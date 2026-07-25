# Admin-editable Shabbat times and ticker — Design

**Date:** 2026-07-25
**Status:** Approved — not yet implemented.
**Scope:** Two things the gabbai currently cannot change without editing source: the five
Shabbat prayer times, and the four lines of the bottom ticker. Both become editable in
`/adminGabbai` and take effect on the wall and on phones alike.

## Problem

Two unrelated requests that land in the same place.

**Shabbat times** are derived. מנחה is Saturday's sunset minus 90 minutes; שחרית is
07:45 in summer and 07:30 in winter; קבלת שבת is candle-lighting plus 2 or 5 minutes;
ערבית מוצ״ש counts back from a seasonal anchor. The arithmetic is in
`resolveShabbatTimes` and its constants in `SHABBAT_CONFIG`, both in
`client/src/components/display/displayData.js`. A shul that announces מנחה at a round
18:00 has no way to post it.

**The ticker** is `TICKER`, a single hardcoded string in the same file, read by the wall's
marquee and (since the mobile layout) by the phone footer. Changing a phone number in it
means a commit and a deploy.

Neither is a bug. Both are values that belong to the gabbai and currently live in a
developer's file.

## Decisions taken during design

| Question | Decision |
|---|---|
| What the gabbai sets for a Shabbat time | **A fixed clock time; blank means automatic** |
| Which Shabbat times get this | **All five**, each independently |
| How the ticker is edited | **A list panel** — one line per item, like הודעות |
| Where the values live | `content.json`, next to the panels |
| Settings transport | `GET`/`PUT /api/content/settings` |
| Automatic rules (`SHABBAT_CONFIG`) | Stay in code — they are *how* auto is computed |

### On blank meaning automatic

The alternative was a mode switch (`auto` / `fixed` radio plus a value). Rejected: it is
two controls where one will do, and the failure it prevents — a stale fixed time still
being served after someone meant to switch back — is exactly what an empty field
communicates without ceremony. Clearing the box is how you go back to automatic.

The cost is that "" and "not set" are the same state. That is acceptable here because
there is no third meaning to represent.

### On overriding a derived time whose neighbour derives from it

קבלת שבת is *candle-lighting plus 2 minutes* (summer) or *plus 5* (winter). If the gabbai
pins הדלקת נרות to 18:00 and leaves קבלת שבת automatic, the automatic value must be
computed from **18:00**, not from the Hebcal time it replaced. Two adjacent rows
contradicting each other — הדלקת נרות 18:00 above מנחה וקבלת שבת 18:23 — is worse than
either value alone being wrong.

So overrides resolve first, and any automatic value derived from another row derives from
that row's *effective* value.

This has a concrete consequence for the implementation: `toClock(candles, offset)` works on
an ISO timestamp, and an override is `'HH:MM'` with no date attached. Chaining off an
overridden candle time therefore needs clock arithmetic on the `'HH:MM'` string, not the
existing epoch arithmetic. A small `addMinutesToClock(clock, minutes)` covers it. It must
wrap at midnight, or a 23:50 + 15 override silently produces `24:05`.

### On an override surviving an unknown season

Three of the five rows blank to `--:--` today when `isSummerTime` cannot decide — a
deliberate choice, because a failed detection in July would otherwise post שחרית 07:30
plus winter offsets, three confidently wrong times with nothing on screen to say so.

An override is not a derivation, so it does not depend on the season being known. An
overridden row shows its value whatever the season detection did. This makes a pinned time
strictly more robust than the automatic one, which is the right ordering.

### On the ticker being a list rather than one long string

A single textarea containing `'…  •  …  •  …'` is less code. It was rejected on three
counts: the gabbai would have to type the separator himself and match its spacing; there
would be no way to hide one line without deleting it; and the phone footer already renders
one line per `•`-separated segment, so the list *is* the model the display wants — the
current string is a flattening of it.

As a list, `ticker` reuses `PANELS`, the shared controller, `PanelList`, `ItemForm`, the
500-item cap and the מוצג/מוסתר switch. The new server code is one entry in a table.

### On not adding `ticker` to `PANEL_ARRAY_KEYS`

`contentStore.load()` rejects any document missing one of `PANEL_ARRAY_KEYS`, logs it as
wrong-shaped, serves the seed and quarantines the file on the next write. Every
`content.json` in existence predates `ticker`. Adding the key to that list would classify
every real installation as corrupt and replace the gabbai's announcements and azkarot with
seed data. `jokes` already avoids this trap and this must too.

But `jokes`'s own answer — create the key lazily, empty — is wrong here. An empty `ticker`
on first load means **the footer disappears from the wall** the moment the server is
upgraded, which is a visible regression in a room full of people.

So the rule is narrower than either: `load()` fills a key that is **absent** from the
defaults, and leaves a key that is **present** alone. An upgrade inherits today's four
lines; a gabbai who deletes all four keeps an empty ticker. The two states are
distinguishable and both are honoured.

### On `/api/content/settings` colliding with `/api/content/:panel`

Express matches routes in declaration order. `GET /settings` must be registered before
`GET /:panel`, or the request reaches `getPanel`, where `isPanel('settings')` is false and
the response is a 404. `/api/settings` was not reused: that path is already mounted to the
Mongo-backed `routes/settings.js`, which does not work — the database is deliberately
absent — and layering a working endpoint next to a dead one at the same prefix invites the
wrong one to be called.

React Router ranks static segments above dynamic ones, so `/adminGabbai/settings` beats
`/adminGabbai/:panel` on the client without ordering care. The server does not; it needs
the explicit ordering.

## Data

```json
"ticker": [
  { "id": "seed-tic-1", "text": "בית כנסת נווה רחמים", "isActive": true },
  { "id": "seed-tic-2", "text": "נא לכבד את קדושת בית הכנסת ולכבות את הטלפונים", "isActive": true },
  { "id": "seed-tic-3", "text": "נדבת משפחת בן חמו לעילוי נשמת משה בן פרטונה", "isActive": true },
  { "id": "seed-tic-4", "text": "לתרומות והנצחות פנו לגבאי · 054-848-7595", "isActive": true }
],
"settings": {
  "shabbat": { "candles": "", "kabbalat": "", "shacharit": "", "mincha": "", "arvit": "" }
}
```

The four seed lines are the current `TICKER` string split on its separators, so an
installation that upgrades sees no change at all.

Each settings value is `'HH:MM'` or `''`. The server validates with the `TIME_RE` already
in `panels.js` and rejects anything else with the same Hebrew message shape the panels use.

## The five Shabbat rows

| Row | Settings key | Automatic value |
|---|---|---|
| הדלקת נרות | `candles` | Hebcal candle lighting (20 min before sunset) |
| מנחה וקבלת שבת | `kabbalat` | effective הדלקת נרות + 2 (קיץ) / + 5 (חורף) |
| שחרית | `shacharit` | 07:45 (קיץ) / 07:30 (חורף) |
| מנחה | `mincha` | Saturday's שקיעה − 90 min |
| ערבית מוצ״ש | `arvit` | קיץ: צאת הכוכבים − 3; חורף: הבדלה − 10 |

`kabbalat` is the only row that reads another row's effective value. The rest read Hebcal
or the config directly, so an override on any of them is a plain substitution.

The countdown gets this for free: `resolvePrayers` already builds each row's `clock` from
the computed map, and `computeNextMinyan` reads `clock`.

## Admin

Two new rows on `/adminGabbai`:

- **פס תחתון** → `/adminGabbai/ticker`, the existing list screen with one field, `text`.
- **זמני שבת** → `/adminGabbai/settings`, a new single-record screen with five time
  inputs and one save button.

The settings screen shows each field's current automatic value as its placeholder
(`אוטומטי · 18:13`), computed by calling the same Hebcal services and `resolveShabbatTimes`
the display uses. Without it the gabbai is overriding a number he cannot see. When Hebcal
is unreachable the placeholder falls back to `אוטומטי` alone — the screen stays usable.

Saving sends the whole `shabbat` object. An empty input is sent as `''`, which is what
clears an override.

## Display

`TICKER` is deleted from `displayData.js`. `useDisplayContent` gains `ticker` alongside the
other panels, filtered to active items exactly like them, and `useDisplayModel` passes it
through.

- **Wall** — `Ticker` receives the items and joins them with `'  •  '`, preserving today's
  spacing, and keeps doubling the string so the marquee loops.
- **Phone** — `TickerLines` receives the items and renders one per line. It stops splitting
  a string on `•`, which was only ever a re-derivation of this list.
- **Both** — an empty list hides the bar entirely rather than rendering an empty one.

`useDisplayModel` passes `settings.shabbat` into `resolveShabbatTimes` as a fourth input
next to candles / havdalah / saturdaySunset.

## Testing

Server, `node --test`, extending the existing 65:

1. Every settings field accepts `'HH:MM'` and `''` and rejects `'25:00'`, `'abc'`, and a
   non-string.
2. `PUT /api/content/settings` round-trips and `GET` returns what was written.
3. `GET /api/content/settings` resolves to the settings, **not** to the panel handler.
4. A `content.json` with no `ticker` key loads with the four seed lines and is **not**
   quarantined — the upgrade path, and the most important test here.
5. A `content.json` with `"ticker": []` stays empty.
6. `ticker` accepts create / update / delete / hide through the shared panel routes.

Client — still no test runner (out of scope, as before), so: lint, build, and the running
app. Specifically an override appearing on both layouts, the ticker edited from the admin
appearing on both, and קבלת שבת following an overridden הדלקת נרות.

## Out of scope

- Weekday מנחה (Thursday's sunset − 20), which was not asked for.
- Making `SHABBAT_CONFIG`'s offsets themselves editable. The gabbai pins a *time*; the
  formula behind the automatic value stays in code.
- Auth on the new endpoints. They inherit the existing unauthenticated-by-unlisted-path
  posture; see the admin panel spec's "On the absence of auth".
- Retiring the dead Mongo-backed `/api/settings` routes.
