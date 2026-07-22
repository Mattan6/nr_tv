const fs = require('node:fs/promises');
const path = require('node:path');
const DEFAULT_CONTENT = require('./defaultContent');

// A mutator throws this to abort the write without persisting; the controller maps
// it to a 404.
class NotFoundError extends Error {}

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
      cache = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (err) {
      cache = structuredClone(DEFAULT_CONTENT);
      if (err.code === 'ENOENT') {
        await persist(cache);
      } else {
        // Don't touch the corrupt file here — it may be recoverable by hand. It
        // survives until the next persist(), which renames it aside (see above)
        // rather than overwriting it.
        corruptPending = true;
        console.error(
          `⚠️  ${file} is unreadable (${err.message}). Serving defaults; the existing file will be preserved as content.json.corrupt-<timestamp> on the next write.`
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
};
