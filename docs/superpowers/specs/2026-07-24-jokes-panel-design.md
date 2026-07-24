# בדיחות ליאור — Design

**Date:** 2026-07-24
**Status:** Approved — not yet implemented.
**Scope:** Replace the פרנס היום panel on the display with a בדיחות ליאור panel showing
short Hebrew בדיחות קרש, scraped automatically from a public Israeli jokes site, filtered
by rule alone, and rotated on the wall every 30 seconds.

## Problem

`ParnasPanel` shows a single hardcoded donor
(`PARNAS` in `client/src/components/display/displayData.js`). It has never changed and has
no way to change short of editing source. The slot is better spent on something that
renews itself.

The replacement is a jokes panel. It must fill itself: nobody logs in to add a joke, and
nobody approves one before it reaches the wall.

## Decisions taken during design

| Question | Decision |
|---|---|
| Where jokes come from | Scraped from `yo-yoo.co.il/jokes/` |
| What stands between a scrape and the wall | **Rule-based filtering only — no human approval** |
| How "fits the panel" is guaranteed | A hard length cap at ingest; fixed font size on screen |
| Rotation cadence | Its own 30-second timer, independent of the 6.5s panel rotation |
| Where the scrape runs | On the server, into `content.json`; the TV never calls yo-yoo |
| Admin editing of jokes | **None.** Jokes are scraper-owned; `/adminGabbai` is untouched |
| Language | Hebrew only — any Latin letter rejects the item |

### On the absence of human approval

This was chosen deliberately, with the cost stated: no syntactic rule detects "not funny."
A well-formed but weak joke — the real sample
`"מהו ההבדל בין תפוח לתפוזה? תשובה: סוגר."` — passes every rule below and will appear on
the wall. The exposure is bounded: it is one of ~150 pooled items and leaves the screen
after 30 seconds.

Two stronger rules were considered and **explicitly rejected** by the owner: requiring
terminal punctuation, and requiring the text to contain `?` (most בדיחות קרש are
riddle-shaped, so this was the single highest-yield filter). The four coherence rules in
their place — repeated word, repeated speaker label, word count, word length — were
validated against five real scraped samples and reject three of them.

## Source assessment

Two Hebrew jokes sites were evaluated against the live web on 2026-07-24.

**`yo-yoo.co.il` — chosen.** Static server-rendered HTML, ~50 jokes per page, 6+ paginated
pages per category. Its `robots.txt` restricts only image crawling and a specific game
asset; `/jokes/` is not disallowed for a generic user agent. Two hazards:

- **Encoding is windows-1255, not UTF-8.** Category parameters are windows-1255
  percent-encodings (`?cat=%F7%F8%F9` is `קרש`), and the response body must be decoded
  explicitly or every joke arrives as mojibake.
- **Content is unmoderated user submissions.** Quality is poor and the site carries
  categories unsuitable for a synagogue (הומור שחור, בלונדיניות). This is what makes the
  filter the substance of this design rather than an afterthought.

**`kids.hidabroot.org/board-jokes` — rejected.** Its content is far more appropriate, but
joke text is absent from the server HTML and rendered by JavaScript. Scraping it requires
a headless browser on the server, a complexity jump this feature does not justify.

## Architecture

```
yo-yoo.co.il  ──(daily, server-side)──▶  scraper ──▶ filter ──▶ content.json
                                                                     │
                                              /api/content ◀─────────┘
                                                     │
                                         useDisplayContent (30s poll)
                                                     │
                                              JokesPanel (30s rotate)
```

The scrape lives on the server for three reasons, any one of which is disqualifying for a
browser-side fetch: CORS blocks it, windows-1255 decoding in the browser is impractical,
and every TV would hit the site independently. Routing through `content.json` also means
the panel inherits the display's existing resilience — `useDisplayContent` already caches
the last good document to `localStorage`, so a TV rebooting during a network outage still
has jokes to show.

## Components

### `server/src/jokes/source.js` — fetch and parse

Fetches configured category pages from yo-yoo and returns raw joke strings.

- Decodes windows-1255 via the built-in `TextDecoder('windows-1255')`. **No new
  dependency** — Node ships full-ICU by default.
- Parses joke text out of the page with a regex over the static markup. `cheerio` is not
  worth a dependency for one legacy page shape.
- Sequential requests with a 1-second delay between them (matching the `Crawl-delay: 1`
  the site asks of bingbot), a descriptive `User-Agent`, and a request timeout.
- Categories and page depth are configuration. The default is בדיחות קרש
  (`?cat=%F7%F8%F9`, confirmed to return jokes at design time) and בדיחות נקיות, six pages
  each. Category parameters are windows-1255 percent-encodings of the Hebrew name; the
  נקיות parameter must be read off the site's own category links during implementation
  rather than hand-encoded.

### `server/src/jokes/filter.js` — the gate

A pure function: raw string in, accept or reject with a reason out. Pure so the whole
table below is testable without a network.

Normalization first: decode HTML entities, collapse whitespace runs, trim.

| # | Rule | Rejects |
|---|---|---|
| 1 | Length 25–110 characters | Fragments; anything overflowing the panel |
| 2 | At most 3 newline-separated lines | Multi-paragraph submissions |
| 3 | No Latin letter `[A-Za-z]`; ≥50% of all characters are Hebrew letters | English, mixed-script gibberish |
| 4 | No punctuation character repeated 3+ times consecutively | `!!!!!!!!!!` |
| 5 | No word of 3+ letters repeated 3+ times | Gibberish loops |
| 6 | No single speaker label (`\S+:`) occurring 3+ times | Mangled dialogue dumps |
| 7 | Word count 5–22 | Sentence fragments; speeches |
| 8 | No word longer than 12 Hebrew letters | Text mashed together without spaces |
| 9 | No run of 4+ digits, no URL, no `@` | Phone numbers, spam |
| 10 | Hebrew blocklist (crude, sexual, violent, political) | Content unfit for a shul |

Rule 5's 3-letter floor keeps common short words (`לא`, `מה`, `את`) from rejecting
legitimate jokes that simply repeat them. Rule 6 counts occurrences of *one* label, not
labels in total.

Rule 1's upper bound is what makes "never exceeds the panel frame" true by construction,
and it is a claim about a specific font size: at 26px with line-height 1.35 in a ~458px
column, 110 Hebrew characters wrap to at most four lines (~140px), which fits under the
heading inside the ~200px panel. Changing the font size invalidates the cap and both must
move together. Implementation must confirm the worst case visually with a 110-character
joke. Nothing on the client measures or shrinks text.

Rules 4–8 are what the rejected `?` rule was traded for. Validated against five real
scraped samples: three are rejected (two of them by more than one rule), one weak-but-
coherent joke passes, and the known residual passes.

### `server/src/jokes/refresh.js` — scheduling and pooling

Runs ~30 seconds after boot (so a slow site never delays startup) and every 24 hours
thereafter.

- New jokes are appended; existing ones are never removed. A site that goes down or
  changes its markup degrades to "the pool stops growing," not "the wall goes blank."
- Deduplicated against the existing pool by normalized text.
- Grows to 150 jokes, then stops. The panel-wide `MAX_ITEMS` (500) remains the hard
  ceiling on `content.json` growth.
- Any failure is logged and swallowed. A scrape error must never take down the server or
  the content API.

### `client/src/components/display/JokesPanel.jsx`

Rendered in `CenterCards.jsx`'s existing `centeredCard` style, in the grid slot
`ParnasPanel` occupied — centre column, middle row, beside המניין הבא.

- Gold `smallTitle` heading: **בדיחות ליאור**.
- Joke text centred at a fixed 26px / line-height 1.35 (the size rule 1's cap is derived
  from), `whiteSpace: 'pre-line'`, `omFade` transition on change — identical treatment to
  מזל טוב and לעילוי נשמת.
- An empty pool renders a quiet placeholder. It must not crash and must not render an
  empty box.

### `SynagogueDisplay.jsx`

- Adds a `jokeTick` state on its own 30-second interval, separate from the existing
  6.5-second `tick`. As with the other lists, the modulo is taken at render time against
  the current array, so a pool that changes size mid-rotation cannot index past its end.
- Removes the `ParnasPanel` import, the `PARNAS` import, and the panel itself.

## Two hazards that must be handled

**`content.json` shape validation.** `contentStore.js` quarantines any document whose
shape does not match `PANEL_ARRAY_KEYS` — currently exactly four panel arrays. Adding
`'jokes'` to that list would classify every existing `content.json` as corrupt on the next
boot and replace the gabbai's real announcements and azkarot with seed data.

`'jokes'` therefore **must not** be added to `PANEL_ARRAY_KEYS`. The refresh mutator
creates the array when absent (`if (!Array.isArray(draft.jokes)) draft.jokes = []`), which
makes the upgrade a no-op for existing installs.

**Client shape.** `useDisplayContent.js` derives its panel list from a fixed `EMPTY`
object; `jokes` must be added there or the panel receives nothing. Its `activeOnly` filter
applies unchanged — scraper-written jokes carry `isActive: true`.

## Seed pool

~30 curated Hebrew בדיחות קרש, written by hand and added to
`server/src/store/defaultContent.js` under a `jokes` key, alongside the other panels'
seeds. This is what shows on day one before the first scrape, and what remains if yo-yoo
is unreachable forever. Seed ids follow the existing `seed-jok-N` convention.

## Removals

- `ParnasPanel` from `client/src/components/display/CenterCards.jsx`
- The `PARNAS` constant from `client/src/components/display/displayData.js`
- Its import and usage in `client/src/pages/SynagogueDisplay.jsx`
- The פרנס היום references in `SETUP.md`

## Testing

All tests run offline. The scraper is never exercised against the live network.

| Area | Test |
|---|---|
| Filter | Accept/reject table covering each of the ten rules, plus the five real scraped samples as fixtures |
| Decoding | A windows-1255 byte fixture decodes to the expected Hebrew |
| Parsing | A saved yo-yoo HTML page fixture in the repo yields the expected joke strings |
| Pooling | Dedup against an existing pool; the 150 cap; failures leave the pool intact |
| Store | A `content.json` with no `jokes` key loads without quarantine and gains the array on refresh |
| Panel | An empty pool renders the placeholder rather than crashing |
| Fit | A 110-character joke at 26px is checked visually in the running display and does not overflow the panel |

## Out of scope

- Any admin UI for jokes (deliberate — see the decisions table)
- A second source site, or failover between sources
- Auto-shrinking text to fit; rule 1 makes it unnecessary
- Rating, favouriting, or scheduling jokes by day
