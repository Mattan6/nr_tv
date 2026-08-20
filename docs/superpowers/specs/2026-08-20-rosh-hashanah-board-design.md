# A ראש השנה board on /tv, and an admin that can hold seven of them — design

## What this is

`/tv` renders two boards today: the dark weekday canvas (`pages/SynagogueDisplay.jsx`) and the
light שבת canvas (`pages/ShabbatDisplay.jsx`), chosen on the calendar by `screenSegment`.

This adds a **third board, for ראש השנה**, on `/tv?screen=rosh` — a pomegranate-and-gold layout
drawn in Claude Design (`Synagogue Display Rosh Hashanah.dc.html`). Every value on it is edited
by the gabbai in `/adminGabbai`, and the three times that the calendar fixes — הדלקת נרות of
both nights and מוצאי החג — are pulled live from Hebcal for Nitzan.

It is **not** put on the schedule. `screenSegment` and `useScheduledScreen` are not touched, so
the board never comes up by itself; it is reached by typing the address, and the gabbai switches
the TV to it by hand when the חג comes in. That is what was asked for and it is also the only
correct answer this year: in 5787 יום א׳ דראש השנה *is* Shabbat, so a schedule rule would have
two boards claiming the same Saturday.

The second half of the work is the part with a longer life than this חג. יום כיפור, סוכות, פסח
and שבועות are coming, and the admin's flat list of seven panels cannot absorb five more boards'
worth. So the admin gains a **board dimension**: a home screen that lists boards, and a screen
per board that lists its panels. Each future חג is then a handful of schema entries and one
registry line — no new controller, no new route, no new admin screen.

`/` on a desktop, `/` on a phone and `/zmanim` are untouched. So are both existing boards.

---

## Scope

**In:**

- Five new content panels: `roshDay1`, `roshDay2`, `roshMechirot`, `roshDedication`, `roshTicker`.
- A `kind` select on prayer rows and on מכירת מצוות items, replacing the mockup's Hebrew regexes.
- A `settings.rosh` override group beside `settings.shabbat`, with the same blank-means-automatic
  rule, fed by a new Hebcal holiday-calendar request.
- `pages/RoshDisplay.jsx`, `components/rosh/*`, `hooks/useRoshModel.js`.
- `?screen=rosh` on `/tv`.
- A two-level admin: boards home → board screen → the existing panel screens.
- Generic row reordering (up/down) on every panel — the 11-row prayer list needs it and nothing
  in the admin can reorder anything today.
- The mockup's content, seeded verbatim.

**Out:**

- Any schedule change. The board is manual, permanently.
- יום כיפור / סוכות / פסח / שבועות boards. This design makes them cheap; it does not build them.
- Splitting the existing shared `ticker` between the חול and שבת boards. Those two share one
  ticker today and nothing in this request asks to change that; doing it silently would either
  blank a live board or duplicate every line. A separate ticker per board applies to the חג
  boards, which have no ticker yet.
- A נמכר / buyer column on מכירת מצוות. The mockup carries a `soldByDay` map, but it is dead
  code there — `renderVals` computes `sold` and never reads it — and the board's job is to post
  the running order before the auction, not to score it during.
- Rich text, images or uploads on any of the new panels.

---

## 1. The data model

### Five panels, in `server/src/store/panels.js`

The codebase's rule holds: a new editable panel is a schema entry, never a new route. One
controller and one pair of admin screens keep serving everything.

```js
// One schema, mounted as the two day panels — the same sharing-by-reference SHIUR_FIELDS
// already uses, and for the same reason: one controller serves both, so a field that differed
// between them could only ever be a bug.
const ROSH_ROW_FIELDS = {
  name:   { required: true },
  time:   { required: false, pattern: TIME_RE, message: 'שעה חייבת להיות בפורמט 06:45' },
  chazan: { required: false },
  kind:   { required: false, values: ROW_KINDS },
};
```

| key | fields |
|---|---|
| `roshDay1` | `ROSH_ROW_FIELDS` |
| `roshDay2` | `ROSH_ROW_FIELDS` |
| `roshMechirot` | `label` (required) · `day` (`values: ['day1','day2']`) · `kind` (`values: ['auction','general']`) |
| `roshDedication` | `lead` / `names` / `note` — the existing `dedication` schema, lifted into a named `DEDICATION_FIELDS` const and shared by reference so the two can never drift |
| `roshTicker` | `text` (required) |

`time` is **optional**, and that is load-bearing rather than lax. Four rows in the mockup carry
no time at all — ערבית ליל החג, עת שערי רצון, מוסף on both days — because they follow whatever
came before them and the shul does not post a minute for them. `validateItem`'s existing
optional branch already does the right thing: a blank stores `''` and skips the pattern check,
so only a *non-empty* time has to look like `19:07`.

`chazan` is the row's detail line, and it carries different things in different rows — the חזן
on תפילה rows, the מגיד שיעור on שיעור rows, the גבאי on מכירת מצוות, and the location on תשליך
(`בבית משפחת רחמין`). Its admin label is **חזן / פרטים** for that reason.

### The `kind` select, and what it replaces

The mockup decides a row's colour by running four regexes over its Hebrew name:

```js
if(/תקיעת שופר/.test(p.name))          // orange
if(/עת שערי רצון|תשליך/.test(p.name))  // blue
if(/מכירת מצוות/.test(p.name))          // gold
if(/שיעור|דבר תורה/.test(p.name))       // burgundy
```

That is fine in a mockup whose strings are fixed and wrong the moment the gabbai types
`תקיעות שופר` or `שיעור הלכות ראש השנה`: the highlight silently vanishes and — worse — the
תקיעת שופר card at the top of the board goes blank, because the same regex is what finds the
row it counts down to. The row's kind becomes an explicit field:

| value | Hebrew label | row treatment |
|---|---|---|
| `regular` | רגילה | plain |
| `shiur` | שיעור / דבר תורה | burgundy tint, right accent |
| `shofar` | תקיעת שופר | orange gradient, thick accent |
| `tashlich` | תשליך | blue tint |
| `piyut` | פיוט / מעמד מיוחד | blue tint |
| `mechirot` | מכירת מצוות | gold tint |

`piyut` exists because עת שערי רצון is styled exactly like תשליך in the mockup but must **not**
feed the תשליך card. Splitting them is the whole reason the field beats the regex: appearance
and meaning were fused in the mockup, and only one of them belongs to a card.

A blank `kind` reads as `regular`, so an item written through the API without one is valid.
The form always sends a value — a `<select>` has no empty state — so this only covers direct
API writes.

### Two derived cards

`shofar` and `tashlich` do double duty: they colour their row **and** they are the source for
the two highlight cards, so the gabbai edits each fact in exactly one place.

- **תקיעת שופר card** — the row whose kind is `shofar`, searched `roshDay2` then `roshDay1`. Its
  time plus the date of the day-list it was found in gives a real instant, and the card counts
  down to it in Israel time. Label: `יום א׳ דחג` or `יום ב׳ דחג` — whichever list held it —
  followed by `· {chazan}` when that field is filled.
- **תשליך card** — the row whose kind is `tashlich`. Label `תשליך · יום {weekday}`, where the
  weekday comes from that day-list's Gregorian date (so it reads `יום שבת` in 5787 and adjusts
  itself in 5788). Time from `time`, place from `chazan`.

Neither card is hidden when its row is missing: the highlight strip is a three-column grid and
collapsing one member would reflow the other two. Each renders a quiet placeholder, as the
existing boards' cards do.

The shofar card's label is the one string on the board that is **derived rather than
transcribed**. The mockup hard-codes `יום ב׳ דחג · לאחר קריאת התורה`; here the second half is
the row's own detail field, which seeds as `הבעל תוקע ישובץ בהמשך`. Changing the card's wording
therefore means editing that row — which is the point, but it is worth knowing that it is where
the string lives.

### Store plumbing

`server/src/store/contentStore.js`: the five keys join **`BACKFILL_KEYS`, never
`PANEL_ARRAY_KEYS`**. Every content.json written before today lacks all five, and adding them
to the shape check would condemn the shul's real file as wrong-shaped and serve the seed over
the gabbai's live announcements and azkarot.

`client/src/hooks/useDisplayContent.js`: the five keys join `EMPTY_LISTS`, and `activeOnly`
stops hard-coding one settings group:

```js
settings: { shabbat: doc?.settings?.shabbat || {}, rosh: doc?.settings?.rosh || {} },
```

---

## 2. The three automatic times

### The override group

```js
settings.rosh = { candles1: '', candles2: '', havdalah: '' }
```

Blank means compute it from Hebcal for Nitzan; a filled value pins it until it is cleared —
exactly `settings.shabbat`'s contract, and the same admin form pattern.

### `validateSettings` becomes group-aware

Today it validates one group and returns it whole:

```js
return { settings: { shabbat } };
```

If `rosh` were simply added alongside, every save on the זמני שבת screen would blank the חג
overrides, because that screen posts `{ shabbat: values }` and the validator would write a fresh
empty `rosh` beside it.

**The group is the unit of replacement.** Within a group every key is written whether or not the
body carried it — a blank is a real value there, it is what clears a pin, so a partial body must
not leave half a group standing. Across groups, only the groups present in the body are
returned, and the controller merges them over the stored record. `PUT /content/settings` with
`{shabbat:{…}}` leaves `rosh` exactly as it was, and vice versa.

An unknown group key is dropped, as unknown field keys already are.

### One Hebcal request, good for every future חג

`services/hebcal.js` gains `getHolidayCalendar(from, days)`:

```
GET /hebcal?v=1&cfg=json&maj=on&c=on&i=on&M=on&b=20
            &geo=pos&latitude=31.7167&longitude=34.6333&tzid=Asia/Jerusalem
            &start=<from>&end=<from + days>
```

- `maj=on&c=on` — major holidays plus their candle-lighting and havdalah items.
- `i=on` — Israel's scheme. Immaterial for ראש השנה, which is two days everywhere; it is here
  for סוכות and פסח, which are not.
- `b=20` and `M=on` — the same הדלקת נרות offset and nightfall הבדלה the שבת board already
  requests, so the two boards can never post two different candle-lighting rules.
- `LOCATION` is the module's existing Nitzan constant. One definition of where the shul is.
- **No `lg=he`**, deliberately, even though every other Hebcal call on this board is for a
  Hebrew-speaking screen. Nothing from this response is ever displayed — only its dates and
  times are read — and `lg=he` rewrites `title` into pointed Hebrew (`רֹאשׁ הַשָּׁנָה 5787`),
  turning the one field the matcher keys on into display copy. Left off, `title` stays a stable
  English identifier.

The window is `today − 3` through `today + 400`. The `−3` is what keeps the board correct
*during* the חג itself and the morning after; the `+400` guarantees exactly one ראש השנה is in
range no matter which day of the year the TV is switched to this board.

### `holidayAnchors` — a pure function over that response

```js
holidayAnchors(response, { title: 'Rosh Hashana', days: 2 })
//   → { day1Date, day2Date, candles1, candles2, havdalah }
```

It finds the **first** item in the window that is `category: 'holiday'`, carries
**`yomtov: true`**, and whose `title` starts with the חג's name; takes that as `day1Date`,
derives `day2Date` as the next calendar day, and then matches the candle/havdalah items to
those dates:

`yomtov` is what makes the match safe. `Erev Rosh Hashana` is also `category: 'holiday'`,
`subcat: 'major'`, and it lands a day *earlier* — so a matcher keyed on category and title
alone would take ערב ראש השנה as day 1 and slide the whole board back twenty-four hours. Only
the two real חג days carry `yomtov: true`. (The observed titles are `Rosh Hashana 5787` and
`Rosh Hashana II`, which is why the test is `startsWith` and not equality.)

- `candles1` — the `candles` item on `day1Date − 1` (ערב יום א׳).
- `candles2` — the `candles` item on `day1Date` itself (ליל יום ב׳, at nightfall; on ראש השנה
  night two this is always lit from an existing flame, which is why the card's note says so).
- `havdalah` — the `havdalah` item on `day2Date` (מוצאי החג).

Matching by calendar date rather than by array position is not a stylistic choice — it is the
bug `shabbatAnchors` already documents. A window containing ראש השנה and the Shabbat after it
carries several `candles` items, and taking the first would post the wrong night. Any anchor
that cannot be matched yields `null`, which the card renders as `--:--`; a חג board never shows
a stale time from last year.

The Hebrew year on the masthead (`תשפ״ז`) is derived locally from `day1Date` with
`Intl.DateTimeFormat('he-u-ca-hebrew', { year: 'numeric' })` — no network, and no literal to go
stale next Elul.

### Resolution

```js
resolveRoshTimes(anchors, overrides) // → { candles1, candles2, havdalah } as 'HH:MM'
```

Resolved at **render**, not inside the fetch — the same split `resolveShabbatTimes` makes and
for the same reason. The overrides arrive on the 30-second content poll and the anchors on a
six-hour one; resolving inside the fetch would leave a time the gabbai just pinned unshown for
up to six hours, while adding the overrides to the effect's dependencies would re-request Hebcal
on every poll. It is string arithmetic and costs nothing at render.

---

## 3. The board

### Route

`pages/TvDisplay.jsx`'s `previewScreen()` accepts a third value:

```js
return value === 'shabbat' || value === 'weekday' || value === 'rosh' ? value : null;
```

and `?screen=rosh` mounts `RoshDisplay` with the existing `TV_SAFE_AREA`. `useScheduledScreen`
returns only `'weekday'` or `'shabbat'`, so `rosh` is reachable **only** through the query
string. A plain `/tv` reload always returns to the schedule — the property the file already
relies on for the שבת preview, now doing real work: the gabbai switches to the חג board by
typing the address and back by reloading.

`screenSegment` is not modified. Neither is `useDisplayModel`.

### Files

```
client/src/pages/RoshDisplay.jsx
client/src/hooks/useRoshModel.js
client/src/components/rosh/
    roshStyle.js       palette + shared card style (pomegranate #7d2233, gold #b0873f, cream)
    icons.jsx          shofar, pomegranate wreath, the eight simanim
    Masthead.jsx
    HighlightStrip.jsx DedicationCard · ShofarCard · TashlichCard
    DayListCard.jsx    one card, mounted twice
    CandlesCard.jsx
    MechirotCard.jsx
    SimanimStrip.jsx
    RoshTicker.jsx
    roshData.js        the pure functions
```

Same fixed 1920x1080 canvas, same `useCanvasScale`, same `safeArea` inset as both existing
boards.

### A separate model hook

`useRoshModel` rather than a `'rosh'` branch in `useDisplayModel`.

`useDisplayModel` is 380 lines carrying six network legs, four timers and three rotation
counters, and ראש השנה shares almost none of it: no parasha, no מן הפרשה, no הנץ rollover, no
weekly מנחה, no jokes, no חול/שבת toggle, no `computeNextMinyan`. Branching it would add a
fourth schedule to a hook that already documents how carefully its three interact, in exchange
for reusing a clock tick.

What it *does* reuse is every pure helper: `israelParts`, `israelToday`, `toClock`,
`useDisplayContent`, and the same `Intl` formatters for `hebDate` / `greg`. One definition of
"what time is it in Nitzan" still serves all three boards.

The Hebcal effect is keyed on Israel's calendar day (`israelDayKey`) with a six-hour interval
backstop — the same shape and the same reasoning as `useDisplayModel`'s, minus the 07:30
`netzDayKey` boundary, which this board has no row that needs.

### Card by card

| card | source |
|---|---|
| Masthead | live clock / hebDate / greg; `תשפ״ז` derived from `day1Date`; shul name, nusach and the שנה טובה copy are literals, as they are on both existing boards |
| הקדשה | `roshDedication`, rotated on the shared 6.5s tick, keyed on `ded.id` — **not** on the tick, or a single dedication would fade itself back in every 6.5 seconds forever (the bug `DedicationCard` already documents) |
| תקיעת שופר | derived from the `shofar` row; label `יום {א׳ or ב׳} דחג · {chazan}`, naming whichever day-list the row was found in; live countdown, clamped at zero once the חג has passed |
| תשליך | derived from the `tashlich` row |
| יום א׳ / יום ב׳ | `roshDay1` / `roshDay2` in the gabbai's order, styled by `kind` |
| הדלקת נרות | `resolveRoshTimes`; the three row labels and the מאש קיימת note are literals — they are true of every ראש השנה |
| מכירת המצוות | `roshMechirot`, grouped by `day`, paginated four to a page, advancing on the shared tick with the diamond dot strip |
| סימני השנה | eight hand-drawn SVGs, fixed. Decoration, like the שבת board's tallit band |
| פס תחתון | `roshTicker` |

`mechirotPages(items, perPage)` reproduces the mockup's split exactly: number the items within
each day, then page that day at `size = ceil(len / ceil(len / perPage))` — ten items become
4 + 4 + 2. The day heading composes `יום א׳ דראש השנה · {weekday}` from the stored `day` value
and the anchors' dates, so the weekday is right in every year rather than frozen at `שבת`.

---

## 4. The admin

### Two levels

```
/adminGabbai                    boards home
/adminGabbai/board/:board       one board's panels
/adminGabbai/settings/:group    times form  (/adminGabbai/settings stays as an alias for shabbat)
/adminGabbai/:panel             unchanged
/adminGabbai/:panel/new         unchanged
/adminGabbai/:panel/:id         unchanged
```

```
ניהול תוכן                     ראש השנה
──────────────                 ──────────────
🗂  כללי             ›          📜  יום א׳ דראש השנה   11 ›
📅  חול              ›          📜  יום ב׳ דראש השנה   10 ›
🕯  שבת              ›          🔨  מכירת מצוות        18 ›
🍎  ראש השנה         ›          🕍  הקדשת הלוח          1 ›
                               📢  פס תחתון            5 ›
                               ⏰  זמני החג              ›
```

| board | panels |
|---|---|
| כללי | הודעות · שמחות ומזל טוב · לעילוי נשמת · פס תחתון (חול ושבת) |
| חול | שיעורי תורה · חול |
| שבת | שיעורי תורה · שבת · הקדשת לוח השבת · זמני שבת |
| ראש השנה | יום א׳ · יום ב׳ · מכירת מצוות · הקדשת הלוח · פס תחתון · זמני החג |

React Router ranks static segments above dynamic ones regardless of declaration order, so
`/adminGabbai/board/:board` and `/adminGabbai/settings/:group` win over `/adminGabbai/:panel/:id`
without ordering care — the opposite of Express, where `routes/content.js` does depend on
declaration order. Worth stating because both files are edited in this change.

### `client/src/pages/Admin/boards.js`

The registry: board id, Hebrew title, icon, its ordered panel keys, and its settings group if it
has one. Plus `boardOfPanel(key)`, so `PanelList` and `ItemForm` send their `‹ חזרה` link back to
the board the panel belongs to rather than to the home screen.

**The server knows nothing about boards.** `PANELS` stays flat and `PANEL_KEYS` stays a flat
array; grouping is presentation, and it lives beside the rest of the presentation in
`panelMeta.js`'s neighbourhood. A future חג touches `panels.js`, `defaultContent.js`,
`contentStore.js`, `panelMeta.js`, `useDisplayContent.js` and one line of `boards.js`.

### `ShabbatTimesForm` → `TimesForm`

One screen driven by a descriptor per group: the rows (key, label, and which key of the resolved
map holds the automatic value) and the async loader that produces those automatic values. Two
descriptors today — `shabbat` (five rows, `resolveShabbatTimes` over `shabbatAnchors`) and
`rosh` (three rows, `resolveRoshTimes` over `holidayAnchors`).

Everything the שבת form already gets right is kept as-is: the stored overrides are the only
request the form waits on, the automatic values load in a **separate** effect that nothing
blocks on (a slow Hebcal must never disable the form the gabbai came here to use), `null` versus
a value distinguishes "still calculating" from "cannot be calculated", and each field shows
`קבוע ·` or `אוטומטי ·` with the number it would show if cleared.

### `ItemForm` gains `select`

One more branch beside `rich` and `textarea`, rendering a native `<select>` from the field's
`options: [{value, label}]`. Native because this admin is used on a phone, and a native select
gets the platform's own picker.

### `panelMeta.js`

Five entries mirroring the server schemas, as the file's own comment requires — the duplication
is deliberate there, and adding a field means editing both.

---

## 5. Reordering, on every panel

Nothing in the admin can move an item today; order is insertion order, and the only way to fix
a mistake is to delete and re-add. A ראש השנה day list is eleven rows in liturgical sequence, so
that is not survivable.

**Server** — `PUT /content/:panel/order`, body `{ ids: [...] }`. The mutator validates that the
array is a permutation of the panel's current ids — same length, same set, no duplicates — and
reorders in place; anything else is a 400 and nothing is written. A permutation check rather
than a positional patch because two admin tabs open on one phone must not be able to drop a row.

Declared **before** `/:panel/:id` in `routes/content.js`. Express matches in declaration order,
so a `PUT /content/roshDay1/order` reaching `updateItem` would try to edit an item with the id
`order` and answer 404 — the identical trap the file already documents for `/settings`.

**Client** — `▲ ▼` buttons on each `PanelList` card, optimistic like the existing `isActive`
toggle: the row moves immediately and rolls back with `הסדר לא נשמר` if the save fails. Generic,
so every panel gains it.

---

## 6. Seed data

`server/src/store/defaultContent.js` gets the mockup's content **verbatim** — the names, the
times, the חזנים and the dedication. This is Matan's own content, already corrected at the
mockup stage, not invented sample text, so the "seed empty unless it restores what the wall
already showed" rule does not apply: the rule guards against putting a stranger's family name on
a real shul's board, and here the shul and the family are the same one that will read it.

Every value is editable in `/adminGabbai` from the moment the server boots. Seed ids are fixed
readable strings (`seed-r1-1`, `seed-mech-3`, …) so the file stays diff-able and the tests stay
deterministic, exactly as the existing seeds are.

### `roshDay1` — יום א׳ דראש השנה

| # | name | time | chazan / details | kind |
|---|---|---|---|---|
| 1 | מנחה ערב חג | 18:35 | החזן ישובץ בהמשך | regular |
| 2 | דבר תורה | 18:50 | יצחק כהן שליט״א | shiur |
| 3 | מכירת מצוות | 19:00 | הגבאי ר׳ ברוך מזוז | mechirot |
| 4 | ערבית ליל החג | — | החזן ישובץ בהמשך | regular |
| 5 | שיעור | 06:45 | ר׳ אפרים עבדיאן שליט״א | shiur |
| 6 | שחרית | 07:30 | החזן ישובץ בהמשך | regular |
| 7 | עת שערי רצון | — | — | piyut |
| 8 | מוסף | — | החזן ישובץ בהמשך | regular |
| 9 | שיעור | 15:20 | ר׳ אפרים עבדיאן שליט״א | shiur |
| 10 | מנחה | 16:20 | החזן ישובץ בהמשך | regular |
| 11 | תשליך | 17:00 | בבית משפחת רחמין | tashlich |

### `roshDay2` — יום ב׳ דראש השנה

| # | name | time | chazan / details | kind |
|---|---|---|---|---|
| 1 | מכירת מצוות | 19:15 | הגבאי ר׳ ברוך מזוז | mechirot |
| 2 | ערבית ליל החג | — | החזן ישובץ בהמשך | regular |
| 3 | שיעור | 06:20 | ר׳ אפרים עבדיאן שליט״א | shiur |
| 4 | שחרית | 07:00 | החזן ישובץ בהמשך | regular |
| 5 | עת שערי רצון | — | — | piyut |
| 6 | תקיעת שופר | 09:45 | הבעל תוקע ישובץ בהמשך | shofar |
| 7 | מוסף | — | החזן ישובץ בהמשך | regular |
| 8 | שיעור | 17:20 | ר׳ אפרים עבדיאן שליט״א | shiur |
| 9 | מנחה | 18:30 | החזן ישובץ בהמשך | regular |
| 10 | ערבית מוצאי חג | 19:07 | החזן ישובץ בהמשך | regular |

### `roshMechirot`

The item labels themselves contain the `·` separator, so they are listed one per row rather than
run together:

| # | `day1` label | `day2` label |
|---|---|---|
| 1 | `ברכת השנה` *(general)* | `ברכת השנה` *(general)* |
| 2 | `פרנסה` | `פרנסה` |
| 3 | `פתיחת היכל` | `פתיחת היכל` |
| 4 | `הולכה והגבהה` | `הולכה והגבהה` |
| 5 | `עלייה · שלישי` | `עלייה · שלישי` |
| 6 | `עלייה · רביעי` | `עלייה · רביעי` |
| 7 | `עלייה · חמישי` | `עלייה · חמישי` |
| 8 | `עלייה · שישי` | `עלייה · מפטיר` |
| 9 | `עלייה · שביעי` | — |
| 10 | `עלייה · מפטיר` | — |

Everything except ברכת השנה is `auction`, which badges as `מכירה פומבית`; ברכת השנה is
`general`, which badges as `מכירה כללית · פנו לגבאי` in burgundy.

Ten items and eight items paginate as **4 + 4 + 2** and **4 + 4** — five pages, five dots. That
is the mockup's own arithmetic reproduced exactly (`n = ceil(len/perPage)`, then
`size = ceil(len/n)`), not an even split: for ten items it yields a size of four and a short
last page rather than 4 + 3 + 3.

The stored `day` is `day1` / `day2` only. The mockup's `· שבת` and `· ראשון` suffixes are
composed at render from the anchors, so they are right in 5788 too.

### `roshDedication`

One item, matching the mockup's card: `מֻקְדָּשׁ לְהַצְלָחַת` / `מִשְׁפַּחַת מַזּוּז` /
`בְּכָל הָעִנְיָנִים`. Seeded with its niqqud because that is the board's typography; the gabbai
may type with or without. The card's footer — `להקדשת הלוחות הבאים — חג או שבת — נא לפנות לגבאי`
— is a literal, as its שבת counterpart is.

The panel is a list and the card rotates through it, so a second and third dedication need no
code — which is what was asked for.

### `roshTicker`

The mockup's marquee, split on its `•` separators into five lines:

1. שנה טובה ומבורכת לכל בית ישראל
2. כתיבה וחתימה טובה לכל קהל בית הכנסת ובני משפחותיהם
3. בליל יום שני מדליקים נרות מאש קיימת בלבד ומברכים שהחיינו על פרי חדש
4. לוח ראש השנה מוקדש להצלחת משפחת מזוז בכל העניינים
5. רוצים להקדיש את הלוחות הבאים? חג או שבת — פנו לגבאי

### `settings.rosh`

All three blank — the three candle/havdalah times come from Hebcal for Nitzan.

The mockup's `18:32 / 19:28 / 19:27` are **not** samples: a live request for Nitzan returns
exactly those three values for תשפ״ז, so the board will post the same numbers the mockup shows
without any of them being stored. That is the argument for leaving the overrides blank rather
than seeding the three: seeding them would pin 5787's numbers onto 5788 and every year after,
and the whole point of the automatic pull is that nobody has to remember to clear them.

---

## 7. What the next חג costs

| file | what יום כיפור adds |
|---|---|
| `server/src/store/panels.js` | its panel schemas, reusing `ROSH_ROW_FIELDS` where the shape matches |
| `server/src/store/defaultContent.js` | its seed arrays and `settings.kippur` |
| `server/src/store/contentStore.js` | its keys in `BACKFILL_KEYS` |
| `client/src/hooks/useDisplayContent.js` | its keys in `EMPTY_LISTS` |
| `client/src/pages/Admin/panelMeta.js` | Hebrew titles, icons, fields |
| `client/src/pages/Admin/boards.js` | **one** registry entry |
| `client/src/services/hebcal.js` | nothing — `getHolidayCalendar` already returns it |
| `client/src/components/rosh/roshData.js` | nothing — `holidayAnchors` is parameterised by title |
| the board itself | its own page, hook and components |

A **generic** holiday model hook is deliberately not built now. יום כיפור has one day, no
מכירת מצוות in the same shape, and כל נדרי and נעילה as its landmarks; סוכות has seven days and
הושענות. Abstracting a shared board hook from a single example would be guessing at the axes
that vary, and the guess would be wrong. What is shared is what is genuinely shared and already
proven: the panel machinery, the admin screens, one Hebcal request, one anchor matcher, and one
set of Israel-time helpers. The second חג board is what will show which parts of the third layer
deserve to be lifted.

---

## 8. Tests

`node --test`, both sides, run by `npm test` at the root.

**Server**

- `panels.test.js` — its first assertion is the exact `PANEL_KEYS` array and will fail until
  updated. Plus: `time` accepts a blank and rejects `25:00`; `kind` rejects a value outside
  `ROW_KINDS`; `roshMechirot.day` rejects an unknown day.
- `contentStore.test.js` — a document written before this change gains all five panels and
  `settings.rosh` on load; a document that already carries an **empty** `roshTicker` keeps it
  empty rather than being refilled from the seed.
- `contentApi.test.js` — CRUD on `roshDay1`; `PUT /content/settings` with only `shabbat` leaves
  a stored `rosh` untouched, and the reverse; `PUT /content/:panel/order` reorders on a
  permutation and 400s on a non-permutation, a short array and a duplicate id.

**Client**

- `roshData.test.js`, against a saved Hebcal fixture in `client/test/fixtures/` covering
  ראש השנה 5787 in Nitzan: `holidayAnchors` picks the two dates and all three anchors; it picks
  the ראש השנה candles and not the following Shabbat's; a missing item yields `null` rather than
  a neighbour's time; `resolveRoshTimes` prefers a pinned override and falls back to the anchor;
  `mechirotPages` splits ten into 5 + 5; `shofarCountdown` counts down in Israel time and clamps
  at zero after the חג.

The fixture is captured from a real request and committed, so the suite needs no network — the
same approach the existing client tests take.

There is no client component-test harness and adding one is out of convention here. The board
itself is verified by running the app: `npm run dev` at the root, then `/tv?screen=rosh`.

Note for whoever runs the timezone-sensitive checks: **Git Bash does not propagate `TZ` to
`node.exe` on this machine**, so a `TZ=Pacific/Auckland node --test` there passes without ever
having tested anything. Use PowerShell (`$env:TZ='Pacific/Auckland'; node --test`).

---

## 9. Decisions taken, and why

**The board is not on the schedule, permanently.** Asked for, and independently correct: in 5787
יום א׳ דראש השנה is Shabbat, so a calendar rule would put two boards on one Saturday.

**Flat panel keys with a board registry, not a nested per-board document.** Nesting groups a
board's data structurally, and costs a rewrite of `doc[panel]` in the controller, `shapeError`,
`activeOnly` and both admin screens, plus a `/content/:board/:panel` route shape — a rewrite of
working, tested code in exchange for a naming preference.

**Two day panels, not one list with a day column.** The codebase already settled this reasoning
for `shiurim` / `shiurimShabbat`: the gabbai edits *the יום ב׳ list*, not *a row with a day
flag*. And twenty-one rows in one phone-sized list is not an editable screen.

**`kind` as an explicit field, not a regex over the name.** The regex fuses appearance with
meaning, breaks silently when the gabbai rewords a row, and takes the שופר card down with it.
The field also separates עת שערי רצון from תשליך, which look identical and mean different
things.

**A separate `useRoshModel`.** `useDisplayModel` is 380 lines and shares nothing with this board
but a clock tick. The pure helpers are reused; the orchestration is not.

**One shared ticker for חול and שבת, its own for each חג board.** Splitting the existing one
was not asked for and would either blank a live board or duplicate every line into two lists to
maintain.

**No נמכר column.** The mockup's `soldByDay` is dead code — computed and never rendered — and
the board posts the running order before the auction rather than scoring it during.

**Seeded with the mockup's real content.** Matan corrected it at the mockup stage; this is his
shul's own data, so the seed-empty rule (which exists to keep a stranger's name off a real
board) has nothing to protect against here.
