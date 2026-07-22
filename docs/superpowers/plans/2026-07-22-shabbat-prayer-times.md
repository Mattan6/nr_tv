# זמני תפילות שבת Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠️ Historical document — the code blocks below are stale.** This plan records the
> original three tasks as they were written, and they shipped. Later review waves then
> changed several of the interfaces it specifies. The task bodies are deliberately left
> as written, so **read the code and
> [the design spec](../specs/2026-07-22-shabbat-prayer-times-design.md), not the
> snippets here**, for current behaviour. What changed since:
>
> | Plan says | Ships as |
> |---|---|
> | `shabbatAnchors(response)`, first item of each category | `shabbatAnchors(response, saturday)` — items matched to that Saturday's own calendar date, so a Yom Tov week cannot post the festival's times. מוצ״ש falls back to that Saturday's `candles` when there is no `havdalah` |
> | `isSummerTime(iso) → boolean`, `false` on failure | `→ true \| false \| null`; `null` means "undetermined" and blanks the three season-dependent rows rather than silently choosing winter |
> | `resolveShabbatTimes` always returns a שחרית | all-anchors-missing now yields `null` for שחרית too (Task 2 Step 5's expected output showing `"shabShacharit":"07:30"` no longer holds) |
> | `Promise.all` for the Hebcal requests | `Promise.allSettled` — one failing request blanks only what it feeds |
> | `SHABBAT_PRAYERS` entries are `{ name, computed }` | each also carries `day` (5 = Friday, 6 = Saturday), which `computeNextMinyan` uses; this closes the "Known limitation" at the foot of this plan |
> | `getParasha()` with a literal `b=20` default | offset comes from `SHABBAT_CONFIG.candleLightingMinBeforeSunset` |
> | Times formatted in device-local time | every clock, date, weekday, countdown and schedule boundary goes through `Asia/Jerusalem` (`toClock`, `israelParts`), so the "assumes the machine's clock is set to Israel time" constraint below no longer applies to the app — only to any scratch script that formats dates itself |
> | Screen override pinned to the scheduled value | pinned to a schedule *segment key* (`screenSegment(now)`), so it expires at the next boundary and cannot resurrect a week later |

**Goal:** Replace the eight placeholder Shabbat prayer times with five rows computed from live Hebcal data, correct year-round in both שעון קיץ and שעון חורף.

**Architecture:** Pure functions in `displayData.js` turn three anchors (candle lighting, Shabbat שקיעה, הבדלה) into five display times, driven by a single `SHABBAT_CONFIG` object that a future admin panel will replace. `SynagogueDisplay.jsx` fetches the anchors and passes the resolved map into the existing `resolvePrayers` mechanism.

**Tech Stack:** React 19, Vite, date-fns, axios, Hebcal REST API. No test framework (declined during design).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-22-shabbat-prayer-times-design.md`
- All computation logic lives in `client/src/components/display/displayData.js`, matching the existing `resolvePrayers` / `governingThursday` / `weeklyMinchaTime` pattern. Do not create new modules.
- Season is decided by Israel's UTC offset **on the anchor date**, never by the device clock or `new Date()`.
- Missing anchors must yield `null`, which `resolvePrayers` renders as `--:--`. Never substitute a fallback time.
- Hebrew strings must use the exact characters given in this plan, including the geresh forms `מוצ״ש` and `ק״ש`.
- No new npm dependencies.
- Verification scripts assume the machine's clock is set to Israel time (`date-fns` formats in local time).

---

### Task 1: Season detection and config

**Files:**
- Modify: `client/src/components/display/displayData.js`
- Verify: `client/tmp-shabbat-check.mjs` (temporary, deleted in Task 3)

**Interfaces:**
- Consumes: nothing.
- Produces: `isSummerTime(iso) → boolean`, `SHABBAT_CONFIG` object, `upcomingSaturday(now: Date) → Date`.

- [ ] **Step 1: Add the config block**

Insert immediately after the existing `WEEKDAY_PRAYERS` export in `displayData.js`:

```js
// Every tunable Shabbat value in one place. When the admin panel lands, only the
// SOURCE of this object changes (static import → fetched state); the computation
// below stays as-is.
export const SHABBAT_CONFIG = {
  kabbalatAfterCandlesMin: { summer: 2, winter: 5 },
  shacharit: { summer: '07:45', winter: '07:30' },
  minchaBeforeSunsetMin: 90,
  arvitBeforeHavdalahMin: { summer: 3, winter: 10 },
};
```

- [ ] **Step 2: Add season detection**

Add near the other helpers, after the existing `toClock` function (it must come after `toClock` is defined only for readability; hoisting makes order irrelevant):

```js
// שעון קיץ vs שעון חורף, decided by Israel's real UTC offset on the anchor date.
// Deliberately NOT from the device clock: a display panel with a misconfigured
// timezone would otherwise show winter times all summer, silently and forever.
// Hebcal timestamps carry the offset, e.g. "2026-07-24T19:15:00+03:00".
export function isSummerTime(iso) {
  if (typeof iso === 'string') {
    const m = iso.match(/([+-])(\d{2}):?(\d{2})$/);
    if (m) {
      const sign = m[1] === '-' ? -1 : 1;
      return sign * (Number(m[2]) * 60 + Number(m[3])) === 180;
    }
  }
  // Fallback for a "Z" or date-only string: ask Intl for Jerusalem's offset then.
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      timeZoneName: 'shortOffset',
    }).formatToParts(d);
    return parts.find((p) => p.type === 'timeZoneName')?.value === 'GMT+3';
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Add the Saturday helper**

Add directly below `governingThursday`:

```js
// The Saturday of the current Shabbat: today if today is Saturday, else the next
// one. The Shabbat panel is reachable any weekday via the TopBar toggle, so מנחה
// must anchor to that Saturday's שקיעה, not to today's.
export function upcomingSaturday(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return d;
}
```

- [ ] **Step 4: Write the verification script**

Create `client/tmp-shabbat-check.mjs` (inside `client/` so Node resolves `date-fns` from `client/node_modules`):

```js
import { isSummerTime, upcomingSaturday } from './src/components/display/displayData.js';

console.log('summer offset  →', isSummerTime('2026-07-24T19:15:00+03:00'), '(expect true)');
console.log('winter offset  →', isSummerTime('2027-01-15T16:40:00+02:00'), '(expect false)');
console.log('null anchor    →', isSummerTime(null), '(expect false)');

const sat = (y, m, d) => upcomingSaturday(new Date(y, m, d)).toDateString();
console.log('from Wed 22 Jul→', sat(2026, 6, 22), '(expect Sat Jul 25 2026)');
console.log('from Sat 25 Jul→', sat(2026, 6, 25), '(expect Sat Jul 25 2026)');
console.log('from Sun 26 Jul→', sat(2026, 6, 26), '(expect Sat Aug 01 2026)');
```

- [ ] **Step 5: Run it**

Run: `cd client && node tmp-shabbat-check.mjs`

Expected output:

```
summer offset  → true (expect true)
winter offset  → false (expect false)
null anchor    → false (expect false)
from Wed 22 Jul→ Sat Jul 25 2026 (expect Sat Jul 25 2026)
from Sat 25 Jul→ Sat Jul 25 2026 (expect Sat Jul 25 2026)
from Sun 26 Jul→ Sat Aug 01 2026 (expect Sat Aug 01 2026)
```

Every line must match. If `upcomingSaturday` returns the wrong day, check the `(6 - d.getDay() + 7) % 7` arithmetic.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/display/displayData.js
git commit -m "feat: add Shabbat config and season detection"
```

Do not commit `tmp-shabbat-check.mjs`.

---

### Task 2: Anchor extraction and time resolution

**Files:**
- Modify: `client/src/components/display/displayData.js`
- Verify: `client/tmp-shabbat-check.mjs`

**Interfaces:**
- Consumes: `SHABBAT_CONFIG`, `isSummerTime` from Task 1; the module-private `toClock(iso, offsetMin)`.
- Produces: `shabbatAnchors(response) → { candles, havdalah }`, `resolveShabbatTimes({ candles, havdalah, saturdaySunset }, config?) → { shabCandles, shabKabbalat, shabShacharit, shabMincha, shabArvit }`, and the rewritten `SHABBAT_PRAYERS`.

- [ ] **Step 1: Replace SHABBAT_PRAYERS**

Replace the entire existing `SHABBAT_PRAYERS` array (the eight hardcoded rows) with:

```js
// Five rows, all resolved by resolveShabbatTimes below. סוף זמן ק״ש and מנחה גדולה
// were dropped — both already appear in the זמנים panel — and שיעור בפרשה moved to
// the שיעורים panel.
export const SHABBAT_PRAYERS = [
  { name: 'הדלקת נרות', computed: 'shabCandles' },
  { name: 'מנחה וקבלת שבת', computed: 'shabKabbalat' },
  { name: 'שחרית', computed: 'shabShacharit' },
  { name: 'מנחה', computed: 'shabMincha' },
  { name: 'ערבית מוצ״ש', computed: 'shabArvit' },
];
```

- [ ] **Step 2: Add anchor extraction**

Add below `upcomingSaturday`:

```js
// Hebcal's /shabbat response (already fetched for the parasha) also carries the
// candle-lighting and havdalah timestamps — no extra request needed for either.
export function shabbatAnchors(shabbatResponse) {
  const items = shabbatResponse?.items || [];
  const pick = (category) => items.find((it) => it.category === category)?.date || null;
  return { candles: pick('candles'), havdalah: pick('havdalah') };
}
```

- [ ] **Step 3: Add the resolver**

Add directly below `shabbatAnchors`:

```js
// Three anchors in, five display times out. Any missing anchor yields null, which
// resolvePrayers renders as "--:--" — never a stale or invented time.
export function resolveShabbatTimes(
  { candles, havdalah, saturdaySunset },
  config = SHABBAT_CONFIG
) {
  const season = isSummerTime(candles || saturdaySunset || havdalah) ? 'summer' : 'winter';
  return {
    shabCandles: toClock(candles),
    shabKabbalat: toClock(candles, config.kabbalatAfterCandlesMin[season]),
    shabShacharit: config.shacharit[season],
    shabMincha: toClock(saturdaySunset, -config.minchaBeforeSunsetMin),
    shabArvit: toClock(havdalah, -config.arvitBeforeHavdalahMin[season]),
  };
}
```

- [ ] **Step 4: Extend the verification script**

Replace the contents of `client/tmp-shabbat-check.mjs` with:

```js
import { resolveShabbatTimes, shabbatAnchors } from './src/components/display/displayData.js';

const summer = resolveShabbatTimes({
  candles: '2026-07-24T19:15:00+03:00',
  havdalah: '2026-07-25T20:12:00+03:00',
  saturdaySunset: '2026-07-25T19:35:00+03:00',
});
const winter = resolveShabbatTimes({
  candles: '2027-01-15T16:40:00+02:00',
  havdalah: '2027-01-16T17:38:00+02:00',
  saturdaySunset: '2027-01-16T17:00:00+02:00',
});
const missing = resolveShabbatTimes({ candles: null, havdalah: null, saturdaySunset: null });

console.log('summer ', JSON.stringify(summer));
console.log('winter ', JSON.stringify(winter));
console.log('missing', JSON.stringify(missing));
console.log('anchors', JSON.stringify(shabbatAnchors({
  items: [
    { category: 'candles', date: '2026-07-24T19:15:00+03:00' },
    { category: 'parashat', hebrew: 'פרשת מטות־מסעי' },
    { category: 'havdalah', date: '2026-07-25T20:12:00+03:00' },
  ],
})));
console.log('empty  ', JSON.stringify(shabbatAnchors(undefined)));
```

- [ ] **Step 5: Run it**

Run: `cd client && node tmp-shabbat-check.mjs`

Expected output — these are the worked examples from the spec:

```
summer  {"shabCandles":"19:15","shabKabbalat":"19:17","shabShacharit":"07:45","shabMincha":"18:05","shabArvit":"20:09"}
winter  {"shabCandles":"16:40","shabKabbalat":"16:45","shabShacharit":"07:30","shabMincha":"15:30","shabArvit":"17:28"}
missing {"shabCandles":null,"shabKabbalat":null,"shabShacharit":"07:30","shabMincha":null,"shabArvit":null}
anchors {"candles":"2026-07-24T19:15:00+03:00","havdalah":"2026-07-25T20:12:00+03:00"}
empty   {"candles":null,"havdalah":null}
```

Note `missing` still returns a שחרית time — it is a fixed clock value with no anchor to lose, and falls to the winter branch because `isSummerTime(null)` is false. This is expected.

If summer/winter times are off by a whole number of hours, the machine is not on Israel time; re-check on an Israel-time clock before treating it as a bug.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/display/displayData.js
git commit -m "feat: compute Shabbat prayer times from Hebcal anchors"
```

---

### Task 3: Wire into the display

**Files:**
- Modify: `client/src/pages/SynagogueDisplay.jsx`
- Delete: `client/tmp-shabbat-check.mjs`

**Interfaces:**
- Consumes: `upcomingSaturday`, `shabbatAnchors`, `resolveShabbatTimes` from Tasks 1–2.
- Produces: nothing — this is the top of the tree.

- [ ] **Step 1: Extend the imports**

In the import block from `'../components/display/displayData'`, add three names alongside the existing ones:

```js
  resolvePrayers,
  computeNextMinyan,
  governingThursday,
  weeklyMinchaTime,
  upcomingSaturday,
  shabbatAnchors,
  resolveShabbatTimes,
```

- [ ] **Step 2: Add state**

Directly below the existing `const [minchaTime, setMinchaTime] = useState(null);`:

```js
  const [shabbatTimes, setShabbatTimes] = useState({});
```

- [ ] **Step 3: Fetch the Saturday zmanim**

In the zmanim `useEffect`, replace the body of `load` from `const today` through the `setMinchaTime` line with:

```js
        const today = new Date();
        const [z, zThu, zSat, p] = await Promise.all([
          getZmanim(today),
          getZmanim(governingThursday(today)),
          getZmanim(upcomingSaturday(today)),
          getParasha(),
        ]);
        if (cancelled) return;
        setZmanimTimes(z.times || null);
        setMinchaTime(weeklyMinchaTime(zThu?.times?.sunset));
        setShabbatTimes(
          resolveShabbatTimes({
            ...shabbatAnchors(p),
            saturdaySunset: zSat?.times?.sunset,
          })
        );
```

Leave the two `parashaItem` lines that follow untouched.

- [ ] **Step 4: Pass the right computed map**

Replace the existing single-line `const prayers = ...` with:

```js
  // Each schedule gets its own computed map — both lists would otherwise collide
  // on a key named `mincha` holding different values.
  const prayers = resolvePrayers(
    isShab ? SHABBAT_PRAYERS : WEEKDAY_PRAYERS,
    zmanimTimes,
    isShab ? shabbatTimes : { mincha: minchaTime }
  );
```

- [ ] **Step 5: Lint**

Run: `cd client && npm run lint`
Expected: no new errors. An unused-variable error for `minchaTime` or `shabbatTimes` means a step above was missed.

- [ ] **Step 6: Check it in the browser**

Run `npm run dev` from the repo root, open the app, and click **שבת** in the TopBar.

Confirm all five of these, in order, with real times and no `--:--`:
הדלקת נרות · מנחה וקבלת שבת · שחרית · מנחה · ערבית מוצ״ש

Then cross-check against hebcal.com for Nitzan (31.7167, 34.6333) for the coming Shabbat:
- הדלקת נרות matches Hebcal's candle lighting exactly.
- מנחה וקבלת שבת is 2 minutes later (July is שעון קיץ).
- שחרית reads 07:45.
- מנחה is exactly 90 minutes before **the coming Saturday's** שקיעה on hebcal.com.
  Do **not** check it against the שקיעה in the זמנים panel: that panel shows *today's*
  sunset, and the two only coincide when today is that Saturday. Midweek they differ by
  a few minutes, which is correct — "correcting" it to today's sunset would reintroduce
  the exact bug this feature removes.
- ערבית מוצ״ש is 3 minutes before Hebcal's havdalah.

- [ ] **Step 7: Remove the scratch script**

```bash
rm client/tmp-shabbat-check.mjs
```

Confirm `git status` shows only `client/src/pages/SynagogueDisplay.jsx` modified.

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/SynagogueDisplay.jsx
git commit -m "feat: wire Shabbat prayer times into the display"
```

---

## Known limitation, not addressed here

`computeNextMinyan` walks the prayer list in **array order** and returns the first entry whose clock is later than now. The Shabbat list spans two days (Friday's הדלקת נרות, Saturday's שחרית), so on a Saturday morning it reports הדלקת נרות — 19:15 that evening — rather than מנחה.

This is pre-existing: the old eight-row list mixed the same two days and behaved identically. This plan neither fixes nor worsens it. Raise it with the user as separate work; fixing it means teaching `computeNextMinyan` which day each row belongs to, which touches the weekday schedule too.
