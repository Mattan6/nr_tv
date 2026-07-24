// The only gate between a scraped string and the synagogue wall. There is no human
// approval step (see the spec's "On the absence of human approval"), so every rule here
// is load-bearing.
//
// Pure by design: no network, no filesystem, no clock. The whole table below is testable
// directly, and it is — see server/test/jokesFilter.test.js.

// 110 characters is not an arbitrary round number: it is the largest joke that fits the
// panel at 26px / line-height 1.35 in a ~458px column (4 wrapped lines). It and the font
// size in JokesPanel must move together or the text overflows the card.
const MIN_LEN = 25;
const MAX_LEN = 110;
const MAX_LINES = 3;
const MIN_WORDS = 5;
const MAX_WORDS = 22;
const MAX_WORD_LEN = 12;
const MIN_HEBREW_RATIO = 0.5;
// "3+ occurrences" — two is ordinary Hebrew ("לא ... לא"), three is a mangled dump.
const REPEAT_LIMIT = 3;

const ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

// Hebrew prefixes (ו/ב/כ/ל/מ/ש/ה) attach directly to nouns, so "שירותים" arrives as
// "בשירותים" and a startsWith test misses it. These stems are matched at index 0-2 of the
// word to absorb one or two prefix letters.
const BLOCKED_PREFIXED = [
  'שמנה', 'שמנמן', 'מכוער', 'שירותים', 'אסלה', 'קקי', 'פיפי', 'פלוץ', 'חרבן', 'משתין', 'גיהוק',
  'זונ', 'שרמוט', 'מזדיי', 'זיון', 'חרמן', 'פורנו', 'שדיים',
  'היטלר', 'נאצי', 'שואה', 'יהודון',
  'רצח', 'אקדח', 'פיגוע', 'טרור',
];

// Whole word only. Prefix tolerance here would reject מתחת (contains תחת), חמת (contains
// מת) and כוסות (contains כוס) — all innocent.
const BLOCKED_EXACT = ['תחת', 'זין', 'כוס', 'סקס', 'חרא', 'מוות', 'נשק', 'ערבים'];

// A word reduced to its Hebrew letters, so punctuation and quotes cannot hide a match or
// inflate a length.
const bare = (word) => word.replace(/[^א-ת]/g, '');

const isBlocked = (word) =>
  BLOCKED_EXACT.includes(word) ||
  BLOCKED_PREFIXED.some((stem) => {
    const at = word.indexOf(stem);
    return at >= 0 && at <= 2;
  });

// Counts occurrences of each key, then reports whether any single key hit the limit.
const anyRepeated = (keys) => {
  const counts = new Map();
  for (const key of keys) counts.set(key, (counts.get(key) || 0) + 1);
  return [...counts.values()].some((n) => n >= REPEAT_LIMIT);
};

function normalize(raw) {
  if (typeof raw !== 'string') return '';
  return (
    raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;/g, (m) => ENTITIES[m])
      // The site stores a gershayim as geresh + acute accent (bytes D7 B4), which renders
      // on the wall as מנכ׳´ל. Repair it rather than reject the joke over it.
      .replace(/׳´|״/g, '"')
      .replace(/׳/g, "'")
      .replace(/[´`]/g, "'")
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t ]+/g, ' ')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')
      .trim()
  );
}

// Returns the first rule the text breaks, or null when it passes all of them. Order
// matches the rule table in the spec, so a reason is always the *first* thing wrong.
function rejectReason(text) {
  if (text.length < MIN_LEN || text.length > MAX_LEN) return 'length';
  if (text.split('\n').length > MAX_LINES) return 'lines';
  if (/[A-Za-z]/.test(text)) return 'latin';
  const hebrew = (text.match(/[א-ת]/g) || []).length;
  if (hebrew / text.length < MIN_HEBREW_RATIO) return 'hebrew-ratio';
  if (/([!?.,\-־])\1{2,}/.test(text)) return 'punct-repeat';

  const words = text.split(/\s+/).filter(Boolean);

  // Short words ("לא", "מה", "את") repeat naturally in real jokes; only content words
  // repeating three times signal a gibberish loop.
  if (anyRepeated(words.map(bare).filter((w) => w.length >= 3))) return 'word-repeat';
  // One speaker label three times over — "אני: ... אני: ... אני:" — is a mangled dialogue
  // dump. Counts occurrences of a single label, not labels in total. Mostly overlaps with
  // word-repeat above, which catches the same text whenever the label is 3+ letters; this
  // rule earns its place on short labels ("בן:", "אב:") that word-repeat deliberately
  // skips.
  if (anyRepeated([...text.matchAll(/(\S+)\s*:/g)].map((m) => bare(m[1])).filter(Boolean)))
    return 'speaker-repeat';

  // MIN_WORDS is the half that earns its keep — it kills sentence fragments. MAX_WORDS is
  // a backstop that MAX_LEN almost always reaches first: 23 words inside 110 characters
  // needs an average word under ~4 letters.
  if (words.length < MIN_WORDS || words.length > MAX_WORDS) return 'word-count';
  if (words.some((w) => bare(w).length > MAX_WORD_LEN)) return 'long-word';
  if (/\d{4,}/.test(text) || /https?:|www\.|@/.test(text)) return 'digits';
  if (words.map(bare).filter(Boolean).some(isBlocked)) return 'blocked';
  return null;
}

function screen(raw) {
  const text = normalize(raw);
  const reason = rejectReason(text);
  return reason ? { ok: false, reason } : { ok: true, text };
}

module.exports = { normalize, screen, MAX_LEN };
