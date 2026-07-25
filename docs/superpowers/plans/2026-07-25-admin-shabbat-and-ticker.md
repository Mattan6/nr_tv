# Admin-editable Shabbat Times and Ticker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the gabbai pin any of the five Shabbat prayer times to a fixed clock time and edit the bottom ticker line by line, from `/adminGabbai`, with both changes reaching the wall and phones.

**Architecture:** `ticker` becomes a fifth list panel — one row in the `PANELS` table buys the whole CRUD stack. Shabbat overrides are a single record under a new `settings` key, served by two explicitly-ordered routes. `resolveShabbatTimes` gains an overrides argument and resolves them before deriving anything from them.

**Tech Stack:** Node 18+ (CommonJS, `node:test`), Express 5, React 19 + Vite, inline styles. **No new dependencies.**

## Global Constraints

- **`'ticker'` must NOT be added to `PANEL_ARRAY_KEYS`** in `server/src/store/contentStore.js`. Every existing `content.json` predates the key; adding it there classifies each one as wrong-shaped, quarantines it, and replaces the gabbai's real content with seed data.
- **A `content.json` with no `ticker` key must load with the four seed lines**, not with an empty list. An empty ticker on upgrade means the footer vanishes from the wall.
- **A `content.json` with `"ticker": []` must stay empty.** Absent and empty are different states.
- **`GET`/`PUT /settings` must be declared before `/:panel`** in `server/src/routes/content.js`. Express matches in declaration order and `isPanel('settings')` is false.
- **Blank means automatic.** `''` is a valid value for every settings field and is what clears an override.
- **An override must win even when the season is unknown.** `isSummerTime` returning null blanks three automatic rows; it must not blank an overridden one.
- **`addMinutesToClock` must wrap at midnight**, or 23:50 + 15 renders as `24:05`.
- **Ticker spacing is `'  •  '`** — two spaces either side, matching the `TICKER` constant being deleted.
- **Hebrew user-facing copy.** Admin rows are exactly `פס תחתון` and `זמני שבת`.
- Existing tests must keep passing: `npm --prefix server test` (65 at the time of writing).
- Client checks each task: `npm --prefix client run lint && npm --prefix client run build`.

---

### Task 1: The ticker panel and the settings record on the server

One table entry, one validator, two routes, the seed, and the backfill rule. All server-side, all covered by `node --test`.

**Files:**
- Modify: `server/src/store/panels.js`
- Modify: `server/src/store/defaultContent.js`
- Modify: `server/src/store/contentStore.js`
- Modify: `server/src/controllers/contentController.js`
- Modify: `server/src/routes/content.js`
- Test: `server/test/panels.test.js`, `server/test/contentStore.test.js`, `server/test/contentApi.test.js`

**Interfaces:**
- Produces:
  - `PANELS.ticker = { text: { required: true } }`
  - `validateSettings(body): { settings } | { errors }` in `panels.js` — `settings` is `{ shabbat: { candles, kabbalat, shacharit, mincha, arvit } }`, every value `'HH:MM'` or `''`
  - `SHABBAT_SETTING_KEYS = ['candles','kabbalat','shacharit','mincha','arvit']`
  - `getSettings` / `updateSettings` handlers in `contentController.js`
  - `DEFAULT_CONTENT.ticker` (4 items) and `DEFAULT_CONTENT.settings`

- [ ] **Step 1: Write the failing tests**

In `server/test/panels.test.js`:

```js
test('accepts a valid time and a blank for every shabbat setting', () => {
  const { settings, errors } = validateSettings({
    shabbat: { candles: '18:00', kabbalat: '', shacharit: '07:45', mincha: '', arvit: '19:58' },
  });
  assert.equal(errors, undefined);
  assert.deepEqual(settings.shabbat, {
    candles: '18:00', kabbalat: '', shacharit: '07:45', mincha: '', arvit: '19:58',
  });
});

test('rejects an out-of-range time', () => {
  const { errors } = validateSettings({ shabbat: { candles: '25:00' } });
  assert.equal(errors.candles, 'שעה חייבת להיות בפורמט 18:00');
});

test('treats a missing or non-string field as blank', () => {
  const { settings, errors } = validateSettings({ shabbat: { candles: 42 } });
  assert.equal(errors, undefined);
  assert.equal(settings.shabbat.candles, '');
});
```

In `server/test/contentStore.test.js` — the upgrade path, the most important test in this plan:

```js
test('backfills an absent ticker with the seed lines', async () => {
  const dir = await tempDir();
  const doc = structuredClone(DEFAULT_CONTENT);
  delete doc.ticker;
  await fs.writeFile(path.join(dir, 'content.json'), JSON.stringify(doc));

  const store = createContentStore(dir);
  const read = await store.read();
  assert.equal(read.ticker.length, 4);
  assert.equal(read.announcements.length, DEFAULT_CONTENT.announcements.length); // not quarantined
});

test('leaves an explicitly empty ticker empty', async () => {
  const dir = await tempDir();
  const doc = structuredClone(DEFAULT_CONTENT);
  doc.ticker = [];
  await fs.writeFile(path.join(dir, 'content.json'), JSON.stringify(doc));

  const store = createContentStore(dir);
  assert.deepEqual((await store.read()).ticker, []);
});
```

In `server/test/contentApi.test.js`:

```js
test('GET /api/content/settings reaches the settings, not the panel handler', async () => {
  const res = await fetch(`${base}/api/content/settings`);
  assert.equal(res.status, 200);
  assert.ok((await res.json()).shabbat);
});

test('PUT /api/content/settings round-trips', async () => {
  const res = await fetch(`${base}/api/content/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shabbat: { candles: '18:00', kabbalat: '', shacharit: '', mincha: '', arvit: '' } }),
  });
  assert.equal(res.status, 200);
  const after = await (await fetch(`${base}/api/content/settings`)).json();
  assert.equal(after.shabbat.candles, '18:00');
});

test('ticker behaves like any other panel', async () => {
  const created = await (await fetch(`${base}/api/content/ticker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'שורה חדשה' }),
  })).json();
  assert.equal(created.isActive, true);
  const del = await fetch(`${base}/api/content/ticker/${created.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
});
```

Match the surrounding files' existing helpers (`tempDir`, `base`) rather than inventing new ones — read the top of each test file first.

- [ ] **Step 2: Run them and watch them fail**

Run: `npm --prefix server test`
Expected: the new tests fail — `validateSettings is not a function`, 404s on `/settings`, and `read.ticker` undefined.

- [ ] **Step 3: `panels.js` — the panel entry and the settings validator**

Add to `PANELS`, after `azkarot`:

```js
  ticker: {
    text: { required: true },
  },
```

Then, below `validateItem`:

```js
// The five Shabbat rows the gabbai can pin to a fixed time. A blank value means
// "leave it automatic", so '' is valid input, not a missing field — which is why this
// cannot reuse validateItem, whose `required` rules exist to reject exactly that.
const SHABBAT_SETTING_KEYS = ['candles', 'kabbalat', 'shacharit', 'mincha', 'arvit'];

function validateSettings(body) {
  const shabbat = {};
  const errors = {};
  const source = (body && body.shabbat) || {};

  for (const key of SHABBAT_SETTING_KEYS) {
    const raw = source[key];
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) {
      shabbat[key] = '';
      continue;
    }
    if (!TIME_RE.test(value)) {
      errors[key] = 'שעה חייבת להיות בפורמט 18:00';
      continue;
    }
    shabbat[key] = value;
  }

  return Object.keys(errors).length ? { errors } : { settings: { shabbat } };
}
```

Export `validateSettings` and `SHABBAT_SETTING_KEYS` alongside the existing exports.

- [ ] **Step 4: `defaultContent.js` — seed the ticker and the settings**

Add after `azkarot`, before `jokes`:

```js
  // The bottom ticker, one item per line. These four are the string that used to live in
  // client/src/components/display/displayData.js as TICKER, split on its separators, so an
  // installation that upgrades sees exactly what it saw before.
  ticker: [
    { id: 'seed-tic-1', text: 'בית כנסת נווה רחמים', isActive: true },
    { id: 'seed-tic-2', text: 'נא לכבד את קדושת בית הכנסת ולכבות את הטלפונים', isActive: true },
    { id: 'seed-tic-3', text: 'נדבת משפחת בן חמו לעילוי נשמת משה בן פרטונה', isActive: true },
    { id: 'seed-tic-4', text: 'לתרומות והנצחות פנו לגבאי · 054-848-7595', isActive: true },
  ],
  // Fixed Shabbat times set by the gabbai. '' means "compute it", which is the default
  // for all five — see resolveShabbatTimes in the client.
  settings: {
    shabbat: { candles: '', kabbalat: '', shacharit: '', mincha: '', arvit: '' },
  },
```

- [ ] **Step 5: `contentStore.js` — backfill absent optional keys**

Do **not** touch `PANEL_ARRAY_KEYS`. Add above `shapeError`:

```js
// Keys added after content.json's first release. They cannot join PANEL_ARRAY_KEYS: every
// file written before they existed lacks them, and shapeError would then condemn every
// real installation as corrupt and serve seed data over the gabbai's content.
//
// Absent and empty are deliberately different. An absent key is backfilled from the seed,
// so upgrading a server keeps the ticker it has always shown. A key that is present and
// empty is left alone, because the gabbai emptied it on purpose.
const BACKFILL_KEYS = ['ticker', 'settings'];

function withDefaults(doc) {
  for (const key of BACKFILL_KEYS) {
    if (doc[key] === undefined) doc[key] = structuredClone(DEFAULT_CONTENT[key]);
  }
  return doc;
}
```

In `load()`, change `cache = parsed;` to `cache = withDefaults(parsed);`.

Note this fills the in-memory document only; the file gains the keys on the next write, which is the same laziness `jokes` already relies on.

- [ ] **Step 6: `contentController.js` — the two settings handlers**

```js
const getSettings = handler(async (req, res) => {
  const doc = await contentStore.read();
  res.json(doc.settings);
});

const updateSettings = handler(async (req, res) => {
  const { settings, errors } = validateSettings(req.body);
  if (errors) return res.status(400).json({ message: 'שדות לא תקינים', errors });

  const saved = await contentStore.update((draft) => {
    draft.settings = settings;
    return settings;
  });
  res.json(saved);
});
```

Import `validateSettings` at the top and add both to `module.exports`. The `handler` wrapper's panel check is skipped automatically — these routes have no `:panel` param, and it already guards on `req.params.panel !== undefined`.

- [ ] **Step 7: `routes/content.js` — order matters**

```js
// Declared before '/:panel': Express matches in order, and a request for /settings that
// reached getPanel would 404, because 'settings' is not a panel.
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

router.get('/', getContent);
router.get('/:panel', getPanel);
```

- [ ] **Step 8: Run the tests**

Run: `npm --prefix server test`
Expected: all pass, including the original 65.

- [ ] **Step 9: Commit**

```bash
git add server/src/store server/src/controllers/contentController.js server/src/routes/content.js server/test
git commit -m "feat: store the ticker and the Shabbat time overrides in content.json"
```

---

### Task 2: Apply the overrides and the ticker list in both layouts

**Files:**
- Modify: `client/src/components/display/displayData.js`
- Modify: `client/src/hooks/useDisplayContent.js`
- Modify: `client/src/hooks/useDisplayModel.js`
- Modify: `client/src/components/display/Ticker.jsx`
- Modify: `client/src/components/mobile/TickerLines.jsx`
- Modify: `client/src/pages/SynagogueDisplay.jsx`, `client/src/pages/MobileDisplay.jsx`

**Interfaces:**
- Consumes: `settings.shabbat` and `ticker` from `/api/content` (Task 1).
- Produces:
  - `addMinutesToClock(clock: string, minutes: number): string | null` — exported from `displayData.js`
  - `resolveShabbatTimes({ candles, havdalah, saturdaySunset }, config, overrides)` — third argument, defaults to `{}`
  - `useDisplayContent()` gains `ticker`
  - `useDisplayModel()` gains `ticker` (active items) and passes overrides through
  - `<Ticker items={...} />`, `<TickerLines items={...} />`

- [ ] **Step 1: `addMinutesToClock` in `displayData.js`**

```js
// Adds minutes to an 'HH:MM' string. Needed only because an override has no date: the
// epoch arithmetic in toClock cannot be applied to a bare clock time, and קבלת שבת has to
// be derivable from a הדלקת נרות the gabbai typed rather than one Hebcal sent.
//
// Wraps at midnight rather than rendering '24:05' for 23:50 + 15.
export function addMinutesToClock(clock, minutes) {
  if (typeof clock !== 'string') return null;
  const m = clock.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const total = ((Number(m[1]) * 60 + Number(m[2]) + minutes) % 1440 + 1440) % 1440;
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}
```

- [ ] **Step 2: `resolveShabbatTimes` takes overrides**

```js
export function resolveShabbatTimes(
  { candles, havdalah, saturdaySunset } = {},
  config = SHABBAT_CONFIG,
  overrides = {}
) {
  const summer = isSummerTime(candles || saturdaySunset || havdalah);
  const season = summer === null ? null : summer ? 'summer' : 'winter';
  // An override is not a derivation, so it does not need the season, Hebcal, or anything
  // else to have worked. `pin` therefore short-circuits before every automatic branch —
  // including the three that blank when the season is undetermined.
  const pin = (key, auto) => overrides[key] || auto;

  // Resolved first: קבלת שבת derives from whatever הדלקת נרות ACTUALLY says. Deriving it
  // from Hebcal's timestamp while the row above showed the gabbai's number would put two
  // contradicting times side by side.
  const shabCandles = pin('candles', toClock(candles));

  return {
    shabCandles,
    shabKabbalat: pin(
      'kabbalat',
      season && shabCandles ? addMinutesToClock(shabCandles, config.kabbalatAfterCandlesMin[season]) : null
    ),
    shabShacharit: pin('shacharit', season ? config.shacharit[season] : null),
    shabMincha: pin('mincha', toClock(saturdaySunset, -config.minchaBeforeSunsetMin)),
    shabArvit: pin('arvit', arvitTime(season, { havdalah, saturdaySunset }, config)),
  };
}
```

Update the function's existing comment: any missing anchor still yields null → `--:--`, but a pinned row is immune to that.

- [ ] **Step 3: Delete `TICKER`**

Remove the `export const TICKER = '…'` block from `displayData.js` and the sentence in the comment above it that says it "stays static for now".

- [ ] **Step 4: `useDisplayContent` carries the ticker**

Add `ticker: []` to `EMPTY`. Nothing else changes — `activeOnly` derives its panel list from `EMPTY`'s keys, so the isActive filter applies for free.

- [ ] **Step 5: `useDisplayModel` passes both through**

Destructure `ticker` and `settings` from the content hook (`settings` is not filtered by `activeOnly`; read it off the raw document — add it to the hook's return in `useDisplayContent` as a passthrough, defaulting to `{ shabbat: {} }` so an old cached document cannot throw).

Then:

```js
setShabbatTimes(
  resolveShabbatTimes(
    { ...shabbatAnchors(value(p), saturday), saturdaySunset: value(zSat)?.times?.sunset },
    SHABBAT_CONFIG,
    shabbatOverrides
  )
);
```

`shabbatOverrides` comes from content, which polls every 30s while the zmanim effect refreshes every 6 hours. The effect must therefore re-run when the overrides change — add them to its dependency array, and keep the existing `cancelled` guard so an in-flight fetch cannot write back over a newer one.

Return `ticker` from the hook.

- [ ] **Step 6: `Ticker.jsx` takes items**

```jsx
const Ticker = ({ items }) => {
  if (!items.length) return null;
  const text = `${items.map((it) => it.text).join('  •  ')}  •  `;
  return ( /* unchanged markup, rendering {text + text} */ );
};
```

Keep the doubling and the existing comment about why it is doubled.

- [ ] **Step 7: `TickerLines.jsx` takes items**

```jsx
const TickerLines = ({ items }) => {
  if (!items.length) return null;
  return (
    <div style={{ textAlign: 'center', fontSize: '13px', color: COLORS.dim, lineHeight: 1.6, padding: '6px 10px 0' }}>
      {items.map((it) => (<div key={it.id}>{it.text}</div>))}
    </div>
  );
};
```

The `split('•')` goes away entirely; keying by `it.id` replaces keying by text, so two identical lines no longer collide.

- [ ] **Step 8: Both pages pass `items`**

`SynagogueDisplay.jsx`: `<Ticker items={ticker} />`, and drop the `TICKER` import.
`MobileDisplay.jsx`: `<TickerLines items={ticker} />`, and drop the `TICKER` import.

- [ ] **Step 9: Lint, build, commit**

```bash
npm --prefix client run lint && npm --prefix client run build
git add client/src
git commit -m "feat: read the ticker and the Shabbat overrides from the API"
```

---

### Task 3: The admin screens

**Files:**
- Modify: `client/src/pages/Admin/panelMeta.js`
- Create: `client/src/pages/Admin/ShabbatTimesForm.jsx`
- Modify: `client/src/pages/Admin/AdminHome.jsx`
- Modify: `client/src/services/content.js`
- Modify: `client/src/App.jsx`

**Interfaces:**
- Produces:
  - `PANEL_META.ticker`
  - `getSettings()` / `updateSettings(data)` in `services/content.js`
  - `ShabbatTimesForm` — default export, the `/adminGabbai/settings` screen

- [ ] **Step 1: `panelMeta.js` — the ticker entry**

```js
  ticker: {
    title: 'פס תחתון',
    icon: '📜',
    addLabel: 'הוסף שורה',
    emptyLabel: 'אין שורות בפס',
    fields: [{ key: 'text', label: 'תוכן השורה', type: 'text', required: true }],
    summary: (item) => item.text,
    sub: () => '',
  },
```

- [ ] **Step 2: `services/content.js` — the two calls**

```js
export const getSettings = () => api.get('/content/settings').then((res) => res.data);
export const updateSettings = (data) => api.put('/content/settings', data).then((res) => res.data);
```

- [ ] **Step 3: `ShabbatTimesForm.jsx`**

Five `type="time"` inputs over one save button, styled from `adminStyles.js` exactly as `ItemForm` is. The row definitions:

```js
const ROWS = [
  { key: 'candles', label: 'הדלקת נרות', auto: 'shabCandles' },
  { key: 'kabbalat', label: 'מנחה וקבלת שבת', auto: 'shabKabbalat' },
  { key: 'shacharit', label: 'שחרית', auto: 'shabShacharit' },
  { key: 'mincha', label: 'מנחה', auto: 'shabMincha' },
  { key: 'arvit', label: 'ערבית מוצ״ש', auto: 'shabArvit' },
];
```

On mount, fetch the settings **and**, in parallel, the automatic values — `getParasha` plus `getZmanim(upcomingSaturday(new Date()))`, fed through `shabbatAnchors` and `resolveShabbatTimes` with no overrides. The result is the placeholder: `אוטומטי · 18:13`, falling back to plain `אוטומטי` when Hebcal is unreachable, so a network failure costs the hint and not the screen.

Use `Promise.allSettled`, matching `useDisplayModel`: the settings request and the Hebcal request are independent, and the form must open even if Hebcal is down.

Include a line of help text under the heading: `שדה ריק = חישוב אוטומטי`.

Saving posts all five keys. Empty inputs send `''`. On a 400, show the per-field Hebrew errors the server returns, exactly as `ItemForm` does; on anything else show `השמירה נכשלה — בדוק את החיבור לשרת`.

- [ ] **Step 4: `AdminHome.jsx` — link the settings screen**

`PANEL_KEYS` picks up `ticker` automatically from `PANEL_META`. Add a separate `<Link to="/adminGabbai/settings">` row below the panel list, labelled `זמני שבת` with a `🕯` icon and no count.

- [ ] **Step 5: `App.jsx` — route it**

```jsx
<Route path="/adminGabbai/settings" element={<ShabbatTimesForm />} />
```

React Router ranks static segments above dynamic ones, so this wins over `/adminGabbai/:panel` regardless of declaration order — but declare it above anyway, so a reader does not have to know that.

- [ ] **Step 6: Lint, build, commit**

```bash
npm --prefix client run lint && npm --prefix client run build
git add client/src
git commit -m "feat: edit the ticker and the Shabbat times from the admin panel"
```

---

### Task 4: End-to-end verification

**Files:** none — this task produces evidence.

- [ ] **Step 1: Server tests**

Run: `npm --prefix server test`. All must pass.

- [ ] **Step 2: The upgrade path, for real**

Back up `server/data/content.json`. Remove its `ticker` and `settings` keys by hand, restart the server, and confirm the wall still shows all four ticker lines and no `content.json.corrupt-*` file was created. Restore the backup afterwards.

This repeats a unit test against the actual data file on purpose: the test proves the store's logic, this proves the file on disk goes through it.

- [ ] **Step 3: An override reaches both layouts**

In `/adminGabbai/settings`, set מנחה to `18:00`. Confirm the שבת prayer card shows `18:00` on the phone layout and on the wall, and that "המניין הבא" counts to it when it is next.

- [ ] **Step 4: קבלת שבת follows an overridden הדלקת נרות**

Set הדלקת נרות to `18:00` and leave קבלת שבת blank. Confirm קבלת שבת reads `18:02` in summer (or `18:05` in winter) — derived from the typed value, not from Hebcal's.

- [ ] **Step 5: Clearing restores automatic**

Empty both fields, save, and confirm the rows return to their computed values.

- [ ] **Step 6: The ticker round-trips**

Add a line in `/adminGabbai/ticker`, confirm it appears in the wall marquee and as a new line in the phone footer. Hide it, confirm it leaves both.

- [ ] **Step 7: Report**

State what was verified and what could not be.

---

## Self-review

**Spec coverage.** Ticker as a list panel → Task 1 Step 3, Task 3 Step 1. Settings record
and endpoints → Task 1 Steps 3, 6, 7. Route ordering → Task 1 Step 7. Backfill of absent
vs empty → Task 1 Step 5, tested in Step 1, re-checked on real data in Task 4 Step 2. All
five rows overridable → Task 2 Step 2. `kabbalat` chaining off the effective candles →
Task 2 Steps 1–2, verified Task 4 Step 4. Override surviving an unknown season → the `pin`
helper, Task 2 Step 2. Placeholder showing the automatic value → Task 3 Step 3. Wall joins
/ phone lists / empty hides → Task 2 Steps 6–8. `TICKER` deleted → Task 2 Step 3.

**Gap found and closed.** Task 2 Step 5 originally passed the overrides into an effect that
only re-runs every 6 hours, so a saved override would not have appeared until the next
zmanim refresh. The dependency array is now called out explicitly.

**Type consistency.** `overrides` is keyed by the five short names (`candles`, `kabbalat`,
`shacharit`, `mincha`, `arvit`) everywhere — `SHABBAT_SETTING_KEYS` in `panels.js`, the
`pin` calls in `resolveShabbatTimes`, and `ROWS[].key` in the form. The *output* keys stay
the existing `shab*` names, which is why `ROWS` carries a separate `auto` field to read the
computed map. Ticker items are `{ id, text, isActive }` in the seed, the panel schema, and
both renderers.
