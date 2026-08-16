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
  // The maqaf below is U+05BE, the same character the generator writes into the table's keys.
  assert.equal(parashaKey('פרשת ויקהל-פקודי'), `ויקהל${MAQAF}פקודי`);
});

test('a combined parasha resolves however Hebcal spelled the dash', () => {
  const viaHyphen = parashaHighlights('פרשת ויקהל-פקודי');
  const viaMaqaf = parashaHighlights(`פרשת ויקהל${MAQAF}פקודי`);
  assert.equal(viaHyphen, viaMaqaf);
  assert.notEqual(viaHyphen, FALLBACK);
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
//
// FORBIDDEN mirrors buildParashaHighlights.mjs's DROP set exactly (cantillation, meteg, rafe,
// paseq, sof pasuk, and the puncta-extraordinaria/nun-hafukha family) — not just the
// cantillation range — so this test enforces the same invariant the generator promises,
// rather than a narrower approximation a future Masoretic marker could slip past unnoticed.
const FORBIDDEN = /[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C3-\u05C6]/;
const NIKUD_PRESENT = /[\u05B0-\u05BC]/;

test('every entry is renderable', () => {
  const keys = Object.keys(PARASHA_HIGHLIGHTS);
  assert.ok(keys.length === 61, `expected 54 parashiyot + 7 combined pairs, got ${keys.length}`);
  for (const key of keys) {
    const entry = PARASHA_HIGHLIGHTS[key];
    assert.ok(entry.pesukim.length >= 1, `${key}: no pesukim`);
    for (const p of entry.pesukim) {
      assert.equal(typeof p.text, 'string');
      assert.equal(typeof p.ref, 'string');
      assert.ok(p.text.length > 0, `${key}: empty text`);
      assert.ok(p.ref.length > 0, `${key}: empty ref`);
      // Cantillation and the rarer Masoretic markers must be gone; nikud must not be.
      assert.ok(!FORBIDDEN.test(p.text), `${key}: cantillation survived in "${p.text}"`);
      assert.ok(NIKUD_PRESENT.test(p.text), `${key}: no nikud in "${p.text}"`);
    }
    if (entry.haftara) {
      assert.equal(typeof entry.haftara.ref, 'string');
      assert.equal(typeof entry.haftara.name, 'string');
      assert.ok(entry.haftara.ref.length > 0, `${key}: empty haftara ref`);
      assert.ok(entry.haftara.name.length > 0, `${key}: empty haftara name`);
      // Haftara names come off the identical slice(await verse(...)) path and render on the
      // same masthead as the pesukim — nothing mechanically stops one arriving unpointed, so
      // this needs the same two assertions, not just a length check.
      assert.ok(!FORBIDDEN.test(entry.haftara.name), `${key}: cantillation survived in haftara name "${entry.haftara.name}"`);
      assert.ok(NIKUD_PRESENT.test(entry.haftara.name), `${key}: no nikud in haftara name "${entry.haftara.name}"`);
    }
  }
});

test('all seven combined pairs are keyed', () => {
  for (const pair of ['ויקהל־פקודי', 'תזריע־מצורע', 'אחרי מות־קדושים', 'בהר־בחוקותי', 'חוקת־בלק', 'מטות־מסעי', 'נצבים־וילך']) {
    assert.notEqual(parashaHighlights(`פרשת ${pair}`), FALLBACK, pair);
  }
});

test('every parasha carries a haftara; only the fallback does not', () => {
  for (const key of Object.keys(PARASHA_HIGHLIGHTS)) {
    assert.ok(PARASHA_HIGHLIGHTS[key].haftara, `${key}: no haftara`);
  }
});
