const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { decodePage, parseJokes, pageUrl, fetchAll } = require('../src/jokes/source');

// A real excerpt of https://www.yo-yoo.co.il/jokes/?cat=%F7%F8%F9, saved in the site's own
// windows-1255 bytes so the decode path is exercised for real. Tests never hit the network.
const FIXTURE = path.join(__dirname, 'fixtures', 'yoyoo-page.html');

test('decodePage turns windows-1255 bytes into Hebrew', () => {
  const html = decodePage(fs.readFileSync(FIXTURE));
  assert.ok(html.includes('everyDesc'), 'markup did not survive decoding');
  assert.ok(/[א-ת]/.test(html), 'no Hebrew letters after decoding');
  assert.ok(!html.includes('�'), 'decoding produced replacement characters');
});

// Reading the same bytes as UTF-8 is the failure this module exists to prevent, so pin it:
// if someone "simplifies" decodePage to response.text(), this test is what catches it.
test('the same bytes read as UTF-8 are mojibake', () => {
  const asUtf8 = fs.readFileSync(FIXTURE).toString('utf8');
  assert.ok(asUtf8.includes('�'), 'expected UTF-8 decoding of this fixture to be broken');
});

test('parseJokes pulls one entry per everyDesc block', () => {
  const jokes = parseJokes(decodePage(fs.readFileSync(FIXTURE)));
  assert.strictEqual(jokes.length, 6);
  assert.ok(jokes.every((j) => j.trim().length > 0), 'a parsed joke was empty');
});

test('parseJokes returns nothing for markup it does not recognise', () => {
  assert.deepStrictEqual(parseJokes('<html><body><p>no jokes here</p></body></html>'), []);
});

test('pageUrl builds the category and page query', () => {
  assert.strictEqual(
    pageUrl('%F7%F8%F9', 2),
    'https://www.yo-yoo.co.il/jokes/?cat=%F7%F8%F9&page=2'
  );
});

test('fetchAll requests every page of every category and concatenates the jokes', async () => {
  const bytes = fs.readFileSync(FIXTURE);
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(url);
    return { ok: true, arrayBuffer: async () => bytes };
  };

  const jokes = await fetchAll({ fetchImpl, delayMs: 0, categories: ['%F7%F8%F9'], pages: 3 });

  assert.deepStrictEqual(seen, [
    'https://www.yo-yoo.co.il/jokes/?cat=%F7%F8%F9&page=1',
    'https://www.yo-yoo.co.il/jokes/?cat=%F7%F8%F9&page=2',
    'https://www.yo-yoo.co.il/jokes/?cat=%F7%F8%F9&page=3',
  ]);
  assert.strictEqual(jokes.length, 18);
});

test('fetchAll identifies itself and bounds the request', async () => {
  const bytes = fs.readFileSync(FIXTURE);
  let options = null;
  const fetchImpl = async (url, opts) => {
    options = opts;
    return { ok: true, arrayBuffer: async () => bytes };
  };

  await fetchAll({ fetchImpl, delayMs: 0, categories: ['%F7%F8%F9'], pages: 1 });

  assert.match(options.headers['User-Agent'], /synagogue-display/);
  assert.ok(options.signal, 'no abort signal — a hung request would stall the refresh');
});

// One page failing must not lose the pages that worked — the wall is unattended.
test('fetchAll keeps the pages that succeeded when one fails', async (t) => {
  const bytes = fs.readFileSync(FIXTURE);
  t.mock.method(console, 'error', () => {});
  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    if (call === 2) throw new Error('socket hang up');
    return { ok: true, arrayBuffer: async () => bytes };
  };

  const jokes = await fetchAll({ fetchImpl, delayMs: 0, categories: ['%F7%F8%F9'], pages: 3 });

  assert.strictEqual(jokes.length, 12, 'expected the two successful pages to survive');
});

test('fetchAll treats a non-OK response as a failed page', async (t) => {
  t.mock.method(console, 'error', () => {});
  const fetchImpl = async () => ({ ok: false, status: 503 });

  const jokes = await fetchAll({ fetchImpl, delayMs: 0, categories: ['%F7%F8%F9'], pages: 2 });

  assert.deepStrictEqual(jokes, []);
});
