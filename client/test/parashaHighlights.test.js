import test from 'node:test';
import assert from 'node:assert/strict';
import { parashaKey, parashaHighlights } from '../src/components/display/parashaHighlights.js';
import { PARASHA_HIGHLIGHTS, FALLBACK } from '../src/components/display/parashaHighlights.data.js';

const MAQAF = '־';

test('strips the פרשת prefix', () => {
  assert.equal(parashaKey('פרשת בראשית'), 'בראשית');
  assert.equal(parashaKey('פרשת לך לך'), 'לך לך');
});

test('every dash in a combined name normalizes to a maqaf', () => {
  for (const dash of ['-', '‐', '–', '—', MAQAF]) {
    assert.equal(parashaKey(`פרשת ויקהל${dash}פקודי`), `ויקהל${MAQAF}פקודי`);
  }
});

test('a non-string is a blank key, not a crash', () => {
  for (const input of [undefined, null, 0, {}]) assert.equal(parashaKey(input), '');
});

test('a known parasha resolves to its own entry', () => {
  const entry = parashaHighlights('פרשת בראשית');
  assert.notEqual(entry, FALLBACK);
  assert.equal(entry, PARASHA_HIGHLIGHTS['בראשית']);
});

test('a combined name normalizes to the key shape the table will use', () => {
  // Genesis has no combined parashiyot, so this asserts the KEY, not a lookup — the lookup
  // half is pinned in Task 3, where the seven pairs exist. The maqaf below is U+05BE, the
  // same character the generator writes into the table's keys.
  assert.equal(parashaKey('פרשת ויקהל-פקודי'), `ויקהל${MAQAF}פקודי`);
  assert.equal(parashaHighlights('פרשת ויקהל-פקודי'), FALLBACK);
});

test('no parasha, a blank one, and an unknown one all fall back', () => {
  for (const input of ['', undefined, 'פרשת שאין־כזו']) {
    assert.equal(parashaHighlights(input), FALLBACK);
  }
});

test('the fallback carries verses and no haftara', () => {
  assert.equal(FALLBACK.haftara, null);
  assert.ok(FALLBACK.pesukim.length >= 1);
});

// Structural integrity of the generated table. It is machine-written, so this is not checking
// for typos — it is checking that a future change to the generator cannot quietly emit an entry
// the board would render as `undefined`.
test('every entry is renderable', () => {
  const keys = Object.keys(PARASHA_HIGHLIGHTS);
  assert.ok(keys.length >= 12, `expected at least the twelve Genesis parashiyot, got ${keys.length}`);
  for (const key of keys) {
    const entry = PARASHA_HIGHLIGHTS[key];
    assert.ok(entry.pesukim.length >= 1, `${key}: no pesukim`);
    for (const p of entry.pesukim) {
      assert.equal(typeof p.text, 'string');
      assert.ok(p.text.length > 0, `${key}: empty text`);
      assert.ok(p.ref.length > 0, `${key}: empty ref`);
      // Cantillation must be gone; nikud must not be.
      assert.ok(!/[\u0591-\u05AF]/.test(p.text), `${key}: cantillation survived in "${p.text}"`);
      assert.ok(/[\u05B0-\u05BC]/.test(p.text), `${key}: no nikud in "${p.text}"`);
    }
    if (entry.haftara) {
      assert.ok(entry.haftara.ref.length > 0, `${key}: empty haftara ref`);
      assert.ok(entry.haftara.name.length > 0, `${key}: empty haftara name`);
    }
  }
});
