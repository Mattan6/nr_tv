import { PARASHA_HIGHLIGHTS, FALLBACK } from './parashaHighlights.data.js';

const MAQAF = '־';
// Hebcal answers 'פרשת בראשית', and combined parashiyot as 'פרשת ויקהל־פקודי'. Which dash lands
// in the middle has varied across responses — Hebrew maqaf (U+05BE), hyphen-minus, and the two
// dashes a copy-paste can introduce — so every form reduces to a maqaf before the table is
// consulted. A multi-word name (לך לך, כי תצא, and the combined pairs whose first member is
// itself two words) carries the same ambiguity one level up: Hebcal sometimes sends the space
// between words as an actual space and sometimes as a maqaf, and CURATION's own multi-word
// names are written with spaces. Both dashes and internal whitespace are folded to a maqaf
// here, so 'כי תצא' and 'כי־תצא' are the same key. The table's own keys go through the
// identical fold at generation time (buildParashaHighlights.mjs keeps its own copy — it cannot
// import this module, which imports the file it writes — see the 'every table key is already
// canonical' test, which is what keeps the two copies from drifting apart).
const PREFIX = /^פרשת\s+/;
// Six visually near-identical glyphs, written with \uXXXX escapes rather than pasted
// literally (see buildParashaHighlights.mjs) -- the leading ASCII "-" is the one exception,
// safe because a hyphen-minus at the start of a character class is always literal, never a
// range operator.
const DASHES = /[-\u2010\u2011\u2012\u2013\u2014\u05BE]/g;

export function parashaKey(hebrewParasha) {
  if (typeof hebrewParasha !== 'string') return '';
  // Trim before folding whitespace to a maqaf, not after: folding first would turn trailing
  // whitespace into a trailing maqaf, which .trim() does not touch.
  return hebrewParasha.replace(PREFIX, '').replace(DASHES, MAQAF).trim().replace(/\s+/g, MAQAF);
}

// Never null, never throws. Three things land on the fallback: a Shabbat with no parashat item
// at all (שבת חול המועד and the other Shabbatot whose reading is the festival's), a blank
// string before the Hebcal response has arrived, and a key the table does not carry — which is
// what a Hebcal rename would look like. The board renders this unconditionally, and a general
// verse is better than an empty card in all three cases.
//
// Object.hasOwn, not `PARASHA_HIGHLIGHTS[key] || FALLBACK`: a bare bracket lookup returns
// PARASHA_HIGHLIGHTS's inherited Object.prototype members for key === 'constructor' or
// 'toString' — truthy, so it reads as a hit, and the board's rendering code then calls
// .pesukim.map on a function or a constructor and throws. Hebcal will never send those keys,
// but "never throws" is the contract, not "never throws for keys Hebcal sends" — see
// server/src/store/panels.js for the same guard against the same class of key.
export function parashaHighlights(hebrewParasha) {
  const key = parashaKey(hebrewParasha);
  return Object.hasOwn(PARASHA_HIGHLIGHTS, key) ? PARASHA_HIGHLIGHTS[key] : FALLBACK;
}
