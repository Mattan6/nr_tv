# Rolling שחרית הנץ over to tomorrow at 07:30 — design

## The problem

`שחרית מניין א׳ (הנץ)` is declared as `{ from: 'sunrise' }` (`displayData.js:15`), which
resolves against **today's** zmanim. Today's zmanim are re-read when Israel's calendar day
turns over, at 00:00.

So for the entire day after the minyan has davened — roughly 05:50 to 23:59 — the board
posts a time that has already passed, and it only becomes tomorrow's at midnight. For a
minyan that meets before six in the morning, midnight is the wrong side of the day to
update on: nobody planning to come is reading the board after it changes.

The countdown has the same defect from the other end. `computeNextMinyan` correctly rolls
forward to tomorrow once no weekday row is still ahead of `now`, but the row it rolls
forward to carries *today's* sunrise, so from about 19:30 every evening the "מניין הבא"
time is off by the day-over-day drift in sunrise.

## The rule

The sunrise date the prayer row displays is:

- **today**, before 07:30 Israel time
- **tomorrow**, from 07:30 onwards

No exceptions — not on Friday, not on erev chag.

The rule is continuous across midnight, which is the property that makes it safe. At 00:00
"tomorrow" becomes "today" and the same calendar date stays on screen; the only moment the
displayed date changes is 07:30. There is no second boundary to reason about and no window
in which the two rules disagree.

**Friday is deliberately not special-cased.** Between 07:30 and 09:00 the weekday board is
still showing (`screenSegment`, `displayData.js:432-443`), and under this rule it posts
Saturday's sunrise rather than Sunday's — Saturday having no הנץ minyan on this shul's
Shabbat schedule. That is a discrepancy of about a minute, inside a ninety-minute window,
once a week. Buying it back costs a day-of-week rule in the date helper, which is a
permanent piece of complexity for an error nobody standing in front of the screen can see.

### Where it lives

One pure function in `displayData.js`, beside `governingThursday` and `upcomingSaturday`,
which do the same kind of work for מנחה and for the Shabbat block:

```js
export const NETZ_NEXT_DAY_FROM_MIN = 7 * 60 + 30;
export function netzPrayerDate(now)   // → Date carrying the Israel calendar date
```

It reads the clock through `israelParts` and builds its result through `israelDateAtNoon`,
exactly as its two neighbours do. That is not incidental: a TV whose timezone was set wrong
at install must cross this boundary at 07:30 in Nitzan, not at 07:30 wherever the box
thinks it is. Noon rather than midnight for the same reason `israelDateAtNoon` already
gives — a DST jump in the device's own zone cannot slide the date back a day.

## A new `computed` key, not a redirected `from:`

`WEEKDAY_PRAYERS[0]` changes from `{ from: 'sunrise' }` to `{ computed: 'netz' }`, and the
hook passes the resolved time in alongside מנחה.

This is the shape מנחה already has — `{ computed: 'mincha' }` fed by `governingThursday`
and `weeklyMinchaTime` (`displayData.js:17,283,412`) — and for the same reason. `computed`
is what the file uses for a time whose *date* is not today's.

The alternative is to leave `from: 'sunrise'` in place and hand `resolvePrayers` a
different zmanim object than the one `ZMANIM_ROWS` reads. That is rejected. The two
consumers currently share one `zmanimTimes` state — `resolvePrayers` at
`useDisplayModel.js:197` and `zmanimRows` at `:206` — and the whole value of
that sharing is that `from:` means one thing: today. Giving the same key two meanings
depending on which caller is asking makes the difference invisible at both call sites, and
silently drags any future `from:`-declared row along with it.

`from:` itself stays, along with the `zmanimTimes` argument to `resolvePrayers`. After this
change no entry in either schedule uses it, so it is unused — but it is three lines, it is
documented in the header comment as one of the four entry shapes, and it is the correct way
to declare the next row that genuinely does track today.

## Fetching

A fifth leg in the existing `Promise.allSettled` (`useDisplayModel.js:113`):

```js
getZmanim(netzPrayerDate(instant))
```

resolved to `HH:MM` through `toClock` and held in its own state, `netzTime`, beside
`minchaTime`.

The request is issued unconditionally, including before 07:30 when its date is the same
date the first leg already asked for. One uniform code path, at the cost of a duplicated
request four times a day. The branch that would save it has to be correct on both sides of
a boundary that only moves once a day, which is more than the saved request is worth.

Failure behaves like every other leg there: a rejection is written back as `null`, and
`resolvePrayers` renders `--:--`. The row never shows a stale time. This is the same
failure the row has today when the zmanim request fails.

## The trigger

The load effect is already keyed on `israelDayKey`, so it tears down and re-runs within a
second of 00:00. A second key is added, derived from `netzPrayerDate`, which flips at 07:30
by the same mechanism.

No new timer and no `setTimeout` aimed at a wall-clock time. `now` already ticks once a
second, the key is computed during render, and React re-runs the effect on the tick that
crosses the boundary. A timer aimed at 07:30 would have to survive backgrounding, throttling
and remounts; a derived key has nothing to survive.

One documented side effect: re-running restarts the six-hour backstop interval, so its
phase now hangs off both boundaries. Loads land at 00:00, 06:00, 07:30, 13:30 and 19:30 —
never more than six hours apart, which is the only thing that interval was ever there to
guarantee.

## What does not change

| | |
|---|---|
| `ZMANIM_ROWS` and the זמנים panel | stay on the current day. It is the day's halachic table: tomorrow's הנץ beside today's חצות and שקיעה would contradict itself, and the whole table moving would post tomorrow's שקיעה while the sun is still up. |
| `computeNextMinyan` | untouched. It already rolls forward to the next day, and the change only makes the time it rolls forward *to* correct. |
| `PrayerTimesPanel`, `PrayerTimesCard`, `NextMinyanHero` | untouched. Both layouts inherit through the hook. |
| `/zmanim` | independent page, does not call `useDisplayModel`. |
| Row label | unchanged. No "מחר" marker: the gap between today's and tomorrow's sunrise is about a minute, so there is nothing visible to explain, and מניין הבא already answers "what is next" with a countdown attached. |

## Files

| File | Change |
|---|---|
| `client/src/components/display/displayData.js` | add `NETZ_NEXT_DAY_FROM_MIN` and `netzPrayerDate`; `WEEKDAY_PRAYERS[0]` becomes `{ computed: 'netz' }` |
| `client/src/hooks/useDisplayModel.js` | fifth `getZmanim` leg; `netzTime` state; `netzDayKey` in the effect's deps; pass `netz` into `resolvePrayers` |

No other client file, and no server file.

## Verification

The client has no test framework, and none is being added for this change.

What to check, at the boundary the change is about:

1. Before 07:30 the row posts today's sunrise; from 07:30 it posts tomorrow's. The two
   differ by about a minute, so the check is against Hebcal's own numbers for the two
   dates, not against eyeballing the screen.
2. Crossing 07:30 with the page left open flips the row without a reload — this is the part
   the derived key exists for, and the part a manual reload would hide.
3. Midnight does **not** move the row.
4. The זמנים panel is unchanged at every one of those moments.
5. In the evening, "המניין הבא" names שחרית הנץ with tomorrow's time.
6. Friday between 07:30 and 09:00 shows Saturday's sunrise, per the rule above.
