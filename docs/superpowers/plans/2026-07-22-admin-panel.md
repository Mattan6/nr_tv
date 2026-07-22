# פאנל ניהול תוכן Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin panel at `/adminGabbai` where the gabbai edits הודעות, שיעורי תורה, שמחות ומזל טוב and לעילוי נשמת from his phone, with the TV picking up changes within 30 seconds.

**Architecture:** Content moves out of the hardcoded arrays in `displayData.js` into a JSON file on the server, guarded by a store that owns atomic writes and write serialization. A single schema table describes all four panels, so one Express controller and one pair of React screens cover all of them. The display polls `/api/content` every 30 seconds and keeps the last good response.

**Tech Stack:** Node 22 (CommonJS), Express 5, React 19, Vite, axios, react-router 7. Tests use `node:test` — built into Node, no new dependency.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-22-admin-panel-design.md`
- **No new npm dependencies**, server or client. `node:test`, `node:crypto`, `node:fs/promises`, `structuredClone` and global `fetch` are all built into Node 22.
- The server is CommonJS (`require`); the client is ESM (`import`). Do not mix them up.
- **Styling is inline styles only.** Tailwind is non-functional in this repo (v3 `@tailwind` directives in `client/src/index.css` against a v4 install). Do not add `className` utility classes and do not fix Tailwind — both are out of scope.
- All user-facing strings are Hebrew, copied verbatim from this plan including the geresh forms `ז״ל`, `מוצ״ש`, `י״ח באלול`.
- The four panel keys are exactly `announcements`, `shiurim`, `mazal`, `azkarot` — matching the existing export names in `displayData.js`. Never rename them.
- `server/data/` is already covered by the `data/` rule in `.gitignore`. Never commit `content.json`.
- Do not touch `models/Announcement.js`, `models/Event.js`, their controllers or routes. They are dead Mongoose code, deliberately left alone.

---

### Task 1: Content store

The store owns the file. Nothing else in the codebase opens `content.json`.

**Files:**
- Create: `server/src/store/defaultContent.js`
- Create: `server/src/store/contentStore.js`
- Create: `server/test/contentStore.test.js`
- Modify: `server/package.json`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `createContentStore(dir) → { read(), update(mutator) }`
  - `contentStore` — a singleton over `process.env.CONTENT_DIR || server/data`
  - `NotFoundError` — a mutator throws it to abort the write and signal a 404
  - `read() → Promise<doc>`; `update(mutator) → Promise<any>` where `mutator(draft)` mutates a clone and returns the controller's result

- [ ] **Step 1: Write the seed module**

Create `server/src/store/defaultContent.js`. These are the values lifted verbatim from `client/src/components/display/displayData.js`, which loses them in Task 5.

```js
// Seed written to server/data/content.json on first boot. Until the admin panel
// existed these arrays lived in client/src/components/display/displayData.js; this
// module is now their only copy.
//
// Seed ids are fixed readable strings so the file stays diff-able and tests stay
// deterministic. Items created through the API get a crypto.randomUUID() instead.
module.exports = {
  version: 1,
  updatedAt: null,
  announcements: [
    { id: 'seed-ann-1', text: 'שיעורו של הרב מוטה יתקיים הערב\nבשעה 20:00 בבית המדרש', isActive: true },
    { id: 'seed-ann-2', text: 'יישר כח למשפחת פרידמן\nעל תרומת המעקה לבימת הכהנים', isActive: true },
    { id: 'seed-ann-3', text: 'ניתן להירשם לשיעור הדף היומי\nאצל הגבאי · 054-848-7595', isActive: true },
  ],
  shiurim: [
    { id: 'seed-shi-1', name: 'דף היומי', time: '06:45', by: 'הרב יגאל', isActive: true },
    { id: 'seed-shi-2', name: 'הלכה יומית', time: '13:15', by: 'הרב מוטה', isActive: true },
    { id: 'seed-shi-3', name: 'עין יעקב', time: '17:30', by: 'הרב שלום', isActive: true },
    { id: 'seed-shi-4', name: 'שיעור לנשים', time: '16:45', by: 'הרב ורהפטיג', isActive: true },
    { id: 'seed-shi-5', name: 'שיעור הלכה', time: '20:00', by: 'הרב יגאל', isActive: true },
  ],
  mazal: [
    { id: 'seed-maz-1', names: 'משפחת בן חמו', occasion: 'להולדת הבן — מזל טוב!', isActive: true },
    { id: 'seed-maz-2', names: 'משפחת אזולאי', occasion: 'לרגל האירוסין — בשעה טובה', isActive: true },
    { id: 'seed-maz-3', names: 'ר׳ יוסי נעים הי״ו', occasion: 'לרגל יום ההולדת', isActive: true },
  ],
  azkarot: [
    { id: 'seed-azk-1', name: 'משה בן פרטונה ז״ל', detail: 'נתרם ע״י יעל ורמון בראון', date: 'י״ח באלול', isActive: true },
    { id: 'seed-azk-2', name: 'חנה נינט ריין בת פרטונה ז״ל', detail: 'תנצב״ה', date: "ה' בתמוז", isActive: true },
    { id: 'seed-azk-3', name: 'רוברט ישראל בן רוזי ז״ל', detail: 'לעילוי נשמת', date: 'כ״ג בטבת', isActive: true },
  ],
};
```

Note `seed-azk-2` uses a straight apostrophe in `"ה' בתמוז"` and is therefore double-quoted. That matches the original data exactly — do not "fix" it to a geresh.

- [ ] **Step 2: Write the failing tests**

Create `server/test/contentStore.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createContentStore, NotFoundError } = require('../src/store/contentStore');
const DEFAULT_CONTENT = require('../src/store/defaultContent');

// Each test gets a throwaway directory so nothing touches server/data. Registers its
// own cleanup on the test context so mkdtemp doesn't leak directories into the OS
// temp dir on every run.
const tmpStore = async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-store-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return { dir, store: createContentStore(dir), file: path.join(dir, 'content.json') };
};

test('seeds content.json from defaultContent when the file is absent', async (t) => {
  const { store, file } = await tmpStore(t);

  const doc = await store.read();

  assert.strictEqual(doc.shiurim.length, DEFAULT_CONTENT.shiurim.length);
  assert.strictEqual(doc.announcements[0].text, DEFAULT_CONTENT.announcements[0].text);
  const written = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.strictEqual(written.shiurim.length, DEFAULT_CONTENT.shiurim.length);
});

// The verbatim Hebrew seed strings are exactly what a well-meaning "cleanup" would
// break, so assert them against hard-coded literals rather than against the module
// under test (which would pass trivially for any value).
test('defaultContent preserves the verbatim seed strings', () => {
  assert.strictEqual(
    DEFAULT_CONTENT.announcements[0].text,
    'שיעורו של הרב מוטה יתקיים הערב\nבשעה 20:00 בבית המדרש'
  );
  // Intentionally a straight ASCII apostrophe, not a geresh (׳) — must stay that way.
  assert.strictEqual(DEFAULT_CONTENT.azkarot[1].date, "ה' בתמוז");
});

test('serves the seed and preserves the file when content.json is corrupt', async (t) => {
  const { store, file } = await tmpStore(t);
  await fs.writeFile(file, '{ this is not json', 'utf8');
  const errorMock = t.mock.method(console, 'error', () => {});

  const doc = await store.read();

  assert.strictEqual(doc.shiurim.length, DEFAULT_CONTENT.shiurim.length);
  // The corrupt file may be hand-recoverable, so a read alone must leave it untouched.
  assert.strictEqual(await fs.readFile(file, 'utf8'), '{ this is not json');
  assert.strictEqual(errorMock.mock.calls.length, 1, 'expected exactly one loud log for the corrupt file');
});

test('the first write after a corrupt read preserves the corrupt file instead of destroying it', async (t) => {
  const { store, dir, file } = await tmpStore(t);
  await fs.writeFile(file, '{ this is not json', 'utf8');
  const errorMock = t.mock.method(console, 'error', () => {});

  await store.read();
  await store.update((draft) => draft.shiurim.pop());

  const entries = await fs.readdir(dir);
  const corruptEntries = entries.filter((name) => name.startsWith('content.json.corrupt-'));
  assert.strictEqual(corruptEntries.length, 1, 'expected exactly one preserved corrupt file');
  const preserved = await fs.readFile(path.join(dir, corruptEntries[0]), 'utf8');
  assert.strictEqual(preserved, '{ this is not json');

  const current = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.strictEqual(current.shiurim.length, DEFAULT_CONTENT.shiurim.length - 1);

  // One loud log when the corruption is discovered, one when the file is preserved.
  assert.strictEqual(errorMock.mock.calls.length, 2, 'expected a log for detection and a log for preservation');
});

test('leaves no .tmp file behind after a successful write', async (t) => {
  const { store, dir } = await tmpStore(t);

  await store.update((draft) => draft.shiurim.push({ id: 'x', name: 'n', time: '01:00', by: 'b', isActive: true }));

  assert.deepStrictEqual(
    (await fs.readdir(dir)).sort(),
    ['content.json']
  );
});

test('concurrent writes both land', async (t) => {
  const { store, file } = await tmpStore(t);

  await Promise.all([
    store.update((draft) => draft.mazal.push({ id: 'a', names: 'א', occasion: 'א', isActive: true })),
    store.update((draft) => draft.mazal.push({ id: 'b', names: 'ב', occasion: 'ב', isActive: true })),
  ]);

  const written = JSON.parse(await fs.readFile(file, 'utf8'));
  const ids = written.mazal.map((it) => it.id);
  assert.ok(ids.includes('a'), 'first write was lost');
  assert.ok(ids.includes('b'), 'second write was lost');
});

test('a throwing mutator leaves the document unchanged', async (t) => {
  const { store } = await tmpStore(t);
  const before = (await store.read()).mazal.length;

  await assert.rejects(
    store.update((draft) => {
      draft.mazal.push({ id: 'ghost' });
      throw new NotFoundError('nope');
    }),
    NotFoundError
  );

  assert.strictEqual((await store.read()).mazal.length, before);
});

test('update stamps updatedAt', async (t) => {
  const { store } = await tmpStore(t);

  await store.update((draft) => draft.shiurim.pop());

  const doc = await store.read();
  assert.ok(doc.updatedAt, 'updatedAt was not set');
  assert.ok(!Number.isNaN(Date.parse(doc.updatedAt)), 'updatedAt is not a valid date');
});

test('update returns the mutator\'s return value', async (t) => {
  const { store } = await tmpStore(t);

  assert.strictEqual(await store.update(() => 'x'), 'x');
});
```

- [ ] **Step 3: Point npm test at node:test**

In `server/package.json`, replace the `"test"` script:

```json
    "test": "node --test"
```

No path argument: Node's test runner auto-discovers `**/*.test.js` under the working
directory (excluding `node_modules`). Passing `test/` instead makes Node 22 on Windows
resolve `test` as a *module* and fail with `MODULE_NOT_FOUND`, and a glob would depend
on the shell doing the expansion.

- [ ] **Step 4: Run the tests to verify they fail**

Run: `cd server && npm test`
Expected: FAIL — `Cannot find module '../src/store/contentStore'`.

- [ ] **Step 5: Write the store**

Create `server/src/store/contentStore.js`:

```js
const fs = require('node:fs/promises');
const path = require('node:path');
const DEFAULT_CONTENT = require('./defaultContent');

// A mutator throws this to abort the write without persisting; the controller maps
// it to a 404.
class NotFoundError extends Error {}

// The only module in the codebase that opens content.json.
//
// content.json is the display's entire content, so a truncated file is a blank TV.
// Every write goes to a .tmp file, is fsynced, then renamed over the target — rename
// is atomic on the same filesystem, so a crash mid-write leaves either the old file
// or the new one, never half of one.
//
// Writes are serialized through a promise chain: two rapid taps from the admin must
// not interleave their read-modify-write and lose one of them.
function createContentStore(dir) {
  const file = path.join(dir, 'content.json');
  const tmp = `${file}.tmp`;
  let cache = null;
  let queue = Promise.resolve();
  // Set when load() finds content.json present but unparseable. The corrupt file is
  // left alone at that point (it may be recoverable by hand) but it can't be left
  // alone forever: the next successful write would otherwise rename a fresh tmp file
  // straight over it and destroy the only copy. So the first persist() after this
  // flag is set renames the corrupt file aside instead of clobbering it, then clears
  // the flag — one preservation per corruption, not one per write.
  let corruptPending = false;

  async function persist(doc) {
    await fs.mkdir(dir, { recursive: true });
    if (corruptPending) {
      const corruptPath = `${file}.corrupt-${Date.now()}`;
      await fs.rename(file, corruptPath);
      console.error(`⚠️  Preserved the corrupt content.json at ${corruptPath} before writing new content.`);
      corruptPending = false;
    }
    const handle = await fs.open(tmp, 'w');
    try {
      await handle.writeFile(JSON.stringify(doc, null, 2), 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tmp, file);
  }

  async function load() {
    if (cache) return cache;
    try {
      cache = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (err) {
      cache = structuredClone(DEFAULT_CONTENT);
      if (err.code === 'ENOENT') {
        await persist(cache);
      } else {
        // Don't touch the corrupt file here — it may be recoverable by hand. It
        // survives until the next persist(), which renames it aside (see above)
        // rather than overwriting it.
        corruptPending = true;
        console.error(
          `⚠️  ${file} is unreadable (${err.message}). Serving defaults; the existing file will be preserved as content.json.corrupt-<timestamp> on the next write.`
        );
      }
    }
    return cache;
  }

  // Runs `task` after everything already queued, whether or not that succeeded.
  function enqueue(task) {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  }

  return {
    read: () => enqueue(() => load()),

    // `mutator` receives a clone. It is only persisted if the mutator returns
    // normally, so a validation failure or a NotFoundError leaves both the file and
    // the in-memory cache exactly as they were.
    update: (mutator) =>
      enqueue(async () => {
        const draft = structuredClone(await load());
        const result = mutator(draft);
        draft.updatedAt = new Date().toISOString();
        await persist(draft);
        cache = draft;
        return result;
      }),
  };
}

// CONTENT_DIR lets the API tests redirect the singleton at a temp directory.
const defaultDir = process.env.CONTENT_DIR || path.join(__dirname, '..', '..', 'data');

module.exports = {
  createContentStore,
  contentStore: createContentStore(defaultDir),
  NotFoundError,
};
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS — `# pass 9`, `# fail 0`.

If `concurrent writes both land` fails with only one id present, the mutators are reading the document before the previous write finished — check that `update` awaits `load()` *inside* the enqueued task, not outside it.

- [ ] **Step 7: Commit**

```bash
git add server/src/store/defaultContent.js server/src/store/contentStore.js server/test/contentStore.test.js server/package.json
git commit -m "feat: add JSON content store with atomic serialized writes"
```

---

### Task 2: Panel schema and validation

**Files:**
- Create: `server/src/store/panels.js`
- Create: `server/test/panels.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `PANEL_KEYS: string[]` — `['announcements', 'shiurim', 'mazal', 'azkarot']`
  - `isPanel(name) → boolean`
  - `validateItem(panel, body) → { fields } | { errors }` — `fields` holds only schema keys, trimmed; `errors` maps field key to a Hebrew message

- [ ] **Step 1: Write the failing tests**

Create `server/test/panels.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');

const { isPanel, validateItem, PANEL_KEYS } = require('../src/store/panels');

test('recognises exactly the four panels', () => {
  assert.deepStrictEqual(PANEL_KEYS, ['announcements', 'shiurim', 'mazal', 'azkarot']);
  assert.strictEqual(isPanel('shiurim'), true);
  assert.strictEqual(isPanel('parnas'), false);
  // Guards against inherited Object properties being treated as panels.
  assert.strictEqual(isPanel('constructor'), false);
});

test('accepts a valid item and trims it', () => {
  const result = validateItem('shiurim', { name: '  דף היומי  ', time: '06:45', by: 'הרב יגאל' });

  assert.deepStrictEqual(result, { fields: { name: 'דף היומי', time: '06:45', by: 'הרב יגאל' } });
});

test('strips keys outside the schema', () => {
  const result = validateItem('mazal', {
    names: 'משפחת בן חמו',
    occasion: 'להולדת הבן',
    id: 'forged-id',
    isActive: false,
    injected: 'nope',
  });

  assert.deepStrictEqual(Object.keys(result.fields).sort(), ['names', 'occasion']);
});

test('rejects a blank required field', () => {
  const result = validateItem('announcements', { text: '   ' });

  assert.deepStrictEqual(result, { errors: { text: 'שדה חובה' } });
});

test('rejects a malformed time', () => {
  assert.ok(validateItem('shiurim', { name: 'א', time: '25:00', by: 'ב' }).errors.time);
  assert.ok(validateItem('shiurim', { name: 'א', time: '6:45', by: 'ב' }).errors.time);
  assert.ok(validateItem('shiurim', { name: 'א', time: 'שש וחצי', by: 'ב' }).errors.time);
  assert.strictEqual(validateItem('shiurim', { name: 'א', time: '00:00', by: 'ב' }).errors, undefined);
  assert.strictEqual(validateItem('shiurim', { name: 'א', time: '23:59', by: 'ב' }).errors, undefined);
});

test('allows an optional field to be empty', () => {
  const result = validateItem('azkarot', { name: 'משה בן פרטונה ז״ל', detail: '', date: 'י״ח באלול' });

  assert.deepStrictEqual(result.fields, { name: 'משה בן פרטונה ז״ל', detail: '', date: 'י״ח באלול' });
});

test('preserves newlines inside announcement text', () => {
  const result = validateItem('announcements', { text: '  שורה ראשונה\nשורה שנייה  ' });

  assert.strictEqual(result.fields.text, 'שורה ראשונה\nשורה שנייה');
});

test('rejects an over-long field', () => {
  const result = validateItem('announcements', { text: 'א'.repeat(301) });

  assert.ok(result.errors.text);
});

test('rejects a non-string field', () => {
  assert.ok(validateItem('announcements', { text: { evil: true } }).errors.text);
  assert.ok(validateItem('announcements', {}).errors.text);
  assert.ok(validateItem('announcements', undefined).errors.text);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd server && npm test`
Expected: FAIL — `Cannot find module '../src/store/panels'`. The Task 1 tests still pass.

- [ ] **Step 3: Write the schema**

Create `server/src/store/panels.js`:

```js
// The four editable panels. Every panel is a list of items carrying an id and an
// isActive flag; they differ only in their text fields. Describing that difference
// as data — rather than as four sets of near-identical handlers — is what lets one
// controller and one pair of React screens serve all four.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_LEN = 300;

const PANELS = {
  announcements: {
    text: { required: true },
  },
  shiurim: {
    name: { required: true },
    time: { required: true, pattern: TIME_RE, message: 'שעה חייבת להיות בפורמט 06:45' },
    by: { required: true },
  },
  mazal: {
    names: { required: true },
    occasion: { required: true },
  },
  azkarot: {
    name: { required: true },
    detail: { required: false },
    date: { required: true },
  },
};

const PANEL_KEYS = Object.keys(PANELS);

// hasOwnProperty, not `panel in PANELS`: otherwise 'constructor' and 'toString'
// would read as valid panel names.
const isPanel = (panel) => Object.prototype.hasOwnProperty.call(PANELS, panel);

// Returns { fields } or { errors }, never both. `fields` contains only schema keys,
// so a client cannot inject an id, an isActive, or anything else by sending it.
function validateItem(panel, body) {
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

  return Object.keys(errors).length ? { errors } : { fields };
}

module.exports = { PANEL_KEYS, isPanel, validateItem };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS — `# pass 18`, `# fail 0` (9 from Task 1, 9 here).

- [ ] **Step 5: Commit**

```bash
git add server/src/store/panels.js server/test/panels.test.js
git commit -m "feat: add panel schema and item validation"
```

---

### Task 3: Content API

Extracting `app.js` out of `server.js` is part of this task, not a separate one: the API tests need an app they can listen on without `connectDB()` firing.

**Files:**
- Create: `server/src/controllers/contentController.js`
- Create: `server/src/routes/content.js`
- Create: `server/src/app.js`
- Modify: `server/src/server.js`
- Create: `server/test/contentApi.test.js`

**Interfaces:**
- Consumes: `contentStore`, `NotFoundError` (Task 1); `isPanel`, `validateItem` (Task 2).
- Produces: `server/src/app.js` exporting a configured Express app that does **not** listen and does **not** connect to Mongo. Routes under `/api/content` as tabulated in the spec.

- [ ] **Step 1: Write the failing tests**

Create `server/test/contentApi.test.js`:

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
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-api-'));
  // Must be set before app.js is required — the store singleton reads it at load.
  process.env.CONTENT_DIR = dir;
  const app = require('../src/app');
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/content`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(dir, { recursive: true, force: true });
});

const send = (method, url, body) =>
  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

test('GET /api/content returns all four panels', async () => {
  const res = await fetch(base);
  const doc = await res.json();

  assert.strictEqual(res.status, 200);
  for (const key of ['announcements', 'shiurim', 'mazal', 'azkarot']) {
    assert.ok(Array.isArray(doc[key]), `${key} is missing`);
  }
});

test('GET /api/content/:panel returns one list', async () => {
  const res = await fetch(`${base}/shiurim`);
  const list = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(list[0].name, 'דף היומי');
});

test('unknown panel returns 404', async () => {
  assert.strictEqual((await fetch(`${base}/parnas`)).status, 404);
  assert.strictEqual((await send('POST', `${base}/parnas`, { text: 'א' })).status, 404);
});

test('POST assigns an id and defaults isActive to true', async () => {
  const res = await send('POST', `${base}/mazal`, { names: 'משפחת כהן', occasion: 'לרגל הבר מצווה' });
  const created = await res.json();

  assert.strictEqual(res.status, 201);
  assert.match(created.id, /^[0-9a-f-]{36}$/);
  assert.strictEqual(created.isActive, true);
  assert.strictEqual(created.names, 'משפחת כהן');
});

test('POST strips fields outside the schema', async () => {
  const res = await send('POST', `${base}/mazal`, {
    names: 'משפחת לוי',
    occasion: 'לרגל הלידה',
    id: 'forged-id',
    isActive: false,
    injected: 'nope',
  });
  const created = await res.json();

  assert.notStrictEqual(created.id, 'forged-id');
  assert.strictEqual(created.isActive, true);
  assert.strictEqual(created.injected, undefined);
});

test('POST rejects a blank required field and a bad time', async () => {
  const blank = await send('POST', `${base}/announcements`, { text: '  ' });
  assert.strictEqual(blank.status, 400);
  assert.ok((await blank.json()).errors.text);

  const badTime = await send('POST', `${base}/shiurim`, { name: 'א', time: '99:99', by: 'ב' });
  assert.strictEqual(badTime.status, 400);
  assert.ok((await badTime.json()).errors.time);
});

test('PUT updates fields and toggles isActive', async () => {
  const created = await (await send('POST', `${base}/azkarot`, {
    name: 'יעקב בן שרה ז״ל',
    detail: 'תנצב״ה',
    date: 'כ״ג בטבת',
  })).json();

  const res = await send('PUT', `${base}/azkarot/${created.id}`, {
    name: 'יעקב בן שרה ז״ל',
    detail: 'תנצב״ה',
    date: 'כ״ד בטבת',
    isActive: false,
  });
  const updated = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(updated.date, 'כ״ד בטבת');
  assert.strictEqual(updated.isActive, false);
  assert.strictEqual(updated.id, created.id);
});

test('PUT and DELETE on a missing id return 404', async () => {
  assert.strictEqual(
    (await send('PUT', `${base}/mazal/no-such-id`, { names: 'א', occasion: 'ב' })).status,
    404
  );
  assert.strictEqual((await send('DELETE', `${base}/mazal/no-such-id`)).status, 404);
});

test('DELETE removes the item', async () => {
  const created = await (await send('POST', `${base}/announcements`, { text: 'זמני' })).json();

  const res = await send('DELETE', `${base}/announcements/${created.id}`);
  assert.strictEqual(res.status, 200);

  const list = await (await fetch(`${base}/announcements`)).json();
  assert.strictEqual(list.find((it) => it.id === created.id), undefined);
});

test('writes survive in content.json', async () => {
  await send('POST', `${base}/shiurim`, { name: 'שיעור נוסף', time: '21:00', by: 'הרב דוד' });

  const written = JSON.parse(await fs.readFile(path.join(dir, 'content.json'), 'utf8'));
  assert.ok(written.shiurim.some((it) => it.name === 'שיעור נוסף'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd server && npm test`
Expected: FAIL — `Cannot find module '../src/app'`.

- [ ] **Step 3: Write the controller**

Create `server/src/controllers/contentController.js`:

```js
const { randomUUID } = require('node:crypto');
const { contentStore, NotFoundError } = require('../store/contentStore');
const { isPanel, validateItem } = require('../store/panels');

// One controller for all four panels — they differ only in their fields, and
// store/panels.js already describes that difference.

// Wraps a handler so panel validation, NotFoundError and unexpected failures are
// handled once instead of five times.
const handler = (fn) => async (req, res, next) => {
  if (req.params.panel !== undefined && !isPanel(req.params.panel)) {
    return res.status(404).json({ message: 'פאנל לא קיים' });
  }
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ message: 'הפריט לא נמצא' });
    }
    next(err);
  }
};

const getContent = handler(async (req, res) => {
  res.json(await contentStore.read());
});

const getPanel = handler(async (req, res) => {
  const doc = await contentStore.read();
  res.json(doc[req.params.panel]);
});

const createItem = handler(async (req, res) => {
  const { panel } = req.params;
  const { fields, errors } = validateItem(panel, req.body);
  if (errors) return res.status(400).json({ message: 'שדות לא תקינים', errors });

  const created = await contentStore.update((draft) => {
    const item = { id: randomUUID(), ...fields, isActive: true };
    draft[panel].push(item);
    return item;
  });
  res.status(201).json(created);
});

const updateItem = handler(async (req, res) => {
  const { panel, id } = req.params;
  const { fields, errors } = validateItem(panel, req.body);
  if (errors) return res.status(400).json({ message: 'שדות לא תקינים', errors });

  const updated = await contentStore.update((draft) => {
    const item = draft[panel].find((it) => it.id === id);
    if (!item) throw new NotFoundError(id);
    Object.assign(item, fields);
    // A PUT replaces the text fields; isActive changes only when explicitly sent,
    // which is how the list screen's הצג/הסתר switch saves.
    if (typeof req.body.isActive === 'boolean') item.isActive = req.body.isActive;
    return item;
  });
  res.json(updated);
});

const deleteItem = handler(async (req, res) => {
  const { panel, id } = req.params;

  await contentStore.update((draft) => {
    const index = draft[panel].findIndex((it) => it.id === id);
    if (index === -1) throw new NotFoundError(id);
    draft[panel].splice(index, 1);
  });
  res.json({ message: 'הפריט נמחק' });
});

module.exports = { getContent, getPanel, createItem, updateItem, deleteItem };
```

- [ ] **Step 4: Write the routes**

Create `server/src/routes/content.js`:

```js
const express = require('express');
const {
  getContent,
  getPanel,
  createItem,
  updateItem,
  deleteItem,
} = require('../controllers/contentController');

const router = express.Router();

// No auth by design — access to the admin is by unlisted path. See the spec's
// "On the absence of auth"; this must be revisited before the server is ever
// reachable from outside the synagogue LAN.
router.get('/', getContent);
router.get('/:panel', getPanel);
router.post('/:panel', createItem);
router.put('/:panel/:id', updateItem);
router.delete('/:panel/:id', deleteItem);

module.exports = router;
```

- [ ] **Step 5: Split app.js out of server.js**

Create `server/src/app.js` with everything from the old `server.js` except `dotenv`, `connectDB()` and `app.listen`:

```js
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const announcementRoutes = require('./routes/announcements');
const eventRoutes = require('./routes/events');
const settingsRoutes = require('./routes/settings');
const contentRoutes = require('./routes/content');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/content', contentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;
```

Then replace the entire contents of `server/src/server.js` with:

```js
require('dotenv').config();
const connectDB = require('./config/database');

// dotenv must load before app.js: the content store reads CONTENT_DIR when it is
// first required, which happens down the app's require chain.
const app = require('./app');

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS — `# pass 28`, `# fail 0` (9 + 9 + 10).

If the API tests hang, `connectDB()` leaked into `app.js` — it belongs only in `server.js`.

- [ ] **Step 7: Check the server still boots**

Run: `cd server && npm run dev`

Expected: a MongoDB warning (normal and intended — the display runs DB-less) followed by `Server running on port 5000`.

In a second terminal:

```bash
curl -s http://localhost:5000/api/content | head -c 200
```

Expected: JSON starting `{"version":1,...`. Confirm `server/data/content.json` now exists, and that `git status` does **not** list it.

Stop the server.

- [ ] **Step 8: Commit**

```bash
git add server/src/controllers/contentController.js server/src/routes/content.js server/src/app.js server/src/server.js server/test/contentApi.test.js
git commit -m "feat: add /api/content REST endpoints over the content store"
```

---

### Task 4: Reach the server from other devices

The display and the admin are both about to depend on the API from devices that are not the server. Neither can work until this is fixed.

**Files:**
- Modify: `client/vite.config.js`
- Modify: `client/src/services/api.js:3`

**Interfaces:**
- Consumes: nothing.
- Produces: an `api` axios instance whose base URL resolves correctly from any device on the LAN.

- [ ] **Step 1: Bind Vite to the network**

Replace the contents of `client/vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The TV and the gabbai's phone load this from another device on the LAN. Vite
  // binds to localhost only by default, which they cannot reach.
  server: { host: true },
})
```

- [ ] **Step 2: Derive the API host from the page's own origin**

In `client/src/services/api.js`, replace line 3:

```js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

with:

```js
// "localhost" is whatever device is *viewing* the page — on the TV or the gabbai's
// phone that is the TV or the phone, not the server. Default to the host the page
// was served from, which is the machine running both processes. Override with
// VITE_API_URL only when the API lives somewhere else entirely.
const API_URL =
  import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
```

- [ ] **Step 3: Verify from a second device**

Run `npm run dev` from the repo root. Vite now prints a **Network:** line, e.g. `http://192.168.1.20:5173/`.

On a phone joined to the same Wi-Fi, open that Network URL. The display must render. Then open `http://192.168.1.20:5000/api/content` on the phone and confirm JSON appears.

If the phone cannot connect, it is a Windows Firewall prompt for Node — allow it on private networks. Confirm both processes are reachable before continuing; every later task's verification depends on it.

- [ ] **Step 4: Commit**

```bash
git add client/vite.config.js client/src/services/api.js
git commit -m "fix: make the client reachable from other devices on the LAN"
```

---

### Task 5: Display reads content from the server

> **Status note (added post-merge, during the final whole-branch review):** this task
> was split. Step 1 (`client/src/services/content.js`) shipped as its own commit,
> "Task 5a". Steps 2–8 below — the polling hook and the `SynagogueDisplay.jsx` /
> `displayData.js` edits — were **deferred** ("Task 5b") because another session was
> concurrently rewriting both of those files on `feature/shabbat-prayer-times` at the
> time this branch was implemented. See the spec's "Implementation status" section
> (top of `docs/superpowers/specs/2026-07-22-admin-panel-design.md`) for the full
> picture: the seed content currently exists in two places, and the TV does not yet
> read from `/api/content`.
>
> **Before running Steps 5–8 below, re-read them against the real, current
> `SynagogueDisplay.jsx`.** The quoted "replace this / with this" code blocks were
> written against the file as it stood before the concurrent rewrite landed — line
> numbers, surrounding code, and possibly the rotation-state variables themselves will
> have moved. Diff the plan's before/after snippets against the actual file first;
> don't paste them in blind.

**Files:**
- Create: `client/src/services/content.js`
- Create: `client/src/hooks/useDisplayContent.js`
- Modify: `client/src/components/display/displayData.js`
- Modify: `client/src/components/display/ShiurimPanel.jsx:8`
- Modify: `client/src/pages/SynagogueDisplay.jsx`

**Interfaces:**
- Consumes: `GET /api/content` (Task 3); the `api` instance (Task 4).
- Produces:
  - `getContent()`, `getPanel(panel)`, `createItem(panel, data)`, `updateItem(panel, id, data)`, `deleteItem(panel, id)` — all returning `Promise<data>`, all used by Tasks 6–7
  - `useDisplayContent() → { announcements, shiurim, mazal, azkarot }`, active items only

- [ ] **Step 1: Write the API service**

Create `client/src/services/content.js`:

```js
import api from './api';

export const getContent = () => api.get('/content').then((res) => res.data);
export const getPanel = (panel) => api.get(`/content/${panel}`).then((res) => res.data);
export const createItem = (panel, data) => api.post(`/content/${panel}`, data).then((res) => res.data);
export const updateItem = (panel, id, data) =>
  api.put(`/content/${panel}/${id}`, data).then((res) => res.data);
export const deleteItem = (panel, id) =>
  api.delete(`/content/${panel}/${id}`).then((res) => res.data);
```

- [ ] **Step 2: Write the polling hook**

Create `client/src/hooks/useDisplayContent.js`:

```js
import { useEffect, useState } from 'react';
import { getContent } from '../services/content';

const POLL_MS = 30000;
const CACHE_KEY = 'synagogue-display-content';
const EMPTY = { announcements: [], shiurim: [], mazal: [], azkarot: [] };

const activeOnly = (doc) =>
  Object.fromEntries(
    Object.keys(EMPTY).map((key) => [key, (doc?.[key] || []).filter((it) => it.isActive)])
  );

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? activeOnly(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
};

// The TV browser is opened once and left running for weeks, so the display polls —
// nothing else reaches a page that is never reloaded.
//
// Written for an unattended screen: a failed poll keeps whatever is currently shown
// (a server restart must not blank the TV), and the last good document is cached so
// even a TV reboot during an outage still has content to show.
export default function useDisplayContent() {
  const [content, setContent] = useState(readCache);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const doc = await getContent();
        if (cancelled) return;
        setContent(activeOnly(doc));
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(doc));
        } catch {
          /* private mode or quota — polling still works, only the reboot cache is lost */
        }
      } catch (error) {
        // Deliberately no setContent: the last good content stays on screen.
        console.error('Failed to load display content:', error);
      }
    };

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return content;
}
```

- [ ] **Step 3: Delete the four constants**

In `client/src/components/display/displayData.js`, delete the `SHIURIM`, `ANNOUNCEMENTS`, `MAZAL` and `AZKAROT` exports entirely — all four arrays, lines 58 through 82 of the current file.

Leave `PARNAS` and `TICKER` in place; they are still static and out of scope. Leave every prayer, zmanim and Shabbat export untouched.

Replace the deleted block with a pointer:

```js
// שיעורים / הודעות / מזל טוב / אזכרות are no longer static — they are edited in
// /adminGabbai and served from the API. Seed values live in
// server/src/store/defaultContent.js; the display fetches them via useDisplayContent.
```

- [ ] **Step 4: Key shiurim rows by id**

In `client/src/components/display/ShiurimPanel.jsx`, replace the `key` on line 8:

```jsx
          key={`${s.name}-${s.time}`}
```

with:

```jsx
          key={s.id}
```

- [ ] **Step 5: Wire the hook into the display**

In `client/src/pages/SynagogueDisplay.jsx`, make four edits.

**5a.** Remove `SHIURIM`, `ANNOUNCEMENTS`, `MAZAL` and `AZKAROT` from the `displayData` import block, leaving:

```js
import {
  WEEKDAY_PRAYERS,
  SHABBAT_PRAYERS,
  ZMANIM_ROWS,
  PARNAS,
  TICKER,
  resolvePrayers,
  computeNextMinyan,
  governingThursday,
  weeklyMinchaTime,
} from '../components/display/displayData';
```

Then add the hook import below the `Ticker` import:

```js
import useDisplayContent from '../hooks/useDisplayContent';
```

**5b.** Replace the three rotation state declarations:

```js
  const [annIdx, setAnnIdx] = useState(0);
  const [mazIdx, setMazIdx] = useState(0);
  const [azkIdx, setAzkIdx] = useState(0);
```

with a single shared counter plus the content hook:

```js
  // One counter, not three: the three panels have always rotated in lockstep.
  const [tick, setTick] = useState(0);
  const { announcements, shiurim, mazal, azkarot } = useDisplayContent();
```

**5c.** Replace the rotation effect:

```js
  // Rotate announcements / mazal / azkarot.
  useEffect(() => {
    const r = setInterval(() => {
      setAnnIdx((i) => (i + 1) % ANNOUNCEMENTS.length);
      setMazIdx((i) => (i + 1) % MAZAL.length);
      setAzkIdx((i) => (i + 1) % AZKAROT.length);
    }, ROTATE_MS);
    return () => clearInterval(r);
  }, []);
```

with:

```js
  // Rotate announcements / mazal / azkarot. The counter only ever increases; the
  // modulo happens at render time against the CURRENT list, because the lists are
  // editable now and a list that shrinks must not leave the index past its end.
  useEffect(() => {
    const r = setInterval(() => setTick((t) => t + 1), ROTATE_MS);
    return () => clearInterval(r);
  }, []);
```

**5d.** Replace the two lines that read the rotating items:

```js
  const maz = MAZAL[mazIdx] || {};
  const azk = AZKAROT[azkIdx] || {};
```

with:

```js
  const pick = (list) => (list.length ? list[tick % list.length] : null);
  const ann = pick(announcements);
  const maz = pick(mazal) || {};
  const azk = pick(azkarot) || {};
```

**5e.** In the JSX, replace the announcements and shiurim panels.

```jsx
              <AnnouncementsPanel ann={ANNOUNCEMENTS[annIdx]} annKey={annIdx} />
```

becomes — an empty list renders the panel's title over blank space, which is the intended quiet fallback:

```jsx
              <AnnouncementsPanel ann={ann?.text || ''} annKey={tick} />
```

And:

```jsx
              <ShiurimPanel shiurim={SHIURIM} />
```

becomes:

```jsx
              <ShiurimPanel shiurim={shiurim} />
```

**5f.** Replace the two remaining `mazKey` / `azkKey` props:

```jsx
                <MazalPanel maz={maz} mazKey={mazIdx} />
                <AzkarotPanel azk={azk} azkKey={azkIdx} />
```

becomes:

```jsx
                <MazalPanel maz={maz} mazKey={tick} />
                <AzkarotPanel azk={azk} azkKey={tick} />
```

- [ ] **Step 6: Lint**

Run: `cd client && npm run lint`
Expected: no new errors. An unused-variable error for `annIdx`, `mazIdx` or `azkIdx` means a sub-step of Step 5 was missed.

- [ ] **Step 7: Verify in the browser**

Run `npm run dev` from the repo root and open the display.

1. הודעות, שיעורי תורה, שמחות ומזל טוב and לעילוי נשמת all show their seeded content — identical to before this change.
2. The three rotating panels still advance together every 6.5 seconds.
3. In DevTools → Network, `content` is requested on load and again after 30 seconds.
4. In DevTools → Application → Local Storage, `synagogue-display-content` holds the document.
5. Stop the server (`Ctrl+C` on the server process). Within a minute the console logs `Failed to load display content` — and **the panels keep showing their content**. This is the behavior that matters most; if the panels blank, the `catch` in the hook is calling `setContent`.
6. Reload the page while the server is still down. Content still appears, from the localStorage cache.
7. Restart the server. The display recovers on its next poll without a reload.

- [ ] **Step 8: Commit**

```bash
git add client/src/services/content.js client/src/hooks/useDisplayContent.js client/src/components/display/displayData.js client/src/components/display/ShiurimPanel.jsx client/src/pages/SynagogueDisplay.jsx
git commit -m "feat: serve display content from the API instead of static arrays"
```

---

### Task 6: Admin shell and home menu

**Files:**
- Create: `client/src/pages/admin/panelMeta.js`
- Create: `client/src/pages/admin/adminStyles.js`
- Create: `client/src/pages/admin/AdminHome.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**
- Consumes: `getContent` (Task 5).
- Produces:
  - `PANEL_META` — keyed by panel, each `{ title, icon, addLabel, emptyLabel, fields, summary, sub }`; `fields` is an array of `{ key, label, type, required, placeholder? }`
  - `PANEL_KEYS: string[]`
  - `adminStyles.js` exporting `COLORS, screen, title, backLink, row, card, button, primaryButton, dangerButton, input, label, error, fieldError, muted`
  - Routes `/adminGabbai`, `/adminGabbai/:panel`, `/adminGabbai/:panel/new`, `/adminGabbai/:panel/:id`

- [ ] **Step 1: Write the panel metadata**

Create `client/src/pages/admin/panelMeta.js`. The field keys must match `server/src/store/panels.js` exactly — the server validates them and silently strips anything else.

```js
// Presentation for the four panels. Mirrors the field keys in
// server/src/store/panels.js; the server owns validation, this owns the Hebrew.
// The duplication is deliberate — deriving one from the other would couple
// validation to UI copy. Adding a field means editing both.
export const PANEL_META = {
  announcements: {
    title: 'הודעות',
    icon: '📢',
    addLabel: 'הוסף הודעה',
    emptyLabel: 'אין הודעות',
    fields: [{ key: 'text', label: 'תוכן ההודעה', type: 'textarea', required: true }],
    summary: (item) => item.text,
    sub: () => '',
  },
  shiurim: {
    title: 'שיעורי תורה',
    icon: '📖',
    addLabel: 'הוסף שיעור',
    emptyLabel: 'אין שיעורים',
    fields: [
      { key: 'name', label: 'שם השיעור', type: 'text', required: true },
      { key: 'time', label: 'שעה', type: 'time', required: true },
      { key: 'by', label: 'מגיד השיעור', type: 'text', required: true },
    ],
    summary: (item) => `${item.name} · ${item.time}`,
    sub: (item) => item.by,
  },
  mazal: {
    title: 'שמחות ומזל טוב',
    icon: '🎉',
    addLabel: 'הוסף שמחה',
    emptyLabel: 'אין שמחות',
    fields: [
      { key: 'names', label: 'שם המשפחה', type: 'text', required: true },
      { key: 'occasion', label: 'האירוע', type: 'text', required: true },
    ],
    summary: (item) => item.names,
    sub: (item) => item.occasion,
  },
  azkarot: {
    title: 'לעילוי נשמת',
    icon: '🕯',
    addLabel: 'הוסף אזכרה',
    emptyLabel: 'אין אזכרות',
    fields: [
      { key: 'name', label: 'שם הנפטר', type: 'text', required: true, placeholder: 'משה בן פרטונה ז״ל' },
      { key: 'detail', label: 'הקדשה', type: 'text', required: false, placeholder: 'תנצב״ה' },
      { key: 'date', label: 'תאריך עברי', type: 'text', required: true, placeholder: 'י״ח באלול' },
    ],
    summary: (item) => item.name,
    sub: (item) => [item.detail, item.date].filter(Boolean).join(' · '),
  },
};

export const PANEL_KEYS = Object.keys(PANEL_META);
```

- [ ] **Step 2: Write the shared styles**

Create `client/src/pages/admin/adminStyles.js`. Inline styles, matching `components/display/*`.

```js
// Inline styles, matching components/display/*. Tailwind is non-functional in this
// repo (v3 directives against a v4 install) — do not reach for utility classes.
export const COLORS = {
  gold: '#c9a86a',
  goldLight: '#f4ead2',
  text: '#e8ecf3',
  muted: '#8b95a7',
  border: 'rgba(255,255,255,0.10)',
  card: 'rgba(255,255,255,0.04)',
  danger: '#d98a8a',
};

// index.css pins body and #root to overflow:hidden for the TV. Rather than change
// global CSS the display depends on, the admin becomes its own scroll container.
export const screen = {
  position: 'fixed',
  inset: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  background: '#0a0e16',
  color: COLORS.text,
  fontFamily: "'Assistant',sans-serif",
  direction: 'rtl',
  padding: '18px 16px 48px',
};

export const title = {
  fontFamily: "'Frank Ruhl Libre',serif",
  fontSize: '26px',
  fontWeight: 700,
  color: COLORS.goldLight,
  margin: '4px 0 18px',
};

export const backLink = {
  display: 'inline-block',
  color: COLORS.gold,
  fontSize: '17px',
  textDecoration: 'none',
  marginBottom: '14px',
};

export const card = {
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '14px',
  padding: '14px 16px',
  marginBottom: '12px',
};

export const row = {
  ...card,
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  color: COLORS.text,
  textDecoration: 'none',
};

const baseButton = {
  border: `1px solid ${COLORS.border}`,
  borderRadius: '12px',
  padding: '13px 18px',
  fontSize: '17px',
  fontFamily: 'inherit',
  cursor: 'pointer',
  background: 'transparent',
  color: COLORS.text,
  minHeight: '48px', // comfortable phone tap target
};

export const button = baseButton;

export const primaryButton = {
  ...baseButton,
  width: '100%',
  background: 'linear-gradient(180deg,rgba(201,168,106,0.28),rgba(201,168,106,0.10))',
  borderColor: 'rgba(201,168,106,0.55)',
  color: COLORS.goldLight,
  fontWeight: 700,
};

export const dangerButton = { ...baseButton, color: COLORS.danger, padding: '8px 12px' };

export const label = {
  display: 'block',
  fontSize: '15px',
  color: COLORS.muted,
  marginBottom: '6px',
};

export const input = {
  width: '100%',
  background: 'rgba(0,0,0,0.30)',
  border: `1px solid ${COLORS.border}`,
  borderRadius: '10px',
  padding: '12px 14px',
  fontSize: '17px', // below 16px iOS Safari zooms the page on focus
  fontFamily: 'inherit',
  color: COLORS.text,
  direction: 'rtl',
};

export const error = {
  background: 'rgba(217,138,138,0.12)',
  border: '1px solid rgba(217,138,138,0.45)',
  borderRadius: '10px',
  padding: '10px 14px',
  color: COLORS.danger,
  fontSize: '16px',
  marginBottom: '14px',
};

export const fieldError = { color: COLORS.danger, fontSize: '14px', marginTop: '5px' };

export const muted = { color: COLORS.muted, fontSize: '16px' };
```

- [ ] **Step 3: Write the home menu**

Create `client/src/pages/admin/AdminHome.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getContent } from '../../services/content';
import { PANEL_META, PANEL_KEYS } from './panelMeta';
import * as S from './adminStyles';

export default function AdminHome() {
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getContent()
      .then((doc) =>
        setCounts(Object.fromEntries(PANEL_KEYS.map((key) => [key, (doc[key] || []).length])))
      )
      .catch(() => setError('לא ניתן להתחבר לשרת'));
  }, []);

  return (
    <div style={S.screen}>
      <h1 style={S.title}>ניהול תוכן</h1>
      {error && <div style={S.error}>{error}</div>}

      {PANEL_KEYS.map((key) => (
        <Link key={key} to={`/adminGabbai/${key}`} style={S.row}>
          <span style={{ fontSize: '26px' }}>{PANEL_META[key].icon}</span>
          <span style={{ flex: 1, fontSize: '19px', fontWeight: 600 }}>{PANEL_META[key].title}</span>
          <span style={{ color: S.COLORS.gold, fontSize: '18px' }}>
            {counts ? counts[key] : '…'}
          </span>
          <span style={S.muted}>‹</span>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Stub the two screens**

Create these first, so the routes added in Step 5 import something that exists. Tasks 7
and 8 replace them.

Create `client/src/pages/admin/PanelList.jsx`:

```jsx
export default function PanelList() {
  return null;
}
```

Create `client/src/pages/admin/ItemForm.jsx`:

```jsx
export default function ItemForm() {
  return null;
}
```

- [ ] **Step 5: Register the routes**

In `client/src/App.jsx`, add the imports below the existing `Zmanim` import:

```jsx
import AdminHome from './pages/admin/AdminHome';
import PanelList from './pages/admin/PanelList';
import ItemForm from './pages/admin/ItemForm';
```

and replace the placeholder comment line:

```jsx
          {/* Admin routes will be added here */}
```

with:

```jsx
          <Route path="/adminGabbai" element={<AdminHome />} />
          <Route path="/adminGabbai/:panel" element={<PanelList />} />
          <Route path="/adminGabbai/:panel/new" element={<ItemForm />} />
          <Route path="/adminGabbai/:panel/:id" element={<ItemForm />} />
```

- [ ] **Step 6: Verify in the browser**

Run `npm run dev` from the repo root and open `http://localhost:5173/adminGabbai`.

1. The four rows appear with the counts `3`, `5`, `3`, `3`.
2. The page is right-to-left, dark, and scrolls if you shrink the window — it must not be clipped by `#root`'s `overflow: hidden`.
3. Tapping a row navigates to `/adminGabbai/<panel>` and renders a blank page (the stub). No console errors.
4. `/` still renders the display unchanged.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/admin/ client/src/App.jsx
git commit -m "feat: add admin shell, panel metadata and home menu"
```

---

### Task 7: Panel list screen

**Files:**
- Modify: `client/src/pages/admin/PanelList.jsx` (replacing the stub)

**Interfaces:**
- Consumes: `getPanel`, `updateItem`, `deleteItem` (Task 5); `PANEL_META` and `adminStyles` (Task 6).
- Produces: nothing — `ItemForm` navigates back here by URL.

- [ ] **Step 1: Write the screen**

Replace the entire contents of `client/src/pages/admin/PanelList.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPanel, updateItem, deleteItem } from '../../services/content';
import { PANEL_META } from './panelMeta';
import * as S from './adminStyles';

export default function PanelList() {
  const { panel } = useParams();
  const meta = PANEL_META[panel];
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meta) return;
    setLoading(true);
    getPanel(panel)
      .then(setItems)
      .catch(() => setError('לא ניתן לטעון את הרשימה'))
      .finally(() => setLoading(false));
  }, [panel, meta]);

  if (!meta) {
    return (
      <div style={S.screen}>
        <Link to="/adminGabbai" style={S.backLink}>‹ חזרה</Link>
        <p style={S.muted}>פאנל לא קיים</p>
      </div>
    );
  }

  // Optimistic: the switch flips immediately and rolls back if the save fails, so a
  // dead network cannot leave the screen disagreeing with the server.
  const toggle = async (item) => {
    const next = { ...item, isActive: !item.isActive };
    setItems((list) => list.map((it) => (it.id === item.id ? next : it)));
    setError('');
    try {
      await updateItem(panel, item.id, next);
    } catch {
      setItems((list) => list.map((it) => (it.id === item.id ? item : it)));
      setError('השינוי לא נשמר');
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`למחוק את "${meta.summary(item)}"?`)) return;
    setError('');
    try {
      await deleteItem(panel, item.id);
      setItems((list) => list.filter((it) => it.id !== item.id));
    } catch {
      setError('המחיקה נכשלה');
    }
  };

  return (
    <div style={S.screen}>
      <Link to="/adminGabbai" style={S.backLink}>‹ חזרה</Link>
      <h1 style={S.title}>{meta.title}</h1>
      {error && <div style={S.error}>{error}</div>}

      {loading && <p style={S.muted}>טוען…</p>}
      {!loading && items.length === 0 && <p style={S.muted}>{meta.emptyLabel}</p>}

      {items.map((item) => (
        <div key={item.id} style={{ ...S.card, opacity: item.isActive ? 1 : 0.45 }}>
          <div style={{ fontSize: '18px', fontWeight: 600, whiteSpace: 'pre-line', lineHeight: 1.35 }}>
            {meta.summary(item)}
          </div>
          {meta.sub(item) && (
            <div style={{ ...S.muted, marginTop: '4px' }}>{meta.sub(item)}</div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, fontSize: '16px' }}>
              <input
                type="checkbox"
                checked={item.isActive}
                onChange={() => toggle(item)}
                style={{ width: '22px', height: '22px', accentColor: S.COLORS.gold }}
              />
              {item.isActive ? 'מוצג' : 'מוסתר'}
            </label>
            <Link to={`/adminGabbai/${panel}/${item.id}`} style={{ ...S.button, textDecoration: 'none' }}>
              ✎ ערוך
            </Link>
            <button type="button" onClick={() => remove(item)} style={S.dangerButton}>
              🗑
            </button>
          </div>
        </div>
      ))}

      <Link to={`/adminGabbai/${panel}/new`} style={{ ...S.primaryButton, display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '18px' }}>
        + {meta.addLabel}
      </Link>
    </div>
  );
}
```

Note the `‹` in `‹ חזרה` — in RTL that arrow points away from the content, which is the correct "back" direction. Do not swap it for `›`.

- [ ] **Step 2: Lint**

Run: `cd client && npm run lint`
Expected: no new errors.

- [ ] **Step 3: Verify in the browser**

With `npm run dev` running, open `/adminGabbai/shiurim`.

1. Five shiurim appear, each showing `name · time` above the rabbi's name.
2. Untick **מוצג** on one. The row immediately dims, the label reads **מוסתר**, and no error appears.
3. Open the display at `/` in another tab. Within 30 seconds that shiur is gone from the שיעורי תורה panel.
4. Re-tick it; within 30 seconds it returns.
5. Visit `/adminGabbai/announcements` and confirm the multi-line announcement text wraps across lines rather than showing a literal `\n`.
6. Press 🗑 on any item and cancel the confirm — the item stays.
7. Stop the server and toggle a switch. It flips, then reverts, and **השינוי לא נשמר** appears. Restart the server.
8. Visit `/adminGabbai/nonsense` and confirm **פאנל לא קיים** with a working back link.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/admin/PanelList.jsx
git commit -m "feat: add admin panel list with show/hide toggle and delete"
```

---

### Task 8: Item form

**Files:**
- Modify: `client/src/pages/admin/ItemForm.jsx` (replacing the stub)
- Modify: `SETUP.md`

**Interfaces:**
- Consumes: `getPanel`, `createItem`, `updateItem` (Task 5); `PANEL_META` and `adminStyles` (Task 6).
- Produces: nothing — this is a leaf screen.

- [ ] **Step 1: Write the form**

Replace the entire contents of `client/src/pages/admin/ItemForm.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getPanel, createItem, updateItem } from '../../services/content';
import { PANEL_META } from './panelMeta';
import * as S from './adminStyles';

const blankValues = (meta) =>
  Object.fromEntries((meta?.fields || []).map((field) => [field.key, '']));

export default function ItemForm() {
  const { panel, id } = useParams();
  const navigate = useNavigate();
  const meta = PANEL_META[panel];
  const isNew = !id;

  const [values, setValues] = useState(() => blankValues(meta));
  const [item, setItem] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!meta || isNew) return;
    getPanel(panel)
      .then((list) => {
        const found = list.find((it) => it.id === id);
        if (!found) {
          setMessage('הפריט לא נמצא');
          return;
        }
        setItem(found);
        setValues(Object.fromEntries(meta.fields.map((f) => [f.key, found[f.key] || ''])));
      })
      .catch(() => setMessage('לא ניתן לטעון את הפריט'));
  }, [panel, id, isNew, meta]);

  if (!meta) {
    return (
      <div style={S.screen}>
        <Link to="/adminGabbai" style={S.backLink}>‹ חזרה</Link>
        <p style={S.muted}>פאנל לא קיים</p>
      </div>
    );
  }

  const setField = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setMessage('');

    // An edit must not silently un-hide a hidden item.
    const payload = { ...values, isActive: item ? item.isActive : true };

    try {
      if (isNew) await createItem(panel, payload);
      else await updateItem(panel, id, payload);
      navigate(`/adminGabbai/${panel}`);
    } catch (error) {
      // `values` is deliberately untouched — the gabbai never loses what he typed.
      const data = error.response?.data;
      setFieldErrors(data?.errors || {});
      setMessage(data?.message || 'השמירה נכשלה — בדוק את החיבור לשרת');
      setSaving(false);
    }
  };

  return (
    <div style={S.screen}>
      <Link to={`/adminGabbai/${panel}`} style={S.backLink}>‹ חזרה</Link>
      <h1 style={S.title}>{isNew ? meta.addLabel : `עריכת ${meta.title}`}</h1>
      {message && <div style={S.error}>{message}</div>}

      <form onSubmit={submit}>
        {meta.fields.map((field) => (
          <div key={field.key} style={{ marginBottom: '16px' }}>
            <label style={S.label} htmlFor={field.key}>
              {field.label}
              {!field.required && ' (לא חובה)'}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                id={field.key}
                value={values[field.key]}
                placeholder={field.placeholder || ''}
                onChange={(e) => setField(field.key, e.target.value)}
                rows={4}
                style={{ ...S.input, resize: 'vertical' }}
              />
            ) : (
              <input
                id={field.key}
                type={field.type}
                value={values[field.key]}
                placeholder={field.placeholder || ''}
                onChange={(e) => setField(field.key, e.target.value)}
                style={S.input}
              />
            )}
            {fieldErrors[field.key] && <div style={S.fieldError}>{fieldErrors[field.key]}</div>}
          </div>
        ))}

        <button type="submit" disabled={saving} style={{ ...S.primaryButton, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'שומר…' : 'שמור'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `cd client && npm run lint`
Expected: no new errors.

- [ ] **Step 3: Verify in the browser**

With `npm run dev` running:

1. `/adminGabbai/shiurim` → **+ הוסף שיעור**. The form shows שם השיעור, שעה (a native time picker) and מגיד השיעור.
2. Press **שמור** with everything blank. The form stays put, **שדות לא תקינים** appears at the top, and **שדה חובה** appears under all three fields. Nothing was created.
3. Fill in `שיעור מבחן` / `21:30` / `הרב דוד` and save. It returns to the list with the new shiur present.
4. Within 30 seconds the display's שיעורי תורה panel shows it.
5. Tap **✎ ערוך** on it, change the time to `22:00`, save; the list reflects the change.
6. Hide it with the toggle, then edit it and save again — it must **still** be hidden. This is the `isActive` preservation in `submit`.
7. Edit it, change a field, stop the server, press **שמור**. An error appears and **your typing is still in the form**. Restart the server and press **שמור** again; it succeeds.
8. Delete the test shiur.
9. Repeat 1–3 briefly for הודעות (multi-line text in the textarea, and confirm the display renders the line break), שמחות ומזל טוב, and לעילוי נשמת.

- [ ] **Step 4: Do the whole thing from the phone**

This is the actual delivery target and everything above has only been proven on a desktop.

Open the Vite **Network:** URL on the gabbai's phone, then `/adminGabbai`. Confirm:

1. All four screens are readable and the buttons are comfortably tappable one-handed.
2. Tapping into a text field does **not** zoom the page (this is what the `17px` font size in `S.input` prevents).
3. The page scrolls normally — the admin's own scroll container is working.
4. A change made on the phone reaches the TV within 30 seconds.

- [ ] **Step 5: Document it**

Append to `SETUP.md`:

```markdown
## ניהול תוכן (Admin panel)

The gabbai edits הודעות, שיעורי תורה, שמחות ומזל טוב and לעילוי נשמת at
**`/adminGabbai`** — for example `http://192.168.1.20:5173/adminGabbai`. There is no
login; access is by knowing the path. Do not expose the server outside the local
network without adding authentication first.

Content lives in `server/data/content.json`, which is git-ignored and created on first
boot from `server/src/store/defaultContent.js`. Back it up by copying that one file.

The store caches the file in memory, so **editing `content.json` by hand requires a
server restart.** Edit through the admin panel instead wherever possible.

The display re-fetches every 30 seconds, so a change reaches the TV within half a
minute without touching the TV. If the server is unreachable the display keeps showing
the last content it saw rather than blanking.
```

- [ ] **Step 6: Run the full test suite**

Run: `cd server && npm test`
Expected: PASS — `# pass 28`, `# fail 0`.

Run: `cd client && npm run lint`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/admin/ItemForm.jsx SETUP.md
git commit -m "feat: add admin item form for all four panels"
```

---

## Verification checklist for the finished feature

Run these once, after Task 8, on the machine that will actually run the display:

- [ ] `cd server && npm test` — 28 passing.
- [ ] `cd client && npm run lint` — no new errors.
- [ ] `git status` does not list `server/data/content.json`.
- [ ] Add, edit, hide and delete one item in each of the four panels, from the phone.
- [ ] Each change appears on the TV within 30 seconds without touching the TV.
- [ ] Stop the server: the TV keeps its content. Reload the TV: content still appears.
- [ ] Restart the server: the TV recovers on its own.
- [ ] Hide every item in one panel: the panel renders empty, nothing crashes, and the other panels keep rotating.

## Known limitation, not addressed here

`computeNextMinyan` walks the prayer list in array order, so on a Saturday morning the
המניין הבא card reports Friday's הדלקת נרות. This is pre-existing, documented at the end
of `docs/superpowers/plans/2026-07-22-shabbat-prayer-times.md`, and untouched by this
work — prayer times are not part of the admin panel.
