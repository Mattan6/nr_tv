# A second wall layout for שבת on /tv — design

## What this is

`/tv` currently renders one board — the dark 1920x1080 canvas in `pages/SynagogueDisplay.jsx`
— in every hour of every week. "Shabbat mode" today changes only what that board *says*:
`useDisplayModel` swaps `WEEKDAY_PRAYERS` for `SHABBAT_PRAYERS` and retitles one panel. The
pixels are identical on a Tuesday afternoon and on Shabbat morning.

This adds a **second layout**, light and built for Shabbat, and makes `/tv` choose between the
two on the calendar: the Shabbat board from Friday 09:00, the existing dark board from Sunday
00:00.

Everything it shows is what the shul already publishes. Announcements, שיעורים, מזל טוב and the
ticker keep coming from `/adminGabbai`; the five שבת times keep resolving through
`resolveShabbatTimes` with the gabbai's pinned overrides; זמנים keep coming live from Hebcal.
No content moves house. One panel is genuinely new — **מן הפרשה** — and it is the only part of
this design that needs a data source that does not exist yet.

`/` on a desktop and `/` on a phone are untouched. So is `/zmanim`. The new board exists on
`/tv` and nowhere else, which is what the request asked for.

## The switch

### It is already written

`screenSegment` (`displayData.js:460`) already answers exactly the question this feature asks:

```
חול   Sunday 00:00 → Friday 09:00
שבת   Friday 09:00 → Sunday 00:00
```

on Israel's calendar rather than the device's, which is the property that matters for a panel
whose timezone may have been set wrong at install. Nothing about the boundary needs to be
built. What is new is that the answer now selects a *layout* and not merely a prayer list.

### A hook that reads the schedule and nothing else

```js
// hooks/useScheduledScreen.js
export default function useScheduledScreen()   // → 'weekday' | 'shabbat'
```

A `useState` seeded from `screenSegment(new Date()).screen` and a 30-second interval that
re-reads it. `TvDisplay` calls it and mounts one of the two boards.

Thirty seconds, not one second: this drives a whole-page layout swap at 09:00 on Friday and at
midnight on Saturday, and being up to half a minute late at either is invisible in a room. The
one-second tick inside `useDisplayModel` exists because a clock renders seconds; nothing here
does.

It deliberately does **not** call `useDisplayModel` to get `screen`. `useDisplayModel` owns six
network legs, four timers and the rotation counters; a second instance of it mounted purely to
read one string would double all of that for the life of the page. This hook is a pure function
of the clock and holds one string.

The cost of the split is that the two boards unmount and remount at the boundary, so
`useDisplayModel` re-runs its fetches and the rotation counters restart. That happens twice a
week, on a screen that already reloads itself nightly (`NightlyReload`), and the alternative —
hoisting the model into `TvDisplay` and threading it into both layouts as props — would change
`SynagogueDisplay`'s contract for the benefit of `/tv` alone, and `/` renders it directly.

### The toggle comes off /tv

The חול/שבת toggle in `TopBar` sets an override in `useDisplayModel` that survives until the
calendar leaves the segment it was cast in. It exists so a Shabbat schedule can be summoned
mid-week.

The Shabbat board has no toggle — that was the explicit request, and a light board designed
around candles and a parasha has nowhere sensible to put two chips. But leaving the toggle on
the *dark* board of `/tv` would build a trap: a gabbai pressing שבת on a Wednesday would land on
a board with no way back, and the override would not expire until Sunday 00:00 — the whole rest
of the week, on the shul's only screen, with no affordance on it to say what happened.

So `TopBar` takes `showToggle` (default `true`), and `TvDisplay` passes `false`. `/` on a
desktop keeps both chips and keeps behaving exactly as it does today. `/tv` becomes purely
schedule-driven end to end, which is what "אוטומטי בלבד" means.

### Previewing without waiting for Friday

`/tv?screen=shabbat` (and `?screen=weekday`) forces a board. Read once from
`window.location.search` in `TvDisplay`, ignored unless it is one of those two values.

This is not the toggle coming back through a side door. Reaching it requires typing a URL, so
nothing on a remote can arrive there by accident and nothing can get stuck there — a reload of
the plain `/tv` address restores the schedule. It is how this design gets reviewed in August,
how a layout regression gets checked in any week, and how the gabbai sees next week's board
before the congregation does.

## Where every value on the board comes from

| Panel | Source | New? |
|---|---|---|
| Hebrew date, Gregorian date, clock | `useDisplayModel` — Israel's clock via `israelParts` | no |
| פרשת … | Hebcal `/shabbat`, `parashat` item | no |
| הפטרה | curated table, keyed by parasha | **yes** |
| הדלקת נרות | `resolveShabbatTimes().shabCandles` (gabbai override or Hebcal) | no |
| שקיעת החמה, on the candle card | Friday's zmanim | **yes** (new fetch leg) |
| התפילה הבאה | `computeNextMinyan` over the שבת list | no |
| מוצאי שבת, on the havdalah card | Hebcal's `havdalah` (sun 8.5° below the horizon) | no (already fetched) |
| צאת ר״ת | Saturday's `tzeit72min` | **yes** (already fetched, currently discarded) |
| ערב שבת rows | `SHABBAT_PRAYERS` where `day === 5`, less הדלקת נרות | no |
| יום השבת rows | `SHABBAT_PRAYERS` where `day === 6` | no |
| זמני היום | `ZMANIM_ROWS` against today's zmanim | no |
| שיעורים | `/adminGabbai` → `shiurim` | no |
| שמחות ומזל טוב | `/adminGabbai` → `mazal` | no |
| מן הפרשה | curated table, keyed by parasha | **yes** |
| הודעות הקהילה | `/adminGabbai` → `announcements` | no |
| ticker | `/adminGabbai` → `ticker` | no |

Three of the four "yes" rows are data the hook already has or can reach with one more leg of
work it already does. The fourth is the parasha table, which has its own section below.

### Which day each of the three top cards belongs to

The board is up from Friday morning through Saturday midnight, so "today" is not one day and
the three cards across the top are not all about the same one.

- **הדלקת נרות** is Friday's, always — including all of Saturday, when it is a statement about
  the Shabbat currently being kept rather than a countdown to anything.
- The **שקיעת החמה** printed under it is Friday's sunset, because it is the number הדלקת נרות is
  derived from. Deriving it back out as `candles + 20` would be exact only while the gabbai has
  left the row automatic; the moment he pins הדלקת נרות to a fixed time, the sunset under it
  would move with his number and stop being a sunset. So Friday's zmanim get fetched.
- **מוצאי שבת** is Saturday's, always.

Friday's zmanim are a sixth leg in the existing `Promise.allSettled`, reached by a new
`shabbatFriday(now)` beside `upcomingSaturday` in `displayData.js` — same `israelDateAtNoon`
construction, same reason. On Friday itself it requests the date the first leg already
requested. That duplicate is accepted for the same reason `netzPrayerDate`'s leg accepts one
(`useDisplayModel.js:131-138`): one uniform path beats a branch that has to be right on both
sides of a boundary that moves daily.

Saturday's response is already fetched, and today only its `sunset` is kept. It keeps two more
fields — nothing else changes about that leg.

`shabbatAnchorTimes` gains `fridaySunset` and `saturdayTzeit72`. `resolveShabbatTimes`
destructures the three keys it needs and is not touched; extra keys pass through it unread.

**מוצאי שבת is Hebcal's הבדלה.** The card reads `toClock(havdalah)` — the sun 8.5° below the
horizon, already requested with `M=on` for winter's ערבית — and not שקיעה + `TZEIT_AFTER_SUNSET_MIN`.

> **Corrected after the board shipped.** This section originally specified the sunset-plus-offset
> reckoning, arguing that reading a different value here "would put two different צאת הכוכבים on
> one screen, twenty-odd minutes apart in July." That argument was wrong, and it put a wrong time
> on a synagogue wall: for 2026-08-22 in Nitzan the card posted 19:36 against a real end of
> Shabbat of 19:55 — telling the congregation Shabbat was out nineteen minutes early.
>
> The two values are different *zmanim*, not two sources for one. `TZEIT_AFTER_SUNSET_MIN` is
> this shul's צאת הכוכבים for **davening ערבית**; הבדלה is when **מלאכה is permitted again**, and
> it is later. The gap is the halacha, not an inconsistency to design away. The codebase already
> encoded the distinction — `SHABBAT_CONFIG.arvitBefore.winter` has always counted ערבית back
> from `havdalah` rather than from צאת — so this card was the only place that collapsed them.
>
> A consequence worth stating: this number is later than the ערבית מוצ״ש row on the same board.
> That is correct. The shul davens ערבית at its own minyan time and Shabbat goes out afterwards.

### Splitting the prayer list

`SHABBAT_PRAYERS` already tags each row with `day` (5 = Friday, 6 = Saturday) and
`resolvePrayers` already passes it through, because `computeNextMinyan` needs it. The two
prayer cards filter on it — no new data, no second list, and no chance of the two boards
disagreeing about what time מנחה is.

הדלקת נרות is filtered out of the ערב שבת card because it has its own card above, which leaves
that card holding one row (מנחה וקבלת שבת). That is the layout the design calls for and it is
correct: an empty-looking card and a duplicated time are both worse.

## מן הפרשה

### Why the verses are curated and not fetched

The panel shows short highlights — a clause, not a whole verse. No API can pick those. Sefaria
will hand over the full text of any parasha, but "which six words are the ones a congregation
recognises" is an editorial judgement, and a program asked to make it mechanically returns
`וַיְדַבֵּר ה׳ אֶל מֹשֶׁה לֵּאמֹר` about as often as anything else, cut wherever the character
budget ran out.

So the selection is curated, once, and committed:

```js
// client/src/components/display/parashaHighlights.data.js
export const PARASHA_HIGHLIGHTS = {
  'כי־תבוא': {
    haftara: { ref: 'ישעיהו ס׳', name: 'קוּמִי אוֹרִי' },
    pesukim: [
      { text: 'וּבָאוּ עָלֶיךָ כָּל הַבְּרָכוֹת הָאֵלֶּה', ref: 'דברים כ״ח, ב׳' },
      // …
    ],
  },
  // … 54 parashiyot, the seven combined pairs, and the fallback
};
```

Three fragments per entry. Rotation is the existing 6.5-second `tick`, the same counter that
advances announcements and מזל טוב — one clock for the whole board, which is the rule this
codebase already follows (`useDisplayModel.js:47-51`).

Bundled with the client rather than served from the API: it is static for the life of the
Torah, it costs one lookup, it needs no server change, and it survives an outage that would
blank a fetched panel. It is "automatic" in the sense that matters — nobody types anything,
ever, and the panel follows the week by itself.

### The text is generated, not typed

Fully-vocalized Hebrew typed from memory will contain errors, and this is sacred text on a
synagogue wall. Sefaria returns the Masoretic text with full nikud and cantillation; stripping
the te'amim (U+0591–U+05AF, plus U+05BD meteg) leaves precisely the form the design shows:

```
עֲנִיָּ֥ה סֹעֲרָ֖ה לֹ֣א נֻחָ֑מָה   →   עֲנִיָּה סֹעֲרָה לֹא נֻחָמָה
```

So `parashaHighlights.js` is **generated**, by a one-off script that is never part of the
runtime:

```
scripts/parashaCuration.js          the editorial input — my selections
scripts/buildParashaHighlights.mjs  fetch, strip, slice, emit
```

The curation file names a reference and a word range, never Hebrew text:

```js
{ parasha: 'כי תבוא', ref: 'Deuteronomy 28:2', words: [1, 6] }
```

The script fetches that verse, strips te'amim and the sof-pasuk, splits on whitespace, slices
the range, and writes the joined result into the generated module along with a Hebrew reference
rendered from a book-name map and gematria. Which words are highlights is mine; how they are
spelled and pointed is Sefaria's. The generated file is committed, so a build never touches the
network and the diff of any regeneration is reviewable.

Two consequences worth stating. The script needs network access when run, and it is run by hand
— it is not wired into `npm run build`. And a word range is a blunt instrument: a fragment that
needs to skip a word in the middle cannot be expressed, so the curation picks fragments that
are contiguous. That is a constraint on the selection, not a defect in the output.

### Looking up this week

Hebcal returns `'פרשת כי תבוא'`. The lookup strips the `פרשת ` prefix, trims, folds every dash a
combined pair might arrive with — Hebrew maqaf (U+05BE), hyphen-minus, and the other Unicode
dashes a copy-paste can introduce — to one form, and *then* folds every remaining run of
internal whitespace to that same maqaf, before the table is consulted.

That last fold is not there for combined pairs — the dash fold already handles those. It exists
because a **multi-word parasha name** carries the identical spelling ambiguity one level up:
`לך לך`, `כי תצא`, `אחרי מות`, and the first half of several combined pairs are each two words
in their own right, and Hebcal has sent the space between those two words as an actual space in
some responses and as a maqaf in others — the same way it varies the dash between two combined
parashiyot. This was a real bug, not a hypothetical one: an earlier version of the lookup folded
only the dash, so `'פרשת כי תצא'` and `'פרשת כי־תצא'` reached two different keys and one of the
two spellings silently fell to the fallback verses. Folding whitespace the same way dashes are
folded closed it, because both the curation's own multi-word keys and Hebcal's own occasional
maqaf-for-space spellings normalize to the identical string.

Four cases have to resolve to something:

| Case | Result |
|---|---|
| `'פרשת נח'` | its own entry |
| `'פרשת כי תצא'` and `'פרשת כי־תצא'` | the same entry — a multi-word name resolves however Hebcal joins its words |
| `'פרשת ויקהל־פקודי'` | its own entry — combined parashiyot are keyed and curated in their own right, not merged at runtime |
| no `parashat` item at all — שבת חול המועד, שבת ראש השנה, and the other Shabbatot whose reading is the festival's | the fallback entry |

The fallback is a small set of Shabbat verses (`וְשָׁמְרוּ בְנֵי יִשְׂרָאֵל אֶת הַשַּׁבָּת` and its
neighbours) and no haftara line. It is also what an unrecognised key falls to, so a Hebcal
rename can degrade the panel but can never blank it or crash the board.

Combined parashiyot are keyed in their own right — there are seven possible pairs and they are
read as one unit, so a curated entry for the pair is both more correct and less code than
splitting a key at runtime and merging two lists.

### הפטרה

The masthead line carries both the reference and the traditional name — `הפטרה: ישעיהו ס׳ ·
קוּמִי אוֹרִי`. The name is the haftara's opening words, so it comes out of the same script by
the same word-range mechanism, from the same source.

**The custom is ספרד / עדות המזרח**, matching the shul's nusach as printed in the masthead. This
differs from the Ashkenazi haftara for roughly a dozen parashiyot, and it is a table rather
than a computation, so it is exactly the kind of content that is silently wrong until someone
reads it. The gabbai should proofread the 54 lines once. That is called out here because it is
the one part of this design whose correctness no test can establish.

## Deliberate departures from the mock

| Mock | Built | Why |
|---|---|---|
| זְמַנֵּי הַשַּׁבָּת, with פלג המנחה in the list | זְמַנֵּי הַיּוֹם, with the existing ten rows including מנחה גדולה | "content identical to today" was the requirement. `ZMANIM_ROWS` is shared with the desktop wall and the phone through `useDisplayModel`; changing its membership for this board would change all three or fork the list. The title follows the data: on Friday these are Friday's zmanim, and calling them שבת's would be wrong for the first fifteen hours the board is up. |
| בדיחות ליאור, לעילוי נשמת | absent on שבת | Agreed. Both keep appearing on the weekday board. |
| `omFadeA`/`omFadeB` alternating to restart the fade | `key={tick}` with the existing `omFade` | The remount-to-replay pattern is what every rotating panel in this codebase already uses, and it needs one keyframe rather than two. |
| Hard-coded times, names and ticker text | live model values | The mock is a mock. |
| No overscan handling | `safeArea` from `TvDisplay`, as the dark board takes it | A TV crops its own edges; the masthead and ticker sit at the very edge of the canvas and are the first things to go. |

## Files

### New

| File | What |
|---|---|
| `client/src/hooks/useScheduledScreen.js` | the schedule, sampled |
| `client/src/hooks/useCanvasScale.js` | the scale-to-fit arithmetic for the 1920x1080 canvas, extracted so both boards call the same one instead of each owning a copy |
| `client/src/pages/ShabbatDisplay.jsx` | the light 1920x1080 canvas and its grid |
| `client/src/components/shabbat/shabbatStyle.js` | palette and the shared card styles |
| `client/src/components/shabbat/icons.jsx` | candles, kiddush cup, sefer torah, the divider rosette |
| `client/src/components/shabbat/Masthead.jsx` | dates, clock, parasha, שבת שלום, shul name, haftara |
| `client/src/components/shabbat/EdgeCards.jsx` | הדלקת נרות · התפילה הבאה · מוצאי שבת |
| `client/src/components/shabbat/PrayerListCard.jsx` | one component, mounted twice (ערב שבת, יום השבת) |
| `client/src/components/shabbat/ZmanimGrid.jsx` | the ten rows in two columns |
| `client/src/components/shabbat/ShiurimCard.jsx` | שיעורים בשבת |
| `client/src/components/shabbat/MazalCard.jsx` | שמחות ומזל טוב |
| `client/src/components/shabbat/ParashaVerseCard.jsx` | מן הפרשה |
| `client/src/components/shabbat/AnnouncementsCard.jsx` | הודעות הקהילה |
| `client/src/components/shabbat/LightTicker.jsx` | the bottom marquee, light palette |
| `client/src/components/display/parashaHighlights.js` | **generated** table + the lookup |
| `scripts/parashaCuration.js` | editorial input: parasha → refs and word ranges |
| `scripts/buildParashaHighlights.mjs` | generator |
| `client/test/parashaHighlights.test.js` | lookup, normalization, fallbacks |
| `client/test/screenSegment.test.js` | the two boundaries |

`LightTicker` is a separate component rather than a palette prop on `Ticker`: the dark one
hard-codes its colours *and* carries `margin: 0 -46px` to bleed past its parent's padding,
which the light board's structure does not want. Two twenty-line components beat one
thirty-line component with two modes.

### Modified

| File | Change |
|---|---|
| `client/src/pages/TvDisplay.jsx` | pick the board; read `?screen=`; pass `showToggle={false}` |
| `client/src/pages/SynagogueDisplay.jsx` | take `showToggle`, pass it to `TopBar`; call the extracted `useCanvasScale` instead of computing the fit inline |
| `client/src/components/display/TopBar.jsx` | `showToggle` prop, default `true` |
| `client/src/components/display/displayData.js` | `shabbatFriday(now)` |
| `client/src/hooks/useDisplayModel.js` | sixth zmanim leg; two more keys on `shabbatAnchorTimes`; expose `shabbatCards`, `haftara`, `pasuk` |
| `client/src/index.css` | `omGlowSoft`, `omFlame` keyframes |
| `client/package.json` | `"test": "node --test test/"` |
| `package.json` | root `test` runs server and client |

No server file changes. Nothing in `/adminGabbai` changes.

## Verification

### Tests

The client has had no test framework, and previous specs declined to add one. This one adds a
narrow harness — `node --test` against `client/test/`, no new dependency, Node's built-in
runner, the same one `server/test/` already uses — because two pieces of pure logic here fail
*silently* and *for a week at a time*:

- `screenSegment` at its two boundaries. It is already written and already correct, but nothing
  pins it, and it now decides which of two layouts a room full of people looks at.
- the parasha lookup: prefix stripping, the three separator forms in a combined name, the
  missing-parasha fallback. A miss here shows a plausible panel with the wrong week's verses,
  which is the failure mode least likely to be noticed from across a hall.

Both are plain ESM modules importing nothing, in a package already declaring
`"type": "module"`, so the runner needs no configuration. Nothing about the JSX components is
tested; that is what the visual pass below is for.

### By hand

1. `/tv?screen=shabbat` — the whole board, against the mock, at 1920x1080 and at whatever the
   set actually reports.
2. Every panel populated from real data: change an announcement in `/adminGabbai` and watch it
   arrive within 30 seconds; confirm a pinned הדלקת נרות in the settings form moves both the
   candle card and the מנחה וקבלת שבת row under it.
3. The three top cards on **Friday** and again on **Saturday** — הדלקת נרות and its sunset must
   not move between the two days; מוצאי שבת must not either.
4. מוצאי שבת on the havdalah card equals Hebcal's `havdalah` for that Saturday — check it
   against `hebcal.com/shabbat?...&M=on` directly, not against anything else on the board. It
   must be **later** than both the זמנים grid's צאת הכוכבים row and the ערבית מוצ״ש prayer row;
   if it ever equals the צאת row, the sunset-plus-offset reckoning has been reintroduced and the
   board is telling people Shabbat is out early. `client/test/screenSegment.test.js` asserts
   that inequality directly, for exactly that reason.

   Nothing else on this board is a pair that has to match. שקיעת החמה is printed twice —
   Friday's on the candle card and (from Saturday onward) today's in the זמנים grid — and those
   two are supposed to differ; that pair is disambiguated by its label, `שקיעת החמה (שישי)`,
   rather than by an equality check.
5. Cross Friday 09:00 with the page left open: the board swaps without a reload. Cross Saturday
   24:00 the same way. Both under `TZ` set to something other than Israel — **via PowerShell**,
   not Git Bash, which does not propagate `TZ` to `node.exe` and lets the check pass without
   having tested anything.
6. `/` on a desktop and `/` on a phone, on a Saturday: unchanged, dark board, toggle present.
7. `/tv` on a Wednesday: dark board, **no** toggle.
8. A Shabbat with no parasha — force it by pointing the lookup at a חול המועד week — falls to
   the generic verses and drops the haftara line rather than rendering `undefined`.
