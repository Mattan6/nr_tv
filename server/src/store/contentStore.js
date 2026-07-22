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

  async function persist(doc) {
    await fs.mkdir(dir, { recursive: true });
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
        // Do NOT overwrite: the file may be recoverable by hand, and clobbering it
        // would destroy the gabbai's content to fix a parse error.
        console.error(
          `⚠️  ${file} is unreadable (${err.message}). Serving defaults; the file is left untouched for manual recovery.`
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
