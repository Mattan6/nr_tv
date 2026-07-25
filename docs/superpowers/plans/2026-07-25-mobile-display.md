# Mobile Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve a phone layout from `/`, showing exactly the panels, labels and numbers the wall display already shows, with פרנס היום replaced by בדיחות ליאור.

**Architecture:** The clock / zmanim / prayers / rotation logic is extracted out of `pages/SynagogueDisplay.jsx` into one hook, `useDisplayModel`. Both layouts consume it, so neither can post a different time from the other. `/` then picks a layout from a media query — the existing 1920×1080 wall canvas above the breakpoint, a new scrolling column below it.

**Tech Stack:** React 19 + Vite 7, react-router-dom 7, inline styles (Tailwind is non-functional in this repo — v3 directives against a v4 install; see `adminStyles.js`). No new dependencies.

## Global Constraints

- **No new npm dependencies.** `matchMedia` is a browser built-in.
- **Inline styles only.** Do not reach for Tailwind utility classes in new display or mobile components.
- **All Hebrew copy is literal and must match the wall exactly**, in particular the panel titles `הודעות`, `זמני תפילות`, `שיעורי תורה`, `שמחות ומזל טוב`, `לעילוי נשמת`, `זמני היום`, `בדיחות ליאור`, `המניין הבא`, and the jokes fallback `אין בדיחות להצגה כרגע`.
- **The slot the mock calls פרנס היום is בדיחות ליאור.** There is no פרנס היום anywhere in this codebase any more (removed 2026-07-24) and none is to be reintroduced.
- **No behavior change on the wall.** Task 1 is a pure extraction; if `/` at 1920×1080 renders differently afterwards, that is a bug, not a refactor.
- **Never invent a time.** A missing value renders `--:--`, as `resolvePrayers` and the zmanim rows already do.
- **`index.css` stays untouched.** `body`/`#root` keep `overflow: hidden` for the TV; the mobile page scrolls inside itself.
- **The server and `/adminGabbai` are not modified by this plan.**
- Existing server tests must keep passing: `npm --prefix server test`.

## No client test runner

`client/package.json` has `dev`, `build`, `lint`, `preview` — no vitest, no jest, no testing-library. Adding one is out of scope (see the spec). So the per-task cycle is **lint → build → look at it**, not red/green. Every task below ends with:

```bash
npm --prefix client run lint && npm --prefix client run build
```

and both must be clean before committing.

---

### Task 1: Extract `useDisplayModel`

The whole point of the feature: one source for every number both layouts show.

**Files:**
- Create: `client/src/hooks/useDisplayModel.js`
- Modify: `client/src/pages/SynagogueDisplay.jsx` (drops lines 1–197 of logic, keeps the JSX)
- Modify: `client/src/components/display/displayData.js` (add `id` to `ZMANIM_ROWS`)
- Modify: `client/src/components/display/ZmanimPanel.jsx` (key rows by `id`)

**Interfaces:**
- Consumes: everything `SynagogueDisplay.jsx` imports from `displayData.js` today, plus `useDisplayContent`, `getZmanim`, `getParasha`.
- Produces: `useDisplayModel(): { screen, setScreen, clock, hebDate, greg, weekday, parasha, prayers, prayersTitle, prayersSub, next, zmanimRows, ann, maz, azk, joke, tick, jokeTick, shiurim }`
  - `zmanimRows: Array<{ id, name, time }>` — `time` is `'HH:MM'` or `'--:--'`
  - `next: { name, time, countdown }`
  - `ann: { id, text, isActive } | null`; `maz`, `azk`: `{}` when their list is empty
  - `joke: { id, text, isActive } | null`
  - `tick`, `jokeTick`: monotonically increasing counters, used as React `key`s to replay the fade

- [ ] **Step 1: Add a stable `id` to each zmanim row**

In `client/src/components/display/displayData.js`, `ZMANIM_ROWS` becomes:

```js
export const ZMANIM_ROWS = [
  { id: 'alot', name: 'עלות השחר', field: 'alotHaShachar' },
  { id: 'sunrise', name: 'הנץ החמה', field: 'sunrise' },
  { id: 'shmaMGA', name: 'סוזק״ש מג״א', field: 'sofZmanShmaMGA' },
  { id: 'shmaGRA', name: 'סוזק״ש גר״א', field: 'sofZmanShma' },
  { id: 'tfilla', name: 'סו״ז תפילה', field: 'sofZmanTfilla' },
  { id: 'chatzot', name: 'חצות היום', field: 'chatzot' },
  { id: 'minchaGedola', name: 'מנחה גדולה', field: 'minchaGedola' },
  { id: 'sunset', name: 'שקיעת החמה', field: 'sunset' },
  { id: 'tzeit', name: 'צאת הכוכבים', field: 'sunset', offsetMin: TZEIT_AFTER_SUNSET_MIN },
  { id: 'tzeitRT', name: 'צאת ר״ת', field: 'tzeit72min' },
];
```

Keep the existing comment above it. Add one line to that comment saying `id` is the stable handle consumers select by — two rows share `field: 'sunset'`, so field-matching is ambiguous and name-matching breaks on a copy edit.

- [ ] **Step 2: Create the hook**

`client/src/hooks/useDisplayModel.js` — move, unchanged in substance, from `SynagogueDisplay.jsx`: the `ROTATE_MS` / `JOKE_ROTATE_MS` / `ZMANIM_REFRESH_MS` constants, `pad`, the five effects (resize excepted — that one is wall-only and stays), and every derivation from `screenSegment` down to `pick`. The `scale` state and its resize effect stay in `SynagogueDisplay.jsx`; they are layout, not model.

Carry the existing comments across verbatim — they explain why the Israel-time handling and the segment-pinned override are shaped the way they are, and they are worth more in the hook than in the page.

Row mapping picks up the id:

```js
const zmanimRows = ZMANIM_ROWS.map((r) => ({
  id: r.id,
  name: r.name,
  time: (zmanimTimes && toClock(zmanimTimes[r.field], r.offsetMin)) || '--:--',
}));
```

Return the full object listed under **Interfaces** above.

- [ ] **Step 3: Rewrite `SynagogueDisplay.jsx` as layout only**

It keeps: the `scale` state + resize effect, and the JSX from `<div style={{ position:'absolute', inset:0 ...`. Everything else becomes:

```js
const {
  screen, setScreen, clock, hebDate, greg, weekday, parasha,
  prayers, prayersTitle, prayersSub, next, zmanimRows, shiurim,
  ann, maz, azk, joke, tick, jokeTick,
} = useDisplayModel();
```

No JSX changes at all — the prop names above are chosen to match what the JSX already passes.

- [ ] **Step 4: Key the zmanim rows by id**

In `ZmanimPanel.jsx`, `key={z.name}` → `key={z.id}`.

- [ ] **Step 5: Verify the wall is unchanged**

```bash
npm --prefix client run lint && npm --prefix client run build
```

Then with `npm run dev` running, open `/` at a desktop size and confirm: clock ticks, all four חול prayer rows resolve, 10 זמנים rows resolve, ticker scrolls, announcements/mazal/azkarot rotate together at 6.5s, the joke rotates on its own, the חול/שבת toggle works.

- [ ] **Step 6: Commit**

```bash
git add client/src/hooks/useDisplayModel.js client/src/pages/SynagogueDisplay.jsx client/src/components/display/displayData.js client/src/components/display/ZmanimPanel.jsx
git commit -m "refactor: extract the display model out of the wall page"
```

---

### Task 2: Mobile shell — styles, header, footer, page

The scroll container, the sticky header and the ticker footer, rendered with real data but with the middle of the page still empty. Committing this separately means the scroll/overflow question is settled before any card is written on top of it.

**Files:**
- Create: `client/src/components/mobile/mobileStyles.js`
- Create: `client/src/components/mobile/MobileHeader.jsx`
- Create: `client/src/components/mobile/TickerLines.jsx`
- Create: `client/src/pages/MobileDisplay.jsx`

**Interfaces:**
- Consumes: `useDisplayModel()` from Task 1; `TICKER` from `displayData.js`.
- Produces:
  - `mobileStyles.js`: `COLORS`, `screen`, `page`, `card`, `heroCard`, `sectionTitle`, `eyebrow`, `row`, `rowName`, `rowTime`, `toggleActive`, `toggleIdle`
  - `<MobileHeader weekday hebDate />`
  - `<TickerLines text />` — splits on `•`, drops empties, one line each
  - `MobileDisplay` — default export, the page

- [ ] **Step 1: `mobileStyles.js`**

Same palette as the wall (`#c9a86a` gold, `#e6c98a` gold text, `#f4ead2` light gold, `#e8ecf3` text, `#8b95a7` muted), sizes from the mock. The scroll container mirrors `adminStyles.screen`:

```js
export const screen = {
  position: 'fixed',
  inset: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  color: COLORS.text,
  fontFamily: "'Assistant',sans-serif",
  direction: 'rtl',
  background:
    'radial-gradient(600px 420px at 50% -6%,rgba(201,168,106,0.16),transparent 62%),' +
    'linear-gradient(180deg,#0d121d 0%,#0a0e16 55%,#080b12 100%)',
};
```

`card` is the mock's glass card: `linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.012))`, `1px solid rgba(201,168,106,0.22)`, `borderRadius: '20px'`.

- [ ] **Step 2: `MobileHeader.jsx`**

Sticky (`position:'sticky', top:0, zIndex:5`), `backdropFilter:'blur(18px)'`, the rotated-square נ״ר mark at 44px, `בית כנסת נווה רחמים` in Frank Ruhl Libre 21px/900, `{weekday} · {hebDate}` at 13px muted, `ב״ה` at the far end. No clock.

- [ ] **Step 3: `TickerLines.jsx`**

```jsx
const TickerLines = ({ text }) => {
  const lines = text.split('•').map((s) => s.trim()).filter(Boolean);
  return (
    <div style={{ textAlign: 'center', fontSize: '13px', color: '#5f6878', lineHeight: 1.6, padding: '6px 10px 0' }}>
      {lines.map((line) => (<div key={line}>{line}</div>))}
    </div>
  );
};
```

`TICKER` ends with a trailing `•` for the marquee loop, hence the `filter(Boolean)`.

- [ ] **Step 4: `MobileDisplay.jsx`**

Calls `useDisplayModel()`, renders `<div style={S.screen}><MobileHeader .../><div style={S.page}>…</div></div>` with `page` being `padding:'18px 18px 34px'; display:flex; flexDirection:column; gap:16px`, and `<TickerLines text={TICKER} />` last. Cards land here in Task 3.

- [ ] **Step 5: Lint, build**

```bash
npm --prefix client run lint && npm --prefix client run build
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/mobile client/src/pages/MobileDisplay.jsx
git commit -m "feat: mobile display shell — scroll container, header, footer"
```

---

### Task 3: The mobile cards

**Files:**
- Create: `client/src/components/mobile/NextMinyanHero.jsx`
- Create: `client/src/components/mobile/PrayerTimesCard.jsx`
- Create: `client/src/components/mobile/ShiurimCard.jsx`
- Create: `client/src/components/mobile/RotatingCards.jsx`
- Create: `client/src/components/mobile/ZmanimAccordion.jsx`
- Modify: `client/src/pages/MobileDisplay.jsx`

**Interfaces:**
- Consumes: `mobileStyles.js`, the `useDisplayModel()` fields.
- Produces:
  - `<NextMinyanHero next={next} zmanimRows={zmanimRows} />`
  - `<PrayerTimesCard title sub prayers screen onSetChol onSetShab />`
  - `<ShiurimCard shiurim />`
  - `RotatingCards.jsx` named exports: `<AnnouncementCard ann annKey count index />`, `<MazalCard maz mazKey />`, `<AzkarotCard azk azkKey />`, `<JokesCard joke jokeKey />`
  - `<ZmanimAccordion rows />`

- [ ] **Step 1: `NextMinyanHero.jsx`**

The mock's hero: `המניין הבא` eyebrow, `next.name` at 25px, `next.time` at 72px/800 tabular-nums, then the countdown pill (`בעוד {next.countdown}`, dot + 17px gold on `rgba(0,0,0,0.3)`), `animation: 'omGlow 4s ease-in-out infinite'` (already in `index.css`).

The three-value strip picks by id — **not** by name or field:

```js
const HERO_ZMANIM = ['sunrise', 'chatzot', 'sunset'];
const strip = HERO_ZMANIM
  .map((id) => zmanimRows.find((r) => r.id === id))
  .filter(Boolean);
```

Rendered `justifyContent:'space-around'` above a `1px solid rgba(201,168,106,0.22)` divider, each as label (12px muted) over time (19px/700 tabular-nums).

- [ ] **Step 2: `PrayerTimesCard.jsx`**

Card with `זמני תפילות` (Frank Ruhl 21px gold) on one line and the pill toggle on the other; the sub-line (`sub`) under the title at 14px muted. Toggle styles come from `mobileStyles` (`toggleActive` is the `linear-gradient(180deg,#e9cf94,#c9a86a)` fill on `#241b0e` text, `toggleIdle` is transparent on `#9aa4b5`), chosen by `screen === 'shabbat'`. Rows: name 19px/600, time 22px/800 gold tabular-nums, `borderTop: '1px solid rgba(255,255,255,0.06)'`, keyed by `p.name`.

Buttons must be real `<button type="button">` elements with the card's own background reset, so the toggle is reachable by keyboard and announces as a control — the wall uses `role="button"` divs, but the wall is a screen nobody touches.

- [ ] **Step 3: `ShiurimCard.jsx`**

`שיעורי תורה` title; per row `s.name` (18px/600) over `s.by` (14px muted) with `s.time` (20px/700 gold) opposite. Keyed by `s.id`, as `ShiurimPanel.jsx` does. Renders `אין שיעורים` in muted 15px when the list is empty.

- [ ] **Step 4: `RotatingCards.jsx`**

Four cards in one file, mirroring `components/display/CenterCards.jsx`:

- `AnnouncementCard` — `!` badge, `הודעות` eyebrow, text at 17px with `whiteSpace:'pre-line'`, and a dot column: `count` dots, the one at `index` in `#e6c98a`, the rest `rgba(201,168,106,0.3)`. `key={annKey}` on the text so `omFade` replays.
- `MazalCard` — `שמחות ומזל טוב` eyebrow, `maz.names` Frank Ruhl 22px, `maz.occasion` 16px gold.
- `AzkarotCard` — `לעילוי נשמת` eyebrow, `azk.name` Frank Ruhl 21px, `azk.detail` 15px muted, `azk.date` 15px gold.
- `JokesCard` — **this is the mock's פרנס היום slot.** Title `בדיחות ליאור`, body `joke ? joke.text : 'אין בדיחות להצגה כרגע'` at 17px, `key={jokeKey}`. The wall's 110-character server-side cap (`server/src/jokes/filter.js`) plus this smaller font means a joke that fits the wall's 386px column always fits a phone's full width; keep `overflow:'hidden'` anyway, as the wall does.

- [ ] **Step 5: `ZmanimAccordion.jsx`**

`useState(true)` — open by default, per the mock. Header row is a `<button type="button">` spanning the card with `זמני היום` and a `הסתר`/`הצג` label, `aria-expanded` set. Body is `gridTemplateColumns:'1fr 1fr', gap:'0 18px'`, one row per zman keyed by `z.id`, name 15px, time 16px/700 gold tabular-nums.

- [ ] **Step 6: Compose them in `MobileDisplay.jsx`**

Order, top to bottom: hero, announcements, prayer times, shiurim, mazal, azkarot, zmanim, jokes, footer.

```jsx
<NextMinyanHero next={next} zmanimRows={zmanimRows} />
<AnnouncementCard ann={ann?.text || ''} annKey={tick} count={announcementCount} index={announcementIndex} />
<PrayerTimesCard title={prayersTitle} sub={prayersSub} prayers={prayers} screen={screen}
  onSetChol={() => setScreen('weekday')} onSetShab={() => setScreen('shabbat')} />
<ShiurimCard shiurim={shiurim} />
<MazalCard maz={maz} mazKey={tick} />
<AzkarotCard azk={azk} azkKey={tick} />
<ZmanimAccordion rows={zmanimRows} />
<JokesCard joke={joke} jokeKey={jokeTick} />
```

`announcementCount` / `announcementIndex` are the dot state. `useDisplayModel` already takes the modulo internally to produce `ann`, so it must also return `announcements.length` and the resolved index for the dots — add `annCount` and `annIndex` to its return value and to Task 1's interface list.

- [ ] **Step 7: Lint, build**

```bash
npm --prefix client run lint && npm --prefix client run build
```

- [ ] **Step 8: Commit**

```bash
git add client/src/components/mobile client/src/pages/MobileDisplay.jsx
git commit -m "feat: mobile display cards"
```

---

### Task 4: The responsive switch

**Files:**
- Create: `client/src/hooks/useIsMobile.js`
- Modify: `client/src/App.jsx`

**Interfaces:**
- Produces: `useIsMobile(): boolean`

- [ ] **Step 1: `useIsMobile.js`**

```js
import { useEffect, useState } from 'react';

// A phone held landscape is 844x390: wide enough to pass a width-only breakpoint and
// far too short for the 1920x1080 wall canvas, which would scale to 0.36 there. Hence
// the height clause. An iPad in landscape (1180x820) and every laptop stay on the wall.
export const MOBILE_QUERY = '(max-width: 820px), (max-height: 500px)';

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMobile;
}
```

- [ ] **Step 2: Choose the layout in `App.jsx`**

```jsx
function DisplayRoot() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileDisplay /> : <SynagogueDisplay />;
}
```

Route `/` to `<DisplayRoot />`. `/zmanim` and the four `/adminGabbai` routes are untouched.

- [ ] **Step 3: Verify both layouts**

`npm run dev`, then in the browser's device toolbar: iPhone portrait → mobile; rotate to landscape → still mobile; 1920×1080 → wall, unchanged.

- [ ] **Step 4: Lint, build**

```bash
npm --prefix client run lint && npm --prefix client run build
```

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useIsMobile.js client/src/App.jsx
git commit -m "feat: serve the mobile layout from / on phone-sized viewports"
```

---

### Task 5: End-to-end verification

**Files:** none — this task produces evidence, not code.

- [ ] **Step 1: Server tests still green**

```bash
npm --prefix server test
```

Nothing in this plan touches the server, so anything but a pass means something unintended happened.

- [ ] **Step 2: Live data on the phone layout**

With `npm run dev` running and `/` open at 390×844: the countdown decrements every second; all four חול prayer rows show real times (not `--:--`); the hero strip shows הנץ/חצות/שקיעה matching the זמנים accordion's rows for the same three; the accordion opens and closes; the חול/שבת toggle swaps 4 rows for 5.

- [ ] **Step 3: The admin reaches both**

Open `/adminGabbai/announcements`, add an announcement, and confirm it appears in the phone layout **and** the wall layout within the 30s poll. Then hide it (the `מוצג`/`מוסתר` switch) and confirm it disappears from both.

- [ ] **Step 4: Commit any fixes, then report**

Report what was verified and what, if anything, could not be.

---

## Self-review

**Spec coverage.** Responsive at `/` → Task 4. `useDisplayModel` → Task 1. Hero strip
by id → Tasks 1 and 3. Ticker footer → Task 2. No clock → Task 2 (stated). בדיחות ליאור in
the פרנס slot → Task 3 Step 4. Admin reaches both → Task 5 Step 3. Own scroll container →
Task 2 Step 1. Breakpoint table → Task 4 Step 1 comment + Step 3.

**Gap found and closed.** Task 3's announcement dots need the list length and the resolved
index, which the hook did not originally return. `annCount` / `annIndex` added to Task 1's
interface and noted in Task 3 Step 6.

**Type consistency.** `zmanimRows` carries `{ id, name, time }` everywhere — produced in
Task 1 Step 2, keyed by `id` in `ZmanimPanel` (Task 1 Step 4), selected by `id` in
`NextMinyanHero` (Task 3 Step 1) and keyed by `id` in `ZmanimAccordion` (Task 3 Step 5).
`next` is `{ name, time, countdown }` in both consumers. `ann` is an item object, so the
page passes `ann?.text`; `maz`/`azk` default to `{}`.
