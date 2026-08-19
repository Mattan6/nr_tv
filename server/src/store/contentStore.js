const fs = require('node:fs/promises');
const path = require('node:path');
const DEFAULT_CONTENT = require('./defaultContent');

// A mutator throws this to abort the write without persisting; the controller maps
// it to a 404.
class NotFoundError extends Error {}

// The four panel arrays every valid content.json must carry. A file that is valid
// JSON but the wrong shape (e.g. `{"version":1}`, or a future migration that renamed
// a key) must not be cached and served as-is — every route that does `draft[panel]`
// or `.map`/`.push` on it would then throw or hand back `undefined`. Treat "wrong
// shape" exactly like "unparseable": log it and quarantine the file.
const PANEL_ARRAY_KEYS = ['announcements', 'shiurim', 'mazal', 'azkarot'];

// Keys added after content.json's first release. They deliberately do NOT join
// PANEL_ARRAY_KEYS above: every file written before they existed lacks them, so shapeError
// would condemn each real installation as wrong-shaped and serve seed data over the
// gabbai's announcements and azkarot.
//
// Absent and empty are different states here, and the difference is the point. An absent
// key means "this file predates the feature", so it is filled from the seed — which is why
// upgrading a server keeps the four ticker lines the wall has always shown. A key that is
// present but empty means the gabbai emptied it on purpose, and is left alone; otherwise
// clearing the ticker would silently refill itself on the next restart.
//
// `shiurimShabbat` and `dedication` are the newest members and the two whose seeds are
// deliberately EMPTY. The other backfilled keys restore what the wall used to show; these
// must not. An upgrading shul already has its שיעורים on the חול list, and copying them into
// both would put every weekday שיעור on the שבת board — the exact overlap the split exists to
// remove. A dedication names a real family, so there is no value to seed that would not be
// a stranger's name on someone's wall.
const BACKFILL_KEYS = ['ticker', 'settings', 'shiurimShabbat', 'dedication'];

function withDefaults(doc) {
  for (const key of BACKFILL_KEYS) {
    if (doc[key] === undefined) doc[key] = structuredClone(DEFAULT_CONTENT[key]);
  }
  return doc;
}

function shapeError(doc) {
  if (doc === null || typeof doc !== 'object') return 'the document is not an object';
  for (const key of PANEL_ARRAY_KEYS) {
    if (!Array.isArray(doc[key])) return `"${key}" is missing or not an array`;
  }
  return null;
}

// The only module in the codebase that opens content.json.
//
// content.json is the display's entire content, so a truncated file is a blank TV.
// Every write goes to a .tmp file, is fsynced, then renamed over the target — rename
// is atomic on the same filesystem, so a crash mid-write leaves either the old file
// or the new one, never half of one.
//
// Writes are serialized through a promise chain: two rapid taps from the admin must
// not interleave their read-modify-write and lose one of them.
function createContentStore(dir) {
  const file = path.join(dir, 'content.json');
  const tmp = `${file}.tmp`;
  let cache = null;
  let queue = Promise.resolve();
  // Set when load() finds content.json present but unparseable. The corrupt file is
  // left alone at that point (it may be recoverable by hand) but it can't be left
  // alone forever: the next successful write would otherwise rename a fresh tmp file
  // straight over it and destroy the only copy. So the first persist() after this
  // flag is set renames the corrupt file aside instead of clobbering it, then clears
  // the flag — one preservation per corruption, not one per write.
  let corruptPending = false;

  async function persist(doc) {
    await fs.mkdir(dir, { recursive: true });
    if (corruptPending) {
      const corruptPath = `${file}.corrupt-${Date.now()}`;
      await fs.rename(file, corruptPath);
      console.error(`⚠️  Preserved the corrupt content.json at ${corruptPath} before writing new content.`);
      corruptPending = false;
    }
    const handle = await fs.open(tmp, 'w');
    try {
      await handle.writeFile(JSON.stringify(doc, null, 2), 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tmp, file);
  }

  async function load() {
    if (cache) return cache;
    try {
      const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
      const reason = shapeError(parsed);
      if (reason) {
        // Valid JSON, wrong shape — e.g. `{"version":1}`, or a panel key renamed by a
        // future migration. JSON.parse alone can't catch this, so throw here to fall
        // into the same catch block below and reuse its corrupt-file handling: log
        // loudly, serve the seed, and quarantine the bad file on the next write
        // instead of caching and serving it.
        const err = new Error(`content.json has the wrong shape: ${reason}`);
        err.code = 'BAD_SHAPE';
        err.shapeReason = reason;
        throw err;
      }
      // Fills only keys the file predates; see BACKFILL_KEYS. The file itself gains them
      // on the next write, the same laziness `jokes` already relies on.
      cache = withDefaults(parsed);
    } catch (err) {
      cache = structuredClone(DEFAULT_CONTENT);
      if (err.code === 'ENOENT') {
        await persist(cache);
      } else {
        // Don't touch the corrupt/wrong-shaped file here — it may be recoverable by
        // hand. It survives until the next persist(), which renames it aside (see
        // above) rather than overwriting it.
        corruptPending = true;
        const problem = err.code === 'BAD_SHAPE' ? `has the wrong shape (${err.shapeReason})` : `is unreadable (${err.message})`;
        console.error(
          `⚠️  ${file} ${problem}. Serving defaults; the existing file will be preserved as content.json.corrupt-<timestamp> on the next write.`
        );
      }
    }
    return cache;
  }

  // Runs `task` after everything already queued, whether or not that succeeded.
  function enqueue(task) {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  }

  return {
    read: () => enqueue(() => load()),

    // `mutator` receives a clone. It is only persisted if the mutator returns
    // normally, so a validation failure or a NotFoundError leaves both the file and
    // the in-memory cache exactly as they were.
    update: (mutator) =>
      enqueue(async () => {
        const draft = structuredClone(await load());
        const result = mutator(draft);
        draft.updatedAt = new Date().toISOString();
        await persist(draft);
        cache = draft;
        return result;
      }),
  };
}

// CONTENT_DIR lets the API tests redirect the singleton at a temp directory.
const defaultDir = process.env.CONTENT_DIR || path.join(__dirname, '..', '..', 'data');

module.exports = {
  createContentStore,
  contentStore: createContentStore(defaultDir),
  NotFoundError,
  // Exported so store/uploads.js writes images beside content.json rather than deriving
  // the path a second time — and so the tests' trick of pointing CONTENT_DIR at a temp
  // directory before `require` covers uploads too.
  CONTENT_DIR: defaultDir,
};
