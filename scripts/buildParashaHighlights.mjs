#!/usr/bin/env node
// Generates client/src/components/display/parashaHighlights.data.js from scripts/parashaCuration.mjs.
//
// Run by hand, never by `npm run build`. It needs the network; a build must not.
//
//   node scripts/buildParashaHighlights.mjs                 regenerate the table
//   node scripts/buildParashaHighlights.mjs --show "Genesis 1:1"   print numbered words
//
// The --show mode is the authoring tool: it prints the verse with its cantillation already
// stripped and each token numbered, so a `words` range in the curation file is read off the
// output rather than guessed.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CURATION, COMBINED, FALLBACK_CURATION } from './parashaCuration.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'client', 'src', 'components', 'display', 'parashaHighlights.data.js');
const SEFARIA = 'https://www.sefaria.org/api/texts';
const DELAY_MS = 120;

// Cantillation (U+0591–U+05AF), meteg (U+05BD), rafe (U+05BF), paseq (U+05C0), sof pasuk
// (U+05C3), and the puncta-extraordinaria/nun-hafukha family (U+05C4–U+05C6: upper dot, lower
// dot, נון הפוכה) — the bracketing marks around Numbers 10:35–36, which Task 3 will curate.
// Nikud (U+05B0–U+05BC, U+05C1, U+05C2, U+05C7) is kept: it is the entire reason this script
// exists. U+05BE maqaf is deliberately outside both sets — see the word-counting rule in
// parashaCuration.mjs.
//
// Written with \uXXXX escapes rather than literal combining marks in the character
// classes: a literal combining mark pasted into a class does not survive copy/paste
// reliably and fails silently by matching nothing.
const DROP = /[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C3-\u05C6]/g;
const NIKUD = /[\u05B0-\u05BC\u05C1\u05C2\u05C7]/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function strip(html) {
  return String(html)
    // Sefaria attaches textual notes (e.g. the ketiv/keri remark on Numbers 25:12's שָׁלוֹם) as
    // <sup class="footnote-marker"> + <i class="footnote">…</i> immediately after the word they
    // annotate, with no separating space. The generic tag strip below removes the tags but not
    // their text, which would otherwise fuse the note's own Hebrew onto the preceding word and
    // spill it into the token stream as extra "words". Drop both elements, tag and content,
    // before the generic strip runs.
    .replace(/<sup class="footnote-marker">.*?<\/sup>/g, '')
    .replace(/<i class="footnote">.*?<\/i>/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&thinsp;|&nbsp;/g, ' ')
    // {פ}/{ס} are Sefaria's open/closed-paragraph markers, and U+034F is a combining grapheme
    // joiner it occasionally emits around maqaf-joined pairs — neither is Masoretic pointing,
    // and leaving either in would land literal braces or an invisible joiner on the wall.
    .replace(/\{[פס]\}/g, '')
    .replace(/\u034F/g, '')
    .replace(DROP, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const cache = new Map();
async function verse(ref) {
  if (cache.has(ref)) return cache.get(ref);
  const res = await fetch(`${SEFARIA}/${encodeURIComponent(ref)}?context=0&commentary=0`);
  if (!res.ok) throw new Error(`${ref}: HTTP ${res.status}`);
  const data = await res.json();
  const raw = Array.isArray(data.he) ? data.he.join(' ') : data.he;
  if (!raw) throw new Error(`${ref}: no Hebrew text in the response`);
  const text = strip(raw);
  // A version without nikud would sail through everything downstream and land unpointed on the
  // wall. Sefaria's default Hebrew for Tanakh is the Masoretic edition, which is pointed; this
  // catches the day that stops being true.
  if (!NIKUD.test(text)) throw new Error(`${ref}: returned text carries no nikud`);
  cache.set(ref, text);
  await sleep(DELAY_MS);
  return text;
}

function slice(text, [from, to], ref) {
  const words = text.split(' ');
  if (from < 1 || to > words.length || to < from) {
    throw new Error(`${ref}: words [${from}, ${to}] out of range — the verse has ${words.length}`);
  }
  return words.slice(from - 1, to).join(' ');
}

const BOOKS = {
  Genesis: 'בראשית', Exodus: 'שמות', Leviticus: 'ויקרא', Numbers: 'במדבר', Deuteronomy: 'דברים',
  Joshua: 'יהושע', Judges: 'שופטים', 'I Samuel': 'שמואל א׳', 'II Samuel': 'שמואל ב׳',
  'I Kings': 'מלכים א׳', 'II Kings': 'מלכים ב׳', Isaiah: 'ישעיהו', Jeremiah: 'ירמיהו',
  Ezekiel: 'יחזקאל', Hosea: 'הושע', Joel: 'יואל', Amos: 'עמוס', Obadiah: 'עובדיה',
  Jonah: 'יונה', Micah: 'מיכה', Habakkuk: 'חבקוק', Zephaniah: 'צפניה', Haggai: 'חגי',
  Zechariah: 'זכריה', Malachi: 'מלאכי', Psalms: 'תהילים',
};

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת'];

// 28 → כ״ח, 2 → ב׳, 15 → ט״ו (never י״ה), 60 → ס׳.
function gematria(n) {
  let rest = n;
  let out = '';
  while (rest >= 400) { out += 'ת'; rest -= 400; }
  out += HUNDREDS[Math.floor(rest / 100)];
  rest %= 100;
  if (rest === 15) out += 'טו';
  else if (rest === 16) out += 'טז';
  else out += TENS[Math.floor(rest / 10)] + ONES[rest % 10];
  return out.length === 1 ? `${out}׳` : `${out.slice(0, -1)}״${out.slice(-1)}`;
}

// 'Deuteronomy 28:2' → 'דברים כ״ח, ב׳'
function hebrewRef(ref, { chapterOnly = false } = {}) {
  const m = ref.match(/^(.+)\s+(\d+):(\d+)$/);
  if (!m) throw new Error(`${ref}: unparsable reference`);
  const book = BOOKS[m[1]];
  if (!book) throw new Error(`${ref}: no Hebrew name for "${m[1]}" — add it to BOOKS`);
  const chapter = gematria(Number(m[2]));
  return chapterOnly ? `${book} ${chapter}` : `${book} ${chapter}, ${gematria(Number(m[3]))}`;
}

async function pasuk({ ref, words }) {
  return { text: slice(await verse(ref), words, ref), ref: hebrewRef(ref) };
}

async function haftaraOf(h) {
  if (!h) return null;
  return { ref: hebrewRef(h.ref, { chapterOnly: true }), name: slice(await verse(h.ref), h.words, h.ref) };
}

const js = (v) => JSON.stringify(v);

async function main() {
  const showAt = process.argv.indexOf('--show');
  if (showAt !== -1) {
    const ref = process.argv[showAt + 1];
    if (!ref) throw new Error('--show needs a reference, e.g. --show "Genesis 1:1"');
    const text = await verse(ref);
    console.log(`${hebrewRef(ref)}   (${text.split(' ').length} tokens)\n`);
    text.split(' ').forEach((w, i) => console.log(String(i + 1).padStart(3), w));
    return;
  }

  const byName = new Map();
  const entries = [];
  for (const item of CURATION) {
    process.stderr.write(`${item.parasha}\n`);
    const entry = {
      haftara: await haftaraOf(item.haftara),
      pesukim: await Promise.all(item.pesukim.map(pasuk)),
    };
    byName.set(item.parasha, item);
    entries.push([item.parasha, entry]);
  }

  for (const { pair, haftara } of COMBINED) {
    const members = pair.map((name) => byName.get(name));
    // Task 2 curates Genesis only, so every pair is skipped on that run; Task 3 completes
    // CURATION and they all resolve. Skipping rather than throwing keeps one code path across
    // both runs — client/test/parashaHighlights.test.js's 'all seven combined pairs are keyed'
    // is what makes a silently-skipped pair fail the build instead of shipping the fallback.
    if (members.some((m) => !m)) {
      process.stderr.write(`skipping ${pair.join('־')} — not all members curated yet\n`);
      continue;
    }
    const [a, b] = members;
    process.stderr.write(`${pair.join('־')}\n`);
    entries.push([pair.join('־'), {
      haftara: await haftaraOf(haftara),
      pesukim: await Promise.all([a.pesukim[0], a.pesukim[1], b.pesukim[0]].map(pasuk)),
    }]);
  }

  const fallback = { haftara: null, pesukim: await Promise.all(FALLBACK_CURATION.pesukim.map(pasuk)) };

  const body = entries
    .map(([key, e]) => {
      const pesukim = e.pesukim.map((p) => `      { text: ${js(p.text)}, ref: ${js(p.ref)} },`).join('\n');
      const haftara = e.haftara ? `{ ref: ${js(e.haftara.ref)}, name: ${js(e.haftara.name)} }` : 'null';
      return `  ${js(key)}: {\n    haftara: ${haftara},\n    pesukim: [\n${pesukim}\n    ],\n  },`;
    })
    .join('\n');

  const fallbackPesukim = fallback.pesukim.map((p) => `    { text: ${js(p.text)}, ref: ${js(p.ref)} },`).join('\n');

  await writeFile(OUT, `// GENERATED FILE — do not edit by hand.
//
// Regenerate with:  node scripts/buildParashaHighlights.mjs
// Selection lives in scripts/parashaCuration.mjs. Every vocalized string below was fetched
// from Sefaria and stripped of cantillation by that script; none of it was typed.
//
// Keys are bare parasha names with a Hebrew maqaf (U+05BE) joining combined pairs. Callers go
// through parashaHighlights.js, which normalizes what Hebcal sends before looking anything up.

export const PARASHA_HIGHLIGHTS = {
${body}
};

export const FALLBACK = {
  haftara: null,
  pesukim: [
${fallbackPesukim}
  ],
};
`, 'utf8');

  console.log(`\nWrote ${entries.length} entries + fallback to ${OUT}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
