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
times. Five rows also render larger, which matters for legibility across a hall.

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

**Shabbat's שקיעה** does need a new request. The display fetches *today's* zmanim, but
the Shabbat panel is reachable on any weekday through the TopBar toggle, so midweek
"today's sunset" is the wrong anchor for מנחה. A new `upcomingSaturday(now)` helper —
mirroring the existing `governingThursday` — supplies the date, fetched as a third
parallel request inside the existing `Promise.all`.

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

## Code structure

### Config block

All five tunables live in one exported object in `displayData.js`, shaped to become the
future admin panel's payload:

```js
export const SHABBAT_CONFIG = {
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
2. Confirm all five rows show real times and none read `--:--`.
3. Cross-check הדלקת נרות and הבדלה against hebcal.com for Nitzan for the coming Shabbat.
4. Confirm מנחה sits 90 minutes before the שקיעה shown in the זמנים panel.
5. Temporarily stub the anchors with a January date to confirm the winter branch
   produces the worked-example numbers above, then revert the stub.

Step 5 matters: without it the winter branch stays unexercised until the clocks change
in October.

## Known edge case

On Saturday night after הבדלה, Hebcal's `/shabbat` endpoint begins returning the
*following* week's Shabbat. The display stays on the Shabbat screen until Sunday
(`isShabbatDay` matches days 5 and 6), so for those few hours it shows next week's times.
Accepted as-is — the panel's audience has left by then.
