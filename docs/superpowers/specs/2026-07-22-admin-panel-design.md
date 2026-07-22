# פאנל ניהול תוכן — Design

**Date:** 2026-07-22
**Status:** Approved — partially shipped, see "Implementation status" below.
**Scope:** An admin panel at `/adminGabbai` letting the gabbai edit the four content
panels of the synagogue display — הודעות, שיעורי תורה, שמחות ומזל טוב, לעילוי נשמת —
from his phone, without touching code.

## Implementation status

This spec describes the full design, but plan Task 5 ("Display reads content from the
server") was deliberately split in two, because another session was concurrently
rewriting `client/src/pages/SynagogueDisplay.jsx` and
`client/src/components/display/displayData.js` on `feature/shabbat-prayer-times` at the
same time this branch was implemented:

- **Shipped**: the content store, the panel schema, the `/api/content` REST API, the
  client API wrapper `client/src/services/content.js`, and the full admin UI
  (`client/src/pages/admin/`). The gabbai can open `/adminGabbai` and edit content
  today, and every write correctly lands in `server/data/content.json`.
- **Not shipped**: `useDisplayContent()` (plan Task 5, Steps 2–8) and the
  corresponding edits to `SynagogueDisplay.jsx` / `displayData.js`. The TV display does
  **not** read from `/api/content` yet — it still renders the static arrays in
  `displayData.js`. Consequently the seed content exists **twice**: once in
  `server/src/store/defaultContent.js` (served by the API, edited via the admin panel)
  and once, unchanged, in `displayData.js` (what the TV actually shows). A save in
  `/adminGabbai` does not reach the TV.
  - The **"Display wiring"** section below and **verification steps 4–8** describe the
    not-yet-shipped behavior — treat them as the spec for the deferred half, not as a
    description of what runs today.
  - **Whoever picks up the deferred half**: `SynagogueDisplay.jsx` has changed
    underneath the plan since it was written. Re-read the plan's Task 5, Steps 5–8
    quoted code against the real current file before applying it — the line numbers
    and surrounding code will have moved.

## Problem

All four panels are hardcoded arrays in
`client/src/components/display/displayData.js` (`ANNOUNCEMENTS`, `SHIURIM`, `MAZAL`,
`AZKAROT`). Changing an announcement means editing source and rebuilding the client, so
in practice the display shows stale content: a mazal tov for a birth stays up for
months, a cancelled shiur keeps appearing.

A Mongoose-backed CRUD API already exists for announcements and events
(`server/src/controllers/announcementController.js`, `models/Announcement.js`), but it is
dead code — `server/src/config/database.js` deliberately runs the server without a
database, and the Atlas cluster it targeted no longer exists. Those files are not
reused; see [Existing scaffolding](#existing-scaffolding).

## Decisions taken during design

| Question | Decision |
|---|---|
| Who edits, from where | The gabbai, from his phone, over the network |
| Authentication | **None.** Access is by unlisted path `/adminGabbai` |
| Persistence | A single JSON file on the server |
| לעילוי נשמת model | A plain manual list — *not* a yahrzeit registry keyed to Hebrew dates |
| How the TV learns of changes | It polls; the TV browser is opened once and never reloaded |
| Per-item actions | Add, edit, delete, and a הצג/הסתר toggle |
| Reordering / auto-expiry | Out of scope (YAGNI) |

### On the absence of auth

The write endpoints are reachable by anyone who can reach the server. This is acceptable
on a synagogue LAN and was chosen deliberately for the gabbai's sake — a login he would
forget is worse than no login. It stops being acceptable the moment the server is exposed
to the internet. If that ever happens, this decision must be revisited before the port is
opened.

### On `app.use(cors())`

`app.js` runs `app.use(cors())` with no origin restriction, which means **any web page,
on any origin, that a browser on the synagogue LAN happens to load can write to
`/api/content`** — not just `/adminGabbai` itself. Verified live: a cross-origin
`DELETE` sent from an arbitrary origin against a running instance returned `200` and
removed the item.

This is a materially wider hole than the "unlisted path" rationale above covers, because
`/api/content` is a fixed, documented, guessable path — no knowledge of `/adminGabbai`
is required to hit it. Concretely: any page opened by anyone on the synagogue Wi-Fi
(an ad, a compromised site, a browser extension) could silently scan the LAN for the
server and wipe all content, with no interaction from the gabbai and no unlisted URL to
guess.

**Accepted as part of the same LAN-only posture as the absence of auth** — open CORS was
a deliberate choice, not an oversight, made alongside the no-auth decision above. It
must be revisited together with authentication before the server is ever reachable from
outside the LAN; do not narrow CORS on its own without also addressing auth, since
either one alone still leaves the other hole open.

## Architecture

Four units, each with one responsibility:

| Unit | Location | Responsibility |
|---|---|---|
| Content store | `server/src/store/contentStore.js` | The only module that touches the JSON file |
| Content API | `server/src/routes/content.js`, `controllers/contentController.js` | REST over the store; validation |
| Admin UI | `client/src/pages/admin/` | Menu → list → form |
| Display hook | `client/src/hooks/useDisplayContent.js` | Polls the API, feeds `SynagogueDisplay` |

The organizing insight: **all four panels have the same shape** — a list of objects with
an `id` and an `isActive` flag, differing only in which text fields they carry. So there
is one controller, one list component, and one form component, each parameterized by a
panel descriptor. Adding a fifth panel later (פרנס היום, the ticker) is a table entry,
not new code.

## Data model

### Runtime file — `server/data/content.json`

```json
{
  "version": 1,
  "updatedAt": "2026-07-22T19:40:00.000Z",
  "announcements": [
    { "id": "…", "text": "שיעורו של הרב מוטה יתקיים הערב\nבשעה 20:00", "isActive": true }
  ],
  "shiurim": [
    { "id": "…", "name": "דף היומי", "time": "06:45", "by": "הרב יגאל", "isActive": true }
  ],
  "mazal": [
    { "id": "…", "names": "משפחת בן חמו", "occasion": "להולדת הבן — מזל טוב!", "isActive": true }
  ],
  "azkarot": [
    { "id": "…", "name": "משה בן פרטונה ז״ל", "detail": "נתרם ע״י יעל ורמון בראון",
      "date": "י״ח באלול", "isActive": true }
  ]
}
```

`id` is a `crypto.randomUUID()` assigned by the server; clients never invent ids.
`version` is a schema version for future migrations, not an optimistic-locking counter.

### Seed — `server/src/store/defaultContent.js`

A committed JS module holding today's values from `displayData.js`. The store imports it
and writes it out on first boot when `content.json` is absent.

It is a `.js` module rather than a JSON file under `server/data/` because `.gitignore`
already excludes `data/` at any depth (a leftover MongoDB rule). Putting the seed there
would have it silently untracked, and re-including it would require inverting the ignore
rule for the directory first. A module sidesteps that and can be imported directly.

### Field schema

The same table exists on both sides, serving different purposes: the server's copy
validates incoming writes and must not trust the client, while the client's copy carries
presentation the server has no business knowing (Hebrew labels, input types). The
duplication is deliberate — deriving one from the other would couple validation to UI
copy. Both are small and change together; adding a field means editing both.

| Panel | Fields | Notes |
|---|---|---|
| `announcements` | `text` | Multi-line; `\n` preserved |
| `shiurim` | `name`, `time`, `by` | `time` must match `HH:MM` |
| `mazal` | `names`, `occasion` | |
| `azkarot` | `name`, `detail`, `date` | `date` is a free-text Hebrew date string |

Announcements change from bare strings to `{ id, text, isActive }`. The rendered output
is unchanged — `AnnouncementsPanel` already sets `white-space: pre-line`.

### Removal from `displayData.js`

The four constants are meant to be **deleted**, once the deferred half of Task 5 lands
(see "Implementation status" at the top) — the seed module becomes the single source,
so there is no second copy to drift. **As shipped so far, they are still present and
still what the TV actually renders**; only the admin/API side of this design has been
built. The prayer, zmanim, and Shabbat logic in that file is untouched either way.

## API — `/api/content`

| Method | Route | Used by |
|---|---|---|
| `GET` | `/api/content` | TV display — the whole document |
| `GET` | `/api/content/:panel` | Admin list screen |
| `POST` | `/api/content/:panel` | Add an item; server assigns `id` |
| `PUT` | `/api/content/:panel/:id` | Edit, and the הצג/הסתר toggle |
| `DELETE` | `/api/content/:panel/:id` | Delete |

Validation, driven by the field schema:

- Unknown `:panel` → `404`
- Missing or blank required field → `400` with a Hebrew message the UI can show as-is
- Fields not in the schema are **stripped**, not rejected — the client cannot inject keys
- `time` on a shiur must match `/^([01]\d|2[0-3]):[0-5]\d$/`
- `isActive` defaults to `true` on create

### Write durability

`content.json` is the display's entire content. A truncated file is a blank screen, so
writes are atomic: serialize to `content.json.tmp`, `fsync`, then `rename` over the
target. `rename` is atomic on the same filesystem, so a crash mid-write leaves either the
old file or the new one — never a partial one.

Concurrent writes are serialized through a promise chain in the store, so two rapid taps
cannot interleave a read-modify-write and lose one of them.

The store keeps the parsed document in memory and serves reads from it, writing through
on mutation. At this scale (tens of items, one editor) that is a convenience, not an
optimization — but it does mean a hand-edit of `content.json` needs a server restart to
take effect. Documented in `SETUP.md`.

## Admin UI

### Routes

```
/adminGabbai              AdminHome   — four rows with live item counts
/adminGabbai/:panel       PanelList   — items, each with ✎ / 🗑 / הצג-הסתר
/adminGabbai/:panel/new   ItemForm
/adminGabbai/:panel/:id   ItemForm
```

`PANEL_META` on the client mirrors the server's field schema and adds presentation —
Hebrew title, icon, per-field label and input type, and a `summary(item)` function for
the list row. `PanelList` and `ItemForm` read from it, so all four panels share the same
two components.

### Interaction

- The toggle saves immediately (one `PUT`), applied optimistically and rolled back on
  failure.
- The form has its own Save, which returns to the list on success.
- Delete asks for confirmation, naming the item.
- A failed save shows an inline Hebrew error and **keeps the form filled**. The gabbai
  never loses what he typed.

### Styling

Inline styles, matching `client/src/components/display/*`.

Tailwind is currently non-functional in this repo: `client/src/index.css` uses the v3
`@tailwind base/components/utilities` directives while v4 is installed via
`@tailwindcss/postcss`, which expects `@import "tailwindcss"`. This is why the newer
display components use inline styles while older ones (`pages/Display.jsx`,
`pages/Zmanim.jsx`) still carry `className` attributes that do nothing. **Fixing Tailwind
is out of scope** — it would change how those older pages render, which is unrelated to
this work.

### Scrolling

`index.css` pins `body` and `#root` to `overflow: hidden` for the TV. The admin root sets
`position: fixed; inset: 0; overflow-y: auto` and becomes its own scroll container, so
the page scrolls on a phone without altering global CSS that the display depends on.

## Display wiring

`useDisplayContent()` fetches `/api/content` on mount and every 30 seconds, filters out
`isActive: false`, and returns the four lists.

The TV browser is opened once and left running for weeks, so the hook is written for an
unattended screen:

- **A failed poll keeps the last good content.** A server restart must not blank the
  screen.
- **The last good response is cached to `localStorage`** so a TV reboot during a server
  outage still shows the most recent known content rather than nothing.
- **An empty panel renders a quiet placeholder**, never a crash.

Polling is the only mechanism that works here. The page is never reloaded, so
load-time-only fetching would mean walking to the TV after every edit.

### A rotation bug this exposes

`SynagogueDisplay.jsx` advances three rotation indices on a shared timer:

```js
setAnnIdx((i) => (i + 1) % ANNOUNCEMENTS.length);
```

With fixed-length arrays this is safe. Once the lists are editable and can shrink, a
stored index can exceed the new length, and `ANNOUNCEMENTS[annIdx]` returns `undefined` —
a blank panel until the counter happens to wrap around.

Fix: keep the counter monotonic and take the modulo at read time, against the current
array — `list[idx % list.length]`, guarded for an empty list.

## Existing scaffolding

`models/Announcement.js`, `models/Event.js`, `controllers/announcementController.js`,
`controllers/eventController.js` and their routes are Mongoose-backed against a database
that is never connected. Every one of their handlers would today buffer until Mongoose's
query timeout elapses and then fail with a 500.

They are **left in place and untouched** by this work. Deleting them is defensible
cleanup but is unrelated to shipping the admin panel, and `models/Settings.js` /
`models/User.js` may yet be wanted if auth is added later. The new content API lives
alongside them at a separate mount point.

## Error handling summary

| Failure | Behavior |
|---|---|
| `content.json` missing | Seeded from `defaultContent.js` on first read |
| `content.json` unparseable | Log loudly, serve the seed; the corrupt file is left alone until the next write, then renamed aside to `content.json.corrupt-<timestamp>` (logged) instead of being overwritten — it may be recoverable by hand |
| Crash mid-write | Atomic rename leaves the previous good file intact |
| API unreachable from the TV | Last good content retained; `localStorage` covers a reboot |
| API unreachable from the admin | Inline Hebrew error; form contents preserved |
| Invalid field submitted | `400` with a Hebrew message rendered next to the field |

## Verification

`node:test` — built into Node, no new dependency — covers the server logic that has real
failure modes:

1. Store seeds `content.json` from `defaultContent.js` when the file is absent.
2. Store serves the seed and preserves the file when `content.json` is corrupt.
3. A write is atomic — no `.tmp` file survives a successful write.
4. Two concurrent writes both land; neither is lost.
5. `POST` assigns an `id` and defaults `isActive` to `true`.
6. Fields outside the schema are stripped from a `POST` / `PUT` body.
7. A blank required field, and a malformed `time`, each return `400`.
8. An unknown panel returns `404`.

Wired up as `npm test` in `server/package.json`, replacing the current stub that exits 1.

No client test runner is added — the admin screens are thin CRUD over the API, and
standing up Vitest for them costs more than it catches. The client is verified by hand:

1. `npm run dev` at the repo root.
2. On a phone on the same network, open `/adminGabbai`; confirm the four counts match
   the display.
3. Add, edit, hide, and delete one item in each of the four panels.
4. Confirm each change reaches the TV within 30 seconds, without reloading it.
5. Stop the server; confirm the TV keeps showing the last content rather than blanking.
6. Reload the TV while the server is still down; confirm `localStorage` content appears.
7. Restart the server; confirm the TV recovers on its next poll.
8. Hide every item in one panel; confirm the placeholder renders and nothing crashes.

Steps 5–8 matter most: they are the states an unattended screen actually reaches, and
none of them are visible during normal editing.

## Out of scope

- **פרנס היום, the ticker, prayer times, zmanim** — still static. The `content.json`
  shape accommodates them as future panels.
- **Authentication** — see the note above.
- **Reordering and auto-expiry** — deliberately deferred.
- **Fixing Tailwind** — pre-existing and unrelated.
- **Deleting the dead Mongoose scaffolding** — pre-existing and unrelated.
