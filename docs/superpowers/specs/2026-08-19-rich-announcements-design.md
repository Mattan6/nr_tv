# Rich הודעות — a WYSIWYG editor with images — design

**Date:** 2026-08-19
**Status:** Approved — fully shipped. Implemented by
`docs/superpowers/plans/2026-08-19-rich-announcements.md`.
**Scope:** The `announcements` panel only. The gabbai gets a small WYSIWYG editor in
`/adminGabbai` — bold, italic, underline, lists, and an uploaded image — and the three
surfaces that render הודעות learn to draw it.

## What this is

`announcements` is the one panel whose content is free text: a single `text` string, edited
in a `<textarea>` and drawn with `whiteSpace: 'pre-line'` on the dark board, the שבת board
and the phone. Everything the gabbai wants to emphasise he has to say in words, and a
מודעה that exists as a picture — a הכנסת ספר תורה invitation, a printed notice from the
rav — cannot go on the wall at all.

This adds a rich document to an announcement: paragraphs with **bold** / *italic* /
underline, bulleted and numbered lists, and up to three uploaded images. It changes nothing
about the other five panels, and nothing about the board's layout — an image lands inside
the existing הודעות box.

## Decisions taken before the design

Four choices were made up front and the whole design follows from them:

1. **`announcements` only.** שיעורים, מזל טוב, אזכרות and the ticker are structured fields
   (a name, a time, a date) whose styling belongs to the board. A rich editor there would
   buy nothing and would let the gabbai break a layout he cannot see.
2. **The image goes inside the existing panel** — no full-screen takeover, no panel that
   grows and displaces מזל טוב. The board's grid is untouched.
3. **Upload from the gabbai's device**, not a pasted URL. A URL depends on a host nobody
   here controls; when it rots, the wall shows a broken image.
4. **Minimal formatting.** No colour picker, no font sizes, no font choice. The board owns
   its typography; the gabbai owns the words. This is also the decision that makes a whole
   editing library the wrong tool — see below.

### Why not Tiptap, Quill or ProseMirror

The obvious move is an editor library, and it was rejected deliberately.

A library brings correct selection handling, undo and paste cleanup — and five to fifteen
packages, a much larger bundle, and stored HTML. Stored HTML means every one of the three
display surfaces renders with `dangerouslySetInnerHTML`, which means the wall's safety
rests forever on a sanitizer being configured correctly. For bold, italic and a list, that
is a permanent liability bought for a temporary convenience.

`npm ci` has already destroyed `node_modules` in this repo once. A design that adds no
dependency at all — client or server — is worth real effort here.

## Architecture

Six units, each with one responsibility:

| Unit | Location | Responsibility |
|---|---|---|
| Document validator | `server/src/store/richText.js` | Decide whether a doc is legal; derive its plain text |
| Upload store | `server/src/store/uploads.js` | The only module that writes image files |
| Upload routes | `server/src/routes/uploads.js` | Accept one image, serve them all |
| DOM ↔ doc walker | `client/src/pages/Admin/richText.js` | Pure functions between the editor's DOM and the doc |
| Editor | `client/src/pages/Admin/RichTextEditor.jsx` | The toolbar and the editing surface |
| Renderer | `client/src/components/RichDoc.jsx` | Draw a doc — on the dark board, on the phone, and in the preview |

The renderer is shared on purpose. The admin's preview is not a lookalike of the board; it
is the board's own component on the board's own background, scaled down.

## The document model

An announcement gains an optional `doc` beside its existing `text`:

```json
{ "id": "…", "text": "flat text", "doc": { "blocks": [ … ] }, "isActive": true }
```

Three block types, and no fourth:

| Block | Shape |
|---|---|
| Paragraph | `{ "type": "p", "spans": [ { "text": "…", "marks": ["b","i","u"] } ] }` |
| List | `{ "type": "ul" \| "ol", "items": [ [span, …], … ] }` |
| Image | `{ "type": "img", "id": "‹uuid›.jpg", "alt": "…" }` |

### The image is a file id, not a URL

`{ "type": "img", "id": "3f2b…-8c1a.jpg" }`, matched against

```js
/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$/
```

and the path `/api/uploads/${id}` is built by the renderer, never stored.

This is the load-bearing decision of the whole model. `javascript:alert(1)`, a tracking
pixel on someone else's server, and `../../data/content.json` are not *filtered out* — they
are unrepresentable. There is no sanitizer to misconfigure and no regex to get subtly
wrong, because the only thing the field can hold is the name of a file this server wrote.

### `doc` is the source of truth; `text` is derived

When a doc is present the server computes `text` from it — spans concatenated, blocks and
list items joined with `\n` — and ignores whatever `text` the client sent. Nothing else in
the codebase has to learn that `doc` exists: `summary: (item) => item.text` in the admin
list keeps working, and so does any future consumer.

Image blocks contribute nothing to `text`. **An image-only announcement therefore has
`text: ""`, and that is legal** — required-ness is checked against the doc, not against the
derived text. A doc is empty when it has no blocks at all, or when every block it has is a
paragraph or list carrying no text; **an image block always counts as content**, which is
exactly what makes a picture-only מודעה savable. Two consequences, both handled:

- `PANEL_META.announcements.summary` becomes `(item) => item.text || '🖼 תמונה'`, or the
  admin list shows a blank row for a picture.
- The renderer must not treat an empty `text` as an empty announcement.

### Backward compatibility

An existing item has only `text`. It stays valid and renders exactly as it does today,
because `RichDoc` falls back to `text` with `whiteSpace: 'pre-line'` whenever `doc` is
falsy. Opening such an item in the editor converts it (split on newlines into paragraphs),
and the next save stores it as a doc. Migration by touch — no script, no flag day.

The legacy write path stays open too: a `POST`/`PUT` carrying only `text` still validates
under the current rule (required, ≤300 chars). **It also stores `doc: null`**, explicitly.
Without that, `Object.assign` in `updateItem` would leave a previously-saved doc in place
while `text` said something else, and the renderer — which prefers `doc` — would show the
old rich content forever. The test suite pins this.

### Limits

| Limit | Value | Why |
|---|---|---|
| Derived text | 600 chars | Up from 300. The box on the wall is fixed at ~900×330 and is the real constraint; 300 was already arbitrary |
| Blocks | 40 | Bounds `content.json` growth on an unauthenticated API, like `MAX_ITEMS` does |
| Images per announcement | 3 | The box holds one comfortably; three is the point past which the gabbai is fighting the layout |
| `alt` | 100 chars | |

`MAX_LEN = 300` is unchanged for every other panel and for the legacy `text` path.

## Images

### In the client: shrink before sending

`client/src/services/uploads.js` loads the chosen file into an `<img>`, draws it to a
`<canvas>` scaled so the long edge is at most **1280px**, and exports it again. A 5MB phone
photo leaves as roughly 200KB.

Re-encoding is not only about size: it drops EXIF (including the location the phone
stamped into a photo taken inside the shul) and any payload hidden in the original
container, because what gets uploaded is pixels this browser just drew.

A PNG source stays PNG, to keep transparency — a logo re-encoded to JPEG arrives with a
white box around it. Everything else leaves as JPEG at quality 0.82.

### In the server: raw bytes, checked by their first bytes

`POST /api/uploads`, body read by `express.raw({ type: ['image/jpeg','image/png'], limit: '3mb' })`.

Raw rather than multipart, because multipart means adding `multer`; raw rather than base64
in JSON, because base64 inflates by a third and `express.json()`'s 100KB default would
reject it anyway.

The server validates **magic bytes** — `FF D8 FF` for JPEG, `89 50 4E 47` for PNG — and not
the `Content-Type` header, which is written by whoever is calling. It then writes
`${CONTENT_DIR}/uploads/‹uuid›.jpg` and answers `{ "id": "‹uuid›.jpg" }`. The extension is
chosen by the server from the detected type; a filename from the client is never used.

`CONTENT_DIR` is exported from `contentStore.js` and imported here, so the images cannot
drift to a different directory from the content that references them — and so the existing
tests' trick of pointing `CONTENT_DIR` at a temp dir before `require` covers uploads too.

### Serving: under `/api`, immutable

`app.use('/api/uploads', uploadRoutes)` — the same path both uploads and serves.

Under `/api` and not `/uploads`, for two concrete reasons. Vite's dev proxy forwards only
`/api`, so a `/uploads` image would 404 in development; and the SPA fallback in `app.js`
answers every non-`/api` GET with `index.html`, so in production the TV would receive HTML
where it expected a JPEG.

Not mounted under `/api/content/uploads` either: `router.post('/:panel')` already lives
there, and a route that only works because it was declared on the right line is the trap
the `/settings` comment in `routes/content.js` already warns about.

Two headers matter:

- `X-Content-Type-Options: nosniff` — a JPEG with HTML appended must never be sniffed into
  a document.
- `Cache-Control: public, max-age=31536000, immutable` — filenames are UUIDs and never
  change. Without this, a TV left on for weeks re-downloads the image on every rotation.

### Orphans

An image uploaded and never saved, or an announcement deleted, leaves a file nothing points
to. After **any** successful content write — not only a write to `announcements` — the
controller sweeps `uploads/`: any file that no announcement's doc references **and that is
older than 24 hours** is deleted. Sweeping on every write rather than on announcement
writes alone is deliberate: it is one code path instead of a condition to get wrong, and
the directory it walks holds tens of files.

The age guard is the whole trick. Without it the sweep would delete the image the gabbai
uploaded four seconds ago, while he is still typing the announcement that will reference
it.

The sweep runs in the controller, after `contentStore.update` resolves, and its failures
are logged rather than propagated — a stale file must not turn a successful save into a
500. It deliberately does not live inside `contentStore.js`, which stays the only module
that touches `content.json` and nothing else.

### Disk ceiling

An upload is rejected with 400 once `uploads/` holds 100 files or 50MB. At the 1280px
ceiling that is roughly 200 real images — two orders of magnitude past what a shul posts —
and it is what stops an unauthenticated endpoint from filling the Railway volume.

## On the absence of auth — restated, because this changes it

`/api/uploads` is unauthenticated, like every other write route. The
[admin panel design](2026-07-22-admin-panel-design.md#on-the-absence-of-auth) accepted that
posture deliberately, but it was written about **text**. This is the first route that
writes *files* to disk, and the difference is real: a stranger who can reach the server
could previously change what the wall says, and can now also consume storage on it.

What the design does about it:

- Only two types are accepted, decided by magic bytes rather than by a header.
- 3MB per request, 100 files and 50MB per directory.
- Served with `nosniff`, from a path that serves nothing but images, with a
  server-assigned extension.

What it does not do: it does not stop a stranger from filling 50MB. It bounds the damage
to a bounded, recoverable amount of disk, which is the honest description.

If the no-auth decision is ever revisited — the condition the original spec set was the
server becoming reachable from outside the shul's LAN, which Railway has already made
true — this route belongs in the same review as `/api/content` and `app.use(cors())`.

## The editor

### The toolbar

Bold · italic · underline · bulleted list · numbered list · insert image. Six buttons,
matching the "minimal formatting" decision exactly. The surface is
`<div contentEditable dir="rtl">` and the commands run through `document.execCommand`.

`execCommand` is marked deprecated and has no replacement for this job; every browser still
implements it, including the TV-stick Chrome and the gabbai's phone. Building selection
handling by hand is how a small editor becomes a large one.

### Loading a doc into the editor builds DOM nodes, never HTML

`docToNodes` uses `createElement` and `textContent`. There is no `innerHTML` anywhere in
the editor, so an escaping bug has nowhere to occur — not for content the server validated,
and not for content converted from a legacy `text`.

### `domToDoc` — the delicate part

On save, the walker translates the editor's DOM into the model:

| In the DOM | In the doc |
|---|---|
| `B`, `STRONG` | mark `b` |
| `I`, `EM` | mark `i` |
| `U` | mark `u` |
| `P`, `DIV`, `BR` | paragraph boundary |
| `UL`, `OL`, `LI` | list block |
| `IMG[data-img-id]` | image block |
| **anything else** | **recursed into for text; its formatting dropped** |

That last row is the design. It is a whitelist, not a blacklist: a paste from Word arrives
as nested `SPAN`s carrying inline styles, `FONT` tags and `MsoNormal` classes, and comes
out as clean paragraphs because nothing outside the table above can survive the walk. A
blacklist would have to keep up with whatever the next version of Word emits.

The walker touches only `nodeType`, `nodeName`, `childNodes`, `textContent` and
`getAttribute`. That is what makes it testable against plain object fixtures under
`node --test` — no jsdom, no browser, no new dependency.

### The whitelist exists twice, on purpose

Once in the walker, once in the server's validator. This mirrors `panelMeta.js` against
`panels.js` today, for the same reason: the server does not trust the client, including
when the client is ours. The walker's job is to produce something clean; the validator's
job is to assume it did not.

### The preview

Below the editor, a box showing the announcement through `RichDoc` — the display's own
component — on the board's dark background, in the wall box's 900×330 proportion at 0.4
scale.

Without it the gabbai edits blind. His editing surface is wide and light, the box on the
wall is fixed and dark, and text that overflows there is simply clipped with nothing to
warn him. Because the renderer already exists for the display, the preview is roughly forty
lines.

## The display

```jsx
<RichDoc doc={ann?.doc} text={ann?.text} />
```

`doc` falsy → render `text` with `whiteSpace: 'pre-line'`, byte for byte today's behaviour.
That single fallback is the entire backward-compatibility story on the display side.

The renderer takes no colour and no size from the data — the surrounding surface supplies
them, per the minimal-formatting decision, which is why the same component works on the
dark board, on the phone card and inside the admin's preview without a theme prop.

Inside the box: `overflow: hidden`, and an image gets `objectFit: 'contain'` with a ceiling
of **55% of the box height**. An image that would otherwise push the text out of a fixed
box shrinks instead.

Two call sites, both handed a string today and both to be handed the item:

| File | Today | After |
|---|---|---|
| `display/AnnouncementsPanel.jsx` | receives a string (`ann?.text \|\| ''`) | receives the item |
| `mobile/RotatingCards.jsx` | receives a string | receives the item |

On the phone the image may run the full card width; it is read from thirty centimetres, not
from across a hall.

### The שבת board is deliberately left out

`shabbat/AnnouncementsCard.jsx` is **not** changed. It keeps rendering `ann?.text` with
`whiteSpace: 'pre-line'`, exactly as it does today.

This is a scope decision, not an oversight, and it has one visible consequence worth
stating rather than leaving to be discovered. `text` is derived from the doc, so a
formatted announcement still reads correctly on the שבת board — it only loses its bold and
its bullets. **An image-only announcement, whose derived `text` is by design the empty
string, renders there as a blank card.** The practical rule that follows: an announcement
that is nothing but a picture is a weekday announcement.

Bringing the שבת board in later is one import and one JSX swap, because `RichDoc` takes no
theme prop — the light card would supply its own colour and size exactly as the dark panel
does.

## Files

### New

| File | Holds |
|---|---|
| `server/src/store/richText.js` | `validateDoc(raw)` → `{ doc, text }` or `{ error }`; the limits |
| `server/src/store/uploads.js` | dir resolution, magic bytes, write, caps, sweep |
| `server/src/routes/uploads.js` | `POST /`, and `express.static` for GET |
| `client/src/services/uploads.js` | canvas downscale, re-encode, POST |
| `client/src/pages/Admin/richText.js` | `domToDoc`, `docToNodes`, `docFromPlainText`, `emptyDoc` |
| `client/src/pages/Admin/RichTextEditor.jsx` | toolbar, surface, preview |
| `client/src/components/RichDoc.jsx` | the shared renderer |
| `server/test/richText.test.js` | the validator, against the limits and the id whitelist |
| `server/test/uploads.test.js` | magic bytes, caps, serving headers, the sweep's age guard |
| `client/test/richText.test.js` | the walker, against object fixtures — joins the existing `client/test/` suite |

### Modified

| File | Change |
|---|---|
| `server/src/store/panels.js` | `announcements` accepts `doc`; legacy `text` path also writes `doc: null` |
| `server/src/store/contentStore.js` | export `CONTENT_DIR` |
| `server/src/controllers/contentController.js` | sweep after a successful write |
| `server/src/app.js` | mount `/api/uploads` |
| `client/src/pages/Admin/panelMeta.js` | announcements field → `{ key: 'doc', type: 'rich' }`; `summary` falls back to `🖼 תמונה` |
| `client/src/pages/Admin/ItemForm.jsx` | render `RichTextEditor` for `type: 'rich'`; `blankValues` yields a doc, not `''` |
| `client/src/pages/SynagogueDisplay.jsx` | pass the item |
| `client/src/pages/MobileDisplay.jsx` | pass the item |
| `client/src/components/display/AnnouncementsPanel.jsx` | render `RichDoc` |
| `client/src/components/mobile/RotatingCards.jsx` | render `RichDoc` |
| `DEPLOY.md` | backup and volume notes below |

### `DEPLOY.md`

Two paragraphs change meaning and must be corrected:

- **Backups.** `curl -s https://…/api/content > content-backup.json` no longer captures
  everything. Images are files beside `content.json`, not inside it, so a restore from that
  JSON alone brings back announcements whose pictures are gone.
- **The volume.** Still required, still `/data`, and still far inside the free tier's
  0.5GB: 100 images at the 1280px ceiling is roughly 25MB.

## Verification

### Tests

**`server/test/richText.test.js`** — accepts a well-formed doc; rejects an unknown block
type, an unknown mark, an image id that is an external URL, one containing `../`, and one
with a `.svg` extension; rejects a doc past each of the four limits; rejects a doc that is
empty or holds only empty paragraphs; accepts an image-only doc and derives `text: ""`;
derives text correctly across spans, blocks and list items.

**`server/test/uploads.test.js`** — rejects a body whose magic bytes are not JPEG or PNG
even when `Content-Type` claims otherwise; rejects a body past 3MB; accepts a real JPEG,
returns an id, and serves the same bytes back from `/api/uploads/‹id›` with `nosniff` and
the immutable cache header; rejects an upload once the file-count cap is reached; the sweep
deletes an unreferenced file older than 24 hours and **spares a fresh one**.

**`server/test/contentApi.test.js`** (additions) — a `POST` with a doc returns the derived
`text`; a legacy `POST` with only `text` still succeeds; a legacy `PUT` over an item that
had a doc clears it to `null`; a doc with a bogus image id gets a 400 with a Hebrew
message.

**`client/test/richText.test.js`** — `domToDoc` over object fixtures: nested `<b><i>`, a
Word-style paste of `<span style>` inside `<font>` (formatting dropped, text kept), `<br>`
runs, empty paragraphs collapsed, an `<img>` with no `data-img-id` dropped, `ul`/`ol` with
formatted items, adjacent identical spans merged.

It joins the three suites already in `client/test/`, which run on `node:test` with ESM
imports and no test framework. `client/package.json` declares `"test": "node --test"` and
the root `npm test` runs both packages, so the new file needs no configuration.

### By hand

1. In `/adminGabbai` → הודעות → add: bold text, a bulleted list, and an uploaded photo.
   The preview shows it on the dark board's background as it will appear on the wall.
2. Within 30 seconds the announcement is on `/` on a desktop-sized window, with the image
   inside the הודעות box and the times untouched around it.
3. The same announcement on a phone, image at card width.
4. Force the שבת board and confirm its card is untouched: a formatted announcement shows
   as plain text there, and an image-only one shows as a blank card — the stated cost of
   leaving that board out.
5. An announcement written before this change still renders, with its line breaks.
6. Paste a formatted block from Word into the editor and save — the text survives, the
   formatting does not.
7. Delete an announcement that had an image; more than 24 hours later, its file is gone
   from `uploads/`.
8. Redeploy on Railway and confirm both the announcement and its image survive — the volume
   test in `DEPLOY.md`, extended to images.
