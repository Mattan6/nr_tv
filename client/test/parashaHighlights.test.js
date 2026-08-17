import test from 'node:test';
import assert from 'node:assert/strict';
import { parashaKey, parashaHighlights } from '../src/components/display/parashaHighlights.js';
import { PARASHA_HIGHLIGHTS, FALLBACK } from '../src/components/display/parashaHighlights.data.js';
import { HEBCAL_PARASHIYOT, NOT_EMITTED_BY_HEBCAL } from './fixtures/hebcal-parashiyot.js';

const MAQAF = '־';

test('strips the פרשת prefix', () => {
  assert.equal(parashaKey('פרשת בראשית'), 'בראשית');
  assert.equal(parashaKey('פרשת לך לך'), `לך${MAQAF}לך`);
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

test('a multi-word parasha resolves however Hebcal joins its words', () => {
  const viaSpace = parashaHighlights('פרשת כי תצא');
  const viaMaqaf = parashaHighlights(`פרשת כי${MAQAF}תצא`);
  assert.equal(viaSpace, viaMaqaf);
  assert.notEqual(viaSpace, FALLBACK);
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
// NIKUD_PRESENT is not held to the same standard: it only needs ONE nikud mark to prove the
// text is pointed at all, so it is deliberately narrower than the generator's own NIKUD —
// U+05C1/U+05C2 (shin/sin dot) and U+05C7 (qamatz qatan) are absent here, not because they
// would fail the check, but because the common vowel points below already do the job.
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
  for (const pair of ['ויקהל־פקודי', 'תזריע־מצרע', 'אחרי מות־קדשים', 'בהר־בחקתי', 'חוקת־בלק', 'מטות־מסעי', 'נצבים־וילך']) {
    assert.notEqual(parashaHighlights(`פרשת ${pair}`), FALLBACK, pair);
  }
});

test('every parasha carries a haftara; only the fallback does not', () => {
  for (const key of Object.keys(PARASHA_HIGHLIGHTS)) {
    assert.ok(PARASHA_HIGHLIGHTS[key].haftara, `${key}: no haftara`);
  }
});

test('every table key is already canonical', () => {
  // The generator canonicalizes keys independently of parashaKey — it cannot import the
  // lookup, which imports the file it is writing. This is what stops the two copies drifting:
  // a key the lookup would normalize differently is a key nothing can ever reach.
  for (const key of Object.keys(PARASHA_HIGHLIGHTS)) {
    assert.equal(parashaKey(`פרשת ${key}`), key);
  }
});

// I1: the test above only checks the table against itself — every key it has is trivially
// "canonical" by its own construction, so it cannot catch the table having curated the WRONG
// spelling. The one time this seam broke, it was found in production, not by this suite: the
// curation guessed wrong for six parashiyot — four used the plene spelling where Hebcal's
// response uses the ktiv chaser one (מצרע, קדשים, בחקתי, בהעלתך), one used the ktiv chaser
// spelling where Hebcal uses plene (קורח), and one used a bare short name where Hebcal always
// sends both words (שלח לך). Every one of those weeks silently rendered the fallback verses
// with no haftara line and nothing on screen to say so — see the "Keyed '...'" comments in
// scripts/parashaCuration.mjs for the fix. This test pins it by replaying real Hebcal output,
// captured once into fixtures/hebcal-parashiyot.js (see that file's header for exactly what
// was requested, when, and how to recapture it) rather than trusting the table's own idea of
// its vocabulary.
test('every parasha name Hebcal has actually sent resolves to a real entry', () => {
  for (const [year, names] of Object.entries(HEBCAL_PARASHIYOT)) {
    for (const name of names) {
      assert.notEqual(parashaHighlights(name), FALLBACK, `${year}: "${name}" fell back`);
    }
  }
});

// The other direction, and the one that closes the gap the first version of this fixture
// left: the test above proves every name Hebcal sends is understood, but on its own it
// would stay green while a table key went permanently unreachable — which is what the
// maqaf and plene/chaser bugs both were.
//
// So: every key must be reachable from a real Hebcal name, and the only permitted
// exceptions are the two Hebcal cannot emit for Israel. They are asserted BY NAME rather
// than by a count, so the boundary is stated rather than hidden inside a smaller number —
// and so that adding a key without fixture coverage fails here instead of shipping.
test('every table key is reachable from a real Hebcal name, bar the two it never emits', () => {
  const reachable = new Set(
    Object.values(HEBCAL_PARASHIYOT).flat().map(parashaKey)
  );
  const unreachable = Object.keys(PARASHA_HIGHLIGHTS).filter((k) => !reachable.has(k));
  assert.deepEqual(
    unreachable.sort(),
    [...NOT_EMITTED_BY_HEBCAL].sort(),
    'a table key is unreachable from any name Hebcal sends — see the fixture header'
  );
});

// Guards the exception list itself. Both entries are real table keys, so neither can be a
// typo quietly excusing a key that does not exist.
test('the declared exceptions are themselves real table keys', () => {
  for (const key of NOT_EMITTED_BY_HEBCAL) {
    assert.ok(Object.hasOwn(PARASHA_HIGHLIGHTS, key), `"${key}" is not a table key`);
  }
});
