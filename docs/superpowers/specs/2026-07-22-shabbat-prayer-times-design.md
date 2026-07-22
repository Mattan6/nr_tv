# זמני תפילות שבת — Design

**Date:** 2026-07-22
**Status:** Approved
**Scope:** Replace the placeholder Shabbat prayer times in the synagogue display with
rules that stay correct year-round for בית הכנסת נווה רחמים (Nitzan).

## Problem

`SHABBAT_PRAYERS` in `client/src/components/display/displayData.js` is placeholder
data: eight hardcoded clock times (הדלקת נרות at 18:21, ערבית מוצ״ש at 19:16) that are
right for roughly one week of the year. Candle lighting in Nitzan swings about 90
minutes between summer and winter, so the panel is wrong most of the time.

The weekday list was already converted to live Hebcal data in commit `0a2e917`. This
brings the Shabbat list to the same standard.

## The schedule

Five rows, replacing the previous eight.

| # | Row | Rule |
|---|-----|------|
| 1 | הדלקת נרות | Hebcal candle-lighting time for Nitzan |
| 2 | מנחה וקבלת שבת | candle lighting **+2 min** (שעון קיץ) / **+5 min** (שעון חורף) |
| 3 | שחרית | fixed **07:45** (שעון קיץ) / **07:30** (שעון חורף) |
| 4 | מנחה | Shabbat **שקיעה − 90 min**, both seasons |
| 5 | ערבית מוצ״ש | **הבדלה − 3 min** (שעון קיץ) / **− 10 min** (שעון חורף) |

Removed rows: סוף זמן ק״ש, מנחה גדולה, שיעור בפרשה. The first two already appear in the
זמנים panel on the left; the שיעור belongs in the שיעורים panel rather than among prayer
times. Five rows leave more whitespace between rows in a panel of fixed height; the type
sizes in `PrayerTimesPanel.jsx` are unchanged.

### Worked examples

Confirmed against practice during design.

| | שעון קיץ (late July, שקיעה 19:35) | שעון חורף (January, שקיעה 17:00) |
|---|---|---|
| הדלקת נרות | 19:15 | 16:40 |
| מנחה וקבלת שבת | 19:17 | 16:45 |
| שחרית | 07:45 | 07:30 |
| מנחה | 18:05 | 15:30 |
| ערבית מוצ״ש | 20:09 | 17:28 |

The winter מנחה at ~15:30 — about two hours before ערבית — is intentional and was
explicitly confirmed. שקיעה−90 applies in both seasons.

## Data sources

Three anchors drive every row: **candle lighting**, **Shabbat's שקיעה**, and **הבדלה**.

**Candle lighting and הבדלה** come from Hebcal's `/shabbat` endpoint, which the display
already calls via `getParasha()`. The response's `items` array carries entries with
`category: 'candles'` and `category: 'havdalah'` next to the `parashat` entry the code
currently reads; today the other two are discarded. No new request is needed — only
reading fields already on the wire.

The candle-lighting offset is sent explicitly as `b=20` (minutes before שקיעה) rather
than left to Hebcal's per-location default, which happens to be the same 20 today. Left
implicit, a change on Hebcal's side would silently move the shul's posted time with no
code change and no signal. The number lives in `SHABBAT_CONFIG`.

### Yom Tov weeks

The `/shabbat` range starts at **today** and runs through the whole Shabbat block, so any
week containing a Yom Tov returns **two** `candles` items and **two** `havdalah` items —
the festival's and Shabbat's. Anchors must therefore be selected by **date**, not by
position: `candles` from the Friday immediately before the upcoming Saturday, מוצ״ש from
that Saturday. Taking the first item of each category posts the festival's times instead
(Pesach 5786 returns 1 Apr 18:40 and 3 Apr 18:42 for a Shabbat on the 4th), and taking
the last is no better — the range can extend into a *following* Yom Tov. A missing item
yields `null`, never a neighbour's time.

When Shabbat runs straight **into** Yom Tov (Rosh Hashanah 2026-09-12, Sukkot
2027-10-02) there is no Saturday-night הבדלה at all: Hebcal emits a candle lighting that
night and הבדלה lands on Sunday, ~24 hours from every other row and not a minyan time.
ערבית still davens Saturday night at roughly the usual מוצ״ש hour, so the מוצ״ש anchor is
**that Saturday's `havdalah` item if present, otherwise that Saturday's `candles` item**.
The −3 / −10 offset applies either way.

**Shabbat's שקיעה** does need a new request. The display fetches *today's* zmanim, but
the Shabbat panel is reachable on any weekday through the TopBar toggle, so midweek
"today's sunset" is the wrong anchor for מנחה. A new `upcomingSaturday(now)` helper —
mirroring the existing `governingThursday` — supplies the date, fetched as a third
parallel request alongside the existing ones (see "Failure behavior" below: the four
requests are issued with `Promise.allSettled`, not `Promise.all`).

### Season detection

שעון קיץ / שעון חורף is **not** read from the device clock. A display panel with a
misconfigured timezone would otherwise show winter times all summer, silently and
indefinitely.

Hebcal's ISO timestamps carry Israel's actual UTC offset — `+03:00` during שעון קיץ,
`+02:00` during שעון חורף — so the season reads directly off data already in hand.
If that offset fails to parse, fall back to `Intl.DateTimeFormat` with
`timeZone: 'Asia/Jerusalem'` and `timeZoneName: 'shortOffset'`.

Israel's DST transitions (Friday before the last Sunday in March; last Sunday in
October) both fall around Shabbat, so the anchor date's own offset — not today's — must
decide the season.

`isSummerTime` therefore returns **`true`, `false`, or `null`** — never `false` as a
stand-in for "don't know". A failed detection in July would otherwise post שחרית 07:30
alongside winter offsets: three confidently wrong times with nothing on screen saying so.
`null` blanks the three season-dependent rows instead.

For the same reason every displayed clock is formatted through
`Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', … })`, in both the prayer and
זמנים panels. Formatting in device-local time while detecting the season
device-independently would render a self-contradicting panel on a wrongly-configured TV:
computed rows an hour off while the fixed שחרית string stayed put.

### Israel time everywhere, not just in the two panels

The same argument applies to everything else on the screen that answers "what time is
it", and to everything that answers "what day is it". The 100px header clock, the Hebrew
and Gregorian date strings, the weekday name, the מניין הבא countdown and the
Friday-09:00 / Sunday-00:00 schedule boundary all read the device's clock at first, which
merely relocated the contradiction: with the TV on UTC the זמנים rows posted
`שקיעה 19:43` while the clock above them read `16:43`.

The calendar half matters more than the clock half. `upcomingSaturday`,
`governingThursday` and `screenSegment` ask which *day* it is, so a TV set east of
Israel gets a different answer for part of every evening. On `Pacific/Auckland`,
`upcomingSaturday` called at Israel's Saturday 19:43 lands on the device's Sunday and
returns **next** Saturday — blanking every candle/havdalah row while שחרית and מנחה go on
describing the wrong Shabbat.

One helper, `israelParts(date)`, returns Israel's calendar parts (year/month/day,
hour/minute/second, and a weekday derived through a UTC `Date` so the device cannot nudge
it). The header clock, the countdown, the boundary and the Saturday/Thursday anchors all
read from it, and the three header `Intl` formatters take `timeZone: 'Asia/Jerusalem'`.
`israelToday(now)` gives the Hebcal service Israel's calendar day. If the runtime has no
tz database, `israelParts` falls back to the device's own fields — degrading to the old
behaviour rather than blanking the screen.

Rendered output is unchanged on an Israel-configured machine, and identical on `UTC`,
`Europe/Athens` and `Pacific/Auckland` — with one exception: the מניין הבא countdown now
does flat wall-clock arithmetic instead of an epoch difference, so on any machine it briefly
overshoots or undershoots by the DST offset in the evening window before one of Israel's own
DST transitions (a few thousand minutes a year; see the comment in `computeNextMinyan`). The
prayer name and displayed clock time are never affected.

## Code structure

### Config block

All five tunables live in one exported object in `displayData.js`, shaped to become the
future admin panel's payload:

```js
export const SHABBAT_CONFIG = {
  candleLightingMinBeforeSunset: 20,
  kabbalatAfterCandlesMin: { summer: 2, winter: 5 },
  shacharit:               { summer: '07:45', winter: '07:30' },
  minchaBeforeSunsetMin:   90,
  arvitBeforeHavdalahMin:  { summer: 3, winter: 10 },
};
```

When the admin panel arrives, only the *source* of this object changes — static import
becomes fetched state. No computation logic moves.

### Resolution

A pure function converts anchors plus config into displayable times:

```
resolveShabbatTimes({ candles, havdalah, saturdaySunset }, config)
  → { shabCandles, shabKabbalat, shabShacharit, shabMincha, shabArvit }
```

`SHABBAT_PRAYERS` entries reference these by `computed:` key — the mechanism
`WEEKDAY_PRAYERS` already uses for its weekly מנחה — so `resolvePrayers` needs no
changes.

Keys are prefixed `shab*` deliberately: the weekday list already uses the key `mincha`
for a different value, and `SynagogueDisplay` passes one merged `computed` map. Distinct
keys prevent the two schedules from colliding.

### Failure behavior

Any missing anchor yields `null` for the rows depending on it, which `resolvePrayers`
already renders as `--:--`. A Hebcal outage degrades to blank times rather than stale or
invented ones. This matches how the זמנים panel already behaves.

Each kind of failure has its own on-screen signature, and they are worth telling apart:

| What went wrong | What the שבת panel looks like |
|---|---|
| Whole `/shabbat` request failed | `הדלקת נרות`, `מנחה וקבלת שבת` and `ערבית מוצ״ש` blank; `שחרית` and `מנחה` still show times |
| Saturday zmanim request failed | only `מנחה` blank |
| **Season undetermined** (`isSummerTime` → `null`) | **`מנחה וקבלת שבת`, `שחרית` and `ערבית מוצ״ש` blank while `הדלקת נרות` and `מנחה` still show times** |

The third row is the distinctive one: it is the only case in which `שחרית` — a fixed
string with no anchor to lose — goes blank, and the only case in which `הדלקת נרות` shows
a time while the row two below it does not. If those three are blank and those two are
not, season detection failed; nothing else produces that pattern.

The four Hebcal requests are issued with `Promise.allSettled`, and each of the four
pieces of state is assigned from its own leg: one failing request blanks only what it
feeds. Assignment is unconditional — a rejected leg writes `null` rather than leaving the
previous value in place, because "stale" and "invented" are the same thing to somebody
reading the wall.

### Which schedule is on screen

The schedule switches to **שבת at Friday 09:00** and back to **חול at Sunday 00:00**, on
Israel's calendar. The TV is powered for weeks at a time, so this is re-derived from the
once-a-second clock tick rather than read once at boot, and it is derived — never written
back through a `useEffect`, which would be vulnerable to a backgrounded tab's throttled
timers and to remounts.

The calendar therefore alternates between two kinds of **segment**:

```
חול   Sunday 00:00 → Friday 09:00
שבת   Friday 09:00 → Sunday 00:00
```

`screenSegment(now)` returns both the screen and a `key` identifying the particular
*run* of it — the screen plus the Israel calendar date that run began on, e.g.
`shabbat@2026-07-24` or `weekday@2026-07-26`. A TopBar tap stores that key alongside the
chosen screen, and the override applies only while `screenSegment(now).key` still
matches. So a manual choice takes effect on the same render, survives every tick to the
end of the segment it was cast in, and is dropped at the next boundary.

**It must be the segment, not the screen value.** Pinning the override to the value it
was overriding — "apply while the schedule still says `weekday`" — does not expire it: it
merely stops *applying* at the next boundary and then resurrects when the schedule cycles
back to that value, which happens every single week. One tap of **חול** on a Saturday
would then suppress the שבת schedule on the following Friday, and the Friday after that,
indefinitely — precisely the failure auto-switching exists to eliminate, reachable by one
tap of its own toggle.

A date-stamped key rather than a boundary timestamp: expiry is an identity question ("am
I still in the segment I was cast in?"), not an ordering one, so no wall-clock-to-epoch
conversion is needed and no DST transition can land the comparison an hour either side of
a boundary. And a key like `weekday@2026-07-26` can never recur.

`computeNextMinyan` needs the same day awareness: the Shabbat list spans two days, and
without it a Saturday morning offers Friday's הדלקת נרות (first in the array, and in
summer nearly the latest clock) all the way through שחרית and מנחה. Each Shabbat row
therefore carries a `day` — Friday for הדלקת נרות and מנחה וקבלת שבת, Saturday for the
rest — and only rows belonging to the current day are eligible. Rows with no `day` belong
to every day, which leaves the untagged weekday list behaving exactly as before.

## Out of scope

**The admin panel.** מנחה was originally specified as admin-controlled. No admin panel
exists: `App.jsx` routes only `/` and `/zmanim` with a comment reading "Admin routes will
be added here", and while a Settings API is scaffolded (`server/src/routes/settings.js`,
`models/Settings.js`) it is Mongoose-backed against a database that
`server/src/config/database.js` deliberately runs without. Delivering it requires
persistence and auth decisions that warrant their own spec. `SHABBAT_CONFIG` is the seam
it will attach to.

## Verification

No test framework will be added (decided during design). Verification is manual:

1. Run `npm run dev` at the repo root and open the Shabbat panel via the TopBar toggle.
2. **On an ordinary week** — no Yom Tov, and not late on a Saturday night — confirm all
   five rows show real times and none read `--:--`. Blank rows are *correct* in the
   cases step 6 and "Known edge case" below describe; this step is the baseline, not a
   universal invariant.
3. Cross-check הדלקת נרות and הבדלה against hebcal.com for Nitzan for the coming Shabbat.
4. Confirm מנחה sits 90 minutes before **the coming Saturday's** שקיעה on hebcal.com —
   *not* before the שקיעה in the זמנים panel, which is today's and only coincides on
   Saturday itself.
5. Temporarily stub the anchors with a January date to confirm the winter branch
   produces the worked-example numbers above, then revert the stub.
6. Exercise a Yom Tov week and a Shabbat-into-Yom Tov week (see "Yom Tov weeks"), not
   only an ordinary one. Every anchor-selection bug this feature has had was invisible on
   an ordinary week.

Step 5 matters: without it the winter branch stays unexercised until the clocks change
in October.

## Known edge case

Hebcal's `/shabbat` endpoint eventually rolls forward to the *following* week's Shabbat
while `upcomingSaturday()` still returns today, so on Saturday night the two disagree
about which Shabbat is being described. Because the anchors are matched to that
Saturday's own calendar date (see "Yom Tov weeks" above), next week's candle lighting and
הבדלה are simply not adopted: הדלקת נרות, מנחה וקבלת שבת and ערבית מוצ״ש blank to `--:--`
while שחרית and מנחה — which hang off the Saturday zmanim request, not off `/shabbat` —
stay correct for the Shabbat that just ended. Accepted as-is: the panel's audience has
left by then, and blank beats posting next week's times as though they were tonight's.

The display returns to the חול schedule at Sunday 00:00 regardless.

### מניין הבא on a Saturday night

There is a second, narrower symptom in the same window. Once `ערבית מוצ״ש` has passed,
no Saturday-tagged row is still ahead, so `computeNextMinyan` rolls forward to the next
day carrying rows — Friday — and offers the הדלקת נרות of **the Shabbat that has just
ended**, six days in the past. The card reads, for example:

```
מניין הבא
הדלקת נרות
19:23
בעוד 142:53:00
```

It lasts from `ערבית מוצ״ש` until Hebcal's `/shabbat` rolls over to the following week
(after which that row blanks and the card falls to the next available one) — roughly
3.5 hours in summer, 6.5 in winter.

Accepted as-is. The countdown is the tell: anyone still in the building on מוצ״ש reading
`בעוד 142:53:00` can see it is pointing six days out, not at tonight. The audience has
left by then anyway. Recorded here so it is not re-reported as a new defect.

(A three-digit countdown on the שבת panel is not by itself a fault — tapping שבת on a
Sunday legitimately shows the coming Friday ~139 hours away. The symptom is specifically
a *Saturday night*, where the next minyan ought to be hours away and is not.)
