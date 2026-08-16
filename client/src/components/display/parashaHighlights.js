import { PARASHA_HIGHLIGHTS, FALLBACK } from './parashaHighlights.data.js';

const MAQAF = '־';
// Hebcal answers 'פרשת בראשית', and combined parashiyot as 'פרשת ויקהל־פקודי'. Which dash lands
// in the middle has varied across responses — Hebrew maqaf (U+05BE), hyphen-minus, and the two
// dashes a copy-paste can introduce — so every form reduces to a maqaf before the table is
// consulted. The table's own keys are written with a maqaf, so the two always meet.
const PREFIX = /^פרשת\s+/;
const DASHES = /[-‐‑‒–—־]/g;

export function parashaKey(hebrewParasha) {
  if (typeof hebrewParasha !== 'string') return '';
  return hebrewParasha.replace(PREFIX, '').replace(DASHES, MAQAF).trim();
}

// Never null, never throws. Three things land on the fallback: a Shabbat with no parashat item
// at all (שבת חול המועד and the other Shabbatot whose reading is the festival's), a blank
// string before the Hebcal response has arrived, and a key the table does not carry — which is
// what a Hebcal rename would look like. The board renders this unconditionally, and a general
// verse is better than an empty card in all three cases.
export function parashaHighlights(hebrewParasha) {
  return PARASHA_HIGHLIGHTS[parashaKey(hebrewParasha)] || FALLBACK;
}
