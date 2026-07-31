# שחרית הנץ Rollover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `שחרית מניין א׳ (הנץ)` row post tomorrow's sunrise from 07:30 Israel time, instead of posting today's already-past sunrise until midnight.

**Architecture:** A pure date helper in `displayData.js` picks the date whose sunrise the row shows — today before 07:30 Israel time, tomorrow from 07:30 on. The row is redeclared from `{ from: 'sunrise' }` (which means "today's zmanim") to `{ computed: 'netz' }`, the shape מנחה already uses for a time whose date is not today's. `useDisplayModel` fetches that date's zmanim as a fifth leg of its existing `Promise.allSettled` and re-runs the whole load effect when the derived date key flips — the same mechanism that already re-runs it at midnight, so no new timer is introduced.

**Tech Stack:** React 19, Vite 7, plain ESM. Hebcal REST API via axios. Node >= 18. No test framework in the client.

**Spec:** `docs/superpowers/specs/2026-07-30-netz-prayer-rollover-design.md`

## Global Constraints

- **No new dependencies**, runtime or dev. No test framework is added to the client — this was explicitly cut from the design. Verification scripts in this plan are throwaway files written to a scratch directory **outside the repo** and are never committed.
- **Only two files change:** `client/src/components/display/displayData.js` and `client/src/hooks/useDisplayModel.js`. No server file, no other component, no page.
- **Every clock and calendar decision goes through `israelParts` / `israelDateAtNoon`**, never through the device's own `Date` fields. A TV whose timezone was set wrong at install must cross the 07:30 boundary at 07:30 in Nitzan.
- **The cutoff is exactly `7 * 60 + 30` minutes, inclusive** — at 07:30:00 the answer is already tomorrow.
- **A failed fetch writes `null`, never a stale time.** The row falls to `--:--`, matching every other leg of the existing load.
- **The row label does not change.** No "מחר" marker anywhere in either layout.
- **`from:` and the `zmanimTimes` argument to `resolvePrayers` stay**, even though no entry will use `from:` after this change. It is the documented way to declare a future row that genuinely tracks today.
- **`ZMANIM_ROWS` and the זמנים panel are not touched.** They stay on the current day.

## File Structure

| File | Responsibility after this change |
|---|---|
| `client/src/components/display/displayData.js` | Owns the rule. Adds `NETZ_NEXT_DAY_FROM_MIN` and `netzPrayerDate(now)` beside `governingThursday` and `upcomingSaturday`, the two sibling helpers that already answer "which date does this row belong to". `WEEKDAY_PRAYERS[0]` switches to `computed: 'netz'`. |
| `client/src/hooks/useDisplayModel.js` | Owns the fetching and the trigger. Adds the fifth `getZmanim` leg, `netzTime` state, `netzDayKey` in the load effect's dependencies, and passes `netz` into `resolvePrayers`. |

Both layouts (`SynagogueDisplay`, `MobileDisplay`) and all three prayer-rendering components inherit the change through the hook and are not edited.

## Scratch directory

Tasks 1 and 2 each write one throwaway verification script. Set `SCRATCH` once per shell to your session scratchpad, or to any directory **outside the repository**. Use the same directory in every step, including the PowerShell ones:

```bash
SCRATCH=/c/Users/<you>/AppData/Local/Temp/netz-check
mkdir -p "$SCRATCH"
```

The scripts are `.mjs`. They `import` the real `displayData.js` through `pathToFileURL`, so they exercise the shipped module rather than a copy. `displayData.js` imports nothing and touches no browser global, so Node loads it directly.

---

### Task 1: The date helper

**Files:**
- Modify: `client/src/components/display/displayData.js` (insert after `upcomingSaturday`, which ends at line 300)
- Verify with: `$SCRATCH/netz-date.mjs` (not committed)

**Interfaces:**
- Consumes: `israelParts(date)` and `israelDateAtNoon(parts, dayShift)`, both already in `displayData.js`. `israelDateAtNoon` is module-private, which is why this function has to live in that file.
- Produces:
  - `NETZ_NEXT_DAY_FROM_MIN: number` — exported constant, `7 * 60 + 30`.
  - `netzPrayerDate(now: Date): Date` — a device-local `Date` at 12:00 whose **calendar fields spell the Israel date** to display. Read it with `.getFullYear()` / `.getMonth()` / `.getDate()`. This is the same contract `governingThursday` and `upcomingSaturday` already return, and it is the shape `getZmanim` needs, because `hebcal.js` formats it with date-fns `format(date, 'yyyy-MM-dd')`, which reads local fields.

- [ ] **Step 1: Write the failing verification script**

Create `$SCRATCH/netz-date.mjs`. Replace `REPO` with the absolute path to the repository root.

```js
import { pathToFileURL } from 'node:url';

const REPO = 'D:/Github Projects/Receipt/git-test/synagogue-display';
const mod = await import(
  pathToFileURL(`${REPO}/client/src/components/display/displayData.js`).href
);
const { netzPrayerDate, NETZ_NEXT_DAY_FROM_MIN } = mod;

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// [instant (UTC), expected displayed date, what it proves]
const CASES = [
  ['2026-07-31T04:29:00Z', '2026-07-31', 'summer, Israel Fri 07:29 — still today'],
  ['2026-07-31T04:30:00Z', '2026-08-01', 'summer, Israel Fri 07:30 exactly — already tomorrow'],
  ['2026-07-31T04:31:00Z', '2026-08-01', 'summer, Israel Fri 07:31 — tomorrow'],
  ['2026-07-31T20:59:00Z', '2026-08-01', 'Israel Fri 23:59 — tomorrow'],
  ['2026-07-31T21:00:00Z', '2026-08-01', 'Israel Sat 00:00 — SAME date across midnight'],
  ['2026-08-01T04:29:00Z', '2026-08-01', 'Israel Sat 07:29 — still that date'],
  ['2026-08-01T04:30:00Z', '2026-08-02', 'Israel Sat 07:30 — flips again'],
  ['2026-01-15T05:29:00Z', '2026-01-15', 'winter (UTC+2), Israel 07:29 — still today'],
  ['2026-01-15T05:30:00Z', '2026-01-16', 'winter (UTC+2), Israel 07:30 — tomorrow'],
  ['2026-12-31T05:30:00Z', '2027-01-01', 'year rollover'],
  ['2026-02-28T05:30:00Z', '2026-03-01', 'month rollover, non-leap February'],
];

let failed = 0;
if (NETZ_NEXT_DAY_FROM_MIN !== 450) {
  console.log(`FAIL  NETZ_NEXT_DAY_FROM_MIN is ${NETZ_NEXT_DAY_FROM_MIN}, expected 450`);
  failed += 1;
}
for (const [iso, expected, why] of CASES) {
  const got = ymd(netzPrayerDate(new Date(iso)));
  const ok = got === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${iso} -> ${got} (expected ${expected})  ${why}`);
}

// The device's own timezone must not move the boundary. Israel Fri 07:29 is Thursday
// afternoon in Los Angeles and Friday evening in Auckland; both must answer 2026-07-31.
console.log(
  `\ndevice TZ = ${Intl.DateTimeFormat().resolvedOptions().timeZone} — ` +
    're-run this script with TZ=Pacific/Auckland and TZ=America/Los_Angeles; ' +
    'every line above must be identical.'
);

console.log(failed ? `\n${failed} FAILING` : '\nall passing');
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node "$SCRATCH/netz-date.mjs"
```

Expected: one `FAIL  NETZ_NEXT_DAY_FROM_MIN is undefined, expected 450` line, then the script dies with `TypeError: netzPrayerDate is not a function`. Neither export exists yet.

- [ ] **Step 3: Add the helper**

In `client/src/components/display/displayData.js`, insert this immediately after the closing brace of `upcomingSaturday` (line 300) and before the `// Calendar date ('YYYY-MM-DD') of one of the Israel-anchored Dates above` comment that introduces `localYmd`:

```js
// The date whose הנץ the שחרית מניין א׳ row posts: today until 07:30 Israel time, tomorrow
// from 07:30 on. The minyan davens before six, so a row that only turned over at midnight
// spent the whole day posting a time that had already passed — and the מניין הבא countdown,
// which rolls forward to that row every evening, inherited the same stale minute.
//
// Continuous across midnight, which is what makes one boundary enough: at 00:00 "tomorrow"
// becomes "today" and the same calendar date stays on screen, so the displayed date changes
// at 07:30 and nowhere else. There is no second boundary and no window where two rules
// disagree.
//
// Friday is deliberately NOT special-cased. The weekday board shows until 09:00 (see
// screenSegment), so between 07:30 and 09:00 this posts Saturday's הנץ rather than Sunday's,
// and this shul has no הנץ minyan on Shabbat. That is about a minute, in a ninety-minute
// window, once a week — cheaper to accept than a permanent day-of-week rule here.
//
// Israel's clock, never the device's, like every other date helper above it: a TV whose
// timezone was set wrong at install has to cross this boundary at 07:30 in Nitzan.
export const NETZ_NEXT_DAY_FROM_MIN = 7 * 60 + 30;
export function netzPrayerDate(now) {
  const p = israelParts(now);
  return israelDateAtNoon(p, p.hour * 60 + p.minute >= NETZ_NEXT_DAY_FROM_MIN ? 1 : 0);
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
node "$SCRATCH/netz-date.mjs"
```

Expected: 11 `ok` lines and `all passing`, exit 0. The constant check prints nothing when it passes.

- [ ] **Step 5: Confirm the device's timezone cannot move the boundary**

**On Windows, use PowerShell for this step.** Git Bash's inline `TZ=... node ...` form does *not* reach native `node.exe` — MSYS2 does not export the assignment into the child process, so `process.env.TZ` arrives `undefined`, the runtime falls back to the system zone, and all three runs silently execute in the same timezone. The step then reports `all passing` while having tested nothing. Confirmed on this machine: under Git Bash `TZ=Pacific/Auckland node -e "console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)"` prints `Asia/Jerusalem`.

```powershell
$SCRATCH = 'C:\Users\<you>\AppData\Local\Temp\netz-check'
$env:TZ='Pacific/Auckland'; node "$SCRATCH\netz-date.mjs"
$env:TZ='America/Los_Angeles'; node "$SCRATCH\netz-date.mjs"
Remove-Item Env:\TZ
```

Expected: `all passing` under both, with output identical to the native-timezone run. This is the constraint the helper exists to satisfy — if `netzPrayerDate` had read `now.getHours()` instead of `israelParts`, these two runs would disagree with the first.

Before trusting a pass, confirm the timezone actually changed: `node -e "console.log(process.env.TZ, Intl.DateTimeFormat().resolvedOptions().timeZone)"` must echo the zone you set. A verification step that cannot fail is worse than no step at all.

On a Unix shell the inline form works and is fine:

```bash
TZ=Pacific/Auckland node "$SCRATCH/netz-date.mjs"
TZ=America/Los_Angeles node "$SCRATCH/netz-date.mjs"
```

- [ ] **Step 6: Lint**

```bash
npm --prefix client run lint
```

Expected: no new errors. Compare against the output on `HEAD` if the repo already has pre-existing warnings.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/display/displayData.js
git commit -m "feat: add netzPrayerDate, the 07:30 rollover for שחרית הנץ

The row that posts הנץ resolves against today's zmanim and only turns
over at midnight, so it shows an already-past time for most of the day.
This is the rule that replaces it: today until 07:30 Israel time,
tomorrow from 07:30 on. Nothing consumes it yet.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Wire the row to the new date

**Files:**
- Modify: `client/src/components/display/displayData.js:5-19` (the `WEEKDAY_PRAYERS` header comment and its first entry)
- Modify: `client/src/hooks/useDisplayModel.js` — imports (line 3-19), state (line 56-57), the day key (line 73-74), the load effect (line 95-154), the `resolvePrayers` call (line 195-199)
- Verify with: `$SCRATCH/netz-wiring.mjs` (not committed)

**Interfaces:**
- Consumes: `netzPrayerDate` and `NETZ_NEXT_DAY_FROM_MIN` from Task 1. `toClock(iso, offsetMin)` and `resolvePrayers(entries, zmanimTimes, computed)`, both already exported from `displayData.js`. `getZmanim(date)` from `services/hebcal.js`, which returns `{ times: { sunrise, sunset, ... } }` with ISO strings carrying an offset.
- Produces: nothing new is exported. `useDisplayModel`'s return shape is unchanged, so no consumer is touched.

- [ ] **Step 1: Write the failing verification script**

Create `$SCRATCH/netz-wiring.mjs`. This checks the declaration and the resolution, which is everything in `displayData.js`'s half of the wiring. Replace `REPO` as before.

```js
import { pathToFileURL } from 'node:url';

const REPO = 'D:/Github Projects/Receipt/git-test/synagogue-display';
const mod = await import(
  pathToFileURL(`${REPO}/client/src/components/display/displayData.js`).href
);
const { WEEKDAY_PRAYERS, resolvePrayers } = mod;

let failed = 0;
const check = (label, got, expected) => {
  const ok = got === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expected ${JSON.stringify(expected)})`);
};

const netzEntry = WEEKDAY_PRAYERS[0];
check('row 0 is still the הנץ row', netzEntry.name, 'שחרית מניין א׳ (הנץ)');
check('row 0 is declared computed', netzEntry.computed, 'netz');
check('row 0 no longer reads today\'s zmanim', netzEntry.from, undefined);

// The זמנים object is deliberately passed as null: the row must resolve from `computed`
// alone. If it still read `from: 'sunrise'` this would come back '--:--'.
const resolved = resolvePrayers(WEEKDAY_PRAYERS, null, { mincha: '19:23', netz: '05:52' });
check('הנץ row displays the computed value', resolved[0].time, '05:52');
check('הנץ row carries it as a sortable clock', resolved[0].clock, '05:52');
check('מנחה is unaffected', resolved[2].time, '19:23');
check('ערבית still follows מנחה', resolved[3].clock, '19:23');
check('ערבית still shows its text', resolved[3].time, 'מיד לאחר מנחה');
check('fixed שחרית ב׳ is unaffected', resolved[1].time, '08:15');

// A failed fetch must blank the row, never leave a stale time.
const failedFetch = resolvePrayers(WEEKDAY_PRAYERS, null, { mincha: '19:23', netz: null });
check('a null netz blanks the row', failedFetch[0].time, '--:--');
check('a null netz leaves no clock to sort by', failedFetch[0].clock, null);

console.log(failed ? `\n${failed} FAILING` : '\nall passing');
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node "$SCRATCH/netz-wiring.mjs"
```

Expected: at least these four failures — `row 0 is declared computed` (gets `undefined`), `row 0 no longer reads today's zmanim` (gets `'sunrise'`), `הנץ row displays the computed value` (gets `'--:--'`), `הנץ row carries it as a sortable clock` (gets `null`).

- [ ] **Step 3: Redeclare the row**

In `client/src/components/display/displayData.js`, replace lines 5-19. The header comment changes too — its `from:` example points at הנץ, which is exactly what is moving.

Replace:

```js
// Weekday (חול) prayers. Each entry is one of:
//   { time: 'HH:MM' }                     — a fixed clock time
//   { from: '<zmanim field>', offsetMin } — derived from TODAY's zmanim
//                                           (e.g. sunrise = הנץ)
//   { computed: '<key>' }                 — a value the container computes and
//                                           passes to resolvePrayers (e.g. the
//                                           weekly מנחה time)
//   { text, afterName }                   — literal text shown instead of a
//                                           time; the countdown follows afterName
export const WEEKDAY_PRAYERS = [
  { name: 'שחרית מניין א׳ (הנץ)', from: 'sunrise' },
```

with:

```js
// Weekday (חול) prayers. Each entry is one of:
//   { time: 'HH:MM' }                     — a fixed clock time
//   { from: '<zmanim field>', offsetMin } — derived from TODAY's zmanim. No entry uses
//                                           this today: הנץ moved to `computed` when it
//                                           began posting TOMORROW's sunrise from 07:30
//                                           (see netzPrayerDate). Kept as the way to
//                                           declare a row that does track today.
//   { computed: '<key>' }                 — a value the container computes and
//                                           passes to resolvePrayers (e.g. the
//                                           weekly מנחה time, or the הנץ of whichever
//                                           date netzPrayerDate picks)
//   { text, afterName }                   — literal text shown instead of a
//                                           time; the countdown follows afterName
export const WEEKDAY_PRAYERS = [
  { name: 'שחרית מניין א׳ (הנץ)', computed: 'netz' },
```

The three entries below it are untouched.

- [ ] **Step 4: Run the wiring script to verify it passes**

```bash
node "$SCRATCH/netz-wiring.mjs"
```

Expected: 11 `ok` lines and `all passing`, exit 0.

Also re-run Task 1's script to confirm nothing regressed:

```bash
node "$SCRATCH/netz-date.mjs"
```

Expected: still `all passing`.

- [ ] **Step 5: Import the helper in the hook**

In `client/src/hooks/useDisplayModel.js`, add `netzPrayerDate` to the existing import block from `../components/display/displayData` (lines 3-19). Insert it after `governingThursday` so the three date helpers stay together:

```js
  governingThursday,
  netzPrayerDate,
  weeklyMinchaTime,
```

- [ ] **Step 6: Add the `netzTime` state**

In the same file, immediately after the `minchaTime` state (line 57), add:

```js
  // The הנץ the שחרית row posts, already formatted. Its own state rather than a field on
  // zmanimTimes: from 07:30 it is TOMORROW's sunrise, while zmanimTimes stays on today for
  // the זמנים panel. Folding them together would make one object mean two dates depending on
  // which consumer asked, and the difference would be invisible at both call sites.
  const [netzTime, setNetzTime] = useState(null);
```

- [ ] **Step 7: Derive the second day key**

In the same file, immediately after the `israelDayKey` line (line 74), add:

```js
  // The second boundary the load effect below has to re-run at: 07:30, when the הנץ row
  // switches to tomorrow's sunrise (netzPrayerDate). Derived from `now` for the same reason
  // israelDayKey is — `now` already ticks once a second, so React re-runs the effect on the
  // tick that crosses the boundary. A setTimeout aimed at 07:30 would have to survive
  // backgrounding, throttling and remounts; a derived key has nothing to survive.
  const netzDate = netzPrayerDate(now);
  const netzDayKey = `${netzDate.getFullYear()}-${pad(netzDate.getMonth() + 1)}-${pad(netzDate.getDate())}`;
```

- [ ] **Step 8: Add the fifth fetch leg**

In the same file, inside the load effect:

Replace the comment on lines 105-110:

```js
      // All three dates come off Israel's calendar, not the device's: east of Israel
```

with:

```js
      // All four dates come off Israel's calendar, not the device's: east of Israel
```

Replace the `allSettled` block (lines 113-118):

```js
      const [z, zThu, zSat, p] = await Promise.allSettled([
        getZmanim(today),
        getZmanim(governingThursday(instant)),
        getZmanim(saturday),
        getParasha(SHABBAT_CONFIG.candleLightingMinBeforeSunset),
      ]);
```

with:

```js
      const [z, zThu, zSat, zNetz, p] = await Promise.allSettled([
        getZmanim(today),
        getZmanim(governingThursday(instant)),
        getZmanim(saturday),
        // Requested unconditionally, including before 07:30 when this is the same date the
        // first leg already asked for. One uniform path, at the cost of a duplicated request
        // four times a day — the branch that would save it has to be right on both sides of
        // a boundary that moves once a day, which is more than the request is worth.
        getZmanim(netzPrayerDate(instant)),
        getParasha(SHABBAT_CONFIG.candleLightingMinBeforeSunset),
      ]);
```

Replace the `failures` line (line 121):

```js
      const failures = [z, zThu, zSat, p].filter((r) => r.status === 'rejected');
```

with:

```js
      const failures = [z, zThu, zSat, zNetz, p].filter((r) => r.status === 'rejected');
```

And add the assignment immediately after `setMinchaTime(...)` (line 126):

```js
      // toClock already answers null for a missing or unparsable time, which resolvePrayers
      // renders as "--:--" — the row blanks rather than holding yesterday's number.
      setNetzTime(toClock(value(zNetz)?.times?.sunrise));
```

- [ ] **Step 9: Update the effect's comment block and dependencies**

In the same file, replace the third line of the comment above the effect (line 97):

```js
  // allSettled, not all: the four requests feed four independent parts of the
  // screen, and one failing must not blank or freeze the other three. Every branch
```

with:

```js
  // allSettled, not all: the five requests feed five independent parts of the
  // screen, and one failing must not blank or freeze the other four. Every branch
```

Then replace the dependency array (line 154):

```js
  }, [israelDayKey]);
```

with:

```js
  }, [israelDayKey, netzDayKey]);
```

And append this paragraph to the end of the comment block below the effect, after the sentence ending "...rather than to whenever someone opened the browser." (line 153):

```js
  //
  // netzDayKey adds the second boundary, 07:30, where the הנץ row switches to tomorrow's
  // sunrise. Re-running restarts the six-hour interval, so its phase now hangs off both
  // boundaries: loads land at 00:00, 06:00, 07:30, 13:30 and 19:30 — never more than six
  // hours apart, which is the only thing that interval was ever there to guarantee.
```

- [ ] **Step 10: Pass `netz` into the resolver**

In the same file, replace the `resolvePrayers` call (lines 195-199):

```js
  const prayers = resolvePrayers(
    isShab ? SHABBAT_PRAYERS : WEEKDAY_PRAYERS,
    zmanimTimes,
    isShab ? shabbatTimes : { mincha: minchaTime }
  );
```

with:

```js
  const prayers = resolvePrayers(
    isShab ? SHABBAT_PRAYERS : WEEKDAY_PRAYERS,
    zmanimTimes,
    isShab ? shabbatTimes : { mincha: minchaTime, netz: netzTime }
  );
```

- [ ] **Step 11: Lint and build**

```bash
npm --prefix client run lint
npm --prefix client run build
```

Expected: lint reports no new errors (in particular no `react-hooks/exhaustive-deps` complaint about `netzDayKey`), and the build succeeds. If `exhaustive-deps` flags the new dependency, do **not** silence it with a disable comment — report it, because `israelDayKey` sits in the same array under the same conditions and a complaint about only one of them means something else is wrong.

- [ ] **Step 12: Verify in the running app**

```bash
npm run dev
```

Open `http://localhost:5173/` and, with the browser devtools Network tab filtered to `zmanim`:

1. Confirm **four** `hebcal.com/zmanim` requests go out on load (plus one to `/shabbat`). Identify each by its `date=` parameter, not by arrival order. Before 07:30 two of them carry the same date — today's — and that is the deliberate duplicate. After 07:30 one carries tomorrow's date.
2. Confirm the `שחרית מניין א׳ (הנץ)` row shows the `sunrise` from the response for that netz date, and that the זמנים panel's `הנץ החמה` row still shows **today's**. Before 07:30 these agree; after 07:30 they differ by about a minute. Read the two numbers off the Hebcal responses rather than judging by eye — a one-minute difference is easy to talk yourself into seeing.
3. In the evening, confirm `המניין הבא` names `שחרית מניין א׳ (הנץ)` with the same time the row shows.

- [ ] **Step 13: Verify the boundary crossing live**

This is the step the derived key exists for, and the one a manual page reload would hide. Do not skip it.

Temporarily change the constant in `displayData.js` to a minute or two ahead of the current wall clock — e.g. at 14:22, set:

```js
export const NETZ_NEXT_DAY_FROM_MIN = 14 * 60 + 24;
```

Leave the page open and watch. At that minute, without touching the browser:

- a new `hebcal.com/zmanim` request appears in the Network tab carrying **tomorrow's** `date=`
- the `שחרית מניין א׳ (הנץ)` row changes to that date's sunrise
- the זמנים panel does **not** move

Then revert the constant to `7 * 60 + 30` and confirm with `git diff` that nothing of the temporary value survives.

- [ ] **Step 14: Commit**

```bash
git add client/src/components/display/displayData.js client/src/hooks/useDisplayModel.js
git commit -m "feat: post tomorrow's הנץ on the שחרית row from 07:30

The row resolved against today's zmanim and turned over at midnight, so
from about 05:50 until 23:59 it posted a time that had already passed —
the wrong side of the day for a minyan that meets before six. The מניין
הבא countdown that rolls forward to it every evening carried the same
stale minute.

It now reads a date netzPrayerDate picks, fetched as a fifth leg of the
existing load, and the effect re-runs at 07:30 off a derived key rather
than a timer. The זמנים panel stays on the current day.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Cleanup

- [ ] **Remove the scratch directory**

```bash
rm -rf "$SCRATCH"
```

Confirm with `git status` that the working tree is clean and no `.mjs` file entered the repo.

## Spec coverage

| Spec section | Task |
|---|---|
| The rule — today before 07:30, tomorrow after | Task 1, Steps 3-4 |
| Continuous across midnight | Task 1, Step 1 (case `2026-07-31T21:00:00Z`) |
| Friday not special-cased | Task 1, Step 1 (case `2026-07-31T04:30:00Z`) + Task 2, Step 12 |
| Israel's clock, not the device's | Task 1, Step 5 |
| `computed` key, not a redirected `from:` | Task 2, Steps 3-4 |
| `from:` and `zmanimTimes` argument stay | Task 2, Step 3 (comment) — `resolvePrayers`'s signature is unchanged |
| Fifth leg, issued unconditionally | Task 2, Step 8 |
| Failure writes null → `--:--` | Task 2, Step 1 (last two checks) + Step 8 |
| Derived key trigger, no new timer | Task 2, Step 7 + Step 13 |
| Six-hour backstop phase documented | Task 2, Step 9 |
| זמנים panel unchanged | Task 2, Step 12 (check 2) + Step 13 |
| `computeNextMinyan` untouched | Task 2, Step 12 (check 3) — verified, not edited |
| Row label unchanged | Task 2, Step 1 (`row 0 is still the הנץ row`) |
| No test framework added | Global Constraints + Cleanup |
