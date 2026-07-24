# בדיחות ליאור Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the פרנס היום panel with a בדיחות ליאור panel that fills itself daily with short Hebrew בדיחות קרש scraped from yo-yoo.co.il, gated by a rule-based filter with no human approval.

**Architecture:** A server-side scraper decodes yo-yoo's windows-1255 pages, extracts jokes from `<div class="everyDesc">` blocks, screens each through a pure ten-rule filter, and merges survivors into `content.json` — the same document `/api/content` already serves. The display polls it as it already does and renders a new `JokesPanel` on its own 30-second timer. The browser never contacts yo-yoo.

**Tech Stack:** Node 18+ (CommonJS, `node:test`), Express 5, React 19 + Vite. **No new dependencies** — windows-1255 decoding uses the built-in `TextDecoder`, and parsing uses regex over static markup.

## Global Constraints

- **No new npm dependencies.** `TextDecoder('windows-1255')` and `fetch` are built into Node 18+.
- **Tests never touch the network.** Every scraper test runs against the committed fixture.
- **`'jokes'` must NOT be added to `PANEL_ARRAY_KEYS`** in `server/src/store/contentStore.js`. Doing so classifies every existing `content.json` as wrong-shaped, quarantines it, and replaces the gabbai's real announcements and azkarot with seed data.
- **`'jokes'` must NOT be added to `PANELS`** in `server/src/store/panels.js`. Jokes are scraper-owned; there is deliberately no admin CRUD for them.
- **Joke max length is 110 characters and the panel font is 26px.** These two numbers are coupled — 110 chars at 26px wraps to at most 4 lines in the ~458px column. Changing either requires changing both.
- **Hebrew user-facing copy.** Panel title is exactly `בדיחות ליאור`.
- Existing tests must keep passing: run `npm test --prefix server` at the end of every task.

## Verified facts (confirmed against the live site on 2026-07-24)

Do not re-derive these; they were checked during planning.

| Fact | Value |
|---|---|
| Category בדיחות קרש | `?cat=%F7%F8%F9` (page `<h1>` reads `בדיחות קרש`) |
| Category בדיחות נקיות | `?cat=%F0%F7%E9%E5%FA` |
| Pagination | `./?cat=<cat>&page=N`, 6 pages for קרש |
| Jokes per page | 50 |
| Joke markup | `<div class="everyDesc">…text with <br /> breaks…</div>` |
| Page encoding | `<meta ... charset=windows-1255>` |
| Filter yield on a real page | 29 accepted of 50 |

---

### Task 1: The filter

The gate every joke passes through. Pure functions only — no network, no filesystem — so the whole rule table is testable directly.

**Files:**
- Create: `server/src/jokes/filter.js`
- Test: `server/test/jokesFilter.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `normalize(raw: string): string` — strips tags, decodes entities, converts `<br>` to newlines, collapses whitespace.
  - `screen(raw: string): { ok: true, text: string } | { ok: false, reason: string }` — `reason` is one of `'length' | 'lines' | 'latin' | 'hebrew-ratio' | 'punct-repeat' | 'word-repeat' | 'speaker-repeat' | 'word-count' | 'long-word' | 'digits' | 'blocked'`.

- [ ] **Step 1: Write the failing test**

Create `server/test/jokesFilter.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');

const { normalize, screen } = require('../src/jokes/filter');

test('normalize turns <br> into newlines and strips tags and entities', () => {
  assert.strictEqual(
    normalize('  שלום<br />עולם&nbsp;<b>שוב</b>  '),
    'שלום\nעולם שוב'
  );
});

// The site emits a mangled gershayim as geresh + acute accent; left alone it shows
// on the wall as מנכ׳´ל.
test('normalize repairs the mangled gershayim', () => {
  assert.strictEqual(normalize('מנכ׳´ל'), 'מנכ"ל');
});

// Five REAL jokes scraped from yo-yoo on 2026-07-24. Three must be rejected and two
// accepted; this is the exact trade the design made when the "must contain ?" rule
// was dropped, so it is asserted verbatim rather than paraphrased.
const REAL = {
  tooLong:
    'מה זה 3 בנים שלא יודעים לשחק כדורגל / אבא:למה את לא משחקת / בן:כי לא רוצה / אבא:למה לא / בן:כי / אבא:כי למה בדיוק בואי?',
  repeatedWord: 'אני: את לא יודעת מה זה בחיים.. / אני: ממש לא יודעת ? / אני: ממש / אני: ממש לא יודעת ?',
  bangs: "האיש : למה את 'יודעת מכי הגיעה !!!!!!!!!!!!!!! / אני : לא אני בטוח מאוד",
  coherent: 'הבן קטן לאמא שלו בקול צעקה: הריצי מהר! הכלב שלנו גנב לי משהו!',
  weakButClean: 'מהו ההבדל בין תפוח לתפוזה? תשובה: סוגר.',
};

test('rejects the real mangled samples', () => {
  assert.strictEqual(screen(REAL.tooLong).reason, 'length');
  assert.strictEqual(screen(REAL.repeatedWord).reason, 'word-repeat');
  assert.strictEqual(screen(REAL.bangs).reason, 'punct-repeat');
});

// Documents the accepted residual: no syntactic rule detects "not funny".
test('accepts the real coherent samples, including the known weak one', () => {
  assert.strictEqual(screen(REAL.coherent).ok, true);
  assert.strictEqual(screen(REAL.weakButClean).ok, true);
});

test('each rule rejects with its own reason', () => {
  const cases = [
    ['קצר מדי.', 'length'],
    ['א'.repeat(120), 'length'],
    ['שורה אחת פה\nשורה שתיים פה\nשלוש כאן\nוארבע כאן', 'lines'],
    ['מה אמר הקיר לקיר השני? hello ניפגש בפינה', 'latin'],
    ['123 456 789 <> {} [] () 321 654 987 111', 'hebrew-ratio'],
    ['מה אמר הקיר לקיר השני??? ניפגש שם בפינה', 'punct-repeat'],
    ['הילד אמר לאמא שלו שהילד רץ והילד נפל בגינה', 'word-repeat'],
    ['דני: שלום לך\nדני: מה נשמע\nדני: אני הולך הביתה', 'speaker-repeat'],
    ['אחת שתיים שלוש ארבע חמש שש שבע שמונה תשע עשר אחת עשרה שתים עשרה שלוש עשרה ארבע עשרה', 'word-count'],
    ['מה אמר הקיר לקיר וההתקוממויותיהם השני בפינה', 'long-word'],
    ['מה אמר הקיר לקיר השני? ניפגש בפינה 12345', 'digits'],
  ];
  for (const [text, reason] of cases) {
    assert.strictEqual(screen(text).reason, reason, `expected ${reason} for: ${text}`);
  }
});

// Hebrew prefixes (ו/ב/כ/ל/מ/ש/ה) attach to words, so the blocklist must tolerate
// them — but only where doing so cannot misfire.
test('blocklist tolerates Hebrew prefixes', () => {
  assert.strictEqual(screen('מה אומרים לשמנה שצועקת עליך ברחוב? קודם תורידי טון').reason, 'blocked');
  assert.strictEqual(screen('אתמול ישבתי שעה בשירותים וצחקתי על כל מי שאמר לי לא').reason, 'blocked');
});

// The reason prefix tolerance is capped at index 2 and split across two lists:
// naive substring matching rejects מתחת for containing תחת.
test('blocklist does not misfire on innocent words', () => {
  assert.strictEqual(screen('מה קורה כשכרוב וכרובית מתחתנים? הם נהיים כרובי משפחה').ok, true);
  assert.strictEqual(screen('הבאתי שמן זית וכוסות לשולחן וכולם היו מרוצים מאוד').ok, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --prefix server -- --test-name-pattern="normalize|rule|blocklist|real"`
Expected: FAIL — `Cannot find module '../src/jokes/filter'`

- [ ] **Step 3: Write the implementation**

Create `server/src/jokes/filter.js`:

```js
// The only gate between a scraped string and the synagogue wall. There is no human
// approval step (see the spec's "On the absence of human approval"), so every rule
// here is load-bearing.
//
// Pure by design: no network, no filesystem, no clock. The whole table below is
// testable directly, and it is — see server/test/jokesFilter.test.js.

// 110 characters is not an arbitrary round number: it is the largest joke that fits
// the panel at 26px / line-height 1.35 in a ~458px column (4 wrapped lines). It and
// the font size in JokesPanel must move together or the text overflows the card.
const MIN_LEN = 25;
const MAX_LEN = 110;
const MAX_LINES = 3;
const MIN_WORDS = 5;
const MAX_WORDS = 22;
const MAX_WORD_LEN = 12;
const MIN_HEBREW_RATIO = 0.5;
// "3+ occurrences" — two is ordinary Hebrew ("לא ... לא"), three is a mangled dump.
const REPEAT_LIMIT = 3;

const HEBREW_LETTER = /[א-ת]/g;

const ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

// Hebrew prefixes (ו/ב/כ/ל/מ/ש/ה) attach directly to nouns, so "שירותים" arrives as
// "בשירותים" and a startsWith test misses it. These stems are matched at index 0-2 of
// the word to absorb one or two prefix letters.
const BLOCKED_PREFIXED = [
  'שמנה', 'שמנמן', 'מכוער', 'שירותים', 'אסלה', 'קקי', 'פיפי', 'פלוץ', 'חרבן', 'משתין', 'גיהוק',
  'זונ', 'שרמוט', 'מזדיי', 'זיון', 'חרמן', 'פורנו', 'שדיים',
  'היטלר', 'נאצי', 'שואה', 'יהודון',
  'רצח', 'אקדח', 'פיגוע', 'טרור',
];

// Whole word only. Prefix tolerance here would reject מתחת (contains תחת), חמת
// (contains מת) and כוסות (contains כוס) — all innocent.
const BLOCKED_EXACT = ['תחת', 'זין', 'כוס', 'סקס', 'חרא', 'מוות', 'נשק', 'ערבים'];

// A word reduced to its Hebrew letters, so punctuation and quotes cannot hide a match
// or inflate a length.
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
      // The site stores a gershayim as geresh + acute accent (bytes D7 B4), which
      // renders on the wall as מנכ׳´ל. Repair it rather than reject the joke over it.
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
// matches the rule table in the spec so a reason is always the *first* thing wrong.
function rejectReason(text) {
  if (text.length < MIN_LEN || text.length > MAX_LEN) return 'length';
  if (text.split('\n').length > MAX_LINES) return 'lines';
  if (/[A-Za-z]/.test(text)) return 'latin';
  const hebrew = (text.match(HEBREW_LETTER) || []).length;
  if (hebrew / text.length < MIN_HEBREW_RATIO) return 'hebrew-ratio';
  if (/([!?.,\-־])\1{2,}/.test(text)) return 'punct-repeat';

  const words = text.split(/\s+/).filter(Boolean);

  // Short words ("לא", "מה", "את") repeat naturally in real jokes; only content words
  // repeating three times signal a gibberish loop.
  if (anyRepeated(words.map(bare).filter((w) => w.length >= 3))) return 'word-repeat';
  // One speaker label three times over — "אני: ... אני: ... אני:" — is a mangled
  // dialogue dump. Counts occurrences of a single label, not labels in total.
  if (anyRepeated([...text.matchAll(/(\S+)\s*:/g)].map((m) => bare(m[1])).filter(Boolean)))
    return 'speaker-repeat';

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --prefix server`
Expected: PASS — all new filter tests plus the existing content store and API tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/jokes/filter.js server/test/jokesFilter.test.js
git commit -m "feat: add the jokes filter, the only gate before the wall"
```

---

### Task 2: Fetching and parsing yo-yoo

Turns yo-yoo pages into raw joke strings. Kept separate from the filter so the network-shaped code and the rule-shaped code are testable apart.

**Files:**
- Create: `server/src/jokes/source.js`
- Create: `server/test/fixtures/yoyoo-page.html` (real page excerpt, windows-1255 bytes)
- Test: `server/test/jokesSource.test.js`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `decodePage(buffer: ArrayBuffer | Buffer): string`
  - `parseJokes(html: string): string[]` — raw `everyDesc` inner HTML, uncleaned.
  - `CATEGORIES: string[]`, `PAGES_PER_CATEGORY: number`
  - `pageUrl(category: string, page: number): string`
  - `fetchAll(options?: { fetchImpl?, delayMs?, categories?, pages? }): Promise<string[]>`

- [ ] **Step 1: Create the fixture from the live page**

The fixture must be real markup in real windows-1255 bytes. Download once and trim to the first six joke blocks (~6 KB rather than 100 KB):

```bash
mkdir -p server/test/fixtures
curl -s -A "synagogue-display/1.0 (shul wall display)" \
  "https://www.yo-yoo.co.il/jokes/?cat=%F7%F8%F9" -o /tmp/yoyoo-full.html
node -e "
const fs=require('fs');
const buf=fs.readFileSync('/tmp/yoyoo-full.html');
const html=new TextDecoder('windows-1255').decode(buf);
const blocks=[...html.matchAll(/<div class=\"everyDesc\">[\s\S]*?<\/div>/g)].slice(0,6).map(m=>m[0]);
const page='<html><head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=windows-1255\" /></head><body>\n'
  + blocks.join('\n') + '\n</body></html>';
// Written back as windows-1255 so the decoder test exercises real bytes.
const map=new Map();for(let b=0;b<256;b++)map.set(new TextDecoder('windows-1255').decode(Uint8Array.from([b])),b);
fs.writeFileSync('server/test/fixtures/yoyoo-page.html',
  Buffer.from([...page].map(c=>map.has(c)?map.get(c):0x3f)));
console.log('wrote', blocks.length, 'joke blocks');
"
```

Expected: `wrote 6 joke blocks`

- [ ] **Step 2: Write the failing test**

Create `server/test/jokesSource.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { decodePage, parseJokes, pageUrl, fetchAll } = require('../src/jokes/source');

const FIXTURE = path.join(__dirname, 'fixtures', 'yoyoo-page.html');

test('decodePage turns windows-1255 bytes into Hebrew', () => {
  const html = decodePage(fs.readFileSync(FIXTURE));
  assert.ok(html.includes('everyDesc'), 'markup did not survive decoding');
  assert.ok(/[א-ת]/.test(html), 'no Hebrew letters after decoding');
  assert.ok(!html.includes('�'), 'decoding produced replacement characters');
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test --prefix server -- --test-name-pattern="decodePage|parseJokes|pageUrl|fetchAll"`
Expected: FAIL — `Cannot find module '../src/jokes/source'`

- [ ] **Step 4: Write the implementation**

Create `server/src/jokes/source.js`:

```js
// Fetches and parses yo-yoo.co.il joke pages. Knows nothing about what makes a joke
// acceptable — that is filter.js — and nothing about storage — that is refresh.js.
//
// Two things about this site drive the whole module:
//   1. It serves windows-1255, not UTF-8. Read as UTF-8 every joke is mojibake.
//   2. Its markup is legacy but stable: one <div class="everyDesc"> per joke.

const BASE = 'https://www.yo-yoo.co.il/jokes/';

// windows-1255 percent-encodings of the Hebrew category names, read off the site's
// own category links rather than hand-encoded: קרש and נקיות.
const CATEGORIES = ['%F7%F8%F9', '%F0%F7%E9%E5%FA'];
const PAGES_PER_CATEGORY = 6;

// robots.txt asks bingbot for Crawl-delay: 1. Nothing binds us to it as a generic
// agent, but a wall display has no reason to be greedier than a search engine.
const DELAY_MS = 1000;
const TIMEOUT_MS = 15000;
const USER_AGENT = 'synagogue-display/1.0 (+shul wall display; one request per second)';

const pageUrl = (category, page) => `${BASE}?cat=${category}&page=${page}`;

// Node's TextDecoder carries the legacy encodings via full-ICU, which ships by
// default — hence no iconv-lite dependency.
const decodePage = (buffer) => new TextDecoder('windows-1255').decode(buffer);

// Returns raw inner HTML per joke; normalization and screening happen in filter.js so
// this stays a parser and nothing more.
const parseJokes = (html) =>
  [...html.matchAll(/<div class="everyDesc">([\s\S]*?)<\/div>/g)].map((m) => m[1]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPage(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseJokes(decodePage(await response.arrayBuffer()));
}

// Walks every page of every category sequentially. A page that fails is logged and
// skipped: the display is unattended, so a partial harvest beats an empty one.
async function fetchAll({
  fetchImpl = fetch,
  delayMs = DELAY_MS,
  categories = CATEGORIES,
  pages = PAGES_PER_CATEGORY,
} = {}) {
  const collected = [];
  let first = true;
  for (const category of categories) {
    for (let page = 1; page <= pages; page += 1) {
      if (!first && delayMs) await sleep(delayMs);
      first = false;
      const url = pageUrl(category, page);
      try {
        collected.push(...(await fetchPage(url, fetchImpl)));
      } catch (err) {
        console.error(`Jokes: failed to fetch ${url}: ${err.message}`);
      }
    }
  }
  return collected;
}

module.exports = { decodePage, parseJokes, pageUrl, fetchAll, CATEGORIES, PAGES_PER_CATEGORY };
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test --prefix server`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/jokes/source.js server/test/jokesSource.test.js server/test/fixtures/yoyoo-page.html
git commit -m "feat: fetch and parse yo-yoo joke pages (windows-1255)"
```

---

### Task 3: Merging jokes into content.json

Joins the previous two tasks to the content store, and holds the two hazards from the spec.

**Files:**
- Create: `server/src/jokes/refresh.js`
- Test: `server/test/jokesRefresh.test.js`

**Interfaces:**
- Consumes: `screen` from `../src/jokes/filter`, `fetchAll` from `../src/jokes/source`.
- Produces:
  - `mergeJokes(draft: object, incoming: string[]): number` — mutates `draft.jokes`, returns how many were added.
  - `refreshJokes(store, options?: { fetchAll? }): Promise<{ added: number, total: number }>`
  - `startJokeRefresh(store): void` — schedules the boot run and the daily interval.
  - `MAX_POOL: number`

- [ ] **Step 1: Write the failing test**

Create `server/test/jokesRefresh.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createContentStore } = require('../src/store/contentStore');
const { mergeJokes, refreshJokes, MAX_POOL } = require('../src/jokes/refresh');

const tmpStore = async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jokes-refresh-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return { dir, store: createContentStore(dir), file: path.join(dir, 'content.json') };
};

const GOOD = 'מה אמר הקיר לקיר השני? ניפגש בפינה.';
const ALSO_GOOD = 'למה השלד לא הלך למסיבה? כי לא היה לו עם מי.';

test('mergeJokes creates the array when the document has no jokes key', () => {
  const draft = { announcements: [] };
  const added = mergeJokes(draft, [GOOD]);
  assert.strictEqual(added, 1);
  assert.ok(Array.isArray(draft.jokes));
  assert.strictEqual(draft.jokes[0].text, GOOD);
  assert.strictEqual(draft.jokes[0].isActive, true);
  assert.ok(draft.jokes[0].id, 'joke has no id');
});

test('mergeJokes drops items the filter rejects', () => {
  const draft = { jokes: [] };
  assert.strictEqual(mergeJokes(draft, ['קצר', 'א'.repeat(200), GOOD]), 1);
  assert.strictEqual(draft.jokes.length, 1);
});

test('mergeJokes deduplicates against the existing pool and within one batch', () => {
  const draft = { jokes: [] };
  mergeJokes(draft, [GOOD]);
  const added = mergeJokes(draft, [GOOD, `  ${GOOD}  `, ALSO_GOOD]);
  assert.strictEqual(added, 1);
  assert.strictEqual(draft.jokes.length, 2);
});

test('mergeJokes stops at MAX_POOL', () => {
  const draft = { jokes: [] };
  // Distinct, filter-passing jokes: the counter varies a word, not punctuation.
  const many = Array.from({ length: MAX_POOL + 20 }, (_, i) => `מה אמר הקיר מספר ${i} לתמונה? שוב אתה תלוי עליי.`);
  mergeJokes(draft, many);
  assert.strictEqual(draft.jokes.length, MAX_POOL);
});

test('refreshJokes writes accepted jokes through the store', async (t) => {
  const { store, file } = await tmpStore(t);

  const result = await refreshJokes(store, { fetchAll: async () => [GOOD, ALSO_GOOD, 'קצר'] });

  assert.strictEqual(result.added, 2);
  const written = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.strictEqual(written.jokes.length, 2);
  // The seeded panels must be untouched by a jokes refresh.
  assert.ok(written.announcements.length > 0);
});

// The wall is unattended: a scrape failure must leave the pool exactly as it was.
test('refreshJokes leaves the pool intact when the fetch throws', async (t) => {
  const { store } = await tmpStore(t);
  t.mock.method(console, 'error', () => {});
  await refreshJokes(store, { fetchAll: async () => [GOOD] });

  const result = await refreshJokes(store, {
    fetchAll: async () => {
      throw new Error('network down');
    },
  });

  assert.strictEqual(result.added, 0);
  assert.strictEqual((await store.read()).jokes.length, 1);
});

test('refreshJokes never rejects, so a scrape failure cannot crash the server', async (t) => {
  const { store } = await tmpStore(t);
  t.mock.method(console, 'error', () => {});
  await assert.doesNotReject(
    refreshJokes(store, {
      fetchAll: async () => {
        throw new Error('boom');
      },
    })
  );
});

// The upgrade path: an existing install's content.json has no jokes key and must not
// be quarantined for it.
test('a content.json written before this feature gains jokes without being quarantined', async (t) => {
  const { store, dir, file } = await tmpStore(t);
  await fs.writeFile(
    file,
    JSON.stringify({ version: 1, announcements: [{ id: 'a', text: 'הודעה', isActive: true }], shiurim: [], mazal: [], azkarot: [] }),
    'utf8'
  );

  await refreshJokes(store, { fetchAll: async () => [GOOD] });

  const written = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.strictEqual(written.jokes.length, 1);
  assert.strictEqual(written.announcements[0].text, 'הודעה', 'the existing content was replaced by the seed');
  const quarantined = (await fs.readdir(dir)).filter((n) => n.startsWith('content.json.corrupt-'));
  assert.deepStrictEqual(quarantined, [], 'the pre-feature file was quarantined');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --prefix server -- --test-name-pattern="mergeJokes|refreshJokes|pre-feature"`
Expected: FAIL — `Cannot find module '../src/jokes/refresh'`

- [ ] **Step 3: Write the implementation**

Create `server/src/jokes/refresh.js`:

```js
const { randomUUID } = require('node:crypto');
const { screen } = require('./filter');
const { fetchAll: fetchAllJokes } = require('./source');

// Well under the store's MAX_ITEMS (500). The pool only has to be large enough that
// the wall does not visibly repeat inside a visit.
const MAX_POOL = 150;

const REFRESH_MS = 24 * 60 * 60 * 1000;
// Late enough that a slow or hanging site cannot delay the server accepting requests.
const BOOT_DELAY_MS = 30000;

// Mutates `draft`, returns how many jokes were added.
//
// `draft.jokes` is created here rather than declared in contentStore's
// PANEL_ARRAY_KEYS on purpose: adding it there would make every content.json written
// before this feature "wrong-shaped", quarantining the gabbai's real announcements and
// azkarot and serving the seed in their place.
function mergeJokes(draft, incoming) {
  if (!Array.isArray(draft.jokes)) draft.jokes = [];
  const seen = new Set(draft.jokes.map((j) => j.text));
  let added = 0;
  for (const raw of incoming) {
    if (draft.jokes.length >= MAX_POOL) break;
    const verdict = screen(raw);
    if (!verdict.ok || seen.has(verdict.text)) continue;
    seen.add(verdict.text);
    draft.jokes.push({ id: randomUUID(), text: verdict.text, isActive: true });
    added += 1;
  }
  return added;
}

// Never rejects. The display is unattended and the content API must keep serving even
// when yo-yoo is down, has changed its markup, or is returning nothing usable. A
// failure leaves the existing pool exactly as it was — stale jokes beat a blank card.
async function refreshJokes(store, { fetchAll = fetchAllJokes } = {}) {
  try {
    const incoming = await fetchAll();
    if (!incoming.length) {
      console.error('Jokes: refresh returned no jokes; keeping the existing pool.');
      return { added: 0, total: (await store.read()).jokes?.length || 0 };
    }
    let added = 0;
    await store.update((draft) => {
      added = mergeJokes(draft, incoming);
    });
    const total = (await store.read()).jokes.length;
    console.log(`Jokes: refreshed — ${added} added from ${incoming.length} scraped, pool now ${total}.`);
    return { added, total };
  } catch (err) {
    console.error(`Jokes: refresh failed, keeping the existing pool: ${err.message}`);
    const doc = await store.read().catch(() => ({}));
    return { added: 0, total: doc.jokes?.length || 0 };
  }
}

function startJokeRefresh(store) {
  const run = () => refreshJokes(store);
  // unref so neither timer holds the process open — matters for tests and for a clean
  // shutdown, not for the TV.
  setTimeout(run, BOOT_DELAY_MS).unref();
  setInterval(run, REFRESH_MS).unref();
}

module.exports = { mergeJokes, refreshJokes, startJokeRefresh, MAX_POOL };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --prefix server`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/jokes/refresh.js server/test/jokesRefresh.test.js
git commit -m "feat: merge scraped jokes into content.json, bounded and deduped"
```

---

### Task 4: Seed jokes and boot scheduling

Gives the panel something to show before the first scrape and on a server that never reaches yo-yoo.

**Files:**
- Modify: `server/src/store/defaultContent.js` (add the `jokes` array)
- Modify: `server/src/server.js` (start the refresh loop)
- Test: `server/test/jokesSeed.test.js`

**Interfaces:**
- Consumes: `screen` from `../src/jokes/filter`, `startJokeRefresh` from `../src/jokes/refresh`.
- Produces: `DEFAULT_CONTENT.jokes` — 30 items shaped `{ id, text, isActive }`.

- [ ] **Step 1: Write the failing test**

Create `server/test/jokesSeed.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');

const DEFAULT_CONTENT = require('../src/store/defaultContent');
const { screen } = require('../src/jokes/filter');

test('the seed ships a usable pool of jokes', () => {
  assert.ok(Array.isArray(DEFAULT_CONTENT.jokes));
  assert.ok(DEFAULT_CONTENT.jokes.length >= 30, 'expected at least 30 seed jokes');
});

// A seed joke that its own filter rejects would be shipped-in contradiction: the
// panel would display text the scraper is forbidden to add.
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --prefix server -- --test-name-pattern="seed"`
Expected: FAIL — `DEFAULT_CONTENT.jokes` is undefined.

- [ ] **Step 3: Add the seed jokes**

In `server/src/store/defaultContent.js`, add this key after `azkarot` (all 30 were verified against the filter during planning):

```js
  // בדיחות ליאור. Scraped jokes are appended to this list at runtime
  // (server/src/jokes/refresh.js); these thirty are what the wall shows before the
  // first scrape, and what remains if yo-yoo is never reachable. Every one of them
  // passes server/src/jokes/filter.js — asserted in server/test/jokesSeed.test.js,
  // because a seed its own filter rejects would be a contradiction on the wall.
  jokes: [
    { id: 'seed-jok-1', text: 'מה אמר הקיר לקיר השני? ניפגש בפינה.', isActive: true },
    { id: 'seed-jok-2', text: 'איך קוראים לדג בלי עין? דג.', isActive: true },
    { id: 'seed-jok-3', text: 'למה השלד לא הלך למסיבה? כי לא היה לו עם מי.', isActive: true },
    { id: 'seed-jok-4', text: 'מה אמר המזלג לסכין? אתה חד מדי בשבילי.', isActive: true },
    { id: 'seed-jok-5', text: 'למה המחשב הלך לרופא? כי הוא תפס וירוס.', isActive: true },
    { id: 'seed-jok-6', text: 'מה אמר הכובע לצעיף? אתה תישאר כאן, אני הולך על הראש.', isActive: true },
    { id: 'seed-jok-7', text: 'למה הספר הלך לבית החולים? כי כאבה לו הכריכה.', isActive: true },
    { id: 'seed-jok-8', text: 'מה אמר הקיר לתמונה? שוב אתה תלוי עליי.', isActive: true },
    { id: 'seed-jok-9', text: 'למה העגבנייה הסמיקה? כי היא ראתה את הרוטב.', isActive: true },
    { id: 'seed-jok-10', text: 'איך קוראים לדוב בלי אוזניים? דב.', isActive: true },
    { id: 'seed-jok-11', text: 'מה אמרה הנעל לגרב? בלעדיך אני מרגישה ריקה.', isActive: true },
    { id: 'seed-jok-12', text: 'למה הדלת התעצבנה? כי כל היום דופקים לה על הראש.', isActive: true },
    { id: 'seed-jok-13', text: 'מה אומר הקומקום כשהוא כועס? אני רותח מבפנים.', isActive: true },
    { id: 'seed-jok-14', text: 'למה המנורה הלכה לישון? כי נגמר לה האור.', isActive: true },
    { id: 'seed-jok-15', text: 'מה אמרה הביצה למחבת? אתה מחמם לי את הראש.', isActive: true },
    { id: 'seed-jok-16', text: 'למה המקרר לא צוחק אף פעם? כי יש לו לב קר.', isActive: true },
    { id: 'seed-jok-17', text: 'מה אמר הגשם למטרייה? בלעדייך הייתי נוגע בכולם.', isActive: true },
    { id: 'seed-jok-18', text: 'איך יוצאים ממעגל? אי אפשר, אין לו פינות.', isActive: true },
    { id: 'seed-jok-19', text: 'מה אמר העיפרון למחק? אתה מוחק לי את כל החיים.', isActive: true },
    { id: 'seed-jok-20', text: 'מה אמרה השעה לדקה? אל תמהרי, יש לנו זמן.', isActive: true },
    { id: 'seed-jok-21', text: 'למה הכיסא עייף? כי כל היום יושבים עליו.', isActive: true },
    { id: 'seed-jok-22', text: 'מה אמר הים לחול? אל תדאג, אני תמיד חוזר אליך.', isActive: true },
    { id: 'seed-jok-23', text: 'למה הנר עצוב? כי הוא נמס מרוב אהבה.', isActive: true },
    { id: 'seed-jok-24', text: 'מה אמרה המחברת לעט? תכתוב עליי משהו יפה.', isActive: true },
    { id: 'seed-jok-25', text: 'למה הבצל בכה? כי הוא ראה סרט עצוב.', isActive: true },
    { id: 'seed-jok-26', text: 'מה אמר הסבון למים? בלעדיכם אני לא שווה כלום.', isActive: true },
    { id: 'seed-jok-27', text: 'למה הכדור עגול? כדי שלא ייתקע בפינות.', isActive: true },
    { id: 'seed-jok-28', text: 'מה אמרה הצלחת לכף? בלעדייך הייתי נשארת מלאה.', isActive: true },
    { id: 'seed-jok-29', text: 'למה הגרביים תמיד נעלמים? כי הם הולכים בזוגות.', isActive: true },
    { id: 'seed-jok-30', text: 'מה אמר הבלון לסיכה? אל תתקרבי אליי בבקשה.', isActive: true },
  ],
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --prefix server`
Expected: PASS

- [ ] **Step 5: Start the refresh loop on boot**

In `server/src/server.js`, add the require beside the others and start the loop after `connectDB()`:

```js
require('dotenv').config();
const connectDB = require('./config/database');

// dotenv must load before app.js: the content store reads CONTENT_DIR when it is
// first required, which happens down the app's require chain.
const app = require('./app');
const { contentStore } = require('./store/contentStore');
const { startJokeRefresh } = require('./jokes/refresh');

connectDB();

// Fills the בדיחות ליאור panel. Deliberately not awaited and scheduled well after
// boot: the wall must come up whether or not yo-yoo answers.
startJokeRefresh(contentStore);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **Step 6: Verify the server still boots**

Run: `node -e "require('./server/src/app'); console.log('app loads')"`
Expected: `app loads`

- [ ] **Step 7: Commit**

```bash
git add server/src/store/defaultContent.js server/src/server.js server/test/jokesSeed.test.js
git commit -m "feat: seed 30 jokes and refresh the pool daily from boot"
```

---

### Task 5: The display panel

Replaces פרנס היום on the wall.

**Files:**
- Modify: `client/src/components/display/CenterCards.jsx` (remove `ParnasPanel`, add `JokesPanel`)
- Modify: `client/src/pages/SynagogueDisplay.jsx` (swap the panel, add the 30s timer)
- Modify: `client/src/hooks/useDisplayContent.js` (carry `jokes` through)
- Modify: `client/src/components/display/displayData.js` (delete the `PARNAS` constant)
- Modify: `SETUP.md:250`
- Modify: `docs/superpowers/specs/2026-07-24-jokes-panel-design.md`

**Interfaces:**
- Consumes: `doc.jokes` — `{ id, text, isActive }[]` — from `/api/content` (Task 3).
- Produces: `JokesPanel({ joke, jokeKey })` where `joke` is one item or `null`.

Note: the spec named a standalone `JokesPanel.jsx`. It goes in `CenterCards.jsx` instead, where every other centre card already lives; Step 6 corrects the spec.

- [ ] **Step 1: Replace ParnasPanel with JokesPanel**

In `client/src/components/display/CenterCards.jsx`, update the comment on `centeredCard` and replace the whole `ParnasPanel` export:

```jsx
// The centered glass card used by jokes / mazal / azkarot (no inset highlight).
```

```jsx
// בדיחות ליאור. The pool is scraped and filtered server-side (server/src/jokes/), so
// nothing here validates or truncates: the filter's 110-character cap is what keeps a
// joke inside this card at 26px. Change one and the other has to move with it.
export const JokesPanel = ({ joke, jokeKey }) => (
  <div style={centeredCard}>
    <div style={smallTitle}>בדיחות ליאור</div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
      <div
        key={jokeKey}
        style={{
          animation: 'omFade .7s ease',
          fontSize: '26px',
          fontWeight: 600,
          color: '#f4ead2',
          lineHeight: 1.35,
          whiteSpace: 'pre-line',
        }}
      >
        {joke ? joke.text : 'אין בדיחות להצגה כרגע'}
      </div>
    </div>
  </div>
);
```

- [ ] **Step 2: Carry jokes through the content hook**

In `client/src/hooks/useDisplayContent.js`, add `jokes` to `EMPTY` — `activeOnly` derives its keys from it, so this one line is the whole change:

```js
const EMPTY = { announcements: [], shiurim: [], mazal: [], azkarot: [], jokes: [] };
```

- [ ] **Step 3: Swap the panel on the display**

In `client/src/pages/SynagogueDisplay.jsx`, make four edits.

Add the rotation constant beside `ROTATE_MS`:

```js
const ROTATE_MS = 6500;
// Jokes rotate on their own, slower clock: 6.5s is not long enough to read a joke and
// reach its punch line.
const JOKE_ROTATE_MS = 30000;
```

Change the two imports:

```js
import { NextMinyanPanel, JokesPanel, MazalPanel, AzkarotPanel } from '../components/display/CenterCards';
```

and drop `PARNAS` from the `displayData` import list.

Add the state and timer beside the existing ones:

```js
  const [jokeTick, setJokeTick] = useState(0);
```

```js
  // Jokes rotate independently of the 6.5s panels — see JOKE_ROTATE_MS.
  useEffect(() => {
    const j = setInterval(() => setJokeTick((t) => t + 1), JOKE_ROTATE_MS);
    return () => clearInterval(j);
  }, []);
```

Pull `jokes` out of the hook and pick from it with the same render-time modulo the other lists use:

```js
  const { announcements, shiurim, mazal, azkarot, jokes } = useDisplayContent();
```

```js
  const joke = jokes.length ? jokes[jokeTick % jokes.length] : null;
```

Replace the panel in the grid:

```jsx
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: 0 }}>
                <NextMinyanPanel next={next} />
                <JokesPanel joke={joke} jokeKey={jokeTick} />
              </div>
```

- [ ] **Step 4: Delete the PARNAS constant**

In `client/src/components/display/displayData.js`, delete the `PARNAS` export and update the two comments that name it:

```js
// שיעורים / הודעות / מזל טוב / אזכרות / בדיחות are no longer static — they are edited
// in /adminGabbai (or, for jokes, scraped by the server) and served from the API. Seed
// values live in server/src/store/defaultContent.js; the display fetches them via
// useDisplayContent. TICKER below stays static for now.
```

and the module header's first line:

```js
// Static, editable content for the synagogue display dashboard.
// (Prayer schedule and ticker.)
```

- [ ] **Step 5: Update SETUP.md**

Replace line 250:

```markdown
Still static (no admin panel): the ticker and prayer/zmanim times. בדיחות ליאור has no
admin panel either — the server scrapes and filters it (`server/src/jokes/`).
```

- [ ] **Step 6: Correct the spec's component path**

In `docs/superpowers/specs/2026-07-24-jokes-panel-design.md`, change the heading
`### client/src/components/display/JokesPanel.jsx` to
`### JokesPanel, in client/src/components/display/CenterCards.jsx` and add to that section:

```markdown
It lives in `CenterCards.jsx` alongside the other centre cards rather than in its own
file, matching the existing pattern.
```

- [ ] **Step 7: Verify the client builds and no reference to Parnas survives**

Run:
```bash
npm run build --prefix client
grep -rn "Parnas\|PARNAS\|פרנס" client/src SETUP.md
```
Expected: build succeeds; grep prints nothing.

- [ ] **Step 8: Verify on the running display**

Run `npm run dev`, open the display, and confirm:
- The בדיחות ליאור card sits where פרנס היום was, and a joke is showing.
- The joke changes roughly every 30 seconds, with the fade, while מזל טוב and אזכרות keep changing every 6.5s.
- Temporarily set a 110-character joke as `seed-jok-1` and confirm it does not overflow the card, then revert it.

- [ ] **Step 9: Commit**

```bash
git add client/src SETUP.md docs/superpowers/specs/2026-07-24-jokes-panel-design.md
git commit -m "feat: show בדיחות ליאור on the wall in place of פרנס היום"
```

---

## Self-Review

**Spec coverage:** Every spec section maps to a task — filter rules and the two
rejected rules → Task 1; windows-1255, parsing, politeness, partial-failure → Task 2;
pooling, dedup, cap, the `PANEL_ARRAY_KEYS` hazard, the `EMPTY` hazard → Task 3 (server
half) and Task 5 (client half); seed pool and scheduling → Task 4; panel, removals,
docs → Task 5. The "no admin CRUD" decision is enforced by the Global Constraint
against touching `PANELS`, and the fit claim is verified in Task 5 Step 8.

**Type consistency:** `screen()` returns `{ ok, text }` / `{ ok, reason }` in Task 1 and
is consumed that way in Tasks 3 and 4. `fetchAll` is named identically in Task 2's
export and Task 3's injection point. `JokesPanel({ joke, jokeKey })` matches its call
site. `mergeJokes` returns a count in both its definition and its assertions.

**Known residual:** a well-formed but unfunny joke reaches the wall. Asserted
deliberately in Task 1 (`weakButClean`) so it reads as a decision, not an oversight.
