# Mobile Display — Design

**Date:** 2026-07-25
**Status:** Approved — not yet implemented.
**Scope:** A phone layout for the display, served from the same URL as the wall. Every
panel, label and number it shows is the one the wall already shows; the only content
difference from the imported mock is that פרנס היום is replaced by בדיחות ליאור, matching
the wall as it stands today.

## Problem

`/` renders a fixed 1920×1080 canvas scaled to fit the viewport
(`pages/SynagogueDisplay.jsx`). On a 390px-wide phone that scale factor is ~0.20: the
layout is intact and completely unreadable. The app is served over the network and the
gabbai and congregants reach it from phones, so `/` has to answer a phone with a phone
layout.

The mock (`Synagogue Display Mobile.dc.html`, imported from Claude Design) supplies the
visual design. It is a standalone prototype with hardcoded times and its own local state,
so nothing in it can be shipped as-is — it is a layout reference, not an implementation.

## Decisions taken during design

| Question | Decision |
|---|---|
| How the phone reaches it | **Responsive at `/`** — one URL, layout chosen by viewport |
| Breakpoint | `(max-width: 820px), (max-height: 500px)` |
| Where the shared numbers come from | One extracted hook, `useDisplayModel`, consumed by both layouts |
| Hero's three-value strip | הנץ החמה · חצות היום · שקיעת החמה (live zmanim) |
| Bottom small print | The wall's `TICKER` string, split on `•` into stacked lines |
| Live clock on mobile | **None** — as designed; the phone has its own |
| פרנס היום slot | **בדיחות ליאור**, same 30s clock and fallback text as the wall |
| Admin reach | Unchanged — both layouts already read what `/adminGabbai` writes |

### On extracting `useDisplayModel` rather than reimplementing

The mock computes its own countdown from a hardcoded array. Doing anything like that here
would produce a second, quietly diverging notion of what time מנחה is. The rules are not
incidental: prayer times resolve against live Hebcal zmanim, שבת times against a seasonal
anchor, the חול/שבת screen follows the calendar with a segment-pinned override, and every
clock reading is taken in `Asia/Jerusalem` rather than on the device. That logic is
currently inline in `SynagogueDisplay.jsx`.

So it moves out unchanged into `client/src/hooks/useDisplayModel.js`, and both layouts
call it. The guarantee this buys is structural: mobile cannot post a different מנחה from
the wall, because there is only one מנחה. The wall page keeps its layout and loses only
the logic — no behavior change there is intended, and any is a bug.

### On the breakpoint carrying a height clause

A width-only breakpoint at 820px sends a phone held **landscape** (844×390) to the wall
canvas, which then scales to 0.36 — the exact failure this design exists to remove. The
height clause catches it. The cases that matter, checked against the rule:

| Device | Viewport | Layout |
|---|---|---|
| The TV | 1920×1080 | wall |
| Laptop | 1366×768 | wall |
| iPad portrait | 820×1180 | mobile |
| iPad landscape | 1180×820 | wall |
| iPhone portrait | 390×844 | mobile |
| iPhone landscape | 844×390 | mobile (height clause) |

The switch listens to the media query, so rotating a phone re-picks the layout live.

### On the hero's three-value strip

The mock's strip reads שקיעה / הדלקת נרות / מוצ״ש against hardcoded times. Two of those
three are שבת values, which are blank or irrelevant for the five weekdays the screen
spends most of its life in. The owner chose **הנץ החמה · חצות היום · שקיעת החמה** instead:
three values that are live and meaningful every day of the week, and all three already
posted in the זמנים panel below — so the strip repeats the wall rather than introducing
anything.

They are selected from the resolved zmanim rows by a stable `id`, not by matching Hebrew
strings: `sunset` is the source field for two different rows (שקיעת החמה, and צאת הכוכבים
at +18 minutes), so field-matching would be ambiguous and name-matching would break on any
copy edit.

### On mobile being its own scroll container

`client/src/index.css` pins `body` and `#root` to `overflow: hidden` — the TV must never
show a scrollbar, and the wall layout depends on that. The mobile page therefore scrolls
inside itself (`position: fixed; inset: 0; overflow-y: auto`) rather than relaxing the
global rule. `/adminGabbai` already solves the same problem the same way
(`adminStyles.screen`); this follows it deliberately, so there is one answer in the
codebase rather than two.

## What the mobile screen shows

Top to bottom. Every value is read from `useDisplayModel` — the same object the wall
renders — so "matches the wall" is a property of the wiring, not of a convention.

| Section | Content | Source |
|---|---|---|
| Header (sticky) | נ״ר mark, בית כנסת נווה רחמים, `{weekday} · {hebDate}`, ב״ה | `weekday`, `hebDate` |
| Hero | המניין הבא: name, time, live `בעוד HH:MM:SS` countdown | `next` |
| Hero strip | הנץ החמה · חצות היום · שקיעת החמה | `zmanimRows` by id |
| הודעות | One rotating announcement + one dot per announcement | `ann`, 6.5s tick |
| זמני תפילות | חול/שבת toggle, sub-line, 4 חול rows / 5 שבת rows | `prayers`, `screen` |
| שיעורי תורה | name · by · time | `shiurim` |
| שמחות ומזל טוב | names · occasion | `maz`, 6.5s tick |
| לעילוי נשמת | name · detail · date | `azk`, 6.5s tick |
| זמני היום | 10 rows, two columns, collapsible, open by default | `zmanimRows` |
| בדיחות ליאור | One joke, or `אין בדיחות להצגה כרגע` | `joke`, 30s tick |
| Footer | `TICKER`, split on `•` into lines | `TICKER` |

Rotation runs off the same two counters as the wall: 6.5s for הודעות / מזל טוב / אזכרות,
30s for בדיחות. A phone and the TV opened at the same moment therefore rotate together.

Every time renders `--:--` when its source is missing, exactly as the wall does. A failed
Hebcal request must never leave a stale or invented time on a phone either.

### The חול/שבת toggle

It writes the same segment-pinned override the wall's toggle writes: the screen follows
the calendar (שבת from Friday 09:00 to Sunday 00:00), a tap pins itself to the schedule
*segment* it overrode, and the pin expires when the calendar leaves that segment. This is
not re-derived for mobile; it is the same `screen` / `setScreen` pair out of the hook.

Unlike the TV, a phone is opened and closed constantly, so in practice the override rarely
outlives the visit — which is the intended behavior, not a compromise.

## Admin reaches both

No server change and no `/adminGabbai` change. Both layouts read `useDisplayContent`,
which polls `/api/content` every 30 seconds and keeps only items whose `isActive` is true.
That is the document the admin panel writes. An announcement added, edited, hidden or
deleted on the gabbai's phone therefore appears on the wall *and* on every phone within
one poll, with no second code path to keep in step.

To be verified end-to-end rather than assumed: edit an item in `/adminGabbai`, confirm it
changes in both layouts.

## Files

```
client/src/hooks/useDisplayModel.js            new   extracted from SynagogueDisplay
client/src/hooks/useIsMobile.js                new   matchMedia breakpoint
client/src/pages/MobileDisplay.jsx             new   composes the mobile sections
client/src/components/mobile/*                 new   mobileStyles, MobileHeader,
                                                     NextMinyanHero, PrayerTimesCard,
                                                     ZmanimAccordion, ShiurimCard,
                                                     RotatingCards, TickerLines
client/src/pages/SynagogueDisplay.jsx          edit  logic → hook; layout untouched
client/src/components/display/displayData.js   edit  stable `id` per ZMANIM_ROWS entry
client/src/App.jsx                             edit  `/` picks a layout by viewport
```

## Testing

The client has no test runner — `client/package.json` has `dev`, `build`, `lint`,
`preview` and nothing else, and adding one is out of scope here. Verification is therefore:

1. `npm --prefix client run lint` and `npm --prefix client run build` both clean.
2. The app running (`npm run dev`), `/` at a phone viewport: every section renders live
   data, the countdown ticks, the חול/שבת toggle switches the prayer list, the זמנים
   accordion opens and closes.
3. `/` at 1920×1080 still renders the wall exactly as before.
4. An `/adminGabbai` edit appearing in both layouts.

Server tests (`npm --prefix server test`) must stay green; nothing in this change touches
the server, so a failure there means something unintended happened.

## Out of scope

- Any change to the wall layout, the admin panel, or the server.
- A client test runner.
- Offline/PWA behavior, install prompts, push notifications.
- `/zmanim`, which keeps its existing (Tailwind-based) page.
