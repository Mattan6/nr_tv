# Rich הודעות Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the gabbai a small WYSIWYG editor for הודעות — bold, italic, underline, lists and uploaded images — and teach the weekday board and the phone to render it. The שבת board is explicitly out of scope and must not be touched.

**Architecture:** An announcement gains an optional `doc`: a closed JSON model of blocks and spans, validated on the server, rendered as React elements. No HTML is ever stored and nothing renders with `dangerouslySetInnerHTML`. Images are uploaded as raw bytes to `/api/uploads`, stored on the Railway volume beside `content.json`, and referenced from a doc by a server-assigned file id rather than by URL.

**Tech Stack:** Express 5 (CommonJS), React 19 + Vite (ESM), `node:test` for both packages. **No new dependencies, client or server.**

**Spec:** `docs/superpowers/specs/2026-08-19-rich-announcements-design.md`

## Global Constraints

- **The שבת board is out of scope.** `client/src/components/shabbat/AnnouncementsCard.jsx` must not be modified by any task. Rich content reaches the weekday board (`display/AnnouncementsPanel.jsx`) and the phone (`mobile/RotatingCards.jsx`) only.
- **Zero new npm packages.** Not in `client/package.json`, not in `server/package.json`. If a task seems to need one, stop and raise it — the design rejected an editor library on exactly this ground.
- **Server is CommonJS** (`require`/`module.exports`), **client is ESM** (`import`/`export`). Do not mix.
- **No Tailwind.** It is non-functional in this repo (v3 directives against a v4 install). Use inline styles, as every existing component does. See the comment at the top of `client/src/pages/Admin/adminStyles.js`.
- **Hebrew must never be passed as a Bash argument** on this machine — Git Bash mangles it. Write files with the Write/Edit tools, and write commit messages with `git commit -F -` and a heredoc (verified working). Never `git commit -m "עברית"`.
- **Limits, copied verbatim from the spec:** derived text ≤ 600 chars · ≤ 40 blocks · ≤ 3 images per announcement · `alt` ≤ 100 chars · upload ≤ 3MB · ≤ 100 files and ≤ 50MB in `uploads/` · orphan age guard 24 hours · client downscale long edge 1280px, JPEG quality 0.82.
- **The image id whitelist is load-bearing.** `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$/` — do not loosen it to accept a URL, a path, or another extension. `.svg` in particular is a script container.
- **Run tests from the repo root** with `npm test` (runs both packages), or per package with `npm --prefix server test` / `npm --prefix client test`.
- Work happens on the branch `feature/rich-announcements`, which already exists and holds the spec commit.

---

### Task 1: The document validator

The server's answer to "is this doc legal", and the place the derived plain text comes from. Pure functions, no wiring — nothing calls it until Task 2.

**Files:**
- Create: `server/src/store/richText.js`
- Test: `server/test/richText.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `module.exports = { validateDoc, IMAGE_ID_RE, MAX_TEXT, MAX_BLOCKS, MAX_IMAGES, MAX_ALT }`.
  `validateDoc(raw)` returns `{ doc, text }` on success or `{ error: '‹Hebrew message›' }` on failure — never both, matching the `{ fields } | { errors }` convention already in `store/panels.js`.

- [ ] **Step 1: Write the failing test**

Create `server/test/richText.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');

const { validateDoc, MAX_TEXT, MAX_BLOCKS, MAX_IMAGES } = require('../src/store/richText');

const ID = '3f2b1a0c-4d5e-6f70-8192-a3b4c5d6e7f8.jpg';
const p = (text) => ({ type: 'p', spans: [{ text }] });

test('a well-formed doc round-trips and derives its text', () => {
  const { doc, text, error } = validateDoc({
    blocks: [
      { type: 'p', spans: [{ text: 'שיעור ' }, { text: 'הערב', marks: ['b'] }] },
      { type: 'ul', items: [[{ text: 'בית המדרש' }], [{ text: '20:00' }]] },
      { type: 'img', id: ID, alt: 'המודעה' },
    ],
  });

  assert.strictEqual(error, undefined);
  assert.strictEqual(text, 'שיעור הערב\nבית המדרש\n20:00');
  assert.strictEqual(doc.blocks.length, 3);
  assert.deepStrictEqual(doc.blocks[0].spans[1], { text: 'הערב', marks: ['b'] });
  assert.deepStrictEqual(doc.blocks[2], { type: 'img', id: ID, alt: 'המודעה' });
});

test('an image contributes no text, so an image-only doc is legal with text: ""', () => {
  const { text, error } = validateDoc({ blocks: [{ type: 'img', id: ID }] });

  assert.strictEqual(error, undefined);
  assert.strictEqual(text, '');
});

test('an empty doc, and one holding only empty paragraphs, are rejected', () => {
  assert.ok(validateDoc({ blocks: [] }).error);
  assert.ok(validateDoc({ blocks: [{ type: 'p', spans: [] }, { type: 'p', spans: [{ text: '' }] }] }).error);
});

test('a non-doc is rejected rather than crashing', () => {
  for (const raw of [null, undefined, 'טקסט', 42, {}, { blocks: 'לא מערך' }]) {
    assert.ok(validateDoc(raw).error, `expected ${JSON.stringify(raw)} to be rejected`);
  }
});

test('unknown block types and unknown marks are rejected', () => {
  assert.ok(validateDoc({ blocks: [{ type: 'script', spans: [] }] }).error);
  assert.ok(validateDoc({ blocks: [{ type: 'p', spans: [{ text: 'א', marks: ['blink'] }] }] }).error);
});

// The whole safety argument of the model: these are not filtered out, they are
// unrepresentable. If any of them ever passes, the renderer is building a URL from
// attacker input.
test('only a file this server could have written is accepted as an image id', () => {
  const bad = [
    'https://example.com/track.gif',
    '../../data/content.json',
    '3f2b1a0c-4d5e-6f70-8192-a3b4c5d6e7f8.svg',
    '3f2b1a0c-4d5e-6f70-8192-a3b4c5d6e7f8',
    'javascript:alert(1)',
    '',
  ];
  for (const id of bad) {
    assert.ok(validateDoc({ blocks: [{ type: 'img', id }] }).error, `expected ${id} to be rejected`);
  }
  assert.strictEqual(validateDoc({ blocks: [{ type: 'img', id: ID }] }).error, undefined);
});

test('each limit is enforced', () => {
  const long = { blocks: [p('א'.repeat(MAX_TEXT + 1))] };
  assert.ok(validateDoc(long).error.includes(String(MAX_TEXT)));

  const many = { blocks: Array.from({ length: MAX_BLOCKS + 1 }, (_, i) => p(String(i))) };
  assert.ok(validateDoc(many).error.includes(String(MAX_BLOCKS)));

  const images = { blocks: Array.from({ length: MAX_IMAGES + 1 }, () => ({ type: 'img', id: ID })) };
  assert.ok(validateDoc(images).error.includes(String(MAX_IMAGES)));

  assert.ok(validateDoc({ blocks: [{ type: 'img', id: ID, alt: 'א'.repeat(101) }] }).error);
});

test('empty paragraphs and empty list items are dropped, not rejected', () => {
  const { doc, error } = validateDoc({
    blocks: [{ type: 'p', spans: [] }, p('שלום'), { type: 'ul', items: [[], [{ text: 'א' }]] }],
  });

  assert.strictEqual(error, undefined);
  assert.deepStrictEqual(doc.blocks.map((b) => b.type), ['p', 'ul']);
  assert.strictEqual(doc.blocks[1].items.length, 1);
});

test('marks are normalised to a fixed order and de-duplicated', () => {
  const { doc } = validateDoc({ blocks: [{ type: 'p', spans: [{ text: 'א', marks: ['u', 'b', 'b'] }] }] });
  assert.deepStrictEqual(doc.blocks[0].spans[0].marks, ['b', 'u']);
});

test('fields outside the model are stripped rather than stored', () => {
  const { doc } = validateDoc({
    blocks: [{ type: 'p', spans: [{ text: 'א', style: 'color:red' }], onclick: 'x' }],
    extra: 'nope',
  });

  assert.deepStrictEqual(doc, { blocks: [{ type: 'p', spans: [{ text: 'א' }] }] });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — `Cannot find module '../src/store/richText'`.

- [ ] **Step 3: Write the implementation**

Create `server/src/store/richText.js`:

```js
// The rich document behind an announcement. Everything here exists to answer one
// question — is this legal — about a structure that arrived from the network rather
// than from our editor.
//
// The model is closed on purpose. No HTML is stored, so no surface renders with
// dangerouslySetInnerHTML and there is no sanitizer whose configuration has to stay
// correct forever; anything not named below is dropped or rejected here.

const MAX_TEXT = 600;
const MAX_BLOCKS = 40;
const MAX_IMAGES = 3;
const MAX_ALT = 100;

// A file this server wrote, and nothing else. The name is a UUID this process generated
// and an extension this process chose (see store/uploads.js), so an external host, a
// javascript: scheme, a traversal path and .svg — which browsers execute — are not
// filtered out, they are unrepresentable.
const IMAGE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$/;

// Fixed order, so two docs that mean the same thing serialize the same way.
const MARKS = ['b', 'i', 'u'];

// Thrown internally to abort with a specific Hebrew message; validateDoc converts it
// into the { error } half of the return value. The gabbai sees these strings.
class DocError extends Error {}

// Returns the normalised spans, dropping empty ones. Throws DocError on anything
// malformed — an unknown mark is a rejection, not something to quietly discard, because
// it means the sender is not the editor we shipped.
function spansOf(raw) {
  if (!Array.isArray(raw)) throw new DocError('תוכן ההודעה אינו תקין');
  const spans = [];

  for (const item of raw) {
    if (item === null || typeof item !== 'object') throw new DocError('תוכן ההודעה אינו תקין');
    if (typeof item.text !== 'string') throw new DocError('תוכן ההודעה אינו תקין');

    let marks = [];
    if (item.marks !== undefined) {
      if (!Array.isArray(item.marks)) throw new DocError('תוכן ההודעה אינו תקין');
      for (const mark of item.marks) {
        if (!MARKS.includes(mark)) throw new DocError('תוכן ההודעה אינו תקין');
      }
      marks = MARKS.filter((mark) => item.marks.includes(mark));
    }

    if (!item.text) continue;
    spans.push(marks.length ? { text: item.text, marks } : { text: item.text });
  }

  return spans;
}

// Returns the normalised block, or null for one that is well-formed but empty — an empty
// paragraph is dropped rather than rejected, because the editor produces them routinely
// and refusing to save over one would be maddening. Malformed blocks throw.
function blockOf(raw, counts) {
  if (raw === null || typeof raw !== 'object') throw new DocError('תוכן ההודעה אינו תקין');

  if (raw.type === 'p') {
    const spans = spansOf(raw.spans);
    return spans.length ? { type: 'p', spans } : null;
  }

  if (raw.type === 'ul' || raw.type === 'ol') {
    if (!Array.isArray(raw.items)) throw new DocError('תוכן ההודעה אינו תקין');
    const items = [];
    for (const entry of raw.items) {
      const spans = spansOf(entry);
      if (spans.length) items.push(spans);
    }
    return items.length ? { type: raw.type, items } : null;
  }

  if (raw.type === 'img') {
    if (typeof raw.id !== 'string' || !IMAGE_ID_RE.test(raw.id)) {
      throw new DocError('התמונה אינה מזוהה — נסה להעלות אותה שוב');
    }
    const alt = typeof raw.alt === 'string' ? raw.alt.trim() : '';
    if (alt.length > MAX_ALT) throw new DocError(`תיאור התמונה — עד ${MAX_ALT} תווים`);
    counts.images += 1;
    return { type: 'img', id: raw.id, alt };
  }

  throw new DocError('תוכן ההודעה אינו תקין');
}

const joinSpans = (spans) => spans.map((span) => span.text).join('');

// Blocks become lines and list items become lines; an image contributes nothing. This is
// what makes an image-only announcement's text an empty string — legal, and the reason
// required-ness is checked against the blocks rather than against this.
function plainText(blocks) {
  const lines = [];
  for (const block of blocks) {
    if (block.type === 'img') continue;
    if (block.type === 'p') lines.push(joinSpans(block.spans));
    else for (const item of block.items) lines.push(joinSpans(item));
  }
  return lines.join('\n');
}

function validateDoc(raw) {
  try {
    if (raw === null || typeof raw !== 'object' || !Array.isArray(raw.blocks)) {
      throw new DocError('תוכן ההודעה אינו תקין');
    }
    // Checked before the loop, so a hostile 100k-block body is refused rather than walked.
    if (raw.blocks.length > MAX_BLOCKS) throw new DocError(`עד ${MAX_BLOCKS} פסקאות בהודעה`);

    const counts = { images: 0 };
    const blocks = [];
    for (const entry of raw.blocks) {
      const block = blockOf(entry, counts);
      if (block) blocks.push(block);
    }

    if (counts.images > MAX_IMAGES) throw new DocError(`עד ${MAX_IMAGES} תמונות בהודעה`);
    if (!blocks.length) throw new DocError('שדה חובה');

    const text = plainText(blocks);
    if (text.length > MAX_TEXT) throw new DocError(`עד ${MAX_TEXT} תווים`);

    return { doc: { blocks }, text };
  } catch (err) {
    if (err instanceof DocError) return { error: err.message };
    throw err;
  }
}

module.exports = { validateDoc, IMAGE_ID_RE, MAX_TEXT, MAX_BLOCKS, MAX_IMAGES, MAX_ALT };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS — all of `richText.test.js`, and the existing suites unchanged.

- [ ] **Step 5: Commit**

```bash
git add server/src/store/richText.js server/test/richText.test.js
git commit -F - <<'EOF'
feat: validate the rich document behind an announcement

A closed JSON model — paragraphs, lists, images — rather than HTML, so no
surface has to render with dangerouslySetInnerHTML and no sanitizer has to stay
correctly configured forever.

An image is named by a file id matched against a UUID-plus-server-chosen-extension
pattern, which is what makes an external host, a javascript: scheme, a traversal
path and .svg unrepresentable instead of merely filtered.

Nothing calls this yet.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 2: The API accepts a doc

Wire the validator into the panel schema so `POST`/`PUT` on `announcements` take a doc, derive `text` from it, and keep the old flat-text path working.

**Files:**
- Modify: `server/src/store/panels.js`
- Test: `server/test/contentApi.test.js` (additions), `server/test/panels.test.js` (additions)

**Interfaces:**
- Consumes: `validateDoc` from Task 1.
- Produces: `validateItem('announcements', body)` returns `{ fields: { doc, text } }` when `body.doc` is present, and `{ fields: { text, doc: null } }` when it is not.

- [ ] **Step 1: Write the failing tests**

Append to `server/test/panels.test.js`:

```js
// --- Rich הודעות ------------------------------------------------------------------

const RICH_ID = '3f2b1a0c-4d5e-6f70-8192-a3b4c5d6e7f8.jpg';

test('a doc on the announcements panel becomes the source of truth for text', () => {
  const { fields, errors } = validateItem('announcements', {
    text: 'טקסט שהלקוח שלח ואין לסמוך עליו',
    doc: { blocks: [{ type: 'p', spans: [{ text: 'מה שנשמר באמת' }] }] },
  });

  assert.strictEqual(errors, undefined);
  assert.strictEqual(fields.text, 'מה שנשמר באמת');
  assert.strictEqual(fields.doc.blocks.length, 1);
});

// Without this, Object.assign in updateItem would leave the old rich content in place
// while `text` said something else — and every renderer prefers `doc`.
test('a write with no doc clears any doc the item already had', () => {
  const { fields } = validateItem('announcements', { text: 'הודעה פשוטה' });

  assert.strictEqual(fields.text, 'הודעה פשוטה');
  assert.strictEqual(fields.doc, null);
});

test('an invalid doc reports under the doc key, which is the form field', () => {
  const { errors } = validateItem('announcements', { doc: { blocks: [{ type: 'iframe' }] } });

  assert.ok(errors.doc);
});

test('only announcements take a doc — the other panels ignore it', () => {
  const { fields } = validateItem('ticker', { text: 'שורה', doc: { blocks: [] } });

  assert.strictEqual(fields.doc, undefined);
  assert.strictEqual(fields.text, 'שורה');
});

test('an image-only doc saves, even though its derived text is empty', () => {
  const { fields, errors } = validateItem('announcements', {
    doc: { blocks: [{ type: 'img', id: RICH_ID, alt: '' }] },
  });

  assert.strictEqual(errors, undefined);
  assert.strictEqual(fields.text, '');
});
```

Append to `server/test/contentApi.test.js`, **before** the `MAX_ITEMS` test (the comment there explains why that one must stay last):

```js
// --- Rich הודעות ------------------------------------------------------------------

const RICH_ID = '3f2b1a0c-4d5e-6f70-8192-a3b4c5d6e7f8.jpg';

test('POST an announcement with a doc returns the derived text', async () => {
  const res = await send('POST', `${base}/announcements`, {
    doc: { blocks: [{ type: 'p', spans: [{ text: 'שיעור ' }, { text: 'הערב', marks: ['b'] }] }] },
  });
  const created = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(created.text, 'שיעור הערב');
  assert.deepStrictEqual(created.doc.blocks[0].spans[1].marks, ['b']);
});

test('a legacy POST carrying only text still works', async () => {
  const res = await send('POST', `${base}/announcements`, { text: 'הודעה ישנה' });
  const created = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(created.text, 'הודעה ישנה');
  assert.strictEqual(created.doc, null);
});

test('a legacy PUT over a rich item clears its doc', async () => {
  const created = await (await send('POST', `${base}/announcements`, {
    doc: { blocks: [{ type: 'p', spans: [{ text: 'עשיר' }] }] },
  })).json();

  const updated = await (await send('PUT', `${base}/announcements/${created.id}`, {
    text: 'פשוט',
  })).json();

  assert.strictEqual(updated.text, 'פשוט');
  assert.strictEqual(updated.doc, null, 'a stale doc would keep winning at render time');
});

test('a doc naming an image we never wrote is a 400 in Hebrew', async () => {
  const res = await send('POST', `${base}/announcements`, {
    doc: { blocks: [{ type: 'img', id: 'https://example.com/track.gif' }] },
  });
  const body = await res.json();

  assert.strictEqual(res.status, 400);
  assert.ok(body.errors.doc);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm --prefix server test`
Expected: FAIL — `fields.doc` is `undefined` where `null` or an object is expected, and the doc-carrying POST comes back 400 (`text` is required and absent).

- [ ] **Step 3: Write the implementation**

In `server/src/store/panels.js`, add the require at the top, beside the existing constants:

```js
const { validateDoc } = require('./richText');
```

Then replace the body of `validateItem` with this. The existing loop is unchanged; two blocks are added around it:

```js
// Returns { fields } or { errors }, never both. `fields` contains only schema keys,
// so a client cannot inject an id, an isActive, or anything else by sending it.
function validateItem(panel, body) {
  // הודעות may carry a rich document instead of a flat string. When one is present it is
  // the source of truth and `text` is derived from it (store/richText.js), so whatever
  // `text` the client also sent is ignored and the plain-field loop below is skipped.
  if (panel === 'announcements' && body != null && body.doc != null) {
    const { doc, text, error } = validateDoc(body.doc);
    // Reported under `doc`, which is the field key the admin form uses — see panelMeta.js.
    if (error) return { errors: { doc: error } };
    return { fields: { doc, text } };
  }

  const schema = PANELS[panel];
  const fields = {};
  const errors = {};

  for (const [key, rule] of Object.entries(schema)) {
    const raw = body == null ? undefined : body[key];
    const value = typeof raw === 'string' ? raw.trim() : '';

    if (!value) {
      if (rule.required) errors[key] = 'שדה חובה';
      else fields[key] = '';
      continue;
    }
    if (value.length > MAX_LEN) {
      errors[key] = `עד ${MAX_LEN} תווים`;
      continue;
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      errors[key] = rule.message;
      continue;
    }
    fields[key] = value;
  }

  if (Object.keys(errors).length) return { errors };

  // A write that carries no doc clears any doc the item already had. Without this,
  // Object.assign in updateItem would leave the old rich content in place while `text`
  // said something else — and every renderer prefers `doc`.
  if (panel === 'announcements') fields.doc = null;

  return { fields };
}
```

`PANELS.announcements` itself does not change: `text` stays required with the 300-char cap, which is still the rule for the legacy path.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm --prefix server test`
Expected: PASS — the new tests and every existing one. The pre-existing `POST rejects a blank required field` test still passes, because a body with no `doc` takes the old path unchanged.

- [ ] **Step 5: Commit**

```bash
git add server/src/store/panels.js server/test/panels.test.js server/test/contentApi.test.js
git commit -F - <<'EOF'
feat: accept a rich document on the announcements panel

A body carrying `doc` takes the new path: the document is validated, `text` is
derived from it, and whatever `text` the client also sent is ignored. A body
without one takes the existing path untouched, so the old API and every
announcement already in content.json keep working.

The legacy path now also writes `doc: null`. Without it, Object.assign in
updateItem would leave stale rich content in place while `text` said something
else, and every renderer prefers `doc`.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 3: Image uploads

The route that accepts one image and the store that writes it. After this task an image can be uploaded with `curl` and fetched back, though nothing references one yet.

**Files:**
- Create: `server/src/store/uploads.js`, `server/src/routes/uploads.js`
- Modify: `server/src/store/contentStore.js` (export `CONTENT_DIR`), `server/src/app.js` (mount)
- Test: `server/test/uploads.test.js`

**Interfaces:**
- Consumes: `CONTENT_DIR` from `contentStore.js`.
- Produces: `module.exports = { UPLOAD_DIR, MAX_BYTES, MAX_FILES, MAX_DIR_BYTES, ORPHAN_AGE_MS, UploadError, detectType, saveImage, listFiles }`. `saveImage(buffer)` resolves to the id string (`'‹uuid›.jpg'`) or rejects with an `UploadError` carrying a Hebrew message. `sweepOrphans` arrives in Task 4.

- [ ] **Step 1: Write the failing test**

Create `server/test/uploads.test.js`:

```js
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

let server;
let base;
let dir;

before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'uploads-api-'));
  // Must be set before app.js is required — both stores read it at load, the same
  // mechanism contentApi.test.js relies on.
  process.env.CONTENT_DIR = dir;
  const app = require('../src/app');
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/uploads`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(dir, { recursive: true, force: true });
});

// A real, minimal JPEG: SOI, a JFIF APP0 segment, and EOI. Enough for the magic-byte
// check, and small enough to write inline rather than commit a binary fixture.
const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

const post = (body, type = 'image/jpeg') =>
  fetch(base, { method: 'POST', headers: { 'Content-Type': type }, body });

test('a JPEG is stored under a uuid and served back byte for byte', async () => {
  const res = await post(JPEG);
  const { id } = await res.json();

  assert.strictEqual(res.status, 201);
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/);

  const got = await fetch(`${base}/${id}`);
  assert.strictEqual(got.status, 200);
  assert.deepStrictEqual(Buffer.from(await got.arrayBuffer()), JPEG);
});

test('the served image is uncacheable-proof and unsniffable', async () => {
  const { id } = await (await post(JPEG)).json();
  const got = await fetch(`${base}/${id}`);

  assert.strictEqual(got.headers.get('x-content-type-options'), 'nosniff');
  assert.match(got.headers.get('cache-control'), /immutable/);
});

test('a PNG keeps its own extension', async () => {
  const { id } = await (await post(PNG, 'image/png')).json();
  assert.ok(id.endsWith('.png'));
});

// The Content-Type header is written by whoever is calling, and this route is
// unauthenticated. Only the bytes decide.
test('the type is decided by the bytes, not by the header', async () => {
  const res = await post(Buffer.from('<script>alert(1)</script>'), 'image/jpeg');

  assert.strictEqual(res.status, 400);
  assert.ok((await res.json()).message);
});

test('an empty body is refused', async () => {
  assert.strictEqual((await post(Buffer.alloc(0))).status, 400);
});

test('a body past the size cap is refused before it is written', async () => {
  const { MAX_BYTES } = require('../src/store/uploads');
  const res = await post(Buffer.concat([JPEG, Buffer.alloc(MAX_BYTES)]));

  // body-parser rejects an over-limit body with 413 of its own accord; app.js's error
  // handler passes that status through.
  assert.strictEqual(res.status, 413);
});

test('detectType recognises exactly two formats', () => {
  const { detectType } = require('../src/store/uploads');

  assert.strictEqual(detectType(JPEG), 'jpg');
  assert.strictEqual(detectType(PNG), 'png');
  assert.strictEqual(detectType(Buffer.from('GIF89a-and-more')), null);
  assert.strictEqual(detectType(Buffer.alloc(2)), null);
});

// Placed last deliberately: it fills the directory to the cap, which would break any
// earlier test that expects an upload to succeed.
test('uploads stop once the file-count cap is reached', async () => {
  const { UPLOAD_DIR, MAX_FILES } = require('../src/store/uploads');
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const existing = (await fs.readdir(UPLOAD_DIR)).length;
  for (let i = existing; i < MAX_FILES; i += 1) {
    await fs.writeFile(path.join(UPLOAD_DIR, `filler-${i}.jpg`), JPEG);
  }

  const res = await post(JPEG);
  assert.strictEqual(res.status, 400);
  assert.ok((await res.json()).message.includes(String(MAX_FILES)));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — `Cannot find module '../src/store/uploads'`.

- [ ] **Step 3: Export `CONTENT_DIR` from the content store**

In `server/src/store/contentStore.js`, change the final export block so the uploads store cannot drift to a different directory from the content that references it:

```js
module.exports = {
  createContentStore,
  contentStore: createContentStore(defaultDir),
  NotFoundError,
  // Exported so store/uploads.js writes images beside content.json rather than deriving
  // the path a second time — and so the tests' trick of pointing CONTENT_DIR at a temp
  // directory before `require` covers uploads too.
  CONTENT_DIR: defaultDir,
};
```

- [ ] **Step 4: Write the upload store**

Create `server/src/store/uploads.js`:

```js
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { CONTENT_DIR } = require('./contentStore');

// The only module that writes image files. They live beside content.json so one Railway
// volume holds all of the shul's content — see DEPLOY.md.
const UPLOAD_DIR = path.join(CONTENT_DIR, 'uploads');

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_FILES = 100;
const MAX_DIR_BYTES = 50 * 1024 * 1024;

class UploadError extends Error {}

// The type is decided by the bytes and never by the Content-Type header, which is written
// by whoever is calling — and this route, like the rest of the API, is unauthenticated.
// The extension that ends up on disk comes from here, which is what keeps a doc's image id
// inside the pattern store/richText.js enforces.
function detectType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  return null;
}

// An absent directory is an empty one — the first upload creates it.
async function listFiles() {
  let names;
  try {
    names = await fs.readdir(UPLOAD_DIR);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }

  const files = [];
  for (const name of names) {
    try {
      const info = await fs.stat(path.join(UPLOAD_DIR, name));
      if (info.isFile()) files.push({ name, size: info.size, mtimeMs: info.mtimeMs });
    } catch (err) {
      // Vanished between readdir and stat — a concurrent sweep. Nothing to report.
      if (err.code !== 'ENOENT') throw err;
    }
  }
  return files;
}

async function saveImage(buffer) {
  const ext = detectType(buffer);
  if (!ext) throw new UploadError('הקובץ אינו תמונת JPEG או PNG');
  if (buffer.length > MAX_BYTES) throw new UploadError('התמונה גדולה מדי');

  // The caps are what stop an unauthenticated endpoint from filling the Railway volume.
  // They bound the damage; they do not prevent it. See the spec's restated auth section.
  const files = await listFiles();
  if (files.length >= MAX_FILES) {
    throw new UploadError(`אין מקום לתמונות נוספות — הגעת ל-${MAX_FILES} תמונות`);
  }
  const used = files.reduce((sum, file) => sum + file.size, 0);
  if (used + buffer.length > MAX_DIR_BYTES) throw new UploadError('אין מקום לתמונות נוספות');

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const id = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, id), buffer);
  return id;
}

module.exports = { UPLOAD_DIR, MAX_BYTES, MAX_FILES, MAX_DIR_BYTES, UploadError, detectType, listFiles, saveImage };
```

- [ ] **Step 5: Write the routes**

Create `server/src/routes/uploads.js`:

```js
const express = require('express');
const { UPLOAD_DIR, MAX_BYTES, UploadError, saveImage } = require('../store/uploads');

const router = express.Router();

// No auth, by the same decision as the rest of the API — but this is the first route that
// writes FILES, which the original decision was not made about. See the spec's
// "On the absence of auth — restated".

// Raw bytes rather than multipart or base64: multipart would mean adding multer, and
// base64 inflates by a third and would be refused by express.json()'s 100KB default
// anyway. A body past the limit is rejected by body-parser with a 413 before it reaches
// the handler.
router.post(
  '/',
  express.raw({ type: ['image/jpeg', 'image/png'], limit: MAX_BYTES }),
  async (req, res, next) => {
    // Not a Buffer when the Content-Type was something express.raw does not parse.
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).json({ message: 'לא התקבלה תמונה' });
    }
    try {
      res.status(201).json({ id: await saveImage(req.body) });
    } catch (err) {
      if (err instanceof UploadError) return res.status(400).json({ message: err.message });
      next(err);
    }
  }
);

// Filenames are UUIDs and never change, so a TV left on for weeks may cache them forever;
// without this it re-downloads the image on every rotation. nosniff so a JPEG with HTML
// appended to it can never be sniffed into a document.
router.use(
  express.static(UPLOAD_DIR, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  })
);

module.exports = router;
```

- [ ] **Step 6: Mount it**

In `server/src/app.js`, add the require beside the others and the mount beside the other `/api` mounts:

```js
const uploadRoutes = require('./routes/uploads');
```

```js
app.use('/api/content', contentRoutes);
// Under /api, and deliberately not under /uploads: Vite's dev proxy forwards only /api,
// and the SPA fallback below answers every non-/api GET with index.html — so at /uploads
// the TV would get HTML where it expected a JPEG. Not under /api/content/uploads either,
// where router.post('/:panel') already lives and correctness would depend on declaration
// order, the trap the /settings comment in routes/content.js warns about.
app.use('/api/uploads', uploadRoutes);
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm --prefix server test`
Expected: PASS, including the existing `contentApi.test.js` — both suites set `CONTENT_DIR` to their own temp directory before requiring `app.js`.

- [ ] **Step 8: Commit**

```bash
git add server/src/store/uploads.js server/src/routes/uploads.js server/src/store/contentStore.js server/src/app.js server/test/uploads.test.js
git commit -F - <<'EOF'
feat: accept and serve uploaded images

POST /api/uploads takes raw JPEG or PNG bytes and writes them beside
content.json on the Railway volume, under a uuid this process generates with an
extension this process chooses — which is what keeps every image id inside the
pattern richText.js enforces.

The format is decided by the file's magic bytes, not by its Content-Type header:
the header is written by whoever is calling, and this route is unauthenticated
like the rest of the API. Count and size caps bound how much disk a stranger can
consume; they do not prevent it, which the spec states plainly.

Mounted at /api/uploads rather than /uploads so Vite's dev proxy and the SPA
fallback both keep working, and outside /api/content so no route depends on
declaration order.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 4: The orphan sweep

An image uploaded and never saved, or one whose announcement was deleted, leaves a file nothing points to. This collects them without collecting the one the gabbai uploaded four seconds ago.

**Files:**
- Modify: `server/src/store/uploads.js`, `server/src/controllers/contentController.js`
- Test: `server/test/uploads.test.js` (additions)

**Interfaces:**
- Consumes: `listFiles`, `UPLOAD_DIR` from Task 3.
- Produces: `sweepOrphans(doc, now = Date.now())` → resolves to the number of files deleted. `now` is a parameter so the age guard is testable without touching the clock.

- [ ] **Step 1: Write the failing test**

Add to `server/test/uploads.test.js`, **before** the file-count-cap test (which must stay last):

```js
test('the sweep deletes an unreferenced old file and spares a fresh one', async () => {
  const { UPLOAD_DIR, ORPHAN_AGE_MS, sweepOrphans } = require('../src/store/uploads');
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const old = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg';
  const fresh = 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee.jpg';
  const kept = 'cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee.jpg';
  for (const name of [old, fresh, kept]) {
    await fs.writeFile(path.join(UPLOAD_DIR, name), JPEG);
  }

  // `old` and `kept` are aged past the guard; `fresh` is not. `kept` is referenced.
  const past = new Date(Date.now() - ORPHAN_AGE_MS - 60_000);
  await fs.utimes(path.join(UPLOAD_DIR, old), past, past);
  await fs.utimes(path.join(UPLOAD_DIR, kept), past, past);

  const doc = { announcements: [{ id: 'a', doc: { blocks: [{ type: 'img', id: kept }] } }] };
  const removed = await sweepOrphans(doc);

  const names = (await fs.readdir(UPLOAD_DIR));
  assert.strictEqual(removed, 1);
  assert.ok(!names.includes(old), 'an aged, unreferenced file should be gone');
  assert.ok(names.includes(fresh), 'a file uploaded seconds ago must survive — its announcement is still being typed');
  assert.ok(names.includes(kept), 'a referenced file must survive regardless of age');
});

test('the sweep tolerates announcements with no doc at all', async () => {
  const { sweepOrphans } = require('../src/store/uploads');

  await assert.doesNotReject(() => sweepOrphans({ announcements: [{ id: 'a', text: 'ישן' }] }));
  await assert.doesNotReject(() => sweepOrphans({}));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — `sweepOrphans is not a function`.

- [ ] **Step 3: Write the sweep**

In `server/src/store/uploads.js`, add the constant beside the others:

```js
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;
```

and the function before `module.exports`:

```js
// Deletes image files that no announcement references.
//
// The age guard is the whole trick, not a refinement of it. An image is uploaded the
// moment the gabbai picks it, and the announcement that references it is not saved until
// he finishes typing — so without the guard the very next write from any panel would
// delete the picture out from under him.
//
// `now` is a parameter so the guard is testable without touching the clock.
async function sweepOrphans(doc, now = Date.now()) {
  const referenced = new Set();
  for (const item of doc?.announcements || []) {
    for (const block of item?.doc?.blocks || []) {
      if (block.type === 'img') referenced.add(block.id);
    }
  }

  let removed = 0;
  for (const file of await listFiles()) {
    if (referenced.has(file.name)) continue;
    if (now - file.mtimeMs < ORPHAN_AGE_MS) continue;
    await fs.rm(path.join(UPLOAD_DIR, file.name), { force: true });
    removed += 1;
  }
  return removed;
}
```

Add `ORPHAN_AGE_MS` and `sweepOrphans` to the export list.

- [ ] **Step 4: Call it after a successful write**

In `server/src/controllers/contentController.js`, add the require:

```js
const { sweepOrphans } = require('../store/uploads');
```

and this helper below the `handler` wrapper:

```js
// Runs after a successful write — on any panel rather than only on announcements, which
// is one code path instead of a condition to get wrong, over a directory holding tens of
// files. Awaited rather than fired and forgotten so it is deterministic under test, and
// wrapped so a stale file can never turn a saved announcement into a 500.
async function sweep() {
  try {
    await sweepOrphans(await contentStore.read());
  } catch (err) {
    console.error(`⚠️  Could not sweep orphaned uploads: ${err.message}`);
  }
}
```

Then `await sweep();` immediately before the response in `createItem`, `updateItem` and `deleteItem`. For example, `deleteItem` becomes:

```js
const deleteItem = handler(async (req, res) => {
  const { panel, id } = req.params;

  await contentStore.update((draft) => {
    const index = draft[panel].findIndex((it) => it.id === id);
    if (index === -1) throw new NotFoundError(id);
    draft[panel].splice(index, 1);
  });
  await sweep();
  res.json({ message: 'הפריט נמחק' });
});
```

`updateSettings` does not sweep — it cannot change which images are referenced.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — both packages. Watch that `contentApi.test.js` still passes: every write there now runs a sweep over an empty or absent `uploads/` directory, which must be a no-op rather than an error.

- [ ] **Step 6: Commit**

```bash
git add server/src/store/uploads.js server/src/controllers/contentController.js server/test/uploads.test.js
git commit -F - <<'EOF'
feat: collect image files no announcement references

An image is uploaded the moment the gabbai picks it, and the announcement that
references it is not saved until he finishes typing. So the sweep deletes only
files that are both unreferenced AND older than 24 hours; without the age guard
the next write from any panel would delete the picture out from under him.

Awaited rather than fired and forgotten, so it is deterministic under test, and
wrapped so a stale file cannot turn a saved announcement into a 500.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 5: The DOM ↔ doc walker

The client's half of the model: pure functions between the editor's `contentEditable` DOM and the document. No React yet.

**Files:**
- Create: `client/src/pages/Admin/richText.js`
- Test: `client/test/richText.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `export { domToDoc, docToNodes, docFromPlainText, emptyDoc }`.
  `domToDoc(root)` → `{ blocks }` · `docToNodes(doc)` → an array of DOM nodes (browser only) · `docFromPlainText(text)` → `{ blocks }` · `emptyDoc()` → `{ blocks: [] }`.

**Note on testability:** `domToDoc` touches only `nodeType`, `nodeName`, `childNodes`, `textContent` and `getAttribute`. That is deliberate and load-bearing — it is what lets the tests build fake nodes as plain objects, with no jsdom and no new dependency. Do not reach for `classList`, `style`, `innerHTML` or `querySelector` in it.

- [ ] **Step 1: Write the failing test**

Create `client/test/richText.test.js`. It matches the ESM + `node:test` style of the three suites already in `client/test/`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { domToDoc, docFromPlainText } from '../src/pages/Admin/richText.js';

// Fake DOM nodes. domToDoc reads only these five properties, which is the whole reason
// this file needs no jsdom.
const text = (value) => ({ nodeType: 3, textContent: value, childNodes: [] });
const el = (nodeName, childNodes = [], attrs = {}) => ({
  nodeType: 1,
  nodeName,
  childNodes,
  getAttribute: (name) => (name in attrs ? attrs[name] : null),
});
const root = (childNodes) => ({ childNodes });

test('plain paragraphs become paragraph blocks', () => {
  const doc = domToDoc(root([el('DIV', [text('שורה ראשונה')]), el('DIV', [text('שורה שנייה')])]));

  assert.deepEqual(doc.blocks, [
    { type: 'p', spans: [{ text: 'שורה ראשונה' }] },
    { type: 'p', spans: [{ text: 'שורה שנייה' }] },
  ]);
});

test('nested marks accumulate', () => {
  const doc = domToDoc(root([el('DIV', [el('B', [el('I', [text('חשוב')])])])]));

  assert.deepEqual(doc.blocks[0].spans, [{ text: 'חשוב', marks: ['b', 'i'] }]);
});

test('STRONG and EM are the same marks as B and I', () => {
  const doc = domToDoc(root([el('DIV', [el('STRONG', [text('א')]), el('EM', [text('ב')])])]));

  assert.deepEqual(doc.blocks[0].spans, [
    { text: 'א', marks: ['b'] },
    { text: 'ב', marks: ['i'] },
  ]);
});

// The whitelist in one test: what Word actually pastes.
test('a paste from Word keeps its text and loses its formatting', () => {
  const doc = domToDoc(
    root([
      el('DIV', [
        el('SPAN', [el('FONT', [text('הודעה חשובה')], { color: '#ff0000' })], {
          style: 'font-size:48pt;color:#c00',
          class: 'MsoNormal',
        }),
      ]),
    ])
  );

  assert.deepEqual(doc.blocks, [{ type: 'p', spans: [{ text: 'הודעה חשובה' }] }]);
});

test('a link keeps its text and stops being a link', () => {
  const doc = domToDoc(root([el('DIV', [el('A', [text('לחץ כאן')], { href: 'javascript:alert(1)' })])]));

  assert.deepEqual(doc.blocks, [{ type: 'p', spans: [{ text: 'לחץ כאן' }] }]);
});

test('adjacent spans with identical marks are merged', () => {
  const doc = domToDoc(root([el('DIV', [el('B', [text('של')]), el('B', [text('ום')])])]));

  assert.deepEqual(doc.blocks[0].spans, [{ text: 'שלום', marks: ['b'] }]);
});

test('a BR ends the paragraph', () => {
  const doc = domToDoc(root([el('DIV', [text('ראשונה'), el('BR'), text('שנייה')])]));

  assert.deepEqual(doc.blocks, [
    { type: 'p', spans: [{ text: 'ראשונה' }] },
    { type: 'p', spans: [{ text: 'שנייה' }] },
  ]);
});

test('empty paragraphs are collapsed away', () => {
  const doc = domToDoc(root([el('DIV', [text('א')]), el('DIV', []), el('DIV', [el('BR')]), el('DIV', [text('ב')])]));

  assert.deepEqual(doc.blocks, [
    { type: 'p', spans: [{ text: 'א' }] },
    { type: 'p', spans: [{ text: 'ב' }] },
  ]);
});

test('lists become list blocks and keep their marks', () => {
  const doc = domToDoc(
    root([
      el('UL', [el('LI', [text('רגיל')]), el('LI', [el('B', [text('מודגש')])]), el('LI', [])]),
      el('OL', [el('LI', [text('ראשון')])]),
    ])
  );

  assert.deepEqual(doc.blocks, [
    { type: 'ul', items: [[{ text: 'רגיל' }], [{ text: 'מודגש', marks: ['b'] }]] },
    { type: 'ol', items: [[{ text: 'ראשון' }]] },
  ]);
});

test('a BR inside a list item does not break the list apart', () => {
  const doc = domToDoc(root([el('UL', [el('LI', [text('א'), el('BR'), text('ב')])])]));

  assert.deepEqual(doc.blocks, [{ type: 'ul', items: [[{ text: 'אב' }]] }]);
});

test('an image with our id becomes an image block', () => {
  const id = '3f2b1a0c-4d5e-6f70-8192-a3b4c5d6e7f8.jpg';
  const doc = domToDoc(
    root([el('DIV', [text('לפני')]), el('IMG', [], { 'data-img-id': id, alt: 'מודעה' }), el('DIV', [text('אחרי')])])
  );

  assert.deepEqual(doc.blocks, [
    { type: 'p', spans: [{ text: 'לפני' }] },
    { type: 'img', id, alt: 'מודעה' },
    { type: 'p', spans: [{ text: 'אחרי' }] },
  ]);
});

// A picture dragged in from a web page has a src we do not host and no file behind it.
test('an image without our id is dropped', () => {
  const doc = domToDoc(root([el('IMG', [], { src: 'https://example.com/x.png' }), el('DIV', [text('טקסט')])]));

  assert.deepEqual(doc.blocks, [{ type: 'p', spans: [{ text: 'טקסט' }] }]);
});

test('an empty editor yields a doc with no blocks, which the server calls required', () => {
  assert.deepEqual(domToDoc(root([])).blocks, []);
  assert.deepEqual(domToDoc(root([el('DIV', [el('BR')])])).blocks, []);
});

test('docFromPlainText turns a legacy announcement into paragraphs', () => {
  assert.deepEqual(docFromPlainText('שורה\nשנייה'), {
    blocks: [
      { type: 'p', spans: [{ text: 'שורה' }] },
      { type: 'p', spans: [{ text: 'שנייה' }] },
    ],
  });
  assert.deepEqual(docFromPlainText(''), { blocks: [] });
  assert.deepEqual(docFromPlainText(undefined), { blocks: [] });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix client test`
Expected: FAIL — cannot resolve `../src/pages/Admin/richText.js`.

- [ ] **Step 3: Write the implementation**

Create `client/src/pages/Admin/richText.js`:

```js
// The bridge between the editor's contentEditable DOM and the stored document.
//
// domToDoc deliberately touches only nodeType, nodeName, childNodes, textContent and
// getAttribute. That is what lets it be tested against plain objects — no jsdom, no
// browser, no new dependency — and it is the reason this file has tests at all. Do not
// reach for classList, style, innerHTML or querySelector here.

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

const MARK_BY_TAG = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u' };
const MARKS = ['b', 'i', 'u'];

export const emptyDoc = () => ({ blocks: [] });

const sameMarks = (a = [], b = []) => a.length === b.length && a.every((mark, i) => mark === b[i]);

// execCommand splits a run into several elements as a matter of course, so <b>של</b><b>ום</b>
// is the normal output rather than an edge case. Merging here keeps the stored document
// from growing a span per keystroke.
function mergeSpans(spans) {
  const out = [];
  for (const span of spans) {
    if (!span.text) continue;
    const marks = MARKS.filter((mark) => span.marks.includes(mark));
    const last = out[out.length - 1];
    if (last && sameMarks(last.marks, marks)) {
      last.text += span.text;
      continue;
    }
    out.push(marks.length ? { text: span.text, marks } : { text: span.text });
  }
  return out;
}

export function domToDoc(root) {
  const blocks = [];
  let para = null;

  // A span is pushed through a function rather than into a captured array: flushing sets
  // `para` to null, and a closure holding the old array would keep filling a paragraph
  // that has already been emitted.
  const pushSpan = (span) => {
    if (!para) para = [];
    para.push(span);
  };

  const flushPara = () => {
    if (!para) return;
    const spans = mergeSpans(para);
    para = null;
    if (spans.length) blocks.push({ type: 'p', spans });
  };

  const image = (node) => {
    const id = node.getAttribute('data-img-id');
    // A picture dragged in from a web page: a src we do not host, with no file of ours
    // behind it. The server would reject it anyway; dropping it here means the gabbai
    // finds out at once rather than at save time.
    if (!id) return;
    flushPara();
    blocks.push({ type: 'img', id, alt: node.getAttribute('alt') || '' });
  };

  // `sink` receives spans and `onBreak` decides what a <br> means here — a new paragraph
  // at the top level, and nothing at all inside a list item, where a stray break must not
  // push a paragraph into the middle of the list.
  const inline = (node, marks, sink, onBreak) => {
    if (node.nodeType === TEXT_NODE) {
      if (node.textContent) sink({ text: node.textContent, marks });
      return;
    }
    if (node.nodeType !== ELEMENT_NODE) return;

    if (node.nodeName === 'BR') return onBreak();
    if (node.nodeName === 'IMG') return image(node);

    const mark = MARK_BY_TAG[node.nodeName];
    const next = mark && !marks.includes(mark) ? [...marks, mark] : marks;
    // Everything not in MARK_BY_TAG — a SPAN carrying Word's inline styles, a FONT, an A,
    // a TABLE — is walked for its text and loses its formatting. A whitelist, so the next
    // version of Word cannot introduce a tag we forgot to blacklist.
    for (const child of node.childNodes) inline(child, next, sink, onBreak);
  };

  const list = (node, type) => {
    const items = [];
    for (const child of node.childNodes) {
      if (child.nodeType !== ELEMENT_NODE || child.nodeName !== 'LI') continue;
      const spans = [];
      for (const grandchild of child.childNodes) {
        inline(grandchild, [], (span) => spans.push(span), () => {});
      }
      const merged = mergeSpans(spans);
      if (merged.length) items.push(merged);
    }
    if (items.length) blocks.push({ type, items });
  };

  const block = (node) => {
    if (node.nodeType === ELEMENT_NODE) {
      const tag = node.nodeName;
      if (tag === 'UL' || tag === 'OL') {
        flushPara();
        list(node, tag === 'UL' ? 'ul' : 'ol');
        return;
      }
      if (tag === 'P' || tag === 'DIV') {
        flushPara();
        for (const child of node.childNodes) block(child);
        flushPara();
        return;
      }
    }
    inline(node, [], pushSpan, flushPara);
  };

  for (const child of root.childNodes) block(child);
  flushPara();

  return { blocks };
}

// A legacy announcement — text with newlines and nothing else — becomes paragraphs. Blank
// lines disappear, which is right: with real paragraphs the spacing comes from the layout,
// and a blank line was only ever the textarea's way of asking for it.
export const docFromPlainText = (text) => ({
  blocks: String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ type: 'p', spans: [{ text: line }] })),
});

// Browser only — the editor's one write into the DOM. Built with createElement and
// textContent rather than an HTML string, so there is no escaping step and therefore no
// escaping bug to have.
export function docToNodes(doc) {
  const nodes = [];

  for (const block of doc?.blocks || []) {
    if (block.type === 'img') {
      const img = document.createElement('img');
      img.src = `/api/uploads/${block.id}`;
      img.setAttribute('data-img-id', block.id);
      img.alt = block.alt || '';
      img.style.maxWidth = '100%';
      nodes.push(img);
      continue;
    }

    if (block.type === 'ul' || block.type === 'ol') {
      const list = document.createElement(block.type);
      for (const item of block.items) {
        const li = document.createElement('li');
        for (const span of item) li.appendChild(spanNode(span));
        list.appendChild(li);
      }
      nodes.push(list);
      continue;
    }

    const p = document.createElement('p');
    for (const span of block.spans) p.appendChild(spanNode(span));
    nodes.push(p);
  }

  // contentEditable needs somewhere to put the caret.
  if (!nodes.length) {
    const p = document.createElement('p');
    p.appendChild(document.createElement('br'));
    nodes.push(p);
  }

  return nodes;
}

const TAG_BY_MARK = { b: 'strong', i: 'em', u: 'u' };

function spanNode(span) {
  let node = document.createTextNode(span.text);
  for (const mark of span.marks || []) {
    const wrapper = document.createElement(TAG_BY_MARK[mark]);
    wrapper.appendChild(node);
    node = wrapper;
  }
  return node;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --prefix client test`
Expected: PASS — the new file plus the 36 tests already in `client/test/`.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Admin/richText.js client/test/richText.test.js
git commit -F - <<'EOF'
feat: translate between the editor's DOM and the stored document

domToDoc walks the contentEditable tree through a whitelist: B/STRONG, I/EM, U,
P/DIV/BR, UL/OL/LI and an IMG carrying one of our file ids. Everything else — a
SPAN full of Word's inline styles, a FONT, an A, a TABLE — is entered for its
text and loses its formatting. A blacklist would have to keep up with whatever
the next version of Word emits.

The walker reads only nodeType, nodeName, childNodes, textContent and
getAttribute, which is what lets its tests build fake nodes as plain objects
with no jsdom and no new dependency.

docToNodes builds elements rather than an HTML string, so there is no escaping
step and therefore no escaping bug to have.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 6: The renderer, and the two surfaces that draw an announcement

After this task a doc saved with `curl` renders on the weekday wall board and on the phone — before any editor exists to write one.

**Files:**
- Create: `client/src/components/RichDoc.jsx`
- Modify: `client/src/components/display/AnnouncementsPanel.jsx`, `client/src/pages/SynagogueDisplay.jsx:98`, `client/src/components/mobile/RotatingCards.jsx`, `client/src/pages/MobileDisplay.jsx:45`
- **Must not touch:** `client/src/components/shabbat/AnnouncementsCard.jsx` — see Step 3

**Interfaces:**
- Consumes: the doc shape from Task 1.
- Produces: `<RichDoc doc={item?.doc} text={item?.text} imageMaxHeight="55%" />`. `imageMaxHeight` defaults to `'55%'`; pass `'none'` where the container has no fixed height.
- Out of scope: the שבת board. `RichDoc` is written to need no theme prop anyway, so adding that board later is one import and one JSX swap — but do not add it now.

- [ ] **Step 1: Create the renderer**

Create `client/src/components/RichDoc.jsx`:

```jsx
import { Fragment } from 'react';

// The one renderer for an announcement's rich document: the weekday board, the phone and
// the admin's preview all draw through this. The admin preview using the display's own
// component — rather than a lookalike — is what makes it trustworthy.
//
// The שבת board deliberately does not use it and keeps its own plain-text render; see the
// spec. That it could, unchanged, follows from the next paragraph.
//
// It takes no colour and no size from the data. The surface around it owns typography,
// which is why the same component sits on a dark panel, in a phone card and inside a
// scaled preview with no theme prop — and why the gabbai cannot make the text unreadable
// from the back of the hall.

const IMAGE_BASE = '/api/uploads/';

const TAG_BY_MARK = { b: 'strong', i: 'em', u: 'u' };

const renderSpans = (spans) =>
  spans.map((span, index) => {
    let node = span.text;
    for (const mark of span.marks || []) {
      const Tag = TAG_BY_MARK[mark];
      node = <Tag>{node}</Tag>;
    }
    return <Fragment key={index}>{node}</Fragment>;
  });

const RichDoc = ({ doc, text, imageMaxHeight = '55%' }) => {
  // No doc — an announcement written before rich content existed, or one whose rich
  // content was cleared by a legacy write. Rendered exactly as it always was; this line
  // is the whole backward-compatibility story on the display side.
  if (!doc?.blocks?.length) {
    return <div style={{ whiteSpace: 'pre-line' }}>{text || ''}</div>;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        maxHeight: '100%',
        minHeight: 0,
      }}
    >
      {doc.blocks.map((block, index) => {
        if (block.type === 'img') {
          return (
            <img
              key={index}
              src={`${IMAGE_BASE}${block.id}`}
              alt={block.alt || ''}
              // The ceiling is what keeps a picture from pushing the text out of a box
              // whose height is fixed by the board's grid: the image shrinks instead.
              style={{
                maxWidth: '100%',
                maxHeight: imageMaxHeight,
                objectFit: 'contain',
                borderRadius: '10px',
                minHeight: 0,
              }}
            />
          );
        }

        if (block.type === 'ul' || block.type === 'ol') {
          const List = block.type;
          return (
            <List key={index} style={{ margin: 0, paddingInlineStart: '1.2em', textAlign: 'start' }}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderSpans(item)}</li>
              ))}
            </List>
          );
        }

        return (
          <p key={index} style={{ margin: 0 }}>
            {renderSpans(block.spans)}
          </p>
        );
      })}
    </div>
  );
};

export default RichDoc;
```

- [ ] **Step 2: Wire the dark board**

Replace `client/src/components/display/AnnouncementsPanel.jsx` entirely:

```jsx
import Panel from './Panel';
import RichDoc from '../RichDoc';

// `annKey` changes on each rotation so the content re-mounts and replays the fade.
//
// Takes the whole item rather than its text: an announcement may now carry a rich
// document, and RichDoc falls back to the plain text when it does not.
const AnnouncementsPanel = ({ ann, annKey }) => (
  <Panel title="הודעות" titleSize={28} padding="16px 26px">
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden' }}>
      <div
        key={annKey}
        style={{ animation: 'omFade .7s ease', fontSize: '31px', fontWeight: 600, lineHeight: 1.45, textAlign: 'center', color: '#eef2f7', width: '100%', maxHeight: '100%', minHeight: 0 }}
      >
        <RichDoc doc={ann?.doc} text={ann?.text} />
      </div>
    </div>
  </Panel>
);

export default AnnouncementsPanel;
```

In `client/src/pages/SynagogueDisplay.jsx`, line 98:

```jsx
<AnnouncementsPanel ann={ann} annKey={tick} />
```

- [ ] **Step 3: Leave the שבת board alone**

Nothing to do — this step exists so its absence is not read as an omission.

`client/src/components/shabbat/AnnouncementsCard.jsx` is **out of scope** and must not be
touched. It keeps rendering `ann?.text` with its own `whiteSpace: 'pre-line'`, and it keeps
receiving the item as it already does. Do not add the `RichDoc` import there.

`text` is derived from the doc, so a formatted announcement still reads correctly on that
board minus its bold and bullets. An image-only announcement, whose derived text is by
design empty, shows there as a blank card. Both are the accepted cost of the scope
decision — see "The שבת board is deliberately left out" in the spec.

- [ ] **Step 4: Wire the phone**

In `client/src/components/mobile/RotatingCards.jsx`, add `import RichDoc from '../RichDoc';` and change `AnnouncementCard`'s body `div` — the prop is now the item, and the image may run the card's full width because a phone is read from thirty centimetres:

```jsx
      <div
        key={annKey}
        style={{
          animation: 'omFade .6s ease',
          fontSize: '17px',
          fontWeight: 600,
          lineHeight: 1.4,
          color: S.COLORS.textBright,
          marginTop: '3px',
        }}
      >
        <RichDoc doc={ann?.doc} text={ann?.text} imageMaxHeight="none" />
      </div>
```

In `client/src/pages/MobileDisplay.jsx`, line 45:

```jsx
<AnnouncementCard ann={ann} annKey={tick} count={annCount} index={annIndex} />
```

- [ ] **Step 5: Verify by hand**

The renderer has no unit tests — it is presentation, and the repo tests logic rather than JSX. Verify it in the browser instead.

Run `npm run dev` from the repo root, then in a second terminal seed a rich announcement:

```bash
curl -s -X POST http://localhost:5000/api/content/announcements \
  -H 'Content-Type: application/json' \
  --data-binary @- <<'EOF'
{"doc":{"blocks":[
  {"type":"p","spans":[{"text":"Shiur tonight "},{"text":"20:00","marks":["b"]}]},
  {"type":"ul","items":[[{"text":"Beit Midrash"}],[{"text":"Bring a sefer"}]]}
]}}
EOF
```

(ASCII in the payload on purpose — Hebrew inside a Bash argument is mangled on this machine. The Hebrew path is covered by step 6 of Task 8, through the browser.)

Check:
- [ ] `http://localhost:5173` in a desktop-sized window: the bold and the bulleted list render inside the הודעות panel, and the panels around it have not moved.
- [ ] The same URL in a narrow window (phone layout): the same announcement in the rotating card.
- [ ] An announcement seeded before this change still shows, with its line breaks intact.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/RichDoc.jsx client/src/components/display/AnnouncementsPanel.jsx client/src/components/mobile/RotatingCards.jsx client/src/pages/SynagogueDisplay.jsx client/src/pages/MobileDisplay.jsx
git commit -F - <<'EOF'
feat: draw an announcement's rich document on the weekday board and the phone

One renderer, shared by both and by the admin's preview. It takes no colour and
no size from the data — the surface around it owns typography — which is why the
same component works on a dark panel, in a phone card and inside a scaled
preview with no theme prop, and why the gabbai cannot make the wall unreadable.

The Shabbat board is deliberately left on its plain-text render. A formatted
announcement still reads correctly there, because `text` is derived from the
doc; an image-only one shows as a blank card, which the spec states as the
accepted cost.

An image gets a ceiling of 55% of the box height, so a picture shrinks rather
than pushing the text out of a box whose height the board's grid has fixed.

A falsy doc falls back to the plain text with pre-line, which is the whole
backward-compatibility story on the display side.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 7: The client's upload service

Shrink the chosen file in the browser and send its bytes. Small enough to fold into the editor, kept separate because it is the one piece with no React in it.

**Files:**
- Create: `client/src/services/uploads.js`

**Interfaces:**
- Consumes: the axios instance from `client/src/services/api.js` (base URL `${API_URL}/api`, so `'/uploads'` resolves to `/api/uploads`).
- Produces: `export async function uploadImage(file)` → the id string.

- [ ] **Step 1: Write it**

Create `client/src/services/uploads.js`:

```js
import api from './api';

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image decode failed'));
    };
    image.src = url;
  });

// Draws the file to a canvas at most MAX_EDGE on its long edge and exports it again.
//
// Size is the obvious reason — a 5MB phone photo leaves as roughly 200KB, which matters
// on a Railway volume and on a TV that fetches it. But the re-encode also drops EXIF,
// including the location the phone stamped into a photo taken inside the shul, and any
// payload hidden in the original container: what gets uploaded is pixels this browser
// just drew.
//
// A PNG source stays PNG so transparency survives — a logo re-encoded to JPEG arrives
// with a white box around it.
async function shrink(file) {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, JPEG_QUALITY));
  if (!blob) throw new Error('image encode failed');
  return { blob, type };
}

// Resolves to the id the server assigned — the value that goes into the document as
// { type: 'img', id }. The path is never stored; the renderer builds it.
export async function uploadImage(file) {
  const { blob, type } = await shrink(file);
  // Raw bytes, overriding the instance's JSON content type. The server decides the real
  // format from the bytes anyway; this header only selects express.raw's parser.
  const res = await api.post('/uploads', blob, { headers: { 'Content-Type': type } });
  return res.data.id;
}
```

- [ ] **Step 2: Commit**

There is nothing to run yet — nothing imports this until Task 8, and it is browser-only code that `node --test` cannot exercise. It is verified in Task 8, step 6.

```bash
git add client/src/services/uploads.js
git commit -F - <<'EOF'
feat: shrink an image in the browser before uploading it

A 5MB phone photo leaves as roughly 200KB. The re-encode is not only about size:
it drops EXIF — including the location the phone stamped into a photo taken
inside the shul — and any payload hidden in the original container, because what
gets uploaded is pixels the browser just drew.

A PNG source stays PNG; a logo re-encoded to JPEG would arrive with a white box
around it.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 8: The editor and the form

The last piece: the toolbar, the editing surface, the preview, and the two lines of wiring in the admin form.

**Files:**
- Create: `client/src/pages/Admin/RichTextEditor.jsx`
- Modify: `client/src/pages/Admin/panelMeta.js`, `client/src/pages/Admin/ItemForm.jsx`

**Interfaces:**
- Consumes: `domToDoc`, `docToNodes`, `docFromPlainText`, `emptyDoc` (Task 5); `uploadImage` (Task 7); `RichDoc` (Task 6).
- Produces: `<RichTextEditor value={doc} onChange={(doc) => …} disabled={bool} />`.

- [ ] **Step 1: Write the editor**

Create `client/src/pages/Admin/RichTextEditor.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react';
import RichDoc from '../../components/RichDoc';
import { uploadImage } from '../../services/uploads';
import { docToNodes, domToDoc } from './richText';
import * as S from './adminStyles';

// execCommand is marked deprecated and has no replacement for this job. Every browser
// still implements it — the TV stick's Chrome and the gabbai's phone included — and
// hand-rolling selection handling is how a six-button editor becomes a large one.
const COMMANDS = [
  { command: 'bold', label: 'B', title: 'מודגש', style: { fontWeight: 800 } },
  { command: 'italic', label: 'I', title: 'נטוי', style: { fontStyle: 'italic' } },
  { command: 'underline', label: 'U', title: 'קו תחתון', style: { textDecoration: 'underline' } },
  { command: 'insertUnorderedList', label: '•', title: 'רשימה' },
  { command: 'insertOrderedList', label: '1.', title: 'רשימה ממוספרת' },
];

const toolButton = {
  minWidth: '44px',
  minHeight: '44px',
  border: `1px solid ${S.COLORS.border}`,
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.05)',
  color: S.COLORS.text,
  fontSize: '17px',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

// execCommand('insertImage') sets a src but cannot set our data-img-id, and no command
// inserts an element with attributes. So the node goes in through the selection — and
// when there is none, because the gabbai tapped the button before typing anything, at the
// end of the editor.
function insertNode(root, node) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !root.contains(selection.anchorNode)) {
    root.appendChild(node);
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export default function RichTextEditor({ value, onChange, disabled }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  // Read once, in the mount effect below. Reading `value` there directly would make it a
  // dependency and reload the DOM on every keystroke.
  const initial = useRef(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Mount only. After this the contentEditable DOM is the state and `value` travels
  // outward; re-writing it from props on every change would put the caret back at the
  // start on every keystroke. ItemForm remounts this component, via `key`, when a
  // genuinely different item finishes loading.
  useEffect(() => {
    if (ref.current) ref.current.replaceChildren(...docToNodes(initial.current));
  }, []);

  const emit = () => {
    if (ref.current) onChange(domToDoc(ref.current));
  };

  const run = (command) => {
    if (disabled) return;
    ref.current?.focus();
    document.execCommand(command, false, null);
    emit();
  };

  // Paste as plain text. The walker drops unknown formatting at save time anyway; without
  // this the editor would show Word's colours and fonts right up until the save silently
  // removed them, which reads as the save being broken.
  const onPaste = (event) => {
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    emit();
  };

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    // Cleared so choosing the same file twice fires the change event again.
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    setError('');
    try {
      const id = await uploadImage(file);
      const img = document.createElement('img');
      img.src = `/api/uploads/${id}`;
      img.setAttribute('data-img-id', id);
      img.alt = '';
      img.style.maxWidth = '100%';
      ref.current?.focus();
      insertNode(ref.current, img);
      emit();
    } catch (err) {
      setError(err.response?.data?.message || 'העלאת התמונה נכשלה');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {COMMANDS.map((item) => (
          <button
            key={item.command}
            type="button"
            title={item.title}
            aria-label={item.title}
            disabled={disabled}
            // onMouseDown, not onClick: a click would blur the editor first and the
            // selection the command is meant to act on would already be gone.
            onMouseDown={(event) => {
              event.preventDefault();
              run(item.command);
            }}
            style={{ ...toolButton, ...item.style, opacity: disabled ? 0.6 : 1 }}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          title="הוסף תמונה"
          disabled={disabled || busy}
          onClick={() => fileRef.current?.click()}
          style={{ ...toolButton, width: 'auto', padding: '0 14px', opacity: disabled || busy ? 0.6 : 1 }}
        >
          {busy ? 'מעלה…' : '🖼 תמונה'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={onFile}
          style={{ display: 'none' }}
        />
      </div>

      {error && <div style={S.fieldError}>{error}</div>}

      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emit}
        onPaste={onPaste}
        style={{ ...S.input, minHeight: '150px', textAlign: 'start', lineHeight: 1.5, opacity: disabled ? 0.6 : 1 }}
      />

      <div style={{ ...S.label, marginTop: '14px' }}>כך זה ייראה על הלוח</div>
      {/* The board's box is 900x330 and its text is clipped there with nothing to warn
          him, while the editor above is wide and light. So the preview is the display's
          own component, on the board's background, at the board's proportions. */}
      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          height: '132px',
          overflow: 'hidden',
          borderRadius: '12px',
          border: `1px solid ${S.COLORS.border}`,
          background: '#0d121d',
        }}
      >
        <div
          style={{
            width: '900px',
            height: '330px',
            transform: 'scale(0.4)',
            transformOrigin: 'top right',
            boxSizing: 'border-box',
            padding: '16px 26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '31px',
            fontWeight: 600,
            lineHeight: 1.45,
            textAlign: 'center',
            color: '#eef2f7',
          }}
        >
          <RichDoc doc={value} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Point the panel at it**

In `client/src/pages/Admin/panelMeta.js`, replace the `announcements` entry:

```js
  announcements: {
    title: 'הודעות',
    icon: '📢',
    addLabel: 'הוסף הודעה',
    emptyLabel: 'אין הודעות',
    // The field key is `doc`, which is also the key the server reports errors under —
    // see the rich branch of validateItem in server/src/store/panels.js.
    fields: [{ key: 'doc', label: 'תוכן ההודעה', type: 'rich', required: true }],
    // An announcement that is only a picture has no derived text; without the fallback
    // the list would show it as a blank row.
    summary: (item) => item.text || '🖼 תמונה',
    sub: () => '',
  },
```

- [ ] **Step 3: Wire the form**

In `client/src/pages/Admin/ItemForm.jsx`:

Add the imports:

```jsx
import RichTextEditor from './RichTextEditor';
import { docFromPlainText, emptyDoc } from './richText';
```

Replace `blankValues`:

```jsx
const blankValues = (meta) =>
  Object.fromEntries((meta?.fields || []).map((field) => [field.key, field.type === 'rich' ? emptyDoc() : '']));
```

In the load effect, replace the `setValues` line so a legacy announcement opens as a document:

```jsx
        setItem(found);
        setValues(
          Object.fromEntries(
            meta.fields.map((f) => [
              f.key,
              // A legacy announcement has no doc. Converting it here is the whole
              // migration: the next save stores it as one.
              f.type === 'rich' ? found.doc || docFromPlainText(found.text) : found[f.key] || '',
            ])
          )
        );
```

In the field loop, add the rich branch ahead of the existing `textarea` branch:

```jsx
            {field.type === 'rich' ? (
              <RichTextEditor
                // Remounts when the fetched item arrives, which is how the editor loads a
                // document exactly once instead of on every keystroke.
                key={item?.id || 'new'}
                value={values[field.key]}
                onChange={(doc) => setField(field.key, doc)}
                disabled={disabled}
              />
            ) : field.type === 'textarea' ? (
```

The `<label htmlFor={field.key}>` above it now points at nothing, since a `contentEditable` div takes no `id`. Give the editor's surface that id instead by passing it through — or simplest, drop `htmlFor` for the rich branch by rendering the label without it. Keep the visible text identical.

- [ ] **Step 4: Run the test suites**

Run: `npm test`
Expected: PASS — nothing here has unit tests, but the run confirms nothing else broke.

- [ ] **Step 5: Run the linter**

Run: `npm --prefix client run lint`
Expected: clean. The mount-only effect has no missing dependency, because the initial value is read through a ref.

- [ ] **Step 6: Verify by hand — the whole feature**

Run `npm run dev` from the repo root and open `http://localhost:5173/adminGabbai`.

- [ ] הודעות → הוסף הודעה. Type Hebrew, select a word, press **B** — it goes bold, and the preview below updates as you type.
- [ ] Insert an image from the device. It appears in the editor and in the preview.
- [ ] Save. The list shows the announcement; an image-only one shows `🖼 תמונה`.
- [ ] Open it again for editing — the bold, the list and the image all come back.
- [ ] The announcement reaches `/` within 30 seconds, image inside the הודעות box, panels around it unmoved.
- [ ] Narrow the window to the phone layout: the same announcement, image at card width.
- [ ] Open an announcement written before this change: it loads into the editor as paragraphs, and saving keeps its text.
- [ ] Paste a formatted block from Word: the text arrives, the formatting does not.
- [ ] Try to save an empty announcement: `שדה חובה` under the editor.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/Admin/RichTextEditor.jsx client/src/pages/Admin/panelMeta.js client/src/pages/Admin/ItemForm.jsx
git commit -F - <<'EOF'
feat: give the gabbai a WYSIWYG editor for announcements

Six buttons — bold, italic, underline, two lists and an image — over a
contentEditable surface, with no editor library and no new dependency.

Paste is forced to plain text. The walker drops unknown formatting at save time
anyway, and without this the editor would show Word's colours right up until the
save silently removed them, which reads as the save being broken.

The preview below the editor is the display's own RichDoc on the board's
background at the board's 900x330 proportions. The gabbai's editing surface is
wide and light; the box on the wall is fixed and dark and clips what overflows
without telling him.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 9: The documents that are now wrong

Two paragraphs in `DEPLOY.md` stopped being true the moment images left `content.json`, and the spec's status line is stale.

**Files:**
- Modify: `DEPLOY.md`, `docs/superpowers/specs/2026-08-19-rich-announcements-design.md`

- [ ] **Step 1: Correct the backup section**

`DEPLOY.md`'s גיבויים section tells the gabbai that one `curl` captures everything. Replace its body with this — use the Edit tool, not a Bash heredoc:

```markdown
בלי אימות, האיום המעשי אינו פריצה אלא מחיקה בטעות. הגיבוי הופך "כל התוכן נמחק"
משעה של הקלדה מחדש לדקה של שחזור.

הורדה ידנית של גיבוי — עובד מכל מחשב, בלי גישה לשרת:

```bash
curl -s https://<הכתובת-שלך>/api/content > content-backup-$(date +%F).json
```

**הקובץ הזה אינו כולל את התמונות.** מאז שאפשר לצרף תמונה להודעה, התמונות נשמרות
כקבצים ב‑`/data/uploads` ליד `content.json` ולא בתוכו — שחזור מה‑JSON לבדו יחזיר את
ההודעות בלי התמונות שלהן. גיבוי מלא של התמונות דורש העתקה של התיקייה דרך Railway CLI.

שווה להריץ אחרי כל עריכה משמעותית, ולשמור עותק בענן. שחזור מלא דורש כתיבה של הקובץ
בחזרה לנפח (דרך Railway CLI).
```

- [ ] **Step 2: Correct the volume section**

In the `**2. חובה נפח קבוע (Volume).**` paragraph, extend the list of what lives on the volume so the size expectation is honest:

```markdown
**2. חובה נפח קבוע (Volume).** כל התוכן — הודעות, שיעורים, מזל טוב, אזכרות, הפס
התחתון וזמני השבת — נשמר בקובץ `content.json` על הדיסק, **והתמונות שצורפו להודעות
נשמרות כקבצים בתיקיית `uploads` לידו**. בלי נפח קבוע הכול נמחק **בכל דיפלוי מחדש**,
והתוכן חוזר לערכי ההתחלה. זו לא תקלה נדירה אלא התנהגות ודאית.
```

And in שלב 2, after the sentence about the smallest size being enough, add:

```markdown
   התמונות חסומות ל‑100 קבצים ו‑50MB בסך הכול, כך שגם המסלול החינמי (0.5GB) מספיק בגדול.
```

- [ ] **Step 3: Extend the volume test in שלב 5**

The redeploy checklist item currently checks only that an announcement survived. Make it check an image too — that is the failure this feature adds:

```markdown
- [ ] **מבחן הנפח:** לחץ Redeploy ב‑Railway, ואחרי שהשירות עולה ודא שההודעה שהוספת
      **עדיין שם, כולל התמונה שצירפת אליה**. אם ההודעה נעלמה — הנפח לא מחובר, חזור
      לשלב 2. אם ההודעה נשארה והתמונה נשברה — `CONTENT_DIR` מצביע למקום אחר מהנפח.
      זו הבדיקה החשובה ביותר במסמך.
```

- [ ] **Step 4: Update the spec's status line**

In `docs/superpowers/specs/2026-08-19-rich-announcements-design.md`, change:

```markdown
**Status:** Approved, not yet implemented.
```

to:

```markdown
**Status:** Approved — fully shipped. Implemented by
`docs/superpowers/plans/2026-08-19-rich-announcements.md`.
```

- [ ] **Step 5: Full verification**

- [ ] `npm test` from the repo root — both packages pass.
- [ ] `npm --prefix client run lint` — clean.
- [ ] `npm run build && npm start`, then open `http://localhost:5000`. This serves the built client from Express, which is exactly what runs in production — a broken import or a bad asset path shows up here and not in the Vite dev server. Confirm a rich announcement with an image renders, and that its image loads from `/api/uploads/…` rather than 404ing into the SPA fallback.

- [ ] **Step 6: Commit**

```bash
git add DEPLOY.md docs/superpowers/specs/2026-08-19-rich-announcements-design.md
git commit -F - <<'EOF'
docs: images live beside content.json, not inside it

The backup instruction in DEPLOY.md promised that one curl captures everything,
which stopped being true the moment an announcement could carry a picture. The
volume section and the redeploy test now name the images too — an announcement
that survives a redeploy with a broken image is a different misconfiguration
from one that vanishes, and the checklist should say which.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

## Self-review notes

Checked against the spec, section by section:

- **Document model** → Task 1 (validator, limits, id whitelist, derived text) and Task 2 (schema wiring, `doc: null` on the legacy path).
- **Image pipeline** → Task 7 (client downscale and re-encode), Task 3 (raw transport, magic bytes, serving headers, caps), Task 4 (orphan sweep and its age guard).
- **Editor** → Task 5 (walker, whitelist, `docToNodes` without `innerHTML`), Task 8 (toolbar, paste, image insertion, preview).
- **Display** → Task 6 (shared renderer, image ceiling, two call sites, and the שבת board explicitly left alone).
- **Testing** → Tasks 1–5 carry the suites the spec's Verification section lists; Tasks 6, 8 and 9 carry its by-hand checks.
- **Auth restatement and DEPLOY.md** → Task 9, plus the comment at the top of `routes/uploads.js` in Task 3.

Names are consistent across tasks: `validateDoc`, `sweepOrphans(doc, now)`, `saveImage(buffer)`, `detectType`, `domToDoc`, `docToNodes`, `docFromPlainText`, `emptyDoc`, `uploadImage(file)`, and `<RichDoc doc text imageMaxHeight />`.

One thing an implementer should raise rather than silently resolve: Task 8 step 3 leaves `<label htmlFor>` pointing at an element that has no `id`, and offers two ways out. Either is fine; picking one and saying which is enough.
