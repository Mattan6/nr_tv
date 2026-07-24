const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createContentStore } = require('../src/store/contentStore');
const DEFAULT_CONTENT = require('../src/store/defaultContent');
const { mergeJokes, refreshJokes, MAX_POOL } = require('../src/jokes/refresh');

const tmpStore = async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jokes-refresh-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return { dir, store: createContentStore(dir), file: path.join(dir, 'content.json') };
};

// A fresh store is seeded with jokes, so anything a test "scrapes" has to be absent from
// the seed or dedup will — correctly — drop it and the test will measure nothing.
const SEEDED = DEFAULT_CONTENT.jokes.length;
const GOOD = 'מה אמר החתול לעכבר? בוא נהיה חברים טובים.';
const ALSO_GOOD = 'למה הטלפון עצוב? כי אף אחד לא מתקשר אליו.';

test('mergeJokes creates the array when the document has no jokes key', () => {
  const draft = { announcements: [] };
  const added = mergeJokes(draft, [GOOD]);
  assert.strictEqual(added, 1);
  assert.ok(Array.isArray(draft.jokes));
  assert.strictEqual(draft.jokes[0].text, GOOD);
  assert.strictEqual(draft.jokes[0].isActive, true);
  assert.ok(draft.jokes[0].id, 'joke has no id');
});

test('mergeJokes drops items the filter rejects', () => {
  const draft = { jokes: [] };
  assert.strictEqual(mergeJokes(draft, ['קצר', 'א'.repeat(200), GOOD]), 1);
  assert.strictEqual(draft.jokes.length, 1);
});

test('mergeJokes deduplicates against the existing pool and within one batch', () => {
  const draft = { jokes: [] };
  mergeJokes(draft, [GOOD]);
  const added = mergeJokes(draft, [GOOD, `  ${GOOD}  `, ALSO_GOOD]);
  assert.strictEqual(added, 1);
  assert.strictEqual(draft.jokes.length, 2);
});

// Pools written before jokes were flattened to a single line still hold newlines; the same
// joke arriving flattened must not be stored a second time.
test('mergeJokes recognises a legacy newline-separated joke as a duplicate', () => {
  const draft = { jokes: [{ id: 'legacy', text: 'מה אמר החתול לעכבר?\nבוא נהיה חברים טובים.', isActive: true }] };

  const added = mergeJokes(draft, ['מה אמר החתול לעכבר? בוא נהיה חברים טובים.']);

  assert.strictEqual(added, 0);
  assert.strictEqual(draft.jokes.length, 1);
});

test('mergeJokes stops at MAX_POOL', () => {
  const draft = { jokes: [] };
  // Distinct, filter-passing jokes: the counter varies a word, not punctuation.
  const many = Array.from(
    { length: MAX_POOL + 20 },
    (_, i) => `מה אמר הקיר מספר ${i} לתמונה? שוב אתה תלוי עליי.`
  );
  mergeJokes(draft, many);
  assert.strictEqual(draft.jokes.length, MAX_POOL);
});

test('refreshJokes writes accepted jokes through the store', async (t) => {
  const { store, file } = await tmpStore(t);

  const result = await refreshJokes(store, { fetchAll: async () => [GOOD, ALSO_GOOD, 'קצר'] });

  assert.strictEqual(result.added, 2);
  const written = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.strictEqual(written.jokes.length, SEEDED + 2, 'scraped jokes must append to the seed');
  // The seeded panels must be untouched by a jokes refresh.
  assert.ok(written.announcements.length > 0);
});

// The seed is a floor, not a starting point that gets replaced.
test('refreshJokes never drops a seed joke', async (t) => {
  const { store } = await tmpStore(t);

  await refreshJokes(store, { fetchAll: async () => [GOOD] });

  const texts = new Set((await store.read()).jokes.map((j) => j.text));
  for (const seed of DEFAULT_CONTENT.jokes) {
    assert.ok(texts.has(seed.text), `seed ${seed.id} was lost by a refresh`);
  }
});

// Re-scraping the same site every day must not grow the pool without bound.
test('a repeated refresh of the same jokes adds nothing the second time', async (t) => {
  const { store } = await tmpStore(t);
  const fetchAll = async () => [GOOD, ALSO_GOOD];

  await refreshJokes(store, { fetchAll });
  const second = await refreshJokes(store, { fetchAll });

  assert.strictEqual(second.added, 0);
  assert.strictEqual((await store.read()).jokes.length, SEEDED + 2);
});

// The wall is unattended: a scrape failure must leave the pool exactly as it was.
test('refreshJokes leaves the pool intact when the fetch throws', async (t) => {
  const { store } = await tmpStore(t);
  t.mock.method(console, 'error', () => {});
  await refreshJokes(store, { fetchAll: async () => [GOOD] });

  const result = await refreshJokes(store, {
    fetchAll: async () => {
      throw new Error('network down');
    },
  });

  assert.strictEqual(result.added, 0);
  assert.strictEqual((await store.read()).jokes.length, SEEDED + 1);
});

test('refreshJokes never rejects, so a scrape failure cannot crash the server', async (t) => {
  const { store } = await tmpStore(t);
  t.mock.method(console, 'error', () => {});
  await assert.doesNotReject(
    refreshJokes(store, {
      fetchAll: async () => {
        throw new Error('boom');
      },
    })
  );
});

// An empty harvest means the site changed its markup or is serving an error page. Keeping
// the pool is the difference between a stale card and a blank one.
test('refreshJokes keeps the pool when the scrape returns nothing', async (t) => {
  const { store } = await tmpStore(t);
  t.mock.method(console, 'error', () => {});
  await refreshJokes(store, { fetchAll: async () => [GOOD] });

  const result = await refreshJokes(store, { fetchAll: async () => [] });

  assert.strictEqual(result.added, 0);
  assert.strictEqual(result.total, SEEDED + 1);
  assert.strictEqual((await store.read()).jokes.length, SEEDED + 1);
});

// The upgrade path: an existing install's content.json has no jokes key and must not be
// quarantined for it. If 'jokes' is ever added to PANEL_ARRAY_KEYS, this test fails —
// which is the point.
test('a content.json written before this feature gains jokes without being quarantined', async (t) => {
  const { store, dir, file } = await tmpStore(t);
  await fs.writeFile(
    file,
    JSON.stringify({
      version: 1,
      announcements: [{ id: 'a', text: 'הודעה', isActive: true }],
      shiurim: [],
      mazal: [],
      azkarot: [],
    }),
    'utf8'
  );

  await refreshJokes(store, { fetchAll: async () => [GOOD] });

  const written = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.strictEqual(written.jokes.length, 1);
  assert.strictEqual(
    written.announcements[0].text,
    'הודעה',
    'the existing content was replaced by the seed'
  );
  const quarantined = (await fs.readdir(dir)).filter((n) => n.startsWith('content.json.corrupt-'));
  assert.deepStrictEqual(quarantined, [], 'the pre-feature file was quarantined');
});
