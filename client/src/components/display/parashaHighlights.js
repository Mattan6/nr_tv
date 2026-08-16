import { PARASHA_HIGHLIGHTS, FALLBACK } from './parashaHighlights.data.js';

const MAQAF = '־';
// Hebcal answers 'פרשת בראשית', and combined parashiyot as 'פרשת ויקהל־פקודי'. Which dash lands
// in the middle has varied across responses — Hebrew maqaf (U+05BE), hyphen-minus, and the two
// dashes a copy-paste can introduce — so every form reduces to a maqaf before the table is
// consulted. The table's own keys are written with a maqaf, so the two always meet.
const PREFIX = /^פרשת\s+/;
// Six visually near-identical glyphs, written with \uXXXX escapes rather than pasted
// literally (see buildParashaHighlights.mjs) -- the leading ASCII "-" is the one exception,
// safe because a hyphen-minus at the start of a character class is always literal, never a
// range operator.
const DASHES = /[-\u2010\u2011\u2012\u2013\u2014\u05BE]/g;

export function parashaKey(hebrewParasha) {
  if (typeof hebrewParasha !== 'string') return '';
  return hebrewParasha.replace(PREFIX, '').replace(DASHES, MAQAF).trim();
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
