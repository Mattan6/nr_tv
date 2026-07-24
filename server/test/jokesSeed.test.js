const { test } = require('node:test');
const assert = require('node:assert');

const DEFAULT_CONTENT = require('../src/store/defaultContent');
const { screen } = require('../src/jokes/filter');

test('the seed ships a usable pool of jokes', () => {
  assert.ok(Array.isArray(DEFAULT_CONTENT.jokes));
  assert.ok(DEFAULT_CONTENT.jokes.length >= 30, 'expected at least 30 seed jokes');
});

// A seed joke its own filter rejects would be a shipped contradiction: the panel would
// display text the scraper is forbidden to add.
test('every seed joke passes the filter it ships with', () => {
  for (const joke of DEFAULT_CONTENT.jokes) {
    const verdict = screen(joke.text);
    assert.strictEqual(verdict.ok, true, `seed ${joke.id} rejected as ${verdict.reason}: ${joke.text}`);
  }
});

test('seed jokes have unique ids and unique text', () => {
  const ids = DEFAULT_CONTENT.jokes.map((j) => j.id);
  const texts = DEFAULT_CONTENT.jokes.map((j) => j.text);
  assert.strictEqual(new Set(ids).size, ids.length, 'duplicate seed id');
  assert.strictEqual(new Set(texts).size, texts.length, 'duplicate seed joke');
});

test('seed jokes are all active and Hebrew', () => {
  for (const joke of DEFAULT_CONTENT.jokes) {
    assert.strictEqual(joke.isActive, true, `seed ${joke.id} is not active`);
    assert.ok(!/[A-Za-z]/.test(joke.text), `seed ${joke.id} contains Latin letters`);
  }
});
