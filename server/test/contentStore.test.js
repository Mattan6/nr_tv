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
