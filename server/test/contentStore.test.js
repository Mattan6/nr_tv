const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createContentStore, NotFoundError } = require('../src/store/contentStore');
const DEFAULT_CONTENT = require('../src/store/defaultContent');

// Each test gets a throwaway directory so nothing touches server/data.
const tmpStore = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-store-'));
  return { dir, store: createContentStore(dir), file: path.join(dir, 'content.json') };
};

test('seeds content.json from defaultContent when the file is absent', async () => {
  const { store, file } = await tmpStore();

  const doc = await store.read();

  assert.strictEqual(doc.shiurim.length, DEFAULT_CONTENT.shiurim.length);
  assert.strictEqual(doc.announcements[0].text, DEFAULT_CONTENT.announcements[0].text);
  const written = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.strictEqual(written.shiurim.length, DEFAULT_CONTENT.shiurim.length);
});

test('serves the seed and preserves the file when content.json is corrupt', async () => {
  const { store, file } = await tmpStore();
  await fs.writeFile(file, '{ this is not json', 'utf8');

  const doc = await store.read();

  assert.strictEqual(doc.shiurim.length, DEFAULT_CONTENT.shiurim.length);
  // The corrupt file may be hand-recoverable, so it must survive untouched.
  assert.strictEqual(await fs.readFile(file, 'utf8'), '{ this is not json');
});

test('leaves no .tmp file behind after a successful write', async () => {
  const { store, dir } = await tmpStore();

  await store.update((draft) => draft.shiurim.push({ id: 'x', name: 'n', time: '01:00', by: 'b', isActive: true }));

  assert.deepStrictEqual(
    (await fs.readdir(dir)).sort(),
    ['content.json']
  );
});

test('concurrent writes both land', async () => {
  const { store, file } = await tmpStore();

  await Promise.all([
    store.update((draft) => draft.mazal.push({ id: 'a', names: 'א', occasion: 'א', isActive: true })),
    store.update((draft) => draft.mazal.push({ id: 'b', names: 'ב', occasion: 'ב', isActive: true })),
  ]);

  const written = JSON.parse(await fs.readFile(file, 'utf8'));
  const ids = written.mazal.map((it) => it.id);
  assert.ok(ids.includes('a'), 'first write was lost');
  assert.ok(ids.includes('b'), 'second write was lost');
});

test('a throwing mutator leaves the document unchanged', async () => {
  const { store } = await tmpStore();
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

test('update stamps updatedAt', async () => {
  const { store } = await tmpStore();

  await store.update((draft) => draft.shiurim.pop());

  const doc = await store.read();
  assert.ok(doc.updatedAt, 'updatedAt was not set');
  assert.ok(!Number.isNaN(Date.parse(doc.updatedAt)), 'updatedAt is not a valid date');
});
