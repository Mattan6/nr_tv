# Prayer Times Date Picker — Design

**Date:** 2026-07-17
**Status:** Approved (design)

## Summary

Add a standalone lookup page at `/zmanim` where a user can pick any date and see
the prayer times (zmanim) for that date. The existing passive, auto-rotating TV
display (`/`) is left completely unchanged. The lookup page is accessed by URL on
a phone, tablet, or computer — no link is added to the TV display.

## Motivation

The current display only ever shows today's zmanim (`getZmanim()` is hardcoded to
today). Congregants sometimes need to know prayer times for a future date (e.g. an
upcoming day). A separate interactive page serves this without disturbing the
passive display.

## Scope

### In scope
- New route `/zmanim` with a date picker and the styled zmanim card for the chosen date.
- Date navigation: calendar date field + previous/next day arrows + a "Today" reset.
- Any date selectable (past or future).
- Heading showing the selected date: weekday + Gregorian date + Hebrew date.
- Refactor the existing zmanim card markup into a reusable component so the display
  and the lookup page share one source of truth.

### Out of scope
- Shabbat-times lookup by date (only zmanim / daily prayer times).
- Any change to the TV display's content, rotation, or adding navigation to it.
- Backend/database work — this page uses the Hebcal API directly, like the current
  `PrayerTimes` component.

## Approach

Extract the presentational parts of `PrayerTimes.jsx` (the `SECTIONS` config,
`TimeCard`, `SectionPanel`, `hexToRgb`, time/tzeit formatting) into a reusable
`ZmanimCard` component that takes a `zmanim` object as a prop and renders the
styled card. Both the TV display's `PrayerTimes` and the new `/zmanim` page render
`ZmanimCard`, so they never visually drift.

Alternatives considered:
- **Duplicate the markup** into the new page — rejected; ~200 lines copied that
  would diverge over time.
- **Make `PrayerTimes` itself date-aware** and reuse it directly — rejected;
  `PrayerTimes` has display-only concerns (the "זמני היום" title, a 6-hour
  auto-refresh interval) that don't belong on a lookup page.

## Components & Data Flow

### `client/src/services/hebcal.js`
- `getZmanim(date)` — add an optional `date` argument (a `Date`, default = today).
  Format it as `YYYY-MM-DD` and pass as the Hebcal `/zmanim` `date` param. Existing
  callers that call `getZmanim()` with no argument keep today's behavior.
- `getHebrewDate(date)` — add the same optional `date` argument so the lookup page
  can display the Hebrew date for the selected day. Existing no-arg callers unchanged.

### `client/src/components/PrayerTimes/ZmanimCard.jsx` (new)
- Presentational only — no fetching, no date state.
- Props: `zmanim` (the Hebcal `times` object) and optional `title` (defaults to the
  current "זמני היום" so the display looks identical).
- Contains the moved `SECTIONS`, `TimeCard`, `SectionPanel`, `hexToRgb`, the
  `formatTime` helper, and the tzeit (`sunset + 18 min`) calculation.

### `client/src/components/PrayerTimes/PrayerTimes.jsx` (refactor)
- Keeps its own fetch of *today's* zmanim and the 6-hour refresh interval.
- Renders `<ZmanimCard zmanim={zmanim} />`.
- Must remain visually identical to the current display.

### `client/src/pages/Zmanim.jsx` (new)
- State: `selectedDate` (a `Date`, initialized to today).
- On `selectedDate` change: fetch `getZmanim(selectedDate)` and `getHebrewDate(selectedDate)`.
- Renders, in RTL and the app's gold/dark theme:
  - Date controls: `<input type="date">` bound to `selectedDate`, ◀ / ▶ buttons
    (step ±1 day via `date-fns` `addDays`), and a "היום" (Today) button.
  - A heading: weekday + Gregorian date + Hebrew date of the selected day. This
    heading is what conveys *which* date the times are for.
  - `<ZmanimCard zmanim={...} />` using the default "זמני היום" title (the generic
    "the day's times"). The specific date lives in the page heading above the card,
    so the card title stays generic and identical to the display.
  - Loading state (reuse "טוען זמני תפילות..." text) and error state (reuse
    "לא ניתן לטעון זמני תפילות" pattern) when Hebcal is unreachable.

### `client/src/App.jsx`
- Add `<Route path="/zmanim" element={<Zmanim />} />` alongside the existing `/` route.

## Dependencies

None new. Uses native `<input type="date">` for the calendar and the already-installed
`date-fns` for date math. No backend or database.

## Error Handling

- Hebcal request failure → show the existing "לא ניתן לטעון זמני תפילות" message;
  the date controls stay usable so the user can retry another date.
- Invalid/empty date input → ignore the change and keep the last valid `selectedDate`.

## Known Limitations

- Zmanim times are formatted in the **viewer's local timezone**, so they are correct
  when viewed from Israel. This matches how `PrayerTimes` already behaves today; it is
  not changed by this work.

## Testing

- `PrayerTimes` on `/` renders identically to before the refactor (visual check).
- `/zmanim` loads with today selected and shows today's zmanim.
- ◀ / ▶ step the date by one day and refetch; the calendar field jumps to an
  arbitrary date and refetches; "היום" resets to today.
- The heading reflects the selected date (weekday + Gregorian + Hebrew date).
- Hebcal-unreachable path shows the error message and remains usable.
