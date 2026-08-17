# שבת TV Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/tv` a second, light wall layout for שבת that it switches to automatically at Friday 09:00 and away from at Sunday 00:00, showing the same content the board already shows plus one new panel, מן הפרשה.

**Architecture:** `screenSegment` in `displayData.js` already draws the Friday 09:00 / Sunday 00:00 boundary on Israel's calendar; a ten-line hook samples it and `TvDisplay` mounts one of two page components on the answer. The new board is a second 1920x1080 canvas, `pages/ShabbatDisplay.jsx`, assembled from small components under `components/shabbat/`, and it reads every value from the same `useDisplayModel` the dark board reads — no second copy of any time. The one new data source, מן הפרשה, is a table generated from Sefaria by a script that is never part of the runtime.

**Tech Stack:** React 19, Vite 7, plain ESM, inline style objects (this codebase uses no CSS framework on the display boards). Hebcal REST via axios for times, Sefaria REST via `fetch` in the build script only. Node 22 (`node --test` for the new client tests). No new dependency, runtime or dev.

**Spec:** `docs/superpowers/specs/2026-08-16-shabbat-tv-board-design.md`

## Global Constraints

- **No new dependencies**, runtime or dev. The client test harness is Node's built-in `node --test`, which the server already uses.
- **The new board exists on `/tv` and nowhere else.** `pages/SynagogueDisplay.jsx` rendered at `/`, `pages/MobileDisplay.jsx`, and `/zmanim` must behave exactly as they do today, on every day of the week.
- **No server file changes and no `/adminGabbai` changes.** Every editable value already has a home.
- **Every clock and calendar decision goes through `israelParts` / `israelDateAtNoon` / `toClock`**, never through the device's own `Date` fields. A TV whose timezone was set wrong at install must switch boards at 09:00 in Nitzan.
- **A failed fetch writes `null`, never a stale time.** Rows and cards fall to `--:--`, matching every existing leg of the load.
- **צאת הכוכבים is שקיעה + `TZEIT_AFTER_SUNSET_MIN` (18 minutes), everywhere.** Never one of Hebcal's own tzeit fields. The זמנים grid and the מוצאי שבת card both post this zman and must post the same number.
- **`ZMANIM_ROWS` membership does not change.** Ten rows including מנחה גדולה, not the mock's פלג המנחה. The זמנים card is titled `זְמַנֵּי הַיּוֹם`.
- **No vocalized Hebrew scripture is typed by hand anywhere in this plan.** All of it is fetched from Sefaria by `scripts/buildParashaHighlights.mjs` and committed as generated output. Hand-typed Hebrew is limited to panel titles and labels.
- **Timezone checks run in PowerShell, never Git Bash** — Git Bash does not propagate `TZ` to `node.exe`, so a TZ-sensitive check silently passes there without having tested anything.
- **The design mock is a mock.** Its times, names, ticker text and its `omFadeA`/`omFadeB` animation pair are all replaced by live model values and by the existing `key={tick}` remount pattern.

## File Structure

### New

| File | Responsibility |
|---|---|
| `client/src/hooks/useScheduledScreen.js` | Samples `screenSegment` on a 30-second interval. Returns `'weekday' \| 'shabbat'`. Knows nothing about layouts, content or fetching. |
| `client/src/pages/ShabbatDisplay.jsx` | The light 1920x1080 canvas: the scale-to-fit effect, the page background, the five-band column, and the grid. Owns no panel internals. |
| `client/src/components/shabbat/shabbatStyle.js` | The light palette and the shared white-card style. One file because eleven components share them. |
| `client/src/components/shabbat/icons.jsx` | The five SVGs: masthead candlestick, twin Shabbat candles, havdalah set, sefer torah, rosette divider. |
| `client/src/components/shabbat/Masthead.jsx` | Dates, clock, parasha, שבת שלום, shul name, haftara line. |
| `client/src/components/shabbat/EdgeCards.jsx` | The three cards across the top: `CandleCard`, `NextPrayerCard`, `HavdalahCard`. They share a row and a visual weight, so they share a file. |
| `client/src/components/shabbat/PrayerListCard.jsx` | One component, mounted twice — ערב שבת and יום השבת. |
| `client/src/components/shabbat/ZmanimGrid.jsx` | The ten zmanim in two columns. |
| `client/src/components/shabbat/ShiurimCard.jsx` | שיעורים בשבת. |
| `client/src/components/shabbat/MazalCard.jsx` | שמחות ומזל טוב. |
| `client/src/components/shabbat/ParashaVerseCard.jsx` | מן הפרשה. |
| `client/src/components/shabbat/AnnouncementsCard.jsx` | הודעות הקהילה. |
| `client/src/components/shabbat/LightTicker.jsx` | The bottom marquee in the light palette. |
| `client/src/components/display/parashaHighlights.data.js` | **Generated.** The table: parasha key → `{ haftara, pesukim }`. |
| `client/src/components/display/parashaHighlights.js` | Hand-written. Key normalization and the lookup, including the fallback. |
| `scripts/parashaCuration.mjs` | The editorial input: which references, which words. No Hebrew scripture. |
| `scripts/buildParashaHighlights.mjs` | Fetches, strips cantillation, slices, renders Hebrew references, emits the data module. Also `--show <ref>` for authoring. |
| `client/test/screenSegment.test.js` | The two schedule boundaries and `shabbatFriday`, under a non-Israel `TZ`. |
| `client/test/parashaHighlights.test.js` | Key normalization, combined parashiyot, the fallback, table integrity. |

**Why `parashaHighlights` is two files.** The spec named one. It is split because a generated file that also contains hand-written logic invites someone to edit the logic and lose it on the next regeneration. The generator only ever overwrites `.data.js`; the lookup is ordinary source.

**Why `LightTicker` is not a prop on `Ticker`.** The dark `Ticker` hard-codes its colours *and* carries `margin: 0 -46px` to bleed past its parent's horizontal padding. The light board's ticker is a direct child of an unpadded root and needs no bleed. Two twenty-line components beat one thirty-line component with two modes.

### Modified

| File | Change |
|---|---|
| `client/src/components/display/displayData.js` | Add `shabbatFriday(now)` and `shabbatCardTimes(anchors, config)`. Nothing existing is edited. |
| `client/src/hooks/useDisplayModel.js` | Optional `forceScreen` argument; sixth `getZmanim` leg; two more keys on `shabbatAnchorTimes`; return `shabbatCards`, `haftara`, `pasuk`. |
| `client/src/components/display/TopBar.jsx` | `showToggle` prop, default `true`. |
| `client/src/pages/TvDisplay.jsx` | Read `?screen=`, call `useScheduledScreen`, mount one of the two boards, pass `showToggle={false}`. |
| `client/src/index.css` | Add `omGlowSoft` and `omFlame` keyframes. |
| `client/package.json` | `"test": "node --test test/"`. |
| `package.json` | Root `test` runs server then client. |

`MobileDisplay.jsx`, every existing panel under `components/display/`, and every file under
`server/` are untouched. `SynagogueDisplay.jsx` is not: Task 10 Step 3 gives it a `showToggle`
prop, so `/tv`'s dark board can drop its toggle without taking it away from `/`. One prop on the
component's own signature and one prop passed down to `TopBar` — see that step for the exact
change.

## Scratch directory

Task 2 and Task 3 run a network-touching script. Nothing else in this plan needs scratch space; verification is by committed tests and by eye in the browser.

---

### Task 1: The schedule boundary, pinned, and the Friday helper

The client has never had a test runner. This task adds one — Node's built-in, no dependency — and uses it to pin two pure functions: `screenSegment`, which is already written and already correct but which now decides *which of two layouts* a room full of people looks at, and `shabbatFriday`, which is new.

**Files:**
- Create: `client/test/screenSegment.test.js`
- Modify: `client/src/components/display/displayData.js` (append after `upcomingSaturday`, which ends at line 304)
- Modify: `client/package.json` (add a `test` script)
- Modify: `package.json` (root `test` script runs both)

**Interfaces:**
- Consumes: `israelParts(date)` and `israelDateAtNoon(parts, dayShift)`, both already in `displayData.js`. `israelDateAtNoon` is module-private, which is why `shabbatFriday` must live in that file. `screenSegment(now)` and `upcomingSaturday(now)`, both exported already.
- Produces:
  - `shabbatFriday(now: Date): Date` — a device-local `Date` at 12:00 whose **calendar fields spell the Israel date** of the Friday of the current Shabbat. Same contract as `upcomingSaturday`, which is what `getZmanim` needs: `hebcal.js` formats it with date-fns `format(date, 'yyyy-MM-dd')`, which reads local fields.

- [ ] **Step 1: Add the test scripts**

In `client/package.json`, add to `"scripts"` (after `"dev"`):

```json
    "test": "node --test test/",
```

In the repository root `package.json`, replace the existing `"test"` line:

```json
    "test": "npm --prefix server test && npm --prefix client test",
```

- [ ] **Step 2: Write the failing test**

Create `client/test/screenSegment.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { screenSegment, shabbatFriday, upcomingSaturday } from '../src/components/display/displayData.js';

// Every instant below is written with an explicit Israel offset — +03:00 in summer, +02:00 in
// winter — so the assertions describe Israel's wall clock no matter what TZ the runner has.
// That is the whole point: these functions exist because the TV's own clock cannot be trusted.
const at = (iso) => new Date(iso);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 2026-08-16 is a Sunday, so 08-21 is Friday, 08-22 Saturday, 08-23 Sunday. Israel is +03:00.
test('weekday until Friday 08:59:59 Israel time', () => {
  const { screen, key } = screenSegment(at('2026-08-21T08:59:59+03:00'));
  assert.equal(screen, 'weekday');
  assert.equal(key, 'weekday@2026-08-16');
});

test('shabbat from Friday 09:00:00 Israel time', () => {
  const { screen, key } = screenSegment(at('2026-08-21T09:00:00+03:00'));
  assert.equal(screen, 'shabbat');
  assert.equal(key, 'shabbat@2026-08-21');
});

test('still shabbat at Saturday 23:59:59 Israel time', () => {
  const { screen, key } = screenSegment(at('2026-08-22T23:59:59+03:00'));
  assert.equal(screen, 'shabbat');
  assert.equal(key, 'shabbat@2026-08-21');
});

test('weekday from Sunday 00:00:00 Israel time', () => {
  const { screen, key } = screenSegment(at('2026-08-23T00:00:00+03:00'));
  assert.equal(screen, 'weekday');
  assert.equal(key, 'weekday@2026-08-23');
});

// 2026-01-16 is a Friday; Israel is +02:00 in January. The boundary is a wall-clock hour, so
// it must not drift with the season.
test('the Friday boundary is 09:00 in winter too', () => {
  assert.equal(screenSegment(at('2026-01-16T08:59:59+02:00')).screen, 'weekday');
  assert.equal(screenSegment(at('2026-01-16T09:00:00+02:00')).screen, 'shabbat');
});

test('shabbatFriday is the Friday of the Shabbat upcomingSaturday names', () => {
  for (const iso of [
    '2026-08-16T12:00:00+03:00', // Sunday
    '2026-08-20T12:00:00+03:00', // Thursday
    '2026-08-21T09:00:00+03:00', // Friday, on the boundary
    '2026-08-22T20:00:00+03:00', // Saturday evening
  ]) {
    assert.equal(ymd(shabbatFriday(at(iso))), '2026-08-21', iso);
    assert.equal(ymd(upcomingSaturday(at(iso))), '2026-08-22', iso);
  }
});

// The case the Israel-time plumbing exists for: east of Israel the device has already rolled
// over to Sunday while Nitzan is still in Shabbat. Run the file under TZ=Pacific/Auckland and
// this must still answer with Friday the 21st.
test('shabbatFriday reads Israel\'s calendar, not the device\'s', () => {
  assert.equal(ymd(shabbatFriday(at('2026-08-22T22:00:00+03:00'))), '2026-08-21');
});
```

- [ ] **Step 3: Run the tests and watch them fail**

```bash
npm --prefix client test
```

Expected: the file fails to import — `SyntaxError: The requested module ... does not provide an export named 'shabbatFriday'`. The `screenSegment` tests do not run yet either, because the import fails before any test does.

- [ ] **Step 4: Add `shabbatFriday`**

In `client/src/components/display/displayData.js`, insert immediately after `upcomingSaturday` (i.e. after line 304, before the `netzPrayerDate` comment block):

```js
// The Friday of the current Shabbat — the day before `upcomingSaturday`, by the same
// Israel-calendar arithmetic and for the same reason.
//
// The שבת board's candle card prints a שקיעה under הדלקת נרות, and the שקיעה that belongs to
// הדלקת נרות is Friday's — on Saturday just as much as on Friday itself, because the card is
// a statement about the Shabbat being kept and not a countdown to anything.
//
// Deliberately not derived as `candles + candleLightingMinBeforeSunset`. That identity holds
// only while the row is automatic; the moment the gabbai pins הדלקת נרות to a fixed time in
// /adminGabbai, a "sunset" derived from his number would move with it and stop being a sunset.
export function shabbatFriday(now) {
  const p = israelParts(now);
  return israelDateAtNoon(p, ((6 - p.weekday + 7) % 7) - 1);
}
```

- [ ] **Step 5: Run the tests and watch them pass**

```bash
npm --prefix client test
```

Expected: 7 passing tests, 0 failing.

- [ ] **Step 6: Run them again under a hostile timezone — PowerShell, not Git Bash**

```powershell
$env:TZ = 'Pacific/Auckland'; npm --prefix client test; Remove-Item Env:\TZ
```

Expected: the same 7 passing. Git Bash does not propagate `TZ` to `node.exe`, so running this there proves nothing — that is why the step names the shell.

- [ ] **Step 7: Confirm the server suite still runs from the root**

```bash
npm test
```

Expected: the server's suite passes, then the client's 7.

- [ ] **Step 8: Commit**

```bash
git add client/test/screenSegment.test.js client/src/components/display/displayData.js client/package.json package.json
git commit -m "test: pin the שבת schedule boundary and add shabbatFriday"
```

---

### Task 2: The מן הפרשה pipeline, proved on Genesis

Build the generator, the lookup and the tests, curating only the twelve parashiyot of Genesis. The pipeline is the risky part; the remaining content is Task 3.

**Files:**
- Create: `scripts/parashaCuration.mjs`
- Create: `scripts/buildParashaHighlights.mjs`
- Create: `client/src/components/display/parashaHighlights.data.js` (generated by the script — never edited by hand)
- Create: `client/src/components/display/parashaHighlights.js`
- Create: `client/test/parashaHighlights.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `PARASHA_HIGHLIGHTS: Record<string, Entry>` and `FALLBACK: Entry` from `parashaHighlights.data.js`, where
    `Entry = { haftara: { ref: string, name: string } | null, pesukim: Array<{ text: string, ref: string }> }`.
  - `parashaKey(hebrewParasha: string): string` — `'פרשת כי תבוא'` → `'כי תבוא'`; non-strings → `''`.
  - `parashaHighlights(hebrewParasha: string): Entry` — never null, never throws.

- [ ] **Step 1: Write the curation file, Genesis only**

Create `scripts/parashaCuration.mjs`. `words` is a 1-based inclusive range over the verse's whitespace-separated tokens *after* cantillation is stripped; maqaf-joined words (`כׇּל־הַבְּרָכוֹת`) count as one token. Ranges are chosen in Step 6 — write the file now with the references, then fill each range from `--show` output.

```js
// The editorial layer of מן הפרשה: which verse, and which words of it.
//
// Deliberately contains no Hebrew scripture. Every vocalized string in the generated table is
// fetched from Sefaria by buildParashaHighlights.mjs, because vocalized Hebrew typed from
// memory will contain errors and this text goes on a synagogue wall.
//
// `words` is a 1-based inclusive range over the verse's tokens after cantillation is stripped.
// Ranges must be contiguous — a fragment that needs to skip a word in the middle cannot be
// expressed, so pick fragments that do not need to. Aim for three to eight tokens: the card
// renders at 29px over about 640px of width and wraps to two lines beyond that.
//
// `haftara` is the ספרד / עדות המזרח custom, matching the nusach printed in the masthead. It
// differs from the Ashkenazi haftara for roughly a dozen parashiyot. This is a table, not a
// computation, so no test can establish it is right — it is the one thing here the gabbai
// must proofread.
export const CURATION = [
  {
    parasha: 'בראשית',
    haftara: { ref: 'Isaiah 42:5', words: [1, 3] },
    pesukim: [
      { ref: 'Genesis 1:1', words: [1, 7] },
      { ref: 'Genesis 1:27', words: [1, 6] },
      { ref: 'Genesis 2:3', words: [1, 6] },
    ],
  },
  { parasha: 'נח', haftara: { ref: 'Isaiah 54:1', words: [1, 3] }, pesukim: [
    { ref: 'Genesis 6:9', words: [1, 1] },
    { ref: 'Genesis 9:13', words: [1, 5] },
    { ref: 'Genesis 8:22', words: [1, 1] },
  ] },
  { parasha: 'לך לך', haftara: { ref: 'Isaiah 40:27', words: [1, 3] }, pesukim: [
    { ref: 'Genesis 12:1', words: [1, 1] },
    { ref: 'Genesis 12:2', words: [1, 1] },
    { ref: 'Genesis 15:6', words: [1, 1] },
  ] },
  { parasha: 'וירא', haftara: { ref: 'II Kings 4:1', words: [1, 3] }, pesukim: [
    { ref: 'Genesis 18:1', words: [1, 1] },
    { ref: 'Genesis 18:19', words: [1, 1] },
    { ref: 'Genesis 22:12', words: [1, 1] },
  ] },
  { parasha: 'חיי שרה', haftara: { ref: 'I Kings 1:1', words: [1, 3] }, pesukim: [
    { ref: 'Genesis 24:1', words: [1, 1] },
    { ref: 'Genesis 24:67', words: [1, 1] },
    { ref: 'Genesis 25:8', words: [1, 1] },
  ] },
  { parasha: 'תולדות', haftara: { ref: 'Malachi 1:1', words: [1, 3] }, pesukim: [
    { ref: 'Genesis 26:12', words: [1, 1] },
    { ref: 'Genesis 26:24', words: [1, 1] },
    { ref: 'Genesis 27:28', words: [1, 1] },
  ] },
  { parasha: 'ויצא', haftara: { ref: 'Hosea 11:7', words: [1, 3] }, pesukim: [
    { ref: 'Genesis 28:12', words: [1, 1] },
    { ref: 'Genesis 28:15', words: [1, 1] },
    { ref: 'Genesis 28:16', words: [1, 1] },
  ] },
  { parasha: 'וישלח', haftara: { ref: 'Obadiah 1:1', words: [1, 3] }, pesukim: [
    { ref: 'Genesis 32:11', words: [1, 1] },
    { ref: 'Genesis 32:29', words: [1, 1] },
    { ref: 'Genesis 33:4', words: [1, 1] },
  ] },
  { parasha: 'וישב', haftara: { ref: 'Amos 2:6', words: [1, 3] }, pesukim: [
    { ref: 'Genesis 37:3', words: [1, 1] },
    { ref: 'Genesis 39:2', words: [1, 1] },
    { ref: 'Genesis 39:21', words: [1, 1] },
  ] },
  { parasha: 'מקץ', haftara: { ref: 'I Kings 3:15', words: [1, 3] }, pesukim: [
    { ref: 'Genesis 41:16', words: [1, 1] },
    { ref: 'Genesis 41:39', words: [1, 1] },
    { ref: 'Genesis 41:40', words: [1, 1] },
  ] },
  { parasha: 'ויגש', haftara: { ref: 'Ezekiel 37:15', words: [1, 3] }, pesukim: [
    { ref: 'Genesis 45:3', words: [1, 1] },
    { ref: 'Genesis 45:5', words: [1, 1] },
    { ref: 'Genesis 46:4', words: [1, 1] },
  ] },
  { parasha: 'ויחי', haftara: { ref: 'I Kings 2:1', words: [1, 3] }, pesukim: [
    { ref: 'Genesis 48:16', words: [1, 1] },
    { ref: 'Genesis 49:10', words: [1, 1] },
    { ref: 'Genesis 50:20', words: [1, 1] },
  ] },
];

// Combined parashiyot are read as one unit, so they are keyed in their own right. Their
// pesukim are composed rather than re-curated — two from the first parasha, one from the
// second — but the haftara is its own, because a combined reading does not simply inherit
// either half's.
export const COMBINED = [
  { pair: ['ויקהל', 'פקודי'], haftara: { ref: 'I Kings 7:40', words: [1, 3] } },
  { pair: ['תזריע', 'מצורע'], haftara: { ref: 'II Kings 7:3', words: [1, 3] } },
  { pair: ['אחרי מות', 'קדושים'], haftara: { ref: 'Ezekiel 20:2', words: [1, 3] } },
  { pair: ['בהר', 'בחוקותי'], haftara: { ref: 'Jeremiah 16:19', words: [1, 3] } },
  { pair: ['חוקת', 'בלק'], haftara: { ref: 'Micah 5:6', words: [1, 3] } },
  { pair: ['מטות', 'מסעי'], haftara: { ref: 'Jeremiah 2:4', words: [1, 3] } },
  { pair: ['נצבים', 'וילך'], haftara: { ref: 'Isaiah 61:10', words: [1, 3] } },
];

// Shown when Hebcal reports no parashat item — שבת חול המועד, שבת ראש השנה and the other
// Shabbatot whose reading is the festival's — and when a key is not in the table at all.
// No haftara line: the generic entry cannot name one.
export const FALLBACK_CURATION = {
  pesukim: [
    { ref: 'Exodus 31:16', words: [1, 1] },
    { ref: 'Exodus 20:8', words: [1, 1] },
    { ref: 'Isaiah 58:13', words: [1, 1] },
  ],
};
```

Note the placeholder ranges `[1, 1]` and `[1, 3]` above: they are **deliberately wrong** and Step 6 replaces every one of them. The only real ranges written now are בראשית's, which serve as the worked example.

- [ ] **Step 2: Write the generator**

Create `scripts/buildParashaHighlights.mjs`:

```js
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

// Cantillation (U+0591–U+05AF), meteg (U+05BD) — which the Masoretic edition adds as a reading
// aid — paseq (U+05C0) and sof pasuk (U+05C3). Nikud (U+05B0–U+05BC, U+05C1, U+05C2, U+05C7)
// is kept: it is the entire reason this script exists.
const DROP = /[֑-ֽ֯׀׃]/g;
const NIKUD = /[ְ-ׇּׁׂ]/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function strip(html) {
  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&thinsp;|&nbsp;/g, ' ')
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
    const [a, b] = pair.map((name) => {
      const found = byName.get(name);
      if (!found) throw new Error(`combined ${pair.join('־')}: "${name}" is not in CURATION`);
      return found;
    });
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
```

- [ ] **Step 3: Write the lookup**

Create `client/src/components/display/parashaHighlights.js`:

```js
import { PARASHA_HIGHLIGHTS, FALLBACK } from './parashaHighlights.data';

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
```

- [ ] **Step 4: Write the failing test**

Create `client/test/parashaHighlights.test.js`:

```js
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
      assert.ok(!/[֑-֯]/.test(p.text), `${key}: cantillation survived in "${p.text}"`);
      assert.ok(/[ְ-ּ]/.test(p.text), `${key}: no nikud in "${p.text}"`);
    }
    if (entry.haftara) {
      assert.ok(entry.haftara.ref.length > 0, `${key}: empty haftara ref`);
      assert.ok(entry.haftara.name.length > 0, `${key}: empty haftara name`);
    }
  }
});
```

- [ ] **Step 5: Run the test and watch it fail**

```bash
npm --prefix client test
```

Expected: `Cannot find module .../parashaHighlights.data.js` — the generated file does not exist yet.

- [ ] **Step 6: Choose the word ranges**

For every reference in `scripts/parashaCuration.mjs` still carrying a placeholder range (everything except בראשית), run:

```bash
node scripts/buildParashaHighlights.mjs --show "Genesis 6:9"
```

It prints the stripped verse with each token numbered. Read off the contiguous run that forms the known fragment and write it into the curation file. Worked examples, so the judgement is unambiguous:

| Reference | Fragment wanted | Range |
|---|---|---|
| `Genesis 1:1` | בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ | `[1, 7]` |
| `Genesis 6:9` | נֹחַ אִישׁ צַדִּיק תָּמִים הָיָה בְּדֹרֹתָיו — skips the opening אֵלֶּה תּוֹלְדֹת נֹחַ | starts at the second נֹחַ |
| `Genesis 9:13` | אֶת קַשְׁתִּי נָתַתִּי בֶּעָנָן | `[1, 4]` |
| `Isaiah 42:5` | the haftara's opening words, three to five tokens | from token 1 |

Rules: three to eight tokens; contiguous; a fragment that reads as a complete thought on its own. Haftara names are always the opening words of the cited verse, so they start at token 1.

- [ ] **Step 7: Generate and inspect**

```bash
node scripts/buildParashaHighlights.mjs
```

Expected: twelve parasha names on stderr, then `Wrote 12 entries + fallback` — the seven `COMBINED` pairs are skipped for now because their members are not all in `CURATION`, which the script reports as an error. **If the run fails on a combined pair, comment out the `COMBINED` loop's body for this task only and restore it in Task 3.**

Read the generated `client/src/components/display/parashaHighlights.data.js` end to end. Every fragment must be complete Hebrew, pointed, with no cantillation and no stray punctuation.

- [ ] **Step 8: Run the tests and watch them pass**

```bash
npm --prefix client test
```

Expected: Task 1's 7 tests plus 8 more, all passing.

- [ ] **Step 9: Commit**

```bash
git add scripts/parashaCuration.mjs scripts/buildParashaHighlights.mjs client/src/components/display/parashaHighlights.js client/src/components/display/parashaHighlights.data.js client/test/parashaHighlights.test.js
git commit -m "feat: generate מן הפרשה highlights from Sefaria, curated for Genesis"
```

---

### Task 3: The rest of the curation

Extend `CURATION` from twelve entries to all fifty-four, restore the `COMBINED` loop, regenerate, and let Task 2's integrity test cover the lot.

**Files:**
- Modify: `scripts/parashaCuration.mjs`
- Modify: `client/src/components/display/parashaHighlights.data.js` (regenerated)
- Modify: `client/test/parashaHighlights.test.js` (raise the count assertion)

**Interfaces:**
- Consumes: `CURATION`, `COMBINED`, `FALLBACK_CURATION` and the generator, all from Task 2. The entry shape does not change.
- Produces: 61 keys in `PARASHA_HIGHLIGHTS` — 54 parashiyot and 7 combined pairs.

- [ ] **Step 1: Add the remaining forty-two parashiyot**

Append to `CURATION` in `scripts/parashaCuration.mjs`, in the same shape as Task 2's entries. The references below are the editorial selection; the `words` ranges come from `--show` exactly as in Task 2 Step 6. `haftara` is the ספרד custom throughout.

| Parasha | Pesukim | Haftara |
|---|---|---|
| שמות | Exodus 1:12 · 3:5 · 3:14 | Jeremiah 1:1 |
| וארא | Exodus 6:6 · 6:7 · 6:8 | Ezekiel 28:25 |
| בא | Exodus 12:2 · 12:42 · 13:8 | Jeremiah 46:13 |
| בשלח | Exodus 14:14 · 15:2 · 15:11 | Judges 5:1 |
| יתרו | Exodus 19:6 · 20:2 · 20:8 | Isaiah 6:1 |
| משפטים | Exodus 23:20 · 23:25 · 24:7 | Jeremiah 34:8 |
| תרומה | Exodus 25:2 · 25:8 · 25:22 | I Kings 5:26 |
| תצוה | Exodus 27:20 · 28:2 · 29:45 | Ezekiel 43:10 |
| כי תשא | Exodus 31:16 · 33:14 · 34:6 | I Kings 18:20 |
| ויקהל | Exodus 35:2 · 35:21 · 36:5 | I Kings 7:40 |
| פקודי | Exodus 39:43 · 40:34 · 40:38 | I Kings 7:51 |
| ויקרא | Leviticus 1:2 · 1:9 · 2:13 | Isaiah 43:21 |
| צו | Leviticus 6:6 · 7:12 · 8:35 | Jeremiah 7:21 |
| שמיני | Leviticus 9:23 · 10:3 · 11:44 | II Samuel 6:1 |
| תזריע | Leviticus 12:2 · 12:3 · 13:59 | II Kings 4:42 |
| מצורע | Leviticus 14:2 · 14:11 · 15:31 | II Kings 7:3 |
| אחרי מות | Leviticus 16:30 · 17:11 · 18:5 | Ezekiel 22:1 |
| קדושים | Leviticus 19:2 · 19:18 · 19:32 | Ezekiel 20:2 |
| אמור | Leviticus 22:32 · 23:3 · 23:40 | Ezekiel 44:15 |
| בהר | Leviticus 25:10 · 25:17 · 25:23 | Jeremiah 32:6 |
| בחוקותי | Leviticus 26:3 · 26:6 · 26:12 | Jeremiah 16:19 |
| במדבר | Numbers 1:2 · 2:2 · 3:13 | Hosea 2:1 |
| נשא | Numbers 6:24 · 6:25 · 6:26 | Judges 13:2 |
| בהעלותך | Numbers 8:2 · 10:35 · 12:3 | Zechariah 2:14 |
| שלח | Numbers 13:30 · 14:20 · 15:39 | Joshua 2:1 |
| קרח | Numbers 16:22 · 17:5 · 18:20 | I Samuel 11:14 |
| חוקת | Numbers 19:2 · 21:8 · 21:17 | Judges 11:1 |
| בלק | Numbers 23:9 · 23:21 · 24:5 | Micah 5:6 |
| פינחס | Numbers 25:12 · 27:16 · 28:2 | I Kings 18:46 |
| מטות | Numbers 30:2 · 30:3 · 32:22 | Jeremiah 1:1 |
| מסעי | Numbers 33:2 · 34:2 · 35:34 | Jeremiah 2:4 |
| דברים | Deuteronomy 1:11 · 1:17 · 3:22 | Isaiah 1:1 |
| ואתחנן | Deuteronomy 6:4 · 6:5 · 7:9 | Isaiah 40:1 |
| עקב | Deuteronomy 8:3 · 8:10 · 10:12 | Isaiah 49:14 |
| ראה | Deuteronomy 11:26 · 15:8 · 16:15 | Isaiah 54:11 |
| שופטים | Deuteronomy 16:20 · 18:13 · 20:4 | Isaiah 51:12 |
| כי תצא | Deuteronomy 22:7 · 23:15 · 24:15 | Isaiah 54:1 |
| כי תבוא | Deuteronomy 26:15 · 28:2 · 28:13 | Isaiah 60:1 |
| נצבים | Deuteronomy 29:28 · 30:14 · 30:19 | Isaiah 61:10 |
| וילך | Deuteronomy 31:6 · 31:8 · 31:19 | Hosea 14:2 |
| האזינו | Deuteronomy 32:1 · 32:4 · 32:7 | II Samuel 22:1 |
| וזאת הברכה | Deuteronomy 33:4 · 33:27 · 34:10 | Joshua 1:1 |

Two of these repeat a reference already used elsewhere — שמות and מטות share Jeremiah 1:1 as their haftara under the ספרד custom, and כי תשא's first pasuk (Exodus 31:16) is also the fallback's. That is correct, not a copy-paste slip; the generator caches by reference so each is fetched once.

- [ ] **Step 2: Restore the combined loop**

If Task 2 Step 7 required commenting out the `COMBINED` loop body in `scripts/buildParashaHighlights.mjs`, restore it now. All fourteen member parashiyot are in `CURATION` after Step 1.

- [ ] **Step 3: Raise the integrity assertion**

In `client/test/parashaHighlights.test.js`, replace the count assertion inside `'every entry is renderable'`:

```js
  assert.ok(keys.length === 61, `expected 54 parashiyot + 7 combined pairs, got ${keys.length}`);
```

and add, at the end of the same file:

```js
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
```

The string literals above use the Hebrew maqaf U+05BE. Copy them; do not retype the dash.

- [ ] **Step 4: Run the tests and watch them fail**

```bash
npm --prefix client test
```

Expected: `expected 54 parashiyot + 7 combined pairs, got 12`, plus seven failures in the combined-pairs test.

- [ ] **Step 5: Choose the remaining word ranges and regenerate**

Same loop as Task 2 Step 6, for every new reference: `--show`, read, write the range. Then:

```bash
node scripts/buildParashaHighlights.mjs
```

Expected: 61 names on stderr and `Wrote 61 entries + fallback`. The run makes roughly 190 requests at 120ms apart — about half a minute.

- [ ] **Step 6: Run the tests and watch them pass**

```bash
npm --prefix client test
```

Expected: all of Tasks 1–3's tests green.

- [ ] **Step 7: Read the generated file end to end**

This is the proofreading pass, and it is the only check that catches a wrong *selection* — the tests can only prove the text is pointed Hebrew, never that it is the right pointed Hebrew. Check for fragments that read as sentence fragments, fragments longer than eight tokens, and haftara names that are not recognisable opening words.

- [ ] **Step 8: Commit**

```bash
git add scripts/parashaCuration.mjs client/src/components/display/parashaHighlights.data.js client/test/parashaHighlights.test.js
git commit -m "feat: curate מן הפרשה for all 54 parashiyot and 7 combined pairs"
```

---

### Task 4: What the model owes the new board

Three additions to `useDisplayModel`, and one pure helper in `displayData.js` so the arithmetic is testable without React or a network.

**Files:**
- Modify: `client/src/components/display/displayData.js` (append `shabbatCardTimes` after `resolveShabbatTimes`/`arvitTime`, which end at line 436)
- Modify: `client/src/hooks/useDisplayModel.js`
- Modify: `client/test/screenSegment.test.js` (add the `shabbatCardTimes` cases)

**Interfaces:**
- Consumes: `toClock(iso, offsetMin)`, `SHABBAT_CONFIG`, `TZEIT_AFTER_SUNSET_MIN`, `shabbatFriday` (Task 1), `parashaHighlights` (Task 2), all already exported.
- Produces, on the object `useDisplayModel` returns:
  - `shabbatCards: { candles: string|null, fridaySunset: string|null, tzeit: string|null, tzeitRT: string|null }` — `'HH:MM'` or `null`.
  - `haftara: { ref: string, name: string } | null`
  - `pasuk: { text: string, ref: string } | null`
  - and the hook now takes `useDisplayModel(forceScreen?: 'weekday'|'shabbat')`.
- Also produces `shabbatCardTimes(anchors, config?)` from `displayData.js`, exported for the test.

- [ ] **Step 1: Write the failing test**

In `client/test/screenSegment.test.js`, extend the existing `displayData.js` import at the top of the file with `shabbatCardTimes` and `TZEIT_AFTER_SUNSET_MIN`:

```js
import {
  screenSegment,
  shabbatFriday,
  upcomingSaturday,
  shabbatCardTimes,
  TZEIT_AFTER_SUNSET_MIN,
} from '../src/components/display/displayData.js';
```

then append to the end of the file:

```js
// Israel, high summer: sunset around 19:40, so צאת lands at 19:58 and ר״ת at 20:52.
const ANCHORS = {
  fridaySunset: '2026-08-21T19:41:00+03:00',
  saturdaySunset: '2026-08-22T19:40:00+03:00',
  saturdayTzeit72: '2026-08-22T20:52:00+03:00',
};

test('the candle card gets Friday\'s sunset, not Saturday\'s', () => {
  assert.equal(shabbatCardTimes(ANCHORS).fridaySunset, '19:41');
});

test('צאת הכוכבים is שקיעה plus the shul\'s own offset, not a Hebcal field', () => {
  assert.equal(TZEIT_AFTER_SUNSET_MIN, 18);
  assert.equal(shabbatCardTimes(ANCHORS).tzeit, '19:58');
});

test('צאת ר״ת is read straight off Saturday\'s zmanim', () => {
  assert.equal(shabbatCardTimes(ANCHORS).tzeitRT, '20:52');
});

test('a missing anchor is null, never a stale or invented time', () => {
  const partial = shabbatCardTimes({ saturdaySunset: ANCHORS.saturdaySunset });
  assert.equal(partial.fridaySunset, null);
  assert.equal(partial.tzeitRT, null);
  assert.equal(partial.tzeit, '19:58');
  const nothing = shabbatCardTimes();
  assert.equal(nothing.fridaySunset, null);
  assert.equal(nothing.tzeit, null);
  assert.equal(nothing.tzeitRT, null);
});
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
npm --prefix client test
```

Expected: `does not provide an export named 'shabbatCardTimes'`.

- [ ] **Step 3: Add `shabbatCardTimes`**

In `client/src/components/display/displayData.js`, insert after `arvitTime` (which ends at line 436) and before `weeklyMinchaTime`:

```js
// The two dated cards flanking מניין הבא on the שבת board, resolved to 'HH:MM'.
//
// Pure string arithmetic over anchors the hook already holds, kept out of the hook so it is
// testable without a Hebcal round trip — the same reason resolveShabbatTimes lives here.
//
// צאת הכוכבים is computed the shul's way, שקיעה + TZEIT_AFTER_SUNSET_MIN, and deliberately NOT
// read off one of Hebcal's tzeit fields. The same zman is already on screen a few centimetres
// away in the זמנים grid, which computes it that way through ZMANIM_ROWS; a second source would
// put two numbers twenty-two minutes apart on one board in July.
//
// Any missing anchor yields null, which every consumer renders as '--:--'. A card never shows
// last week's number.
export function shabbatCardTimes(
  { fridaySunset, saturdaySunset, saturdayTzeit72 } = {},
  config = SHABBAT_CONFIG
) {
  return {
    fridaySunset: toClock(fridaySunset),
    tzeit: toClock(saturdaySunset, config.tzeitAfterSunsetMin),
    tzeitRT: toClock(saturdayTzeit72),
  };
}
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npm --prefix client test
```

Expected: all green, four more than before.

- [ ] **Step 5: Add the sixth fetch leg and the two anchor keys**

In `client/src/hooks/useDisplayModel.js`:

Extend the import from `displayData` (lines 3–20) with `shabbatFriday` and `shabbatCardTimes`, and add a new import beneath the `useDisplayContent` one:

```js
import { parashaHighlights } from '../components/display/parashaHighlights';
```

Replace the `Promise.allSettled` destructure and call (lines 130–140) with:

```js
      const [z, zThu, zSat, zNetz, zFri, p] = await Promise.allSettled([
        getZmanim(today),
        getZmanim(governingThursday(instant)),
        getZmanim(saturday),
        // Requested unconditionally, including before 07:30 when this is the same date the
        // first leg already asked for. One uniform path, at the cost of a duplicated request
        // twice a day — the branch that would save it has to be right on both sides of
        // a boundary that moves once a day, which is more than the request is worth.
        getZmanim(netzPrayerDate(instant)),
        // Friday's, for the שקיעה the שבת board prints under הדלקת נרות. Duplicates the first
        // leg on Fridays, and is accepted for the same reason the line above is.
        getZmanim(shabbatFriday(instant)),
        getParasha(SHABBAT_CONFIG.candleLightingMinBeforeSunset),
      ]);
```

Replace the `failures` line (line 143) with:

```js
      const failures = [z, zThu, zSat, zNetz, zFri, p].filter((r) => r.status === 'rejected');
```

Replace the `setShabbatAnchorTimes` call (lines 152–155) with:

```js
      setShabbatAnchorTimes({
        ...shabbatAnchors(value(p), saturday),
        saturdaySunset: value(zSat)?.times?.sunset,
        // Two more fields off a response already in hand. resolveShabbatTimes destructures only
        // the three keys it needs, so these pass through it unread.
        saturdayTzeit72: value(zSat)?.times?.tzeit72min,
        fridaySunset: value(zFri)?.times?.sunset,
      });
```

- [ ] **Step 6: Add `forceScreen` and the three new return values**

In the same file, change the signature (line 42):

```js
// `forceScreen` pins the schedule instead of reading it off the calendar. pages/ShabbatDisplay
// passes 'shabbat', because it IS the שבת board — asking it to render חול prayers would be
// incoherent, and without this the `?screen=shabbat` preview on a Tuesday would post weekday
// times under שבת headings. It bypasses the TopBar override too, which is harmless: the only
// caller that forces has no TopBar.
export default function useDisplayModel(forceScreen) {
```

Change the `screen` derivation (line 207):

```js
  const screen = forceScreen || (override && override.segmentKey === segmentKey ? override.screen : scheduled);
```

After the `zmanimRows` block (which ends at line 246), add:

```js
  // The three edge cards. `candles` comes from the resolved prayer row rather than from the
  // anchors, so a הדלקת נרות the gabbai pinned in /adminGabbai shows on the card as well as in
  // the list — one number, two places.
  const shabbatCards = {
    candles: shabbatTimes.shabCandles,
    ...shabbatCardTimes(shabbatAnchorTimes),
  };

  // מן הפרשה. Always an entry — parashaHighlights falls back rather than returning null — so
  // the card renders through a Hebcal outage and through a Shabbat that has no parasha at all.
  const highlights = parashaHighlights(parasha);
  const haftara = highlights.haftara;
```

And inside the `pick`/`ann` block, after `const joke = ...` (line 255), add:

```js
  // Rotates on the shared 6.5s counter, like ann/maz/azk — one clock for the whole board.
  const pasuk = highlights.pesukim.length ? highlights.pesukim[tick % highlights.pesukim.length] : null;
```

Finally, in the returned object, add `shabbatCards` after `zmanimRows`, and `haftara` and `pasuk` after `joke`:

```js
    zmanimRows,
    shabbatCards,
```

```js
    joke,
    haftara,
    pasuk,
```

- [ ] **Step 7: Verify nothing regressed on the existing boards**

```bash
npm run dev
```

Open `http://localhost:5173/` on a desktop viewport and confirm: the dark board renders, the clock ticks, זמני היום is populated, מניין הבא counts down, and the browser console carries no error. Then open the same URL narrow enough to trip `useIsMobile` and confirm the phone column still renders. Six network legs now fire instead of five — check the Network tab shows five `zmanim` requests and one `shabbat`, all 200.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/display/displayData.js client/src/hooks/useDisplayModel.js client/test/screenSegment.test.js
git commit -m "feat: give the model Friday's sunset, Saturday's ר״ת and the parasha highlights"
```

---

### Task 5: The light canvas — background, masthead, ticker, and a preview route

The board's chrome, and the URL that makes everything after this task reviewable without waiting for Friday. The middle of the page stays empty until Task 6.

**Files:**
- Create: `client/src/components/shabbat/shabbatStyle.js`
- Create: `client/src/components/shabbat/icons.jsx`
- Create: `client/src/components/shabbat/Masthead.jsx`
- Create: `client/src/components/shabbat/LightTicker.jsx`
- Create: `client/src/pages/ShabbatDisplay.jsx`
- Modify: `client/src/index.css` (append two keyframes)
- Modify: `client/src/pages/TvDisplay.jsx`

**Interfaces:**
- Consumes: `useDisplayModel(forceScreen)` and its `shabbatCards`/`haftara`/`pasuk` (Task 4).
- Produces:
  - `C` (palette object), `CARD` (white card style), `SERIF`, `SANS` from `shabbatStyle.js`.
  - `<TwinCandles />`, `<HavdalahSet />`, `<SeferTorah />`, `<Rosette />` from `icons.jsx` — no props — and `<MastheadCandle delay="0s" />`, whose one prop offsets the flame animation.
  - `<Masthead hebDate greg clock parasha haftara />` where `haftara` is `{ ref, name } | null`.
  - `<LightTicker items />` where `items` is the model's `ticker` array of `{ id, text }`.
  - `<ShabbatDisplay safeArea={{x, y}} />`.

- [ ] **Step 1: Write the palette**

Create `client/src/components/shabbat/shabbatStyle.js`:

```js
// The light שבת palette, in one file because eleven components share it.
//
// The dark board keeps its colours inline in each component and that is fine there: on black,
// two greys three percent apart are indistinguishable. On white they read as a printing error,
// so this board needs its tokens to be literally the same string everywhere.
export const C = {
  ink: '#2f3742',
  inkSoft: '#3f4d5c',
  muted: '#7f93a8',
  navy: '#17436b',
  navySoft: '#3f5a75',
  steel: '#5a7da0',
  line: 'rgba(60,95,135,0.13)',
  edge: 'rgba(90,125,160,0.26)',
  gold: '#c8a869',
  goldLight: '#d7bb85',
  // Gold text on white. #c8a869 fails legibility across a hall; this is the same hue darkened.
  goldDeep: '#8a7136',
  deep: 'linear-gradient(165deg,#20486e,#12304c)',
  onDeep: '#ffffff',
  onDeepSoft: '#94aec9',
  onDeepBright: '#dbe9f6',
  page: 'linear-gradient(180deg,#fdfefe 0%,#f4f7fa 58%,#eaeff5 100%)',
  pageFlat: '#eef2f6',
};

export const SERIF = "'Frank Ruhl Libre',serif";
export const SANS = "'Assistant',sans-serif";

// The white card every panel on this board sits in.
export const CARD = {
  background: '#ffffff',
  border: `1px solid ${C.edge}`,
  borderRadius: '18px',
  boxShadow: '0 8px 24px rgba(40,70,105,0.08)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};

// The two dark cards — מניין הבא and מן הפרשה — which invert the palette to carry the eye.
export const DEEP_CARD = {
  background: C.deep,
  border: '1px solid rgba(15,47,77,0.85)',
  borderRadius: '18px',
  boxShadow: '0 10px 28px rgba(20,60,98,0.22)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};
```

- [ ] **Step 2: Write the icons**

Create `client/src/components/shabbat/icons.jsx`:

```jsx
import { C } from './shabbatStyle';

// The board's five SVGs. Flat markup, no props: each appears at exactly one size in exactly one
// place, and a size prop would be a parameter with one argument.
//
// The flames animate through `omFlame` (client/src/index.css). The offset second flame on the
// masthead is deliberate — two candles flickering in lockstep read as a loop, not as fire.

export const MastheadCandle = ({ delay = '0s' }) => (
  <svg width="70" height="86" viewBox="0 0 70 86" style={{ flex: 'none' }} aria-hidden="true">
    <ellipse cx="35" cy="80" rx="20" ry="4.5" fill={C.goldLight} />
    <path d="M31 76 C31 60 28 52 28 44 h14 c0 8 -3 16 -3 32 Z" fill={C.gold} />
    <rect x="30" y="36" width="10" height="9" rx="2" fill={C.goldLight} />
    <g style={{ animation: `omFlame 2.4s ease-in-out infinite ${delay}`, transformOrigin: '35px 32px' }}>
      <path d="M35 16 C40 24 39 31 35 34 C31 31 30 24 35 16 Z" fill="#ffd98a" />
      <path d="M35 22 C37.5 27 37 30.5 35 32 C33 30.5 32.5 27 35 22 Z" fill="#fff6dc" />
    </g>
  </svg>
);

export const TwinCandles = () => (
  <svg width="46" height="42" viewBox="0 0 46 42" style={{ flex: 'none' }} aria-hidden="true">
    <ellipse cx="15" cy="38" rx="8" ry="2.4" fill={C.gold} />
    <ellipse cx="31" cy="38" rx="8" ry="2.4" fill={C.gold} />
    <rect x="12.5" y="18" width="5" height="19" rx="1.6" fill="#e0d3b4" stroke={C.goldDeep} strokeWidth="1.1" />
    <rect x="28.5" y="18" width="5" height="19" rx="1.6" fill="#e0d3b4" stroke={C.goldDeep} strokeWidth="1.1" />
    <g style={{ animation: 'omFlame 2.4s ease-in-out infinite', transformOrigin: '15px 14px' }}>
      <path d="M15 4 C19 10 18 15 15 17 C12 15 11 10 15 4 Z" fill="#f0b03c" />
    </g>
    <g style={{ animation: 'omFlame 2.4s ease-in-out infinite .8s', transformOrigin: '31px 14px' }}>
      <path d="M31 4 C35 10 34 15 31 17 C28 15 27 10 31 4 Z" fill="#f0b03c" />
    </g>
  </svg>
);

export const HavdalahSet = () => (
  <svg width="46" height="42" viewBox="0 0 46 42" style={{ flex: 'none' }} aria-hidden="true">
    <path d="M6 12 h13 l-2 12 a4.5 4.5 0 0 1 -9 0 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth="1.2" />
    <path d="M12.5 28 v6" stroke={C.goldDeep} strokeWidth="1.8" />
    <ellipse cx="12.5" cy="36" rx="7" ry="2.4" fill={C.gold} />
    <path d="M30 37 c-1-8 -1-14 0-19 M36 37 c1-8 1-14 0-19" stroke="#e0d3b4" strokeWidth="4" strokeLinecap="round" />
    <path d="M30 20 c2-3 4-3 6 0" fill="none" stroke={C.goldDeep} strokeWidth="1.3" />
    <g style={{ animation: 'omFlame 2.4s ease-in-out infinite', transformOrigin: '33px 14px' }}>
      <path d="M33 3 C38 10 37 15 33 17 C29 15 28 10 33 3 Z" fill="#f0b03c" />
    </g>
  </svg>
);

export const SeferTorah = () => (
  <svg width="30" height="32" viewBox="0 0 30 32" style={{ flex: 'none' }} aria-hidden="true">
    <path d="M4 4 h9 a2 2 0 0 1 2 2 v22 a2 2 0 0 0 -2 -2 h-9 Z" fill="#33587e" stroke={C.goldLight} strokeWidth="1.3" />
    <path d="M26 4 h-9 a2 2 0 0 0 -2 2 v22 a2 2 0 0 1 2 -2 h9 Z" fill="#3f6a94" stroke={C.goldLight} strokeWidth="1.3" />
    <path d="M15 6 v22" stroke={C.goldLight} strokeWidth="1.3" />
  </svg>
);

export const Rosette = () => (
  <svg width="24" height="24" viewBox="0 0 26 26" style={{ flex: 'none' }} aria-hidden="true">
    <path d="M13 3 C15.6 7.4 15.6 10.2 13 13 C10.4 10.2 10.4 7.4 13 3 Z" fill="rgba(200,168,105,0.85)" />
    <path d="M23 13 C18.6 15.6 15.8 15.6 13 13 C15.8 10.4 18.6 10.4 23 13 Z" fill="rgba(90,125,160,0.6)" />
    <path d="M13 23 C10.4 18.6 10.4 15.8 13 13 C15.6 15.8 15.6 18.6 13 23 Z" fill="rgba(200,168,105,0.85)" />
    <path d="M3 13 C7.4 10.4 10.2 10.4 13 13 C10.2 15.6 7.4 15.6 3 13 Z" fill="rgba(90,125,160,0.6)" />
    <circle cx="13" cy="13" r="1.7" fill="rgba(200,168,105,0.95)" />
  </svg>
);
```

- [ ] **Step 3: Add the two keyframes**

Append to `client/src/index.css`:

```css
/* The שבת board (pages/ShabbatDisplay.jsx). omFade and omTicker above are shared with the dark
   board; these two are only used here. */
@keyframes omGlowSoft {
  0%, 100% { opacity: .4;  transform: translateX(-50%) scale(1); }
  50%      { opacity: .75; transform: translateX(-50%) scale(1.05); }
}
@keyframes omFlame {
  0%, 100% { transform: scale(1);                  opacity: .95; }
  50%      { transform: scale(1.12) translateY(-1.5px); opacity: 1; }
}
```

- [ ] **Step 4: Write the masthead**

Create `client/src/components/shabbat/Masthead.jsx`:

```jsx
import { C, SERIF } from './shabbatStyle';
import { MastheadCandle } from './icons';

const rule = (deg) => ({
  width: '90px',
  height: '1px',
  background: `linear-gradient(${deg}deg,transparent,rgba(200,168,105,0.85))`,
});

// `haftara` is { ref, name } or null — null on a Shabbat whose reading is a festival's, where
// the generic fallback entry cannot name one. The line is dropped rather than left blank so the
// block above it does not float over a gap.
const Masthead = ({ hebDate, greg, clock, parasha, haftara }) => (
  <div
    style={{
      flex: 'none',
      position: 'relative',
      overflow: 'hidden',
      background: C.deep,
      padding: '24px 46px 22px',
      borderBottom: '2px solid rgba(200,168,105,0.65)',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: '-140px',
        left: '50%',
        width: '1000px',
        height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(closest-side,rgba(215,187,133,0.42),transparent)',
        animation: 'omGlowSoft 8s ease-in-out infinite',
        pointerEvents: 'none',
      }}
    />
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '30px' }}>
      <div style={{ flex: 1, textAlign: 'right' }}>
        <div style={{ fontSize: '23px', fontWeight: 600, color: C.goldLight, letterSpacing: '1px' }}>{hebDate}</div>
        <div style={{ fontSize: '24px', color: C.onDeepSoft, marginTop: '2px' }}>{greg}</div>
        <div style={{ fontSize: '46px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: C.onDeep, marginTop: '4px', lineHeight: 1 }}>
          {clock}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '26px' }}>
        <MastheadCandle />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: '62px', color: C.onDeep, lineHeight: 1, letterSpacing: '2px' }}>
            {parasha}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '11px' }}>
            <div style={rule(90)} />
            <div style={{ fontFamily: SERIF, fontSize: '25px', fontWeight: 700, color: C.goldLight, letterSpacing: '3px' }}>
              שַׁבַּת שָׁלוֹם וּמְבֹרָךְ
            </div>
            <div style={rule(270)} />
          </div>
        </div>
        <MastheadCandle delay=".8s" />
      </div>

      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ fontFamily: SERIF, fontSize: '28px', fontWeight: 700, color: C.onDeep }}>בית כנסת נווה רחמים</div>
        <div style={{ fontSize: '24px', color: C.onDeepSoft, marginTop: '3px' }}>נוסח עדות המזרח · ב״ה</div>
        {haftara && (
          <div style={{ fontSize: '24px', color: C.goldLight, marginTop: '6px' }}>
            הפטרה: {haftara.ref} · {haftara.name}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default Masthead;
```

- [ ] **Step 5: Write the light ticker**

Create `client/src/components/shabbat/LightTicker.jsx`:

```jsx
// The dark board's Ticker with the light palette and no negative margin: this one is a direct
// child of an unpadded root, so it is already full-bleed and has nothing to bleed past.
// Same contract, same doubling, same '  •  ' spacing, same empty-list behaviour.
const LightTicker = ({ items }) => {
  if (!items.length) return null;
  const text = `${items.map((it) => it.text).join('  •  ')}  •  `;

  return (
    <div
      style={{
        height: '52px',
        flex: 'none',
        background: 'linear-gradient(90deg,#dfe8f2,#f2f6fb,#dfe8f2)',
        borderTop: '1px solid rgba(200,168,105,0.65)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{ whiteSpace: 'nowrap', fontSize: '23px', fontWeight: 600, color: '#274866', animation: 'omTicker 48s linear infinite' }}>
        {text + text}
      </div>
    </div>
  );
};

export default LightTicker;
```

- [ ] **Step 6: Write the canvas**

Create `client/src/pages/ShabbatDisplay.jsx`:

```jsx
import { useState, useEffect } from 'react';
import Masthead from '../components/shabbat/Masthead';
import LightTicker from '../components/shabbat/LightTicker';
import { C } from '../components/shabbat/shabbatStyle';
import useDisplayModel from '../hooks/useDisplayModel';

// The שבת wall board: the same fixed 1920x1080 canvas the dark board uses, scaled to whatever
// screen it is on, in a light palette built for Friday afternoon through Saturday night.
//
// Mounted only by pages/TvDisplay.jsx. `/` on a desktop and `/` on a phone keep the dark board
// in every hour of the week — this layout is a /tv decision, not a viewport one.
//
// It calls useDisplayModel('shabbat') rather than useDisplayModel(): it IS the שבת board, so
// asking it to resolve חול prayers would be incoherent, and the ?screen=shabbat preview would
// otherwise post weekday times under שבת headings on any day but Saturday.
const ShabbatDisplay = ({ safeArea = { x: 0, y: 0 } }) => {
  const [scale, setScale] = useState(1);
  const { clock, hebDate, greg, ticker, haftara, parasha } = useDisplayModel('shabbat');

  // Identical to the dark board's fit, including the safe-area inset for TVs that crop their
  // own edges — see pages/TvDisplay.jsx. Depends on the two numbers rather than the object so
  // an inline literal does not re-subscribe on every render.
  const { x: safeX, y: safeY } = safeArea;
  useEffect(() => {
    const fit = () =>
      setScale(
        Math.min(
          (window.innerWidth * (1 - 2 * safeX)) / 1920,
          (window.innerHeight * (1 - 2 * safeY)) / 1080
        )
      );
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [safeX, safeY]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: C.pageFlat }}>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '1920px',
          height: '1080px',
          transform: `translate(-50%,-50%) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <div
          dir="rtl"
          style={{
            position: 'absolute',
            inset: 0,
            fontFamily: "'Assistant',sans-serif",
            color: C.ink,
            background: C.page,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Masthead hebDate={hebDate} greg={greg} clock={clock} parasha={parasha || 'שַׁבַּת קֹדֶשׁ'} haftara={haftara} />

          {/* The tallit band: three woven stripes under the masthead. Purely decorative, and the
              one element on the board that carries no data at all. */}
          <div
            style={{
              flex: 'none',
              height: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '2px',
              padding: '0 46px',
              background: '#ffffff',
              borderBottom: '1px solid rgba(90,125,160,0.22)',
            }}
          >
            <div style={{ height: '4px', background: C.navy }} />
            <div style={{ height: '2px', background: C.navy }} />
            <div style={{ height: '4px', background: C.navy }} />
          </div>

          {/* Panels land here in Tasks 6-9. */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '18px', padding: '20px 46px 0', minHeight: 0 }} />

          <LightTicker items={ticker} />
        </div>
      </div>
    </div>
  );
};

export default ShabbatDisplay;
```

- [ ] **Step 7: Wire the preview route**

Replace the body of `client/src/pages/TvDisplay.jsx` below the `TV_SAFE_AREA` constant, keeping every existing comment above it intact:

```jsx
// A typed URL can pin the board: /tv?screen=shabbat, /tv?screen=weekday. Read once, at mount.
//
// Not the חול/שבת toggle coming back through a side door. Reaching it takes a keyboard, so a
// remote cannot arrive here by accident, and a reload of the plain /tv address always restores
// the schedule — the toggle's override, by contrast, outlived the segment it was cast in.
// It is how this layout gets reviewed on a Tuesday.
const previewScreen = () => {
  const value = new URLSearchParams(window.location.search).get('screen');
  return value === 'shabbat' || value === 'weekday' ? value : null;
};

const TvDisplay = () => {
  const screen = previewScreen();
  return (
    <div data-tv>
      {/* The box's screensaver takes the screen after a few minutes and its firmware offers no
          "never", so the page has to hold the screen itself. Mounted only here: this is the
          one import site, which is what keeps the wake lock off every other route. */}
      <KeepAwake />
      {/* Nothing else ever reloads this page, so a deploy would never reach the TV — and
          KeepAwake removes the sleep/wake cycles that used to do it by accident. Same one
          import site rule: a phone must never reload under the reader. */}
      <NightlyReload />
      {screen === 'shabbat' ? (
        <ShabbatDisplay safeArea={TV_SAFE_AREA} />
      ) : (
        <SynagogueDisplay safeArea={TV_SAFE_AREA} />
      )}
    </div>
  );
};
```

and add the import at the top, beside the `SynagogueDisplay` one:

```jsx
import ShabbatDisplay from './ShabbatDisplay';
```

- [ ] **Step 8: Look at it**

```bash
npm run dev
```

Open `http://localhost:5173/tv?screen=shabbat`. Expected: a light page, the dark masthead with a slow gold glow behind it, two flickering candles, today's Hebrew and Gregorian dates, a ticking clock, this week's parasha, the haftara line at the left, three navy stripes, a wide empty middle, and the ticker scrolling at the bottom.

Then open `http://localhost:5173/tv` with no query. Expected: the dark board, exactly as before.

- [ ] **Step 9: Commit**

```bash
git add client/src/components/shabbat client/src/pages/ShabbatDisplay.jsx client/src/pages/TvDisplay.jsx client/src/index.css
git commit -m "feat: the שבת board's canvas, masthead and ticker, behind ?screen=shabbat"
```

---

### Task 6: The three cards across the top

**Files:**
- Create: `client/src/components/shabbat/EdgeCards.jsx`
- Modify: `client/src/pages/ShabbatDisplay.jsx`

**Interfaces:**
- Consumes: `shabbatCards` and `next` from `useDisplayModel` (Task 4); `CARD`, `DEEP_CARD`, `C`, `SERIF` (Task 5); `TwinCandles`, `HavdalahSet` (Task 5).
- Produces: `CandleCard({ candles, sunset })`, `NextPrayerCard({ next })`, `HavdalahCard({ tzeit, tzeitRT })`, all named exports.

- [ ] **Step 1: Write the cards**

Create `client/src/components/shabbat/EdgeCards.jsx`:

```jsx
import { C, CARD, DEEP_CARD, SERIF } from './shabbatStyle';
import { TwinCandles, HavdalahSet } from './icons';

// The three cards across the top of the שבת board. They share a row, a height and a visual
// weight, so they share a file — and the two white ones share a shape that would otherwise be
// copied twice.
//
// Every time here may be null, which renders '--:--'. That is deliberate and matches the rest
// of the display: a failed Hebcal leg blanks its own row and leaves the others alone.
const clock = (t) => t || '--:--';

const EdgeShell = ({ icon, title, children }) => (
  <div style={{ ...CARD, padding: '14px 22px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {icon}
      <div style={{ fontSize: '24px', fontWeight: 700, color: C.goldDeep, letterSpacing: '3px' }}>{title}</div>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginTop: '2px' }}>{children}</div>
  </div>
);

const Big = ({ children }) => (
  <div style={{ fontSize: '38px', fontWeight: 800, color: C.navy, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
    {children}
  </div>
);

const Sub = ({ children }) => (
  <div style={{ fontFamily: SERIF, fontSize: '23px', fontWeight: 700, color: C.navySoft }}>{children}</div>
);

// `sunset` is FRIDAY's, on Saturday as much as on Friday — see shabbatFriday in displayData.js.
// The card is a statement about the Shabbat being kept, not a countdown.
export const CandleCard = ({ candles, sunset }) => (
  <EdgeShell icon={<TwinCandles />} title="הַדְלָקַת נֵרוֹת">
    <Big>{clock(candles)}</Big>
    <Sub>שקיעת החמה {clock(sunset)}</Sub>
  </EdgeShell>
);

// `tzeit` is Saturday's שקיעה + 18, the same reckoning the זמנים grid uses. `tzeitRT` is
// Saturday's צאת ר״ת, read straight off Hebcal.
export const HavdalahCard = ({ tzeit, tzeitRT }) => (
  <EdgeShell icon={<HavdalahSet />} title="מוֹצָאֵי שַׁבָּת">
    <Big>{clock(tzeit)}</Big>
    <Sub>הבדלה · ר״ת {clock(tzeitRT)}</Sub>
  </EdgeShell>
);

// The one card on this row that changes every second. `next` comes from computeNextMinyan over
// the שבת list, so on Friday it names קבלת שבת and on Saturday afternoon it names מנחה — the
// `day` tag on each SHABBAT_PRAYERS row is what keeps it from offering Friday's candle lighting
// to a hall sitting in shul on Saturday morning.
export const NextPrayerCard = ({ next }) => (
  <div style={{ ...DEEP_CARD, padding: '12px 24px', textAlign: 'center' }}>
    <div style={{ fontSize: '24px', fontWeight: 700, color: C.goldLight, letterSpacing: '4px' }}>הַתְּפִלָּה הַבָּאָה</div>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '24px', marginTop: '2px' }}>
      <div style={{ fontFamily: SERIF, fontSize: '25px', fontWeight: 700, color: C.onDeepBright }}>{next.name}</div>
      <div style={{ fontSize: '54px', fontWeight: 800, color: C.onDeep, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05 }}>
        {next.time}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: C.goldLight, fontVariantNumeric: 'tabular-nums' }}>
        בעוד {next.countdown}
      </div>
    </div>
  </div>
);
```

- [ ] **Step 2: Mount them**

In `client/src/pages/ShabbatDisplay.jsx`, add to the imports:

```jsx
import { CandleCard, NextPrayerCard, HavdalahCard } from '../components/shabbat/EdgeCards';
```

extend the destructure from `useDisplayModel('shabbat')` with `shabbatCards` and `next`, and replace the empty panel container with:

```jsx
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '18px', padding: '20px 46px 0', minHeight: 0 }}>
            {/* Under dir=rtl the first column is the rightmost: נרות right, מניין הבא centre,
                מוצאי שבת left — the two ends of Shabbat flanking the thing happening next. */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr', gap: '20px', flex: 'none' }}>
              <CandleCard candles={shabbatCards.candles} sunset={shabbatCards.fridaySunset} />
              <NextPrayerCard next={next} />
              <HavdalahCard tzeit={shabbatCards.tzeit} tzeitRT={shabbatCards.tzeitRT} />
            </div>

            {/* Panels land here in Tasks 7-9. */}
            <div style={{ flex: 1, minHeight: 0 }} />
          </div>
```

- [ ] **Step 3: Look at it**

```bash
npm run dev
```

Open `http://localhost:5173/tv?screen=shabbat`. Expected: three cards under the tallit band. הדלקת נרות carries a real time and a שקיעה about twenty minutes later. הַתְּפִלָּה הַבָּאָה names a שבת prayer and its countdown ticks every second. מוצאי שבת carries צאת and ר״ת, roughly fifty minutes apart.

- [ ] **Step 4: Cross-check the two sources of צאת הכוכבים**

Open `http://localhost:5173/` in a second tab and read the צאת הכוכבים row in the dark board's זמנים panel. On **Saturday** the two must be identical. On any other day they differ, because the dark panel posts today's and the card posts Saturday's — confirm the difference is a minute or two per day of separation, not twenty-two minutes, which would mean the card is reading a Hebcal tzeit field.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/shabbat/EdgeCards.jsx client/src/pages/ShabbatDisplay.jsx
git commit -m "feat: candle lighting, next prayer and havdalah cards on the שבת board"
```

---

### Task 7: The prayer columns — ערב שבת and יום השבת

**Files:**
- Create: `client/src/components/shabbat/PrayerListCard.jsx`
- Modify: `client/src/pages/ShabbatDisplay.jsx`

**Interfaces:**
- Consumes: `prayers` from `useDisplayModel('shabbat')` — an array of `{ name, time, clock, day }` resolved from `SHABBAT_PRAYERS`; `CARD`, `C`, `SERIF`; `Rosette`.
- Produces: `<PrayerListCard title sub rows />` (default export) where `rows` is `[{ name, time }]`.

- [ ] **Step 1: Write the card**

Create `client/src/components/shabbat/PrayerListCard.jsx`:

```jsx
import { C, CARD, SERIF } from './shabbatStyle';
import { Rosette } from './icons';

// One component, mounted twice: ערב שבת and יום השבת. The two lists differ only in their rows
// and their headings, and a second component would be the same forty lines with two strings
// changed — which is exactly how the two lists would drift apart.
//
// Three rows carry the weight of the whole board: the moment Shabbat is accepted and the moment
// it is released. They are picked out by name rather than by a flag on the data, because the
// data is SHABBAT_PRAYERS and adding a presentation flag there would push a styling decision
// into the schedule.
const EMPHASIS = /הדלקת נרות|קבלת שבת|ערבית מוצ״ש/;

const PrayerListCard = ({ title, sub, rows }) => (
  <div style={{ ...CARD, padding: '14px 24px' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: '29px', color: C.navy }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: 600, color: C.steel, letterSpacing: '2px' }}>{sub}</div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '7px 0 3px' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(200,168,105,0.75))' }} />
      <Rosette />
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(270deg,transparent,rgba(200,168,105,0.75))' }} />
    </div>

    {/* grid-auto-rows:1fr spreads however many rows there are over the card's height, so the
        one-row ערב שבת card and the three-row יום השבת card both fill their box. */}
    <div style={{ display: 'grid', gridAutoRows: '1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {rows.map((p) => {
        const strong = EMPHASIS.test(p.name);
        const color = strong ? C.navy : C.inkSoft;
        return (
          <div
            key={p.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 6px',
              minHeight: 0,
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <div style={{ fontSize: '25px', fontWeight: strong ? 800 : 600, color, lineHeight: 1.1 }}>{p.name}</div>
            <div style={{ fontSize: '27px', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
              {p.time}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default PrayerListCard;
```

- [ ] **Step 2: Mount both**

In `client/src/pages/ShabbatDisplay.jsx`, add the import:

```jsx
import PrayerListCard from '../components/shabbat/PrayerListCard';
```

extend the destructure with `prayers`, and add above the `return` (after the fit effect):

```jsx
  // The שבת list spans two days and each row is already tagged with the day it happens on —
  // `day` exists because computeNextMinyan needs it, and the two cards get it for free.
  //
  // הדלקת נרות is filtered out of ערב שבת because it has its own card above. That leaves one
  // row there, which is the layout the design calls for: a duplicated time and an over-full
  // card are both worse than a card with room in it.
  const erev = prayers.filter((p) => p.day === 5 && p.name !== 'הדלקת נרות');
  const yom = prayers.filter((p) => p.day === 6);
```

then replace the `{/* Panels land here in Tasks 7-9. */}` filler with:

```jsx
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr', gap: '20px', minHeight: 0, paddingBottom: '4px' }}>
              <div style={{ display: 'grid', gridTemplateRows: '0.8fr 1.2fr', gap: '20px', minHeight: 0 }}>
                <PrayerListCard title="עֶרֶב שַׁבָּת" sub="יום שישי · קבלת שבת" rows={erev} />
                <PrayerListCard title="יוֹם הַשַּׁבָּת" sub="שחרית · מנחה · ערבית" rows={yom} />
              </div>

              {/* Middle column — Task 8. */}
              <div style={{ minHeight: 0 }} />

              {/* Left column — Task 9. */}
              <div style={{ minHeight: 0 }} />
            </div>
```

- [ ] **Step 3: Look at it**

```bash
npm run dev
```

Open `http://localhost:5173/tv?screen=shabbat`. Expected: the rightmost column now holds two white cards. ערב שבת carries **one** row — מנחה וקבלת שבת, in heavy navy. יום השבת carries three — שחרית, מנחה, and ערבית מוצ״ש with the last in heavy navy. No הדלקת נרות row anywhere in either card.

- [ ] **Step 4: Cross-check against the dark board**

Open `http://localhost:5173/tv?screen=weekday` and press the שבת chip in its top bar. The five rows it lists must be the same five times: הדלקת נרות on the candle card, מנחה וקבלת שבת in ערב שבת, and the three in יום השבת. A mismatch means the two boards are resolving different schedules, which is the failure `forceScreen` exists to prevent.

(Task 10 later removes the חול/שבת chips from `/tv` itself, so once this whole plan is complete this exact click is no longer available there. The equivalent cross-check at that point is done from `/` on a desktop, which keeps both chips — see Task 10 Step 6.)

- [ ] **Step 5: Confirm a pinned time reaches both places it shows**

In `/adminGabbai/settings`, pin הדלקת נרות to a time clearly different from the computed one — say `18:00`. Within 30 seconds:

- the candle card's big number becomes `18:00`;
- the שקיעה printed beside it does **not** move, because it is Friday's real sunset and not a derivation of the pinned number — this is the whole reason Friday's zmanim are fetched;
- מנחה וקבלת שבת in the ערב שבת card moves with the pin, because `resolveShabbatTimes` chains קבלת שבת off whatever הדלקת נרות actually says.

Clear the pin and confirm all three return to their computed values.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/shabbat/PrayerListCard.jsx client/src/pages/ShabbatDisplay.jsx
git commit -m "feat: ערב שבת and יום השבת prayer cards on the שבת board"
```

---

### Task 8: זמנים and שיעורים

**Files:**
- Create: `client/src/components/shabbat/ZmanimGrid.jsx`
- Create: `client/src/components/shabbat/ShiurimCard.jsx`
- Modify: `client/src/pages/ShabbatDisplay.jsx`

**Interfaces:**
- Consumes: `zmanimRows` (`[{ id, name, time }]`) and `shiurim` (`[{ id, name, time, by }]`) from the model; `CARD`, `C`, `SERIF`.
- Produces: `<ZmanimGrid rows />` and `<ShiurimCard shiurim />`, both default exports.

- [ ] **Step 1: Write the shared heading, the grid and the shiurim card**

Create `client/src/components/shabbat/ZmanimGrid.jsx`:

```jsx
import { C, CARD, SERIF } from './shabbatStyle';

// The diamond-flanked heading the two cards in this column share. Exported because ShiurimCard
// uses it too and a second copy would be the place they drift apart.
export const DiamondHeading = ({ children }) => (
  <>
    <div style={{ textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: '28px', color: C.navy }}>{children}</div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '6px 0 2px' }}>
      <div style={{ width: '56px', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(200,168,105,0.8))' }} />
      <div style={{ width: '7px', height: '7px', transform: 'rotate(45deg)', background: C.gold }} />
      <div style={{ width: '56px', height: '1px', background: 'linear-gradient(270deg,transparent,rgba(200,168,105,0.8))' }} />
    </div>
  </>
);

// Titled זְמַנֵּי הַיּוֹם and not זמני השבת, and the difference is not cosmetic: these are TODAY's
// zmanim, and the board is up from Friday morning. Calling Friday's סוף זמן קריאת שמע "שבת's"
// would be wrong for the first fifteen hours of every run.
//
// The ten rows are ZMANIM_ROWS, unchanged — shared with the dark board and the phone, so the
// three can never post a different זמנים table.
const ZmanimGrid = ({ rows }) => (
  <div style={{ ...CARD, padding: '14px 24px' }}>
    <DiamondHeading>זְמַנֵּי הַיּוֹם</DiamondHeading>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridAutoRows: '1fr',
        gap: '0 20px',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {rows.map((z) => (
        <div
          key={z.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 4px',
            minHeight: 0,
            borderBottom: `1px solid ${C.line}`,
          }}
        >
          <div style={{ fontSize: '21px', lineHeight: 1.1, color: C.inkSoft }}>{z.name}</div>
          <div style={{ fontSize: '22px', lineHeight: 1.1, fontWeight: 700, color: C.goldDeep, fontVariantNumeric: 'tabular-nums' }}>
            {z.time}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ZmanimGrid;
```

Create `client/src/components/shabbat/ShiurimCard.jsx`:

```jsx
import { C, CARD } from './shabbatStyle';
import { DiamondHeading } from './ZmanimGrid';

// The same שיעורים list the dark board shows, edited in /adminGabbai. There is one list, not a
// weekday one and a Shabbat one, so this heading is a heading and not a filter.
const ShiurimCard = ({ shiurim }) => (
  <div style={{ ...CARD, padding: '14px 24px' }}>
    <DiamondHeading>שִׁעוּרִים בְּשַׁבָּת</DiamondHeading>
    <div style={{ display: 'grid', gridAutoRows: '1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {shiurim.map((s) => (
        <div
          key={s.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '0 6px',
            minHeight: 0,
            borderBottom: `1px solid ${C.line}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '26px', fontWeight: 600, color: C.inkSoft, lineHeight: 1 }}>{s.name}</div>
            <div style={{ fontSize: '20px', color: C.muted, lineHeight: 1 }}>{s.by}</div>
          </div>
          <div style={{ fontSize: '29px', fontWeight: 700, color: C.goldDeep, fontVariantNumeric: 'tabular-nums', flex: 'none' }}>
            {s.time}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ShiurimCard;
```

- [ ] **Step 2: Mount them**

In `client/src/pages/ShabbatDisplay.jsx`, add:

```jsx
import ZmanimGrid from '../components/shabbat/ZmanimGrid';
import ShiurimCard from '../components/shabbat/ShiurimCard';
```

extend the destructure with `zmanimRows` and `shiurim`, and replace the `{/* Middle column — Task 8. */}` filler div with:

```jsx
              <div style={{ display: 'grid', gridTemplateRows: '0.72fr 1.28fr', gap: '20px', minHeight: 0 }}>
                <ZmanimGrid rows={zmanimRows} />
                <ShiurimCard shiurim={shiurim} />
              </div>
```

- [ ] **Step 3: Look at it**

```bash
npm run dev
```

Open `http://localhost:5173/tv?screen=shabbat`. Expected: the middle column holds the ten zmanim in two columns of five, and the שיעורים list under it. Every zman carries a time, not `--:--`.

- [ ] **Step 4: Cross-check the two boards' זמנים**

Open `http://localhost:5173/` beside it. Every one of the ten rows must read identically — same names, same order, same times. They come from the same `zmanimRows`, so any difference is a rendering bug in one of the two.

- [ ] **Step 5: Confirm the שיעורים list is live**

In `/adminGabbai`, hide one שיעור. Within 30 seconds it must disappear from both boards, and the remaining rows must redistribute over the card's height rather than leaving a gap.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/shabbat/ZmanimGrid.jsx client/src/components/shabbat/ShiurimCard.jsx client/src/pages/ShabbatDisplay.jsx
git commit -m "feat: זמנים grid and שיעורים card on the שבת board"
```

---

### Task 9: מזל טוב, מן הפרשה, and the announcements

The third column, and the first time the curated table reaches a screen.

**Files:**
- Create: `client/src/components/shabbat/MazalCard.jsx`
- Create: `client/src/components/shabbat/ParashaVerseCard.jsx`
- Create: `client/src/components/shabbat/AnnouncementsCard.jsx`
- Modify: `client/src/pages/ShabbatDisplay.jsx`

**Interfaces:**
- Consumes: `maz` (`{ names, occasion }` or `{}`), `pasuk` (`{ text, ref }` or `null`), `ann` (`{ text }` or `null`), and `tick` from the model; `CARD`, `DEEP_CARD`, `C`, `SERIF`; `SeferTorah`, `Rosette`.
- Produces: `<MazalCard maz rotationKey />`, `<ParashaVerseCard pasuk rotationKey />`, `<AnnouncementsCard ann rotationKey />`, all default exports.

- [ ] **Step 1: Write the three cards**

Create `client/src/components/shabbat/MazalCard.jsx`:

```jsx
import { C, SERIF } from './shabbatStyle';

// `rotationKey` is the model's `tick`. Changing it remounts the inner div, which replays the
// fade — the same trick every rotating panel on the dark board uses, and the reason this board
// needs one `omFade` keyframe rather than the mock's alternating pair.
const MazalCard = ({ maz, rotationKey }) => (
  <div
    style={{
      background: 'linear-gradient(180deg,#e9f0f8,#dbe7f3)',
      border: '1px solid rgba(200,168,105,0.55)',
      borderRadius: '18px',
      padding: '14px 24px',
      textAlign: 'center',
    }}
  >
    <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: '25px', color: C.navy }}>שְׂמָחוֹת וּמַזָּל טוֹב</div>
    <div style={{ width: '54px', height: '1px', background: 'rgba(200,168,105,0.85)', margin: '6px auto 0' }} />
    <div key={rotationKey} style={{ animation: 'omFade .7s ease', marginTop: '6px' }}>
      <div style={{ fontFamily: SERIF, fontSize: '27px', fontWeight: 700, color: C.navy, lineHeight: 1.25 }}>{maz.names}</div>
      <div style={{ fontSize: '20px', fontWeight: 600, color: C.goldDeep, marginTop: '4px' }}>{maz.occasion}</div>
    </div>
  </div>
);

export default MazalCard;
```

Create `client/src/components/shabbat/ParashaVerseCard.jsx`:

```jsx
import { C, DEEP_CARD, SERIF } from './shabbatStyle';
import { SeferTorah } from './icons';

// מן הפרשה. The verses come from client/src/components/display/parashaHighlights.js, keyed on
// the parasha Hebcal already reports — nobody types anything and nobody maintains a schedule.
//
// `pasuk` is null only if a table entry somehow carries no pesukim; the lookup itself always
// returns an entry, falling back to generic Shabbat verses when the week has no parasha at all.
// The card renders empty rather than crashing in that case.
const ParashaVerseCard = ({ pasuk, rotationKey }) => (
  <div style={{ ...DEEP_CARD, padding: '16px 24px', textAlign: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <SeferTorah />
      <div style={{ fontSize: '24px', fontWeight: 700, color: C.goldLight, letterSpacing: '5px' }}>מִן הַפָּרָשָׁה</div>
    </div>
    <div key={rotationKey} style={{ animation: 'omFade .9s ease', marginTop: '8px' }}>
      <div style={{ fontFamily: SERIF, fontSize: '29px', fontWeight: 700, color: C.onDeep, lineHeight: 1.4 }}>
        {pasuk?.text || ''}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 600, color: C.goldLight, marginTop: '6px' }}>{pasuk?.ref || ''}</div>
    </div>
  </div>
);

export default ParashaVerseCard;
```

Create `client/src/components/shabbat/AnnouncementsCard.jsx`:

```jsx
import { C, CARD, SERIF } from './shabbatStyle';
import { Rosette } from './icons';

// whiteSpace:'pre-line' because the gabbai's announcements carry their own line breaks — the
// dark board's AnnouncementsPanel does the same, and dropping it would run two lines together.
const AnnouncementsCard = ({ ann, rotationKey }) => (
  <div style={{ ...CARD, padding: '14px 24px' }}>
    <div style={{ textAlign: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: '25px', color: C.navy }}>
      הוֹדָעוֹת הַקְּהִלָּה
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '6px 0 0' }}>
      <div style={{ width: '56px', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(200,168,105,0.8))' }} />
      <Rosette />
      <div style={{ width: '56px', height: '1px', background: 'linear-gradient(270deg,transparent,rgba(200,168,105,0.8))' }} />
    </div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden' }}>
      <div
        key={rotationKey}
        style={{
          animation: 'omFade .8s ease',
          fontSize: '25px',
          fontWeight: 600,
          lineHeight: 1.45,
          textAlign: 'center',
          whiteSpace: 'pre-line',
          color: C.ink,
          textWrap: 'pretty',
        }}
      >
        {ann?.text || ''}
      </div>
    </div>
  </div>
);

export default AnnouncementsCard;
```

- [ ] **Step 2: Mount the column**

In `client/src/pages/ShabbatDisplay.jsx`, add:

```jsx
import MazalCard from '../components/shabbat/MazalCard';
import ParashaVerseCard from '../components/shabbat/ParashaVerseCard';
import AnnouncementsCard from '../components/shabbat/AnnouncementsCard';
```

extend the destructure with `maz`, `pasuk`, `ann` and `tick`, and replace the `{/* Left column — Task 9. */}` filler div with:

```jsx
              <div style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: '20px', minHeight: 0 }}>
                <MazalCard maz={maz} rotationKey={tick} />
                <ParashaVerseCard pasuk={pasuk} rotationKey={tick} />
                <AnnouncementsCard ann={ann} rotationKey={tick} />
              </div>
```

- [ ] **Step 3: Look at it**

```bash
npm run dev
```

Open `http://localhost:5173/tv?screen=shabbat`. Expected: the board is complete. The leftmost column holds מזל טוב, a dark מן הפרשה card, and the announcements. All three fade together every 6.5 seconds — that shared beat is intended, and it is what the single `tick` counter buys.

- [ ] **Step 4: Check the verses are this week's**

Read the parasha in the masthead, then read the three verses as they rotate. They must be from that parasha, and their Hebrew references must name a book that parasha is in. If they are generic Shabbat verses, the lookup fell through — check what `parasha` actually holds in the React DevTools, and whether that key is in the table.

- [ ] **Step 5: Check the fallback renders**

Temporarily pass a nonsense parasha by editing the `parashaHighlights(parasha)` call in `useDisplayModel.js` to `parashaHighlights('פרשת שאין־כזו')`. Expected: the card shows the generic Shabbat verses and the masthead's haftara line disappears entirely — no empty line, no `undefined`. **Revert the edit.**

- [ ] **Step 6: Commit**

```bash
git add client/src/components/shabbat/MazalCard.jsx client/src/components/shabbat/ParashaVerseCard.jsx client/src/components/shabbat/AnnouncementsCard.jsx client/src/pages/ShabbatDisplay.jsx
git commit -m "feat: מזל טוב, מן הפרשה and announcements on the שבת board"
```

---

### Task 10: Hand the board to the calendar

The preview query has carried the board through five tasks. This task gives it to the schedule and takes the toggle off `/tv`.

**Files:**
- Create: `client/src/hooks/useScheduledScreen.js`
- Modify: `client/src/components/display/TopBar.jsx`
- Modify: `client/src/pages/TvDisplay.jsx`

**Interfaces:**
- Consumes: `screenSegment(now)` from `displayData.js`; `ShabbatDisplay` and the preview reader from Task 5.
- Produces: `useScheduledScreen(): 'weekday' | 'shabbat'` (default export).

- [ ] **Step 1: Write the hook**

Create `client/src/hooks/useScheduledScreen.js`:

```js
import { useEffect, useState } from 'react';
import { screenSegment } from '../components/display/displayData';

// 30 seconds, not one. This drives a whole-page layout swap at Friday 09:00 and at Saturday
// midnight, and being up to half a minute late at either is invisible in a room. The one-second
// tick inside useDisplayModel exists because a clock renders seconds; nothing here does.
const SAMPLE_MS = 30000;

// Which board /tv should be showing, on Israel's calendar. Nothing else: no fetching, no
// content, no rotation.
//
// Deliberately not `useDisplayModel().screen`. That hook owns six network legs, four timers and
// the rotation counters, and a second instance of it mounted purely to read one string would
// double all of it for the life of the page — a page that stays open for weeks.
//
// The cost of keeping them separate is that the two boards unmount and remount at the boundary,
// so useDisplayModel re-fetches and the rotations restart. That happens twice a week on a screen
// that already reloads itself nightly (components/NightlyReload.jsx).
export default function useScheduledScreen() {
  const [screen, setScreen] = useState(() => screenSegment(new Date()).screen);

  useEffect(() => {
    const id = setInterval(() => setScreen(screenSegment(new Date()).screen), SAMPLE_MS);
    return () => clearInterval(id);
  }, []);

  return screen;
}
```

- [ ] **Step 2: Make the toggle optional**

In `client/src/components/display/TopBar.jsx`, change the signature and wrap the chips. Replace:

```jsx
const TopBar = ({ weekday, hebDate, greg, parasha, screen, onSetChol, onSetShab }) => {
```

with:

```jsx
// `showToggle` is false on /tv. The חול/שבת override outlives the segment it was cast in, so on
// a TV — whose only input is a remote and whose שבת board has no chips of its own — pressing שבת
// on a Wednesday would strand the screen on a board with no way back until Sunday 00:00. /tv is
// schedule-driven end to end instead; `/` on a desktop keeps both chips.
const TopBar = ({ weekday, hebDate, greg, parasha, screen, onSetChol, onSetShab, showToggle = true }) => {
```

and replace the chip row:

```jsx
        <div style={{ display: 'flex', gap: '10px' }}>
          <div role="button" tabIndex={0} onClick={onSetChol} onKeyDown={activate(onSetChol)} style={isShab ? TOGGLE_IDLE : TOGGLE_ACTIVE}>חול</div>
          <div role="button" tabIndex={0} onClick={onSetShab} onKeyDown={activate(onSetShab)} style={isShab ? TOGGLE_ACTIVE : TOGGLE_IDLE}>שבת</div>
        </div>
```

with:

```jsx
        {showToggle && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <div role="button" tabIndex={0} onClick={onSetChol} onKeyDown={activate(onSetChol)} style={isShab ? TOGGLE_IDLE : TOGGLE_ACTIVE}>חול</div>
            <div role="button" tabIndex={0} onClick={onSetShab} onKeyDown={activate(onSetShab)} style={isShab ? TOGGLE_ACTIVE : TOGGLE_IDLE}>שבת</div>
          </div>
        )}
```

- [ ] **Step 3: Thread it through the dark board**

In `client/src/pages/SynagogueDisplay.jsx`, change the signature (line 21):

```jsx
const SynagogueDisplay = ({ safeArea = { x: 0, y: 0 }, showToggle = true }) => {
```

and add the prop to the `TopBar` element (line 91):

```jsx
          <TopBar
            weekday={weekday}
            hebDate={hebDate}
            greg={greg}
            parasha={parasha}
            screen={screen}
            showToggle={showToggle}
            onSetChol={() => setScreen('weekday')}
            onSetShab={() => setScreen('shabbat')}
          />
```

`/` renders `<SynagogueDisplay />` with no props, so it keeps both chips.

- [ ] **Step 4: Give the choice to the schedule**

In `client/src/pages/TvDisplay.jsx`, add the import:

```jsx
import useScheduledScreen from '../hooks/useScheduledScreen';
```

and replace the one line inside `TvDisplay`:

```jsx
  const screen = previewScreen();
```

with:

```jsx
  // The query wins when it is present, and it can only be present if someone typed it.
  const scheduled = useScheduledScreen();
  const screen = previewScreen() || scheduled;
```

and add `showToggle={false}` to the `SynagogueDisplay` element:

```jsx
        <SynagogueDisplay safeArea={TV_SAFE_AREA} showToggle={false} />
```

- [ ] **Step 5: Verify the switch, without waiting for Friday**

The board choice is a pure function of the clock, so the check is against `screenSegment`, and Task 1 already pins that. What is left to prove is the wiring. In PowerShell:

```powershell
$env:TZ = 'Pacific/Auckland'; npm --prefix client test; Remove-Item Env:\TZ
```

Expected: green — the schedule still reads Israel's calendar under a hostile device timezone.

Then, in the browser, temporarily force the hook by editing `useScheduledScreen.js` to `return 'shabbat';` as its first line. Open `http://localhost:5173/tv` **with no query**: the light board. Change it to `return 'weekday';`: the dark board, with **no** חול/שבת chips. **Revert both edits.**

- [ ] **Step 6: Verify nothing else lost its toggle**

Open `http://localhost:5173/` on a desktop viewport. Expected: the dark board **with** both chips, and pressing שבת still swaps the prayer list as it always has. This is the one behaviour Step 2 could have broken everywhere instead of only on `/tv`.

- [ ] **Step 7: Full sweep**

```bash
npm test
npm --prefix client run lint
```

Expected: every test green; lint clean. Then walk the six routes once each — `/`, `/` narrow, `/tv`, `/tv?screen=shabbat`, `/tv?screen=weekday`, `/zmanim` — with the browser console open, and confirm none of them logs an error.

- [ ] **Step 8: Commit**

```bash
git add client/src/hooks/useScheduledScreen.js client/src/components/display/TopBar.jsx client/src/pages/SynagogueDisplay.jsx client/src/pages/TvDisplay.jsx
git commit -m "feat: switch /tv to the שבת board on the calendar, and drop its toggle"
```

---

## After the plan

Two things this plan deliberately leaves for a human:

1. **Proofread the haftarot.** Fifty-four lines, ספרד custom, in `scripts/parashaCuration.mjs` and rendered into the masthead. No test can establish they are right.
2. **Watch one real transition.** The first Friday after deploy, at 09:00 Israel time, on the actual TV — the one thing every check above approximates.
