const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createContentStore, NotFoundError } = require('../src/store/contentStore');
const DEFAULT_CONTENT = require('../src/store/defaultContent');

// Each test gets a throwaway directory so nothing touches server/data. Registers its
// own cleanup on the test context so mkdtemp doesn't leak directories into the OS
// temp dir on every run.
const tmpStore = async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-store-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return { dir, store: createContentStore(dir), file: path.join(dir, 'content.json') };
};

test('seeds content.json from defaultContent when the file is absent', async (t) => {
  const { store, file } = await tmpStore(t);

  const doc = await store.read();

  assert.strictEqual(doc.shiurim.length, DEFAULT_CONTENT.shiurim.length);
  assert.strictEqual(doc.announcements[0].text, DEFAULT_CONTENT.announcements[0].text);
  const written = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.strictEqual(written.shiurim.length, DEFAULT_CONTENT.shiurim.length);
});

// The verbatim Hebrew seed strings are exactly what a well-meaning "cleanup" would
// break, so assert them against hard-coded literals rather than against the module
// under test (which would pass trivially for any value).
test('defaultContent preserves the verbatim seed strings', () => {
  assert.strictEqual(
    DEFAULT_CONTENT.announcements[0].text,
    'שיעורו של הרב מוטה יתקיים הערב\nבשעה 20:00 בבית המדרש'
  );
  // Intentionally a straight ASCII apostrophe, not a geresh (׳) — must stay that way.
  assert.strictEqual(DEFAULT_CONTENT.azkarot[1].date, "ה' בתמוז");
});

test('serves the seed and preserves the file when content.json is corrupt', async (t) => {
  const { store, file } = await tmpStore(t);
  await fs.writeFile(file, '{ this is not json', 'utf8');
  const errorMock = t.mock.method(console, 'error', () => {});

  const doc = await store.read();

  assert.strictEqual(doc.shiurim.length, DEFAULT_CONTENT.shiurim.length);
  // The corrupt file may be hand-recoverable, so it must survive untouched by a read.
  assert.strictEqual(await fs.readFile(file, 'utf8'), '{ this is not json');
  assert.strictEqual(errorMock.mock.calls.length, 1, 'expected exactly one loud log for the corrupt file');
});

test('a parseable but wrong-shaped content.json (missing a panel array) is quarantined and the seed served', async (t) => {
  const { store, file } = await tmpStore(t);
  await fs.writeFile(file, JSON.stringify({ version: 1 }), 'utf8');
  const errorMock = t.mock.method(console, 'error', () => {});

  const doc = await store.read();

  assert.strictEqual(doc.shiurim.length, DEFAULT_CONTENT.shiurim.length);
  assert.ok(Array.isArray(doc.announcements));
  assert.ok(Array.isArray(doc.mazal));
  assert.ok(Array.isArray(doc.azkarot));
  // The wrong-shaped file may be hand-recoverable, so a read alone must leave it
  // untouched — same guarantee as an unparseable file.
  assert.strictEqual(JSON.parse(await fs.readFile(file, 'utf8')).version, 1);
  assert.strictEqual(errorMock.mock.calls.length, 1, 'expected exactly one loud log for the wrong-shaped file');

  await store.update((draft) => draft.shiurim.pop());
  const dir = path.dirname(file);
  const corruptEntries = (await fs.readdir(dir)).filter((name) => name.startsWith('content.json.corrupt-'));
  assert.strictEqual(corruptEntries.length, 1, 'expected the wrong-shaped file to be quarantined on the next write');
});

test('a panel property present but not an array is treated the same as a missing one', async (t) => {
  const { store, file } = await tmpStore(t);
  await fs.writeFile(
    file,
    JSON.stringify({ version: 1, announcements: [], shiurim: 'not-an-array', mazal: [], azkarot: [] }),
    'utf8'
  );
  const errorMock = t.mock.method(console, 'error', () => {});

  const doc = await store.read();

  assert.strictEqual(doc.shiurim.length, DEFAULT_CONTENT.shiurim.length);
  assert.ok(Array.isArray(doc.shiurim));
  assert.strictEqual(errorMock.mock.calls.length, 1, 'expected exactly one loud log for the wrong-shaped file');
});

test('the first write after a corrupt read preserves the corrupt file instead of destroying it', async (t) => {
  const { store, dir, file } = await tmpStore(t);
  await fs.writeFile(file, '{ this is not json', 'utf8');
  const errorMock = t.mock.method(console, 'error', () => {});

  await store.read();
  await store.update((draft) => draft.shiurim.pop());

  const entries = await fs.readdir(dir);
  const corruptEntries = entries.filter((name) => name.startsWith('content.json.corrupt-'));
  assert.strictEqual(corruptEntries.length, 1, 'expected exactly one preserved corrupt file');
  const preserved = await fs.readFile(path.join(dir, corruptEntries[0]), 'utf8');
  assert.strictEqual(preserved, '{ this is not json');

  const current = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.strictEqual(current.shiurim.length, DEFAULT_CONTENT.shiurim.length - 1);

  // One loud log when the corruption is discovered, one when the file is preserved.
  assert.strictEqual(errorMock.mock.calls.length, 2, 'expected a log for detection and a log for preservation');
});

test('leaves no .tmp file behind after a successful write', async (t) => {
  const { store, dir } = await tmpStore(t);

  await store.update((draft) => draft.shiurim.push({ id: 'x', name: 'n', time: '01:00', by: 'b', isActive: true }));

  assert.deepStrictEqual(
    (await fs.readdir(dir)).sort(),
    ['content.json']
  );
});

test('concurrent writes both land', async (t) => {
  const { store, file } = await tmpStore(t);

  await Promise.all([
    store.update((draft) => draft.mazal.push({ id: 'a', names: 'א', occasion: 'א', isActive: true })),
    store.update((draft) => draft.mazal.push({ id: 'b', names: 'ב', occasion: 'ב', isActive: true })),
  ]);

  const written = JSON.parse(await fs.readFile(file, 'utf8'));
  const ids = written.mazal.map((it) => it.id);
  assert.ok(ids.includes('a'), 'first write was lost');
  assert.ok(ids.includes('b'), 'second write was lost');
});

test('a throwing mutator leaves the document unchanged', async (t) => {
  const { store } = await tmpStore(t);
  const before = (await store.read()).mazal.length;

  await assert.rejects(
    store.update((draft) => {
      draft.mazal.push({ id: 'ghost' });
      throw new NotFoundError('nope');
    }),
    NotFoundError
  );

  assert.strictEqual((await store.read()).mazal.length, before);
});

test('update stamps updatedAt', async (t) => {
  const { store } = await tmpStore(t);

  await store.update((draft) => draft.shiurim.pop());

  const doc = await store.read();
  assert.ok(doc.updatedAt, 'updatedAt was not set');
  assert.ok(!Number.isNaN(Date.parse(doc.updatedAt)), 'updatedAt is not a valid date');
});

test('update returns the mutator\'s return value', async (t) => {
  const { store } = await tmpStore(t);

  assert.strictEqual(await store.update(() => 'x'), 'x');
});

// --- Keys added after content.json's first release --------------------------------
//
// `ticker` and `settings` cannot join PANEL_ARRAY_KEYS: every file written before they
// existed lacks them, and shapeError would condemn each one as corrupt and serve seed
// data over the gabbai's real content. They are backfilled instead — but only when
// ABSENT. Absent means "this file predates the feature"; empty means "the gabbai
// emptied it", and the two must not be confused, or clearing the ticker would silently
// refill itself on the next restart.

test('backfills an absent ticker with the seed lines rather than quarantining the file', async (t) => {
  const { store, file } = await tmpStore(t);
  const legacy = structuredClone(DEFAULT_CONTENT);
  delete legacy.ticker;
  delete legacy.settings;
  await fs.writeFile(file, JSON.stringify(legacy), 'utf8');

  const doc = await store.read();

  assert.strictEqual(doc.ticker.length, DEFAULT_CONTENT.ticker.length);
  assert.strictEqual(doc.ticker[0].text, DEFAULT_CONTENT.ticker[0].text);
  assert.deepStrictEqual(doc.settings, DEFAULT_CONTENT.settings);
  // The real content survived: the document was not treated as wrong-shaped.
  assert.strictEqual(doc.announcements.length, DEFAULT_CONTENT.announcements.length);
});

// שיעורים was split into a חול list and a שבת list. The שבת key is the newest member of
// BACKFILL_KEYS, and it is the one whose seed is deliberately EMPTY: an upgrading shul
// keeps every שיעור it already had on the חול list and starts the שבת list blank, rather
// than having its existing list silently copied into both.
test('backfills an absent שבת שיעורים list as empty without quarantining the file', async (t) => {
  const { store, file } = await tmpStore(t);
  const legacy = structuredClone(DEFAULT_CONTENT);
  delete legacy.shiurimShabbat;
  await fs.writeFile(file, JSON.stringify(legacy), 'utf8');

  const doc = await store.read();

  assert.deepStrictEqual(doc.shiurimShabbat, []);
  // The whole point of the split: the חול list is untouched, not copied and not emptied.
  assert.strictEqual(doc.shiurim.length, DEFAULT_CONTENT.shiurim.length);
  // The document was not treated as wrong-shaped — the gabbai's real content survived.
  assert.strictEqual(doc.announcements.length, DEFAULT_CONTENT.announcements.length);
});

// הקדשת הלוח is newer still, and empty for the same reason the שבת שיעורים list is: there is
// no honest value to invent. A dedication names a real family, so a seeded one would put a
// stranger's name on a real shul's board the first time it booted.
test('backfills an absent dedication list as empty without quarantining the file', async (t) => {
  const { store, file } = await tmpStore(t);
  const legacy = structuredClone(DEFAULT_CONTENT);
  delete legacy.dedication;
  await fs.writeFile(file, JSON.stringify(legacy), 'utf8');

  const doc = await store.read();

  assert.deepStrictEqual(doc.dedication, []);
  // The document was not treated as wrong-shaped — the gabbai's real content survived.
  assert.strictEqual(doc.announcements.length, DEFAULT_CONTENT.announcements.length);
});

test('leaves an explicitly empty ticker empty', async (t) => {
  const { store, file } = await tmpStore(t);
  const emptied = structuredClone(DEFAULT_CONTENT);
  emptied.ticker = [];
  await fs.writeFile(file, JSON.stringify(emptied), 'utf8');

  assert.deepStrictEqual((await store.read()).ticker, []);
});

test('backfilled keys survive the next write', async (t) => {
  const { store, file } = await tmpStore(t);
  const legacy = structuredClone(DEFAULT_CONTENT);
  delete legacy.ticker;
  await fs.writeFile(file, JSON.stringify(legacy), 'utf8');

  await store.read();
  await store.update((draft) => {
    draft.announcements[0].text = 'שונה';
  });

  const written = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.strictEqual(written.ticker.length, DEFAULT_CONTENT.ticker.length);
});
