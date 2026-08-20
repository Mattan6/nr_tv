# ראש השנה board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a ראש השנה wall board on `/tv?screen=rosh` whose every value is gabbai-editable, whose three calendar-fixed times come live from Hebcal for Nitzan, and restructure `/adminGabbai` so it can hold this board and the five חג boards coming after it.

**Architecture:** Five new flat panel keys ride the existing `PANELS` → one controller → one pair of admin screens machinery; a `settings.rosh` override group sits beside `settings.shabbat` under a group-aware validator; the board is its own page + its own model hook built from the existing Israel-time helpers; the admin gains a board dimension as a client-side registry the server knows nothing about.

**Tech Stack:** Node 18+ / Express / a JSON file store (no DB); React 18 + Vite + react-router-dom v6; `node --test` on both sides; Hebcal REST for zmanim.

**Spec:** `docs/superpowers/specs/2026-08-20-rosh-hashanah-board-design.md`

## Global Constraints

- **Never add the new keys to `PANEL_ARRAY_KEYS`** in `server/src/store/contentStore.js`. They go in `BACKFILL_KEYS`. The other way round condemns every existing `content.json` as wrong-shaped and serves seed data over the shul's live content.
- **All Hebrew is written with the `Write`/`Edit` tools, never through a Bash heredoc or a Bash argument.** Git Bash mangles Hebrew on this machine and has already corrupted a `content.json` and a source comment once.
- **Timezone-sensitive checks must be run from PowerShell** (`$env:TZ='Pacific/Auckland'; node --test`). Git Bash does not propagate `TZ` to `node.exe` here, so the check passes without testing anything.
- **Israel's clock, never the device's.** Anything asking "what time/day is it" goes through `israelParts` from `client/src/components/display/displayData.js`.
- **Local-noon Dates carry Israel's calendar fields.** Read them with *local* getters (`getFullYear`, `getDay`) and format them **without** a `timeZone` option. Adding `timeZone: 'Asia/Jerusalem'` to a formatter fed one of these Dates can shift it a day. `toClock` is the opposite case — it takes a real ISO instant and *must* format in Jerusalem.
- **Hebcal request for holidays carries no `lg=he`.** Its `title` is the field the matcher keys on and must stay a stable English identifier.
- **Row kinds:** `regular` · `shiur` · `shofar` · `tashlich` · `piyut` · `mechirot`. **Mechira days:** `day1` · `day2`. **Mechira kinds:** `auction` · `general`.
- **Seed ids are fixed readable strings**, never `randomUUID`, so the file stays diff-able and tests stay deterministic.
- Board palette, from the mockup: pomegranate `#7d2233`, deep pomegranate `#5a1522`, gold `#b0873f`, light gold `#e0be7c`, cream page `#f6efe0`, ink `#3a352c`, muted ink `#6b6553`. Fonts `'Assistant', sans-serif` and `'Frank Ruhl Libre', serif`.

---

## File Structure

**Server**

| file | responsibility |
|---|---|
| `server/src/store/panels.js` | *modify* — extract `DEDICATION_FIELDS`; add `ROW_KINDS`, `ROSH_ROW_FIELDS` and five panels; add `values` enum support to `validateItem`; make `validateSettings` group-aware |
| `server/src/store/defaultContent.js` | *modify* — five seed arrays + `settings.rosh` |
| `server/src/store/contentStore.js` | *modify* — five keys into `BACKFILL_KEYS` |
| `server/src/controllers/contentController.js` | *modify* — merge settings groups; add `reorderPanel` |
| `server/src/routes/content.js` | *modify* — `PUT /:panel/order` **above** `PUT /:panel/:id` |

**Client — data**

| file | responsibility |
|---|---|
| `client/src/services/hebcal.js` | *modify* — `getHolidayCalendar(from, days)` |
| `client/src/components/display/displayData.js` | *modify* — export `localYmd` (one definition of a calendar-date string) |
| `client/src/components/rosh/roshData.js` | *create* — the board's pure functions |
| `client/src/hooks/useDisplayContent.js` | *modify* — five keys into `EMPTY_LISTS`; carry both settings groups |
| `client/src/hooks/useRoshModel.js` | *create* — the board's model |
| `client/src/services/content.js` | *modify* — `reorderPanel` |

**Client — board**

| file | responsibility |
|---|---|
| `client/src/components/rosh/roshStyle.js` | palette, shared card style, keyframes |
| `client/src/components/rosh/icons.jsx` | shofar, wreath divider, the eight simanim |
| `client/src/components/rosh/Masthead.jsx` | date/clock/greeting band |
| `client/src/components/rosh/HighlightStrip.jsx` | הקדשה · תקיעת שופר · תשליך |
| `client/src/components/rosh/DayListCard.jsx` | one day's rows; mounted twice |
| `client/src/components/rosh/CandlesCard.jsx` | the three calendar times |
| `client/src/components/rosh/MechirotCard.jsx` | paged מכירת מצוות + dot strip |
| `client/src/components/rosh/SimanimStrip.jsx` | the eight simanim, fixed |
| `client/src/components/rosh/RoshTicker.jsx` | bottom marquee |
| `client/src/pages/RoshDisplay.jsx` | the 1920x1080 canvas |
| `client/src/pages/TvDisplay.jsx` | *modify* — accept `?screen=rosh` |

**Client — admin**

| file | responsibility |
|---|---|
| `client/src/pages/Admin/boards.js` | *create* — the board registry + `boardOfPanel` |
| `client/src/pages/Admin/timesMeta.js` | *create* — one descriptor per settings group |
| `client/src/pages/Admin/BoardPanels.jsx` | *create* — one board's panel list |
| `client/src/pages/Admin/AdminHome.jsx` | *modify* — lists boards |
| `client/src/pages/Admin/TimesForm.jsx` | *create* — generalised from `ShabbatTimesForm.jsx`, which is deleted |
| `client/src/pages/Admin/panelMeta.js` | *modify* — five entries + `options` on select fields |
| `client/src/pages/Admin/ItemForm.jsx` | *modify* — `select` branch |
| `client/src/pages/Admin/PanelList.jsx` | *modify* — reorder buttons, board-aware back link |
| `client/src/App.jsx` | *modify* — board and settings routes |

**Tests**

`server/test/panels.test.js` · `server/test/contentStore.test.js` · `server/test/contentApi.test.js` · `client/test/roshData.test.js` · `client/test/fixtures/hebcal-rosh-hashanah.js`

---

## Task 1: Panel schemas and enum validation

**Files:**
- Modify: `server/src/store/panels.js`
- Test: `server/test/panels.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `PANEL_KEYS` gains `roshDay1`, `roshDay2`, `roshMechirot`, `roshDedication`, `roshTicker` in that order, after `ticker`. `validateItem(panel, body)` keeps its `{fields}|{errors}` contract and now enforces `rule.values`.

- [ ] **Step 1: Read the existing test's first assertion**

Run: `sed -n '1,40p' server/test/panels.test.js`

It asserts the exact `PANEL_KEYS` array and will fail until Step 3 updates it. Note the exact style it is written in and match it.

- [ ] **Step 2: Write the failing tests**

Append to `server/test/panels.test.js` (use the file's existing `test`/`assert` imports):

```js
test('rosh day panels accept a row with no time and no chazan', () => {
  const { fields, errors } = validateItem('roshDay1', { name: 'מוסף', time: '', chazan: '', kind: 'regular' });
  assert.equal(errors, undefined);
  assert.deepEqual(fields, { name: 'מוסף', time: '', chazan: '', kind: 'regular' });
});

test('rosh day panels still reject a malformed time when one is given', () => {
  const { errors } = validateItem('roshDay1', { name: 'שחרית', time: '25:00' });
  assert.ok(errors.time);
});

test('rosh day panels reject a kind outside the enum', () => {
  const { errors } = validateItem('roshDay2', { name: 'שחרית', kind: 'confetti' });
  assert.equal(errors.kind, 'ערך לא תקין');
});

test('a blank kind is allowed and stored blank', () => {
  const { fields, errors } = validateItem('roshDay2', { name: 'שחרית', kind: '' });
  assert.equal(errors, undefined);
  assert.equal(fields.kind, '');
});

test('mechirot validates both of its enums', () => {
  assert.ok(validateItem('roshMechirot', { label: 'פרנסה', day: 'day3', kind: 'auction' }).errors.day);
  assert.ok(validateItem('roshMechirot', { label: 'פרנסה', day: 'day1', kind: 'raffle' }).errors.kind);
  assert.equal(validateItem('roshMechirot', { label: 'פרנסה', day: 'day1', kind: 'general' }).errors, undefined);
});

test('roshDedication takes the same three fields as dedication', () => {
  const { fields } = validateItem('roshDedication', { lead: 'מוקדש להצלחת', names: 'משפחת מזוז' });
  assert.deepEqual(fields, { lead: 'מוקדש להצלחת', names: 'משפחת מזוז', note: '' });
});
```

And update the existing `PANEL_KEYS` assertion to:

```js
assert.deepEqual(PANEL_KEYS, [
  'announcements', 'shiurim', 'shiurimShabbat', 'mazal', 'azkarot',
  'dedication', 'ticker',
  'roshDay1', 'roshDay2', 'roshMechirot', 'roshDedication', 'roshTicker',
]);
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm --prefix server test`
Expected: FAIL — `PANEL_KEYS` mismatch, and the rosh panels 404 out of `validateItem` (`PANELS[panel]` is `undefined`).

- [ ] **Step 4: Implement**

In `server/src/store/panels.js`, above `const PANELS`:

```js
// The row kinds a ראש השנה prayer row may carry. The mockup decided this by running four
// regexes over the row's Hebrew name; that breaks silently the first time the gabbai writes
// תקיעות שופר instead of תקיעת שופר — and takes the שופר card down with it, because the same
// regex is what finds the row the card counts down to.
//
// `piyut` and `tashlich` render identically (the blue treatment). They are separate values
// anyway because only one of them feeds a card: עת שערי רצון must not be picked up as תשליך.
// Appearance and meaning were fused in the mockup; this is where they come apart.
const ROW_KINDS = ['regular', 'shiur', 'shofar', 'tashlich', 'piyut', 'mechirot'];

const MECHIRA_DAYS = ['day1', 'day2'];
const MECHIRA_KINDS = ['auction', 'general'];

// Lifted out of the `dedication` entry below so הקדשת לוח השבת and הקדשת לוח החג share one
// definition. Same reasoning as SHIUR_FIELDS: one controller and one pair of screens serve
// both, so a field that differed between them could only ever be a bug.
const DEDICATION_FIELDS = {
  lead: { required: true },
  names: { required: true },
  note: { required: false },
};

// One schema, mounted as the two day panels.
//
// `time` is optional, and that is load-bearing rather than lax: four rows on the board carry
// no time at all — ערבית ליל החג, עת שערי רצון and מוסף — because they follow whatever came
// before them and the shul posts no minute for them. Only a NON-EMPTY time has to look like
// a time, which is exactly what the optional branch of validateItem already does.
//
// `chazan` is the row's detail line and carries different things in different rows: the חזן on
// a תפילה row, the מגיד שיעור on a שיעור, the גבאי on מכירת מצוות, and the location on תשליך.
const ROSH_ROW_FIELDS = {
  name: { required: true },
  time: { required: false, pattern: TIME_RE, message: 'שעה חייבת להיות בפורמט 06:45' },
  chazan: { required: false },
  kind: { required: false, values: ROW_KINDS },
};
```

Replace the inline `dedication` schema with `dedication: DEDICATION_FIELDS,` and append after `ticker`:

```js
  // ראש השנה. Two day panels rather than one list with a day column, for the reason
  // shiurim/shiurimShabbat already settled: the gabbai edits *the יום ב׳ list*, not *a row
  // with a day flag* — and twenty-one rows in one phone-sized list is not an editable screen.
  roshDay1: ROSH_ROW_FIELDS,
  roshDay2: ROSH_ROW_FIELDS,
  roshMechirot: {
    label: { required: true },
    // Stores day1/day2 only. The mockup's `· שבת` / `· ראשון` suffixes are composed at render
    // from the Hebcal anchors, so the heading is right in 5788 rather than frozen at שבת.
    day: { required: false, values: MECHIRA_DAYS },
    kind: { required: false, values: MECHIRA_KINDS },
  },
  // A חג dedication is bought separately from a שבת one — the board's own footer says so — so
  // a shared list would put the שבת dedicator's name on the חג board.
  roshDedication: DEDICATION_FIELDS,
  // Its own ticker. The חול and שבת boards keep sharing `ticker` above; splitting that was not
  // asked for and would either blank a live board or double every line into two lists.
  roshTicker: {
    text: { required: true },
  },
```

In `validateItem`, immediately after the `rule.pattern` check:

```js
    if (rule.values && !rule.values.includes(value)) {
      errors[key] = 'ערך לא תקין';
      continue;
    }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/store/panels.js server/test/panels.test.js
git commit -m "feat(rosh): add the five ראש השנה panel schemas and enum field validation"
```

---

## Task 2: Group-aware settings

**Files:**
- Modify: `server/src/store/panels.js`, `server/src/controllers/contentController.js`
- Test: `server/test/contentApi.test.js`

**Interfaces:**
- Consumes: Task 1's `panels.js`.
- Produces: `ROSH_SETTING_KEYS = ['candles1','candles2','havdalah']`, exported. `validateSettings(body)` returns `{settings}` containing **only the groups present in `body`**, or `{errors}` keyed by the flat setting key. `PUT /content/settings` merges group-wise over the stored record.

- [ ] **Step 1: Read the existing settings tests**

Run: `grep -n "settings" server/test/contentApi.test.js`

If any test asserts that a body without `shabbat` clears the stored `shabbat`, it is asserting the old whole-document semantics and must be rewritten to the group semantics below. Note it now.

- [ ] **Step 2: Write the failing tests**

Append to `server/test/contentApi.test.js`, in the style of the file's existing API tests:

```js
test('a settings PUT carrying only shabbat leaves rosh untouched', async () => {
  await put('/api/content/settings', { rosh: { candles1: '18:32', candles2: '', havdalah: '19:27' } });
  await put('/api/content/settings', { shabbat: { candles: '18:00', kabbalat: '', shacharit: '', mincha: '', arvit: '' } });

  const { body } = await get('/api/content/settings');
  assert.equal(body.shabbat.candles, '18:00');
  assert.equal(body.rosh.candles1, '18:32');
  assert.equal(body.rosh.havdalah, '19:27');
});

test('a settings PUT carrying only rosh leaves shabbat untouched', async () => {
  await put('/api/content/settings', { shabbat: { candles: '18:00', kabbalat: '', shacharit: '', mincha: '', arvit: '' } });
  await put('/api/content/settings', { rosh: { candles1: '', candles2: '', havdalah: '' } });

  const { body } = await get('/api/content/settings');
  assert.equal(body.shabbat.candles, '18:00');
  assert.equal(body.rosh.candles1, '');
});

test('within a group a blank clears a pinned time', async () => {
  await put('/api/content/settings', { rosh: { candles1: '18:32', candles2: '19:28', havdalah: '19:27' } });
  await put('/api/content/settings', { rosh: { candles1: '', candles2: '19:28', havdalah: '19:27' } });

  const { body } = await get('/api/content/settings');
  assert.equal(body.rosh.candles1, '');
  assert.equal(body.rosh.candles2, '19:28');
});

test('a malformed rosh time is a 400 and writes nothing', async () => {
  await put('/api/content/settings', { rosh: { candles1: '18:32', candles2: '', havdalah: '' } });
  const bad = await put('/api/content/settings', { rosh: { candles1: '6pm', candles2: '', havdalah: '' } });

  assert.equal(bad.status, 400);
  assert.ok(bad.body.errors.candles1);
  const { body } = await get('/api/content/settings');
  assert.equal(body.rosh.candles1, '18:32');
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npm --prefix server test`
Expected: FAIL — `body.rosh` is `undefined`.

- [ ] **Step 4: Implement the validator**

In `server/src/store/panels.js`, replace `validateSettings` and its `SHABBAT_SETTING_KEYS` neighbourhood:

```js
// The five שבת rows and the three ראש השנה rows the gabbai may pin to a fixed time. Blank
// means "leave it automatic" — the display computes that row from the zmanim instead.
const SHABBAT_SETTING_KEYS = ['candles', 'kabbalat', 'shacharit', 'mincha', 'arvit'];
const ROSH_SETTING_KEYS = ['candles1', 'candles2', 'havdalah'];

const SETTING_GROUPS = {
  shabbat: SHABBAT_SETTING_KEYS,
  rosh: ROSH_SETTING_KEYS,
};

// Deliberately NOT expressed through PANELS/validateItem. That machinery is built around
// `required`, whose whole job is to reject a blank — and here a blank is the single most
// important valid value there is, because clearing a field is how an override is removed.
//
// Returns { settings } or { errors }, never both.
//
// THE GROUP IS THE UNIT OF REPLACEMENT, and the asymmetry is the point:
//
//   within a group  every key is written whether or not the body carried it, so a partial
//                   PUT cannot leave a group half-shaped and a blank really does clear a pin;
//   across groups   only the groups the body carried come back, and the controller merges
//                   them over what is stored.
//
// Without the second half, every save on the זמני שבת screen would silently blank the חג
// overrides — that form posts `{shabbat: …}` and nothing else, and a validator that always
// emitted both groups would write a fresh empty `rosh` beside it.
//
// An unknown group is dropped rather than persisted, as an unknown field key already is.
function validateSettings(body) {
  const settings = {};
  const errors = {};

  for (const [group, keys] of Object.entries(SETTING_GROUPS)) {
    const source = body != null && typeof body[group] === 'object' && body[group] !== null ? body[group] : null;
    if (!source) continue;

    const values = {};
    for (const key of keys) {
      const raw = source[key];
      const value = typeof raw === 'string' ? raw.trim() : '';

      if (!value) {
        values[key] = '';
        continue;
      }
      if (!TIME_RE.test(value)) {
        errors[key] = 'שעה חייבת להיות בפורמט 18:00';
        continue;
      }
      values[key] = value;
    }
    settings[group] = values;
  }

  return Object.keys(errors).length ? { errors } : { settings };
}
```

Export `ROSH_SETTING_KEYS` and `SETTING_GROUPS` alongside `SHABBAT_SETTING_KEYS`.

- [ ] **Step 5: Implement the merge**

Run `grep -n "updateSettings\|getSettings" -A 12 server/src/controllers/contentController.js` and change the mutator so the validated groups are merged over the stored record rather than replacing it:

```js
const updateSettings = handler(async (req, res) => {
  const { settings, errors } = validateSettings(req.body);
  if (errors) return res.status(400).json({ message: 'שדות לא תקינים', errors });

  // Spread, not assignment: `settings` holds only the groups this request carried, and a save
  // from one times screen must not blank another's. See validateSettings.
  const updated = await contentStore.update((draft) => {
    draft.settings = { ...draft.settings, ...settings };
    return draft.settings;
  });
  res.json(updated);
});
```

- [ ] **Step 6: Run to verify they pass**

Run: `npm --prefix server test`
Expected: PASS. If an old test asserted whole-document replacement, rewrite it per Step 1.

- [ ] **Step 7: Commit**

```bash
git add server/src/store/panels.js server/src/controllers/contentController.js server/test/contentApi.test.js
git commit -m "feat(rosh): make settings group-aware so two times screens cannot blank each other"
```

---

## Task 3: Seed data and backfill

**Files:**
- Modify: `server/src/store/defaultContent.js`, `server/src/store/contentStore.js`
- Test: `server/test/contentStore.test.js`

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces: `DEFAULT_CONTENT.roshDay1` (11 items), `.roshDay2` (10), `.roshMechirot` (18), `.roshDedication` (1), `.roshTicker` (5), `.settings.rosh`. Item shape `{id, name, time, chazan, kind, isActive}` for the day panels, `{id, label, day, kind, isActive}` for mechirot.

- [ ] **Step 1: Write the failing tests**

Append to `server/test/contentStore.test.js`:

```js
test('a document written before ראש השנה existed gains all five panels', async () => {
  const dir = await tempDir();
  await fs.writeFile(path.join(dir, 'content.json'), JSON.stringify({
    version: 1, announcements: [], shiurim: [], mazal: [], azkarot: [],
  }));

  const doc = await createContentStore(dir).read();
  assert.equal(doc.roshDay1.length, 11);
  assert.equal(doc.roshDay2.length, 10);
  assert.equal(doc.roshMechirot.length, 18);
  assert.equal(doc.roshDedication.length, 1);
  assert.equal(doc.roshTicker.length, 5);
  assert.deepEqual(doc.settings.rosh, { candles1: '', candles2: '', havdalah: '' });
});

test('a roshTicker the gabbai emptied stays empty', async () => {
  const dir = await tempDir();
  await fs.writeFile(path.join(dir, 'content.json'), JSON.stringify({
    version: 1, announcements: [], shiurim: [], mazal: [], azkarot: [], roshTicker: [],
  }));

  const doc = await createContentStore(dir).read();
  assert.equal(doc.roshTicker.length, 0);
});

test('the שופר row is the only row seeded with kind shofar', async () => {
  const doc = await createContentStore(await tempDir()).read();
  const shofar = [...doc.roshDay1, ...doc.roshDay2].filter((r) => r.kind === 'shofar');
  assert.equal(shofar.length, 1);
  assert.equal(shofar[0].time, '09:45');
});
```

Reuse whatever `tempDir` helper the file already has; if it names it differently, match that.

- [ ] **Step 2: Run to verify they fail**

Run: `npm --prefix server test`
Expected: FAIL — `doc.roshDay1` is `undefined`.

- [ ] **Step 3: Add the seeds**

In `server/src/store/defaultContent.js`, after `ticker` and before `settings`. **Write this with the `Write`/`Edit` tool, never a heredoc.**

```js
  // ראש השנה. Seeded with the shul's real content rather than left empty, which is the
  // opposite of what shiurimShabbat and dedication do — and the difference is where the
  // content came from. Those two are empty because there is no honest value to INVENT: a
  // seeded dedication is a stranger's family name on someone's wall. These rows were written
  // and corrected by the gabbai himself in the board's mockup, so they are this shul's own
  // schedule, not sample text. Every one of them is editable in /adminGabbai.
  //
  // `time` is blank on the rows the shul posts no minute for; they follow the row above.
  roshDay1: [
    { id: 'seed-r1-1', name: 'מנחה ערב חג', time: '18:35', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r1-2', name: 'דבר תורה', time: '18:50', chazan: 'יצחק כהן שליט״א', kind: 'shiur', isActive: true },
    { id: 'seed-r1-3', name: 'מכירת מצוות', time: '19:00', chazan: 'הגבאי ר׳ ברוך מזוז', kind: 'mechirot', isActive: true },
    { id: 'seed-r1-4', name: 'ערבית ליל החג', time: '', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r1-5', name: 'שיעור', time: '06:45', chazan: 'ר׳ אפרים עבדיאן שליט״א', kind: 'shiur', isActive: true },
    { id: 'seed-r1-6', name: 'שחרית', time: '07:30', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r1-7', name: 'עת שערי רצון', time: '', chazan: '', kind: 'piyut', isActive: true },
    { id: 'seed-r1-8', name: 'מוסף', time: '', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r1-9', name: 'שיעור', time: '15:20', chazan: 'ר׳ אפרים עבדיאן שליט״א', kind: 'shiur', isActive: true },
    { id: 'seed-r1-10', name: 'מנחה', time: '16:20', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r1-11', name: 'תשליך', time: '17:00', chazan: 'בבית משפחת רחמין', kind: 'tashlich', isActive: true },
  ],
  roshDay2: [
    { id: 'seed-r2-1', name: 'מכירת מצוות', time: '19:15', chazan: 'הגבאי ר׳ ברוך מזוז', kind: 'mechirot', isActive: true },
    { id: 'seed-r2-2', name: 'ערבית ליל החג', time: '', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r2-3', name: 'שיעור', time: '06:20', chazan: 'ר׳ אפרים עבדיאן שליט״א', kind: 'shiur', isActive: true },
    { id: 'seed-r2-4', name: 'שחרית', time: '07:00', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r2-5', name: 'עת שערי רצון', time: '', chazan: '', kind: 'piyut', isActive: true },
    { id: 'seed-r2-6', name: 'תקיעת שופר', time: '09:45', chazan: 'הבעל תוקע ישובץ בהמשך', kind: 'shofar', isActive: true },
    { id: 'seed-r2-7', name: 'מוסף', time: '', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r2-8', name: 'שיעור', time: '17:20', chazan: 'ר׳ אפרים עבדיאן שליט״א', kind: 'shiur', isActive: true },
    { id: 'seed-r2-9', name: 'מנחה', time: '18:30', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
    { id: 'seed-r2-10', name: 'ערבית מוצאי חג', time: '19:07', chazan: 'החזן ישובץ בהמשך', kind: 'regular', isActive: true },
  ],
  // Ten items on day one and eight on day two, paged four to a screen by mechirotPages.
  roshMechirot: [
    { id: 'seed-rm-1', label: 'ברכת השנה', day: 'day1', kind: 'general', isActive: true },
    { id: 'seed-rm-2', label: 'פרנסה', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-3', label: 'פתיחת היכל', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-4', label: 'הולכה והגבהה', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-5', label: 'עלייה · שלישי', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-6', label: 'עלייה · רביעי', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-7', label: 'עלייה · חמישי', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-8', label: 'עלייה · שישי', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-9', label: 'עלייה · שביעי', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-10', label: 'עלייה · מפטיר', day: 'day1', kind: 'auction', isActive: true },
    { id: 'seed-rm-11', label: 'ברכת השנה', day: 'day2', kind: 'general', isActive: true },
    { id: 'seed-rm-12', label: 'פרנסה', day: 'day2', kind: 'auction', isActive: true },
    { id: 'seed-rm-13', label: 'פתיחת היכל', day: 'day2', kind: 'auction', isActive: true },
    { id: 'seed-rm-14', label: 'הולכה והגבהה', day: 'day2', kind: 'auction', isActive: true },
    { id: 'seed-rm-15', label: 'עלייה · שלישי', day: 'day2', kind: 'auction', isActive: true },
    { id: 'seed-rm-16', label: 'עלייה · רביעי', day: 'day2', kind: 'auction', isActive: true },
    { id: 'seed-rm-17', label: 'עלייה · חמישי', day: 'day2', kind: 'auction', isActive: true },
    { id: 'seed-rm-18', label: 'עלייה · מפטיר', day: 'day2', kind: 'auction', isActive: true },
  ],
  // A list, so a second and third dedication need no code — which is what was asked for. The
  // niqqud is the board's typography; the gabbai may type with it or without.
  roshDedication: [
    { id: 'seed-rd-1', lead: 'מֻקְדָּשׁ לְהַצְלָחַת', names: 'מִשְׁפַּחַת מַזּוּז', note: 'בְּכָל הָעִנְיָנִים', isActive: true },
  ],
  roshTicker: [
    { id: 'seed-rt-1', text: 'שנה טובה ומבורכת לכל בית ישראל', isActive: true },
    { id: 'seed-rt-2', text: 'כתיבה וחתימה טובה לכל קהל בית הכנסת ובני משפחותיהם', isActive: true },
    { id: 'seed-rt-3', text: 'בליל יום שני מדליקים נרות מאש קיימת בלבד ומברכים שהחיינו על פרי חדש', isActive: true },
    { id: 'seed-rt-4', text: 'לוח ראש השנה מוקדש להצלחת משפחת מזוז בכל העניינים', isActive: true },
    { id: 'seed-rt-5', text: 'רוצים להקדיש את הלוחות הבאים? חג או שבת — פנו לגבאי', isActive: true },
  ],
```

And in the `settings` object, beside `shabbat`:

```js
    // Blank, so all three come from Hebcal for Nitzan. A live request returns exactly the
    // 18:32 / 19:28 / 19:27 the mockup shows, so seeding them would buy nothing and would pin
    // 5787's numbers onto every year after it.
    rosh: { candles1: '', candles2: '', havdalah: '' },
```

- [ ] **Step 4: Add the backfill keys**

In `server/src/store/contentStore.js`, extend `BACKFILL_KEYS` and its comment:

```js
const BACKFILL_KEYS = [
  'ticker', 'settings', 'shiurimShabbat', 'dedication',
  // ראש השנה. In BACKFILL_KEYS and NOT in PANEL_ARRAY_KEYS above, like every key added after
  // the first release: the shul's live content.json predates all five, and putting them in the
  // shape check would condemn it as wrong-shaped and serve the seed over real announcements.
  //
  // Unlike shiurimShabbat and dedication, these seed NON-empty — see defaultContent.js for
  // why that is not a contradiction. The absent/empty distinction still holds: a file that
  // predates the feature is filled from the seed, and a roshTicker the gabbai emptied on
  // purpose is left alone.
  'roshDay1', 'roshDay2', 'roshMechirot', 'roshDedication', 'roshTicker',
];
```

`withDefaults` already backfills `settings` wholesale only when it is absent, so a document that has `settings` but no `settings.rosh` needs one more line:

```js
function withDefaults(doc) {
  for (const key of BACKFILL_KEYS) {
    if (doc[key] === undefined) doc[key] = structuredClone(DEFAULT_CONTENT[key]);
  }
  // A file from between the שבת times feature and this one carries `settings` — so the loop
  // above skips it — but no `settings.rosh` inside it. Backfilled per group, for the same
  // reason validateSettings merges per group.
  for (const group of Object.keys(DEFAULT_CONTENT.settings)) {
    if (doc.settings[group] === undefined) doc.settings[group] = structuredClone(DEFAULT_CONTENT.settings[group]);
  }
  return doc;
}
```

- [ ] **Step 5: Run to verify they pass**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 6: Verify against a real boot**

Run: `node -e "require('./server/src/store/defaultContent.js')" && node --input-type=commonjs -e "const d=require('./server/src/store/defaultContent.js');console.log(d.roshDay1.length,d.roshDay2.length,d.roshMechirot.length,d.roshTicker.length,JSON.stringify(d.settings.rosh))"`
Expected: `11 10 18 5 {"candles1":"","candles2":"","havdalah":""}`

- [ ] **Step 7: Commit**

```bash
git add server/src/store/defaultContent.js server/src/store/contentStore.js server/test/contentStore.test.js
git commit -m "feat(rosh): seed the board's content and backfill the five panels"
```

---

## Task 4: Reordering

**Files:**
- Modify: `server/src/controllers/contentController.js`, `server/src/routes/content.js`, `client/src/services/content.js`
- Test: `server/test/contentApi.test.js`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `PUT /api/content/:panel/order` with body `{ids: string[]}` → 200 with the reordered array, or 400. Client: `reorderPanel(panel, ids) → Promise<Item[]>`.

- [ ] **Step 1: Write the failing tests**

```js
test('reorder accepts a permutation and rewrites the order', async () => {
  const { body: before } = await get('/api/content/roshDay1');
  const ids = before.map((it) => it.id);
  const swapped = [ids[1], ids[0], ...ids.slice(2)];

  const res = await put('/api/content/roshDay1/order', { ids: swapped });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map((it) => it.id), swapped);

  const { body: after } = await get('/api/content/roshDay1');
  assert.deepEqual(after.map((it) => it.id), swapped);
});

test('reorder rejects a short list, a duplicate and an unknown id, writing nothing', async () => {
  const { body: before } = await get('/api/content/roshDay1');
  const ids = before.map((it) => it.id);

  for (const bad of [ids.slice(1), [ids[0], ids[0], ...ids.slice(2)], ['nope', ...ids.slice(1)]]) {
    const res = await put('/api/content/roshDay1/order', { ids: bad });
    assert.equal(res.status, 400);
  }

  const { body: after } = await get('/api/content/roshDay1');
  assert.deepEqual(after.map((it) => it.id), ids);
});

test('reorder on an unknown panel is a 404', async () => {
  const res = await put('/api/content/nosuchpanel/order', { ids: [] });
  assert.equal(res.status, 404);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm --prefix server test`
Expected: FAIL — the request falls through to `updateItem` with `id === 'order'` and answers 404.

- [ ] **Step 3: Implement the controller**

In `server/src/controllers/contentController.js`, beside `ItemLimitError`:

```js
// A mutator throws this when the posted id list is not a permutation of the panel's current
// items; the controller maps it to a 400, same as any other validation failure.
class ReorderError extends Error {}
```

Add it to the `handler` wrapper's catch chain:

```js
    if (err instanceof ReorderError) {
      return res.status(400).json({ message: 'סדר לא תקין' });
    }
```

And the handler itself:

```js
// Reorders a panel by posting its ids in the order they should be stored.
//
// A permutation check rather than a positional patch ("move item X up one"). Two admin tabs
// open on one phone is an ordinary thing to happen, and a positional patch computed against a
// list one of them has not seen can drop or duplicate a row silently. A permutation either
// describes the list the server actually holds or it does not, and if it does not, nothing is
// written.
const reorderPanel = handler(async (req, res) => {
  const { panel } = req.params;
  const ids = req.body == null ? undefined : req.body.ids;
  if (!Array.isArray(ids)) return res.status(400).json({ message: 'רשימת מזהים חסרה' });

  const reordered = await contentStore.update((draft) => {
    const current = draft[panel];
    if (ids.length !== current.length) throw new ReorderError();

    const remaining = new Map(current.map((it) => [it.id, it]));
    const next = [];
    for (const id of ids) {
      const item = remaining.get(id);
      // Deleting as we go is what makes a repeated id fail on its second visit rather than
      // quietly cloning a row over a dropped one.
      if (!item) throw new ReorderError();
      remaining.delete(id);
      next.push(item);
    }

    draft[panel] = next;
    return next;
  });

  res.json(reordered);
});
```

Export `reorderPanel`.

- [ ] **Step 4: Mount the route ABOVE `/:panel/:id`**

In `server/src/routes/content.js`:

```js
// Declared BEFORE '/:panel/:id'. Express matches in declaration order, so a
// PUT /content/roshDay1/order that reached updateItem would try to edit an item whose id is
// 'order' and answer 404 — the identical trap the /settings pair above documents.
router.put('/:panel/order', reorderPanel);
router.put('/:panel/:id', updateItem);
```

- [ ] **Step 5: Add the client call**

In `client/src/services/content.js`:

```js
// Reordering posts the whole id list rather than "move this one up", so the server can reject
// an order computed against a list it no longer holds. See reorderPanel on the server.
export const reorderPanel = (panel, ids) =>
  api.put(`/content/${panel}/order`, { ids }).then((res) => res.data);
```

- [ ] **Step 6: Run to verify they pass**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/contentController.js server/src/routes/content.js client/src/services/content.js server/test/contentApi.test.js
git commit -m "feat(admin): reorder a panel's items by posting an id permutation"
```

---

## Task 5: Hebcal holiday calendar and the board's pure functions

**Files:**
- Create: `client/src/components/rosh/roshData.js`, `client/test/fixtures/hebcal-rosh-hashanah.js`, `client/test/roshData.test.js`
- Modify: `client/src/services/hebcal.js`, `client/src/components/display/displayData.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `getHolidayCalendar(from: Date, days: number) → Promise<HebcalResponse>`
  - `localYmd(d: Date) → 'YYYY-MM-DD'` — now **exported** from `displayData.js`
  - `holidayAnchors(response, {title, days}) → {day1Date, day2Date, lastDate, candles1, candles2, havdalah}` — Dates are local-noon, the three anchors are raw ISO strings or `null`
  - `resolveRoshTimes(anchors, overrides) → {candles1, candles2, havdalah}` as `'HH:MM'` or `null`
  - `mechirotPages(items, perPage) → [{day, rows: [{...item, num}]}]`
  - `countdownTo(now, targetDate, clock) → 'HH:MM:SS'`
  - `ROW_STYLES: Record<kind, {font, nameColor, subColor, timeColor, rowBg, rowAccent, rowRadius}>`
  - `rowStyle(kind) → ROW_STYLES[kind] ?? ROW_STYLES.regular`

- [ ] **Step 1: Save the fixture**

Create `client/test/fixtures/hebcal-rosh-hashanah.js`. It is a real capture, trimmed to the fields the matcher reads — follow the provenance-header style of the existing `hebcal-parashiyot.js`:

```js
// GENERATED FILE -- captured from Hebcal, not typed.
//
// Regenerate with:
//   Invoke-RestMethod "https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&c=on&i=on&M=on&b=20&geo=pos&latitude=31.7167&longitude=34.6333&tzid=Asia/Jerusalem&start=2026-09-08&end=2026-09-22"
//
// Trimmed to the fields holidayAnchors reads (title/date/hdate/category/subcat/yomtov), plus
// `hebrew` for readability. The `leyning`, `link` and `memo` fields are dropped; nothing looks
// at them.
//
// What makes this window the right test case:
//   * 'Erev Rosh Hashana' is category holiday + subcat major and lands a day EARLIER than the
//     חג — the trap that yomtov:true exists to avoid.
//   * The Shabbat of 18-19 Sep carries its own candles/havdalah, so an anchor picked by array
//     position instead of by date would take the wrong night.
//   * Yom Kippur is in range, so a title match must not be a substring free-for-all.
export const HEBCAL_ROSH_5787 = {
  items: [
    { title: 'Erev Rosh Hashana', date: '2026-09-11', hdate: '29 Elul 5786', category: 'holiday', subcat: 'major', hebrew: 'ערב ראש השנה' },
    { title: 'Candle lighting: 18:32', date: '2026-09-11T18:32:00+03:00', category: 'candles', hebrew: 'הדלקת נרות' },
    { title: 'Rosh Hashana 5787', date: '2026-09-12', hdate: '1 Tishrei 5787', category: 'holiday', subcat: 'major', yomtov: true, hebrew: 'ראש השנה 5787' },
    { title: 'Candle lighting: 19:28', date: '2026-09-12T19:28:00+03:00', category: 'candles', hebrew: 'הדלקת נרות' },
    { title: 'Rosh Hashana II', date: '2026-09-13', hdate: '2 Tishrei 5787', category: 'holiday', subcat: 'major', yomtov: true, hebrew: 'ראש השנה ב׳' },
    { title: 'Havdalah: 19:27', date: '2026-09-13T19:27:00+03:00', category: 'havdalah', hebrew: 'הבדלה' },
    { title: 'Candle lighting: 18:23', date: '2026-09-18T18:23:00+03:00', category: 'candles', hebrew: 'הדלקת נרות' },
    { title: 'Havdalah: 19:18', date: '2026-09-19T19:18:00+03:00', category: 'havdalah', hebrew: 'הבדלה' },
    { title: 'Erev Yom Kippur', date: '2026-09-20', hdate: '9 Tishrei 5787', category: 'holiday', subcat: 'major', hebrew: 'ערב יום כיפור' },
    { title: 'Candle lighting: 18:21', date: '2026-09-20T18:21:00+03:00', category: 'candles', hebrew: 'הדלקת נרות' },
    { title: 'Yom Kippur', date: '2026-09-21', hdate: '10 Tishrei 5787', category: 'holiday', subcat: 'major', yomtov: true, hebrew: 'יום כיפור' },
    { title: 'Havdalah: 19:16', date: '2026-09-21T19:16:00+03:00', category: 'havdalah', hebrew: 'הבדלה' },
  ],
};
```

- [ ] **Step 2: Write the failing tests**

Create `client/test/roshData.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  holidayAnchors,
  resolveRoshTimes,
  mechirotPages,
  countdownTo,
  rowStyle,
} from '../src/components/rosh/roshData.js';
import { HEBCAL_ROSH_5787 } from './fixtures/hebcal-rosh-hashanah.js';

const ROSH = { title: 'Rosh Hashana', days: 2 };

test('holidayAnchors finds the two חג days, not ערב ראש השנה', () => {
  const a = holidayAnchors(HEBCAL_ROSH_5787, ROSH);
  assert.equal(a.day1Date.getFullYear(), 2026);
  assert.equal(a.day1Date.getMonth(), 8);
  assert.equal(a.day1Date.getDate(), 12);
  assert.equal(a.day2Date.getDate(), 13);
});

test('holidayAnchors takes the חג candles and havdalah, not the next Shabbat’s', () => {
  const a = holidayAnchors(HEBCAL_ROSH_5787, ROSH);
  assert.equal(a.candles1, '2026-09-11T18:32:00+03:00');
  assert.equal(a.candles2, '2026-09-12T19:28:00+03:00');
  assert.equal(a.havdalah, '2026-09-13T19:27:00+03:00');
});

test('holidayAnchors is parameterised by title — Yom Kippur is one day', () => {
  const a = holidayAnchors(HEBCAL_ROSH_5787, { title: 'Yom Kippur', days: 1 });
  assert.equal(a.day1Date.getDate(), 21);
  assert.equal(a.candles1, '2026-09-20T18:21:00+03:00');
  assert.equal(a.candles2, null);
  assert.equal(a.havdalah, '2026-09-21T19:16:00+03:00');
});

test('holidayAnchors yields nulls rather than a neighbour’s time when the חג is absent', () => {
  const a = holidayAnchors({ items: [] }, ROSH);
  assert.equal(a.day1Date, null);
  assert.equal(a.candles1, null);
  assert.equal(a.havdalah, null);
});

test('holidayAnchors survives a malformed response', () => {
  for (const bad of [null, undefined, {}, { items: null }]) {
    assert.equal(holidayAnchors(bad, ROSH).day1Date, null);
  }
});

test('resolveRoshTimes formats the anchors in Jerusalem', () => {
  const t = resolveRoshTimes(holidayAnchors(HEBCAL_ROSH_5787, ROSH), {});
  assert.deepEqual(t, { candles1: '18:32', candles2: '19:28', havdalah: '19:27' });
});

test('a pinned override beats the anchor, and a blank falls back to it', () => {
  const a = holidayAnchors(HEBCAL_ROSH_5787, ROSH);
  const t = resolveRoshTimes(a, { candles1: '18:15', candles2: '', havdalah: '' });
  assert.equal(t.candles1, '18:15');
  assert.equal(t.candles2, '19:28');
});

test('a pinned override still shows when Hebcal gave nothing', () => {
  const t = resolveRoshTimes({}, { candles1: '18:15' });
  assert.equal(t.candles1, '18:15');
  assert.equal(t.havdalah, null);
});

test('mechirotPages reproduces the mockup’s split: ten become 4 + 4 + 2', () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ id: `a${i}`, label: `x${i}`, day: 'day1' }));
  const pages = mechirotPages(items, 4);
  assert.deepEqual(pages.map((p) => p.rows.length), [4, 4, 2]);
  assert.equal(pages[0].rows[0].num, 1);
  assert.equal(pages[2].rows[1].num, 10);
});

test('mechirotPages keeps the days apart and numbers each from one', () => {
  const items = [
    ...Array.from({ length: 10 }, (_, i) => ({ id: `a${i}`, day: 'day1' })),
    ...Array.from({ length: 8 }, (_, i) => ({ id: `b${i}`, day: 'day2' })),
  ];
  const pages = mechirotPages(items, 4);
  assert.deepEqual(pages.map((p) => p.day), ['day1', 'day1', 'day1', 'day2', 'day2']);
  assert.deepEqual(pages.map((p) => p.rows.length), [4, 4, 2, 4, 4]);
  assert.equal(pages[3].rows[0].num, 1);
});

test('mechirotPages treats a missing day as day1 and an empty list as no pages', () => {
  assert.equal(mechirotPages([{ id: 'a' }], 4)[0].day, 'day1');
  assert.deepEqual(mechirotPages([], 4), []);
});

test('countdownTo counts down on Israel’s clock', () => {
  const target = new Date(2026, 8, 13, 12);
  // 2026-09-13 07:45 Israel time is 04:45Z.
  assert.equal(countdownTo(new Date('2026-09-13T04:45:00Z'), target, '09:45'), '02:00:00');
});

test('countdownTo spans days and clamps once the time has passed', () => {
  const target = new Date(2026, 8, 13, 12);
  assert.equal(countdownTo(new Date('2026-09-12T06:45:00Z'), target, '09:45'), '26:00:00');
  assert.equal(countdownTo(new Date('2026-09-13T08:00:00Z'), target, '09:45'), '00:00:00');
});

test('countdownTo yields placeholders rather than a wrong number', () => {
  assert.equal(countdownTo(new Date(), null, '09:45'), '--:--:--');
  assert.equal(countdownTo(new Date(), new Date(2026, 8, 13, 12), ''), '--:--:--');
});

test('rowStyle separates תשליך from פיוט in meaning while matching them in colour', () => {
  assert.equal(rowStyle('tashlich').nameColor, rowStyle('piyut').nameColor);
  assert.notEqual(rowStyle('shofar').nameColor, rowStyle('regular').nameColor);
  assert.deepEqual(rowStyle('nonsense'), rowStyle('regular'));
  assert.deepEqual(rowStyle(''), rowStyle('regular'));
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npm --prefix client test`
Expected: FAIL — cannot resolve `../src/components/rosh/roshData.js`.

- [ ] **Step 4: Export `localYmd`**

In `client/src/components/display/displayData.js`, change `function localYmd(d)` to `export function localYmd(d)` and extend its comment:

```js
// Calendar date ('YYYY-MM-DD') of one of the Israel-anchored Dates above, for comparing
// against the first ten characters of a Hebcal timestamp. Built from the date's own fields
// rather than toISOString(), which would answer in UTC and slide a day backwards for anything
// before 02:00/03:00 local.
//
// Exported for components/rosh/roshData.js, which matches Hebcal's holiday items to dates
// exactly as shabbatAnchors matches its candle items. A second copy of four lines would be
// cheap to write and is precisely how the two would drift.
```

- [ ] **Step 5: Add the Hebcal call**

In `client/src/services/hebcal.js`, after `getParasha`:

```js
/**
 * Major holidays in a window, with their candle lighting and havdalah times for Nitzan.
 *
 * One request serves every חג board: ראש השנה today, and יום כיפור, סוכות, פסח and שבועות
 * when they are built. `holidayAnchors` in components/rosh/roshData.js picks one חג out of
 * the response by title.
 *
 * Deliberately WITHOUT `lg=he`, unlike every other call in this module. Nothing here is ever
 * displayed — only the dates and times are read — and `lg=he` rewrites `title` into pointed
 * Hebrew ('רֹאשׁ הַשָּׁנָה 5787'), turning the one field the matcher keys on into display copy.
 *
 * @param {Date} from - first day of the window. Should be Israel-anchored (displayData's
 *   `israelToday`), because its local calendar fields are read here.
 * @param {number} days - length of the window.
 */
export const getHolidayCalendar = async (from, days) => {
  const end = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days, 12, 0, 0, 0);
  try {
    const response = await axios.get(`${HEBCAL_API_URL}/hebcal`, {
      params: {
        v: 1,
        cfg: 'json',
        maj: 'on',   // major holidays
        c: 'on',     // ...with candle lighting
        i: 'on',     // Israel's scheme. Immaterial for ראש השנה; it is here for סוכות and פסח.
        M: 'on',     // הבדלה at nightfall, matching the שבת board's request
        b: SHABBAT_CONFIG.candleLightingMinBeforeSunset,
        geo: 'pos',
        latitude: LOCATION.latitude,
        longitude: LOCATION.longitude,
        tzid: LOCATION.tzid,
        start: format(from, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching holiday calendar:', error);
    throw error;
  }
};
```

- [ ] **Step 6: Write `roshData.js`**

Create `client/src/components/rosh/roshData.js`:

```js
import { israelParts, localYmd, toClock } from '../display/displayData';

const pad2 = (n) => String(n).padStart(2, '0');

// The window the board asks Hebcal for. `-3` keeps it correct DURING the חג and the morning
// after; `+400` guarantees exactly one ראש השנה is in range whatever day the TV is switched to
// this board.
export const HOLIDAY_WINDOW_BACK_DAYS = 3;
export const HOLIDAY_WINDOW_DAYS = 400;

// The חג this board is about, as holidayAnchors takes it. `title` is matched with startsWith
// because Hebcal names the two days differently — 'Rosh Hashana 5787' and 'Rosh Hashana II'.
export const ROSH_HASHANAH = { title: 'Rosh Hashana', days: 2 };

const EMPTY_ANCHORS = {
  day1Date: null,
  day2Date: null,
  lastDate: null,
  candles1: null,
  candles2: null,
  havdalah: null,
};

// A local-noon Date from a 'YYYY-MM-DD' prefix. Noon rather than midnight so a DST jump in the
// DEVICE's own zone cannot slide the date back a day — the same convention israelDateAtNoon
// uses in displayData.js, and the reason every Date this module returns is read with LOCAL
// getters and formatted WITHOUT a timeZone option.
function dateFromYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

const shiftDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0, 0);

// One חג out of a getHolidayCalendar response: its dates, and the candle/havdalah timestamps
// that bracket it.
//
// `yomtov: true` is what makes the match safe, and it is not decoration. 'Erev Rosh Hashana'
// is ALSO category 'holiday' with subcat 'major', and it lands a day EARLIER — so a matcher
// keyed on category and title alone takes ערב ראש השנה as day one and slides the whole board
// back twenty-four hours. Only the real חג days carry yomtov.
//
// The anchors are matched to dates rather than taken by array position, for the reason
// shabbatAnchors already documents: a window that holds ראש השנה also holds the Shabbat after
// it, with its own candles and havdalah, and the first `candles` item in the array is not
// necessarily the one that belongs to this חג. A missing item yields null, which every card
// renders as '--:--' — a חג board must never post last year's number.
export function holidayAnchors(response, { title, days = 2 } = {}) {
  const items = Array.isArray(response?.items) ? response.items : [];

  const first = items.find(
    (it) =>
      it.category === 'holiday' &&
      it.yomtov === true &&
      typeof it.title === 'string' &&
      typeof title === 'string' &&
      it.title.startsWith(title)
  );
  const day1Date = dateFromYmd(first?.date);
  if (!day1Date) return { ...EMPTY_ANCHORS };

  const lastDate = shiftDays(day1Date, days - 1);
  const on = (category, when) =>
    items.find(
      (it) =>
        it.category === category &&
        typeof it.date === 'string' &&
        it.date.slice(0, 10) === localYmd(when)
    )?.date || null;

  return {
    day1Date,
    day2Date: days > 1 ? shiftDays(day1Date, 1) : null,
    lastDate,
    // ערב יום א׳ — the evening before the חג opens.
    candles1: on('candles', shiftDays(day1Date, -1)),
    // ליל יום ב׳ — lit ON day one, at nightfall, from an existing flame. Absent for a one-day
    // חג, which is what `days` is for.
    candles2: days > 1 ? on('candles', day1Date) : null,
    havdalah: on('havdalah', lastDate),
  };
}

// The gabbai's pinned times applied to this year's anchors. Blank means "compute it".
//
// Resolved at RENDER rather than inside the fetch, the same split resolveShabbatTimes makes:
// the overrides arrive on the 30-second content poll and the anchors on a six-hour one, so
// resolving in the fetch would leave a time just pinned unshown for up to six hours, while
// adding the overrides to the effect's dependencies would re-request Hebcal on every poll.
export function resolveRoshTimes(anchors = {}, overrides = {}) {
  // An override is a stated fact, not a derivation, so it short-circuits ahead of the anchor
  // and shows even through a total Hebcal outage.
  const pin = (key, auto) => overrides[key] || auto;
  return {
    candles1: pin('candles1', toClock(anchors.candles1)),
    candles2: pin('candles2', toClock(anchors.candles2)),
    havdalah: pin('havdalah', toClock(anchors.havdalah)),
  };
}

export const MECHIRA_DAY_ORDER = ['day1', 'day2'];

// מכירת המצוות, split into the pages the card rotates through.
//
// The arithmetic is the mockup's, reproduced rather than improved: page count from `perPage`,
// then a size from the page count. For ten items that gives 4 + 4 + 2 and not an even
// 4 + 3 + 3, which is what the board was designed around.
//
// The two days never share a page, and each is numbered from one — the numbers are positions
// in the day's running order, which is what the gabbai calls out.
export function mechirotPages(items, perPage = 4) {
  const pages = [];
  for (const day of MECHIRA_DAY_ORDER) {
    const rows = (items || [])
      .filter((it) => (it.day || 'day1') === day)
      .map((it, i) => ({ ...it, num: i + 1 }));
    if (!rows.length) continue;

    const size = Math.ceil(rows.length / Math.ceil(rows.length / perPage));
    for (let i = 0; i < rows.length; i += size) pages.push({ day, rows: rows.slice(i, i + size) });
  }
  return pages;
}

// HH:MM:SS from `now` until `clock` on `targetDate`, on Israel's wall clock.
//
// Wall-clock arithmetic rather than an epoch difference, for the reason computeNextMinyan
// documents: the epoch would have to be read through the DEVICE's clock, which is the
// dependency this board exists without. It inherits that function's DST caveat too — a
// countdown spanning one of Israel's transitions is off by the offset until the transition
// passes. ראש השנה is nowhere near one.
//
// Both Dates are local-noon (see dateFromYmd), so their difference is a clean multiple of a
// day even across a DST change in the device's own zone; Math.round absorbs a 23h or 25h day.
export function countdownTo(now, targetDate, clock) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(clock || '');
  if (!(targetDate instanceof Date) || Number.isNaN(targetDate.getTime()) || !m) return '--:--:--';

  const p = israelParts(now);
  const today = new Date(p.year, p.month - 1, p.day, 12, 0, 0, 0);
  const daysAhead = Math.round((targetDate.getTime() - today.getTime()) / 86400000);

  const diffMs =
    (daysAhead * 1440 + Number(m[1]) * 60 + Number(m[2])) * 60000 -
    ((p.hour * 60 + p.minute) * 60000 + p.second * 1000 + p.ms);
  const diff = Math.max(0, Math.floor(diffMs / 1000));

  return `${pad2(Math.floor(diff / 3600))}:${pad2(Math.floor((diff % 3600) / 60))}:${pad2(diff % 60)}`;
}

const SANS = "'Assistant',sans-serif";
const SERIF = "'Frank Ruhl Libre',serif";

// The row treatments, transcribed from the mockup's `_row`. It chose between these by running
// regexes over the row's Hebrew NAME; the stored `kind` chooses now — see ROW_KINDS in
// server/src/store/panels.js for why.
//
// `tashlich` and `piyut` are deliberately identical here. They are separate kinds because only
// תשליך feeds a card, not because they look different.
export const ROW_STYLES = {
  regular: {
    font: SANS, nameColor: '#3a352c', subColor: '#6b6553', timeColor: '#b0873f',
    rowBg: 'transparent', rowAccent: '0', rowRadius: '0',
  },
  shiur: {
    font: SANS, nameColor: '#5f1a28', subColor: '#7d4453', timeColor: '#5f1a28',
    rowBg: 'rgba(125,34,51,0.07)', rowAccent: '4px solid #9c3348', rowRadius: '8px',
  },
  shofar: {
    font: SANS, nameColor: '#7a3a05', subColor: '#a06a2c', timeColor: '#7a3a05',
    rowBg: 'linear-gradient(90deg,rgba(214,138,32,0.26),rgba(214,138,32,0.07))',
    rowAccent: '5px solid #d68a20', rowRadius: '10px',
  },
  tashlich: {
    font: SERIF, nameColor: '#1f4f6b', subColor: '#5a8299', timeColor: '#1f4f6b',
    rowBg: 'rgba(31,79,107,0.10)', rowAccent: '4px solid #2f7ea6', rowRadius: '8px',
  },
  piyut: {
    font: SERIF, nameColor: '#1f4f6b', subColor: '#5a8299', timeColor: '#1f4f6b',
    rowBg: 'rgba(31,79,107,0.10)', rowAccent: '4px solid #2f7ea6', rowRadius: '8px',
  },
  mechirot: {
    font: SERIF, nameColor: '#6d5316', subColor: '#8a7136', timeColor: '#6d5316',
    rowBg: 'rgba(176,135,63,0.16)', rowAccent: '4px solid #b0873f', rowRadius: '8px',
  },
};

// An unknown or blank kind reads as `regular`, so a row written straight through the API
// without one still renders.
export const rowStyle = (kind) => ROW_STYLES[kind] || ROW_STYLES.regular;
```

- [ ] **Step 7: Run to verify they pass**

Run: `npm --prefix client test`
Expected: PASS, all of `roshData.test.js`.

- [ ] **Step 8: Run the timezone check from PowerShell**

Run (PowerShell, **not** Git Bash): `$env:TZ='Pacific/Auckland'; npm --prefix client test; Remove-Item Env:TZ`
Expected: PASS. `countdownTo` reads Israel's clock, so a device twelve hours ahead must not change any assertion.

- [ ] **Step 9: Commit**

```bash
git add client/src/components/rosh/roshData.js client/src/services/hebcal.js client/src/components/display/displayData.js client/test/roshData.test.js client/test/fixtures/hebcal-rosh-hashanah.js
git commit -m "feat(rosh): Hebcal holiday anchors, mechirot paging and row styles"
```

---

## Task 6: Content wiring and the model hook

**Files:**
- Modify: `client/src/hooks/useDisplayContent.js`
- Create: `client/src/hooks/useRoshModel.js`

**Interfaces:**
- Consumes: Task 5's `roshData.js`; Task 3's seeded panels.
- Produces: `useRoshModel() → { clock, hebDate, greg, hebrewYear, day1, day2, day1Label, day2Label, candles, shofar, tashlich, mechirot, mechirotDay, pageIndex, pageCount, ded, ticker, tick }` where
  `day1`/`day2` are `[{id, name, time, chazan, kind, style}]`,
  `candles` is `{candles1, candles2, havdalah}`,
  `shofar` is `{label, time, countdown}`,
  `tashlich` is `{label, time, place}`,
  `mechirot` is the current page's `rows`, `mechirotDay` its heading.

- [ ] **Step 1: Extend `useDisplayContent`**

Add the five keys to `EMPTY_LISTS` with a comment, and carry both settings groups:

```js
  // ראש השנה. Read only by hooks/useRoshModel.js — the two everyday boards never touch them —
  // but they live in the one document and are filtered by the same isActive rule as everything
  // else, so they need nothing here beyond a key.
  roshDay1: [],
  roshDay2: [],
  roshMechirot: [],
  roshDedication: [],
  roshTicker: [],
```

```js
// The pinned time overrides, one group per board. Defaulted rather than passed straight
// through because a document cached before either feature existed carries neither.
const EMPTY_SETTINGS = { shabbat: {}, rosh: {} };
```

```js
  settings: {
    shabbat: doc?.settings?.shabbat || {},
    rosh: doc?.settings?.rosh || {},
  },
```

- [ ] **Step 2: Write `useRoshModel.js`**

```js
import { useEffect, useState } from 'react';
import { getHolidayCalendar } from '../services/hebcal';
import { israelParts, israelToday } from '../components/display/displayData';
import {
  HOLIDAY_WINDOW_BACK_DAYS,
  HOLIDAY_WINDOW_DAYS,
  ROSH_HASHANAH,
  holidayAnchors,
  resolveRoshTimes,
  mechirotPages,
  countdownTo,
  rowStyle,
} from '../components/rosh/roshData';
import useDisplayContent from './useDisplayContent';

const ROTATE_MS = 6500;
const ZMANIM_REFRESH_MS = 21600000; // 6 hours

const pad = (n) => String(n).padStart(2, '0');

// Everything the ראש השנה board shows.
//
// A hook of its own rather than a fourth branch of useDisplayModel. That hook is 380 lines
// carrying six network legs, four timers and three rotation counters, and this board shares
// none of it: no parasha, no מן הפרשה, no הנץ rollover, no weekly מנחה, no jokes, no חול/שבת
// toggle, no computeNextMinyan. What it does reuse is every pure helper — israelParts,
// israelToday, toClock and useDisplayContent — so there is still exactly one definition of
// what time it is in Nitzan serving all three boards.
export default function useRoshModel() {
  const [now, setNow] = useState(() => new Date());
  // One counter for the whole board, as the other two have: the mechirot pages and the
  // dedication advance together. The modulo is taken at render against the CURRENT list, so a
  // list the gabbai shortens cannot leave an index past its end.
  const [tick, setTick] = useState(0);
  const [anchors, setAnchors] = useState({});

  const { roshDay1, roshDay2, roshMechirot, roshDedication, roshTicker, settings } = useDisplayContent();

  const nowIL = israelParts(now);
  const israelDayKey = `${nowIL.year}-${pad(nowIL.month)}-${pad(nowIL.day)}`;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const r = setInterval(() => setTick((v) => v + 1), ROTATE_MS);
    return () => clearInterval(r);
  }, []);

  // Keyed on Israel's calendar day so the whole effect re-runs within a second of 00:00, with
  // the six-hour interval as a backstop for a failed load — the same shape and the same
  // reasoning as useDisplayModel's, minus its 07:30 boundary, which no row here needs.
  //
  // A failed request deliberately leaves the previous anchors in state: the board keeps
  // showing the times it had rather than blanking because a third party was briefly down.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const from = israelToday(new Date());
        const start = new Date(from.getFullYear(), from.getMonth(), from.getDate() - HOLIDAY_WINDOW_BACK_DAYS, 12, 0, 0, 0);
        const response = await getHolidayCalendar(start, HOLIDAY_WINDOW_DAYS);
        if (cancelled) return;
        setAnchors(holidayAnchors(response, ROSH_HASHANAH));
      } catch {
        /* keep the anchors already on screen */
      }
    };

    load();
    const id = setInterval(load, ZMANIM_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [israelDayKey]);

  const clock = `${pad(nowIL.hour)}:${pad(nowIL.minute)}:${pad(nowIL.second)}`;
  let hebDate = '';
  let greg = '';
  try {
    const opts = { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'long', year: 'numeric' };
    hebDate = new Intl.DateTimeFormat('he-u-ca-hebrew', opts).format(now);
    greg = new Intl.DateTimeFormat('he', opts).format(now);
  } catch {
    /* Intl calendar unsupported — leave the header dates blank */
  }

  // NO timeZone option, unlike the two formatters above, and that is not an oversight. Those
  // format `now`, a real instant, which must be read in Jerusalem. These format the local-noon
  // Dates holidayAnchors returns, which already CARRY Israel's calendar fields — pushing one
  // through a Jerusalem formatter could shift it a day. Same rule localYmd follows.
  const format = (date, opts) => {
    if (!date) return '';
    try {
      return new Intl.DateTimeFormat('he-u-ca-hebrew', opts).format(date);
    } catch {
      return '';
    }
  };
  const hebrewYear = format(anchors.day1Date, { year: 'numeric' });
  const weekdayOf = (date) => {
    if (!date) return '';
    try {
      return new Intl.DateTimeFormat('he', { weekday: 'long' }).format(date);
    } catch {
      return '';
    }
  };

  const decorate = (rows) => (rows || []).map((r) => ({ ...r, style: rowStyle(r.kind) }));
  const day1 = decorate(roshDay1);
  const day2 = decorate(roshDay2);

  const candles = resolveRoshTimes(anchors, settings.rosh);

  // The two derived cards. Each is the row the gabbai marked with that kind, so the fact lives
  // in exactly one place — searched day two first, because that is where both landmarks fall
  // in a year whose first day is Shabbat.
  const findKind = (kind) => {
    const inDay2 = day2.find((r) => r.kind === kind);
    if (inDay2) return { row: inDay2, date: anchors.day2Date, ordinal: 'ב׳' };
    const inDay1 = day1.find((r) => r.kind === kind);
    if (inDay1) return { row: inDay1, date: anchors.day1Date, ordinal: 'א׳' };
    return null;
  };

  const shofarHit = findKind('shofar');
  const shofar = shofarHit
    ? {
        label: [`יום ${shofarHit.ordinal} דחג`, shofarHit.row.chazan].filter(Boolean).join(' · '),
        time: shofarHit.row.time || '',
        countdown: countdownTo(now, shofarHit.date, shofarHit.row.time),
      }
    : { label: '', time: '', countdown: '--:--:--' };

  const tashlichHit = findKind('tashlich');
  const tashlich = tashlichHit
    ? {
        label: weekdayOf(tashlichHit.date) ? `תשליך · יום ${weekdayOf(tashlichHit.date)}` : 'תשליך',
        time: tashlichHit.row.time || '',
        place: tashlichHit.row.chazan || '',
      }
    : { label: 'תשליך', time: '', place: '' };

  const pages = mechirotPages(roshMechirot, 4);
  const pageCount = pages.length;
  const pageIndex = pageCount ? tick % pageCount : -1;
  const page = pageCount ? pages[pageIndex] : null;
  const DAY_TITLES = { day1: 'יום א׳ דראש השנה', day2: 'יום ב׳ דראש השנה' };
  const dayHeading = (day, date) =>
    [DAY_TITLES[day], weekdayOf(date)].filter(Boolean).join(' · ');

  const ded = roshDedication.length ? roshDedication[tick % roshDedication.length] : null;

  return {
    clock,
    hebDate,
    greg,
    hebrewYear,
    day1,
    day2,
    day1Label: weekdayOf(anchors.day1Date),
    day2Label: weekdayOf(anchors.day2Date),
    candles,
    shofar,
    tashlich,
    mechirot: page ? page.rows : [],
    mechirotDay: page ? dayHeading(page.day, page.day === 'day1' ? anchors.day1Date : anchors.day2Date) : '',
    pageIndex,
    pageCount,
    ded,
    ticker: roshTicker,
    tick,
  };
}
```

- [ ] **Step 3: Verify it parses and the client still builds**

Run: `npm --prefix client run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useDisplayContent.js client/src/hooks/useRoshModel.js
git commit -m "feat(rosh): the board's model hook and its content wiring"
```

---

## Task 7: The board's presentation

**Files:**
- Create: `client/src/components/rosh/roshStyle.js`, `icons.jsx`, `Masthead.jsx`, `HighlightStrip.jsx`, `DayListCard.jsx`, `CandlesCard.jsx`, `MechirotCard.jsx`, `SimanimStrip.jsx`, `RoshTicker.jsx`
- Create: `client/src/pages/RoshDisplay.jsx`
- Modify: `client/src/pages/TvDisplay.jsx`

**Interfaces:**
- Consumes: Task 6's `useRoshModel`.
- Produces: `/tv?screen=rosh`.

The layout is a transcription of `Synagogue Display Rosh Hashanah.dc.html` in the Claude Design project `41ba8c75-f1db-4920-b55e-a05ed4b2168e`. Read that file for the exact markup; the structure is:

```
Masthead              flex:none, gradient 165deg #7d2233 → #5a1522, padding 26px 46px 30px
  right   hebDate 24px gold · greg 24px pink · clock 46px 800 white
  centre  shofar svg · שָׁנָה טוֹבָה וּמְתוּקָה 66px 900 serif · רֹאשׁ הַשָּׁנָה {hebrewYear} 25px
  left    shul name 28px serif · nusach 24px · תכלה שנה 24px gold
HighlightStrip        grid 1.1fr 1.1fr 1fr, gap 20px
  DedicationCard   cream card, gold corner diamonds, lead 24px gold ls5 / names 36px serif 900 / note 24px
  ShofarCard       pomegranate card, label 24px gold ls4, time 58px 800, בעוד {countdown} 25px
  TashlichCard     white card, label 24px gold ls3, time 38px 800, place 24px serif
main                  grid 1.1fr 1.1fr 1fr, flex:1, gap 20px
  DayListCard x2   white card; title 27px serif 900 #7d2233; wreath divider; rows grid-auto-rows:1fr
  right column     grid auto 1fr
    CandlesCard    three label/time rows + the מאש קיימת note
    MechirotCard   heading · numbered rows with badges · diamond dot strip
SimanimStrip          flex:none, the eight simanim, fixed
RoshTicker            52px, marquee at 46s linear infinite
```

- [ ] **Step 1: `roshStyle.js` — the palette and the keyframes**

```js
// The ראש השנה board's palette, transcribed from the mockup. Its own module rather than a
// branch in shabbatStyle.js: the two boards share no colour, and one file holding both would
// be two palettes in a trench coat.
export const C = {
  pomegranate: '#7d2233',
  pomegranateDeep: '#5a1522',
  pomegranateSoft: '#e3b9be',
  gold: '#b0873f',
  goldLight: '#e0be7c',
  goldEdge: 'rgba(176,135,63,0.3)',
  page: 'linear-gradient(180deg,#fdfaf1 0%,#f8f2e4 58%,#f4ecd9 100%)',
  pageFlat: '#f6efe0',
  ink: '#3a352c',
  inkMuted: '#6b6553',
  inkSteel: '#5b5344',
  card: '#ffffff',
};

export const SANS = "'Assistant',sans-serif";
export const SERIF = "'Frank Ruhl Libre',serif";

export const CARD = {
  background: C.card,
  border: `1px solid ${C.goldEdge}`,
  borderRadius: '18px',
  padding: '16px 24px',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  boxShadow: '0 8px 24px rgba(120,95,45,0.08)',
};

// Injected once by RoshDisplay. The board's animations, and the Google Fonts link, cannot ride
// index.css: the two existing boards do not use these faces and a wall panel should not pay
// for a font it never renders.
export const KEYFRAMES = `
@keyframes roshFade{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
@keyframes roshTicker{from{transform:translateX(-100%);}to{transform:translateX(100%);}}
@keyframes roshSunrise{0%,100%{opacity:.55;transform:translateX(-50%) scale(1);}50%{opacity:.9;transform:translateX(-50%) scale(1.05);}}
@keyframes roshShofar{0%,100%{transform:translateY(0) rotate(-3deg);}50%{transform:translateY(-6px) rotate(-3deg);}}
`;
```

- [ ] **Step 2: `icons.jsx` — the SVGs, copied verbatim from the mockup**

Export `ShofarIcon`, `WreathIcon`, `SprigIcon`, and `SIMANIM` — an array of `{name, Icon}` for רִמּוֹן, תַּפּוּחַ בִּדְבַשׁ, רֹאשׁ דָּג, רֻבִּיָּא, כַּרְתִּי, סִלְקָא, תָּמָר, רֹאשׁ כֶּבֶשׂ. Copy each `<path>`/`<circle>` `d`, `fill` and `stroke` from the mockup unchanged; convert `stroke-width` → `strokeWidth`, `stroke-linecap` → `strokeLinecap`, `aria-hidden` → `aria-hidden` (valid in JSX as-is).

- [ ] **Step 3: The cards**

Each is a small presentational component taking exactly what `useRoshModel` returns. Three that need care:

`DayListCard` — rows come pre-decorated with `style`; the row renders

```jsx
<div style={{
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 6px', minHeight: 0, borderBottom: '1px solid rgba(120,95,45,0.14)',
  background: row.style.rowBg, borderRight: row.style.rowAccent, borderRadius: row.style.rowRadius,
}}>
```

with the name at 26px/700 in `style.nameColor`, `chazan` at 24px in `style.subColor` (ellipsised, `whiteSpace: 'nowrap'`), and the time at 26px/800 tabular-nums in `style.timeColor`. **A blank time renders as an empty string, not `--:--`** — those rows have no time by design and a placeholder would read as a missing one.

The container is `display:grid; gridAutoRows:1fr; flex:1; minHeight:0; overflow:hidden` so eleven rows and ten rows both fill their card without either scrolling.

`MechirotCard` — badge copy by kind:

```js
const BADGE = {
  general: { text: 'מכירה כללית · פנו לגבאי', color: '#7d2233', bg: 'rgba(125,34,51,0.08)', border: 'rgba(125,34,51,0.35)' },
  auction: { text: 'מכירה פומבית', color: '#7a6122', bg: 'rgba(176,135,63,0.1)', border: 'rgba(176,135,63,0.4)' },
};
const badge = BADGE[item.kind] || BADGE.auction;
```

The page body carries `animation: 'roshFade .6s ease'` and is keyed on `pageIndex`, so each turn replays the fade. The dot strip renders `pageCount` diamonds with the one at `pageIndex` in `C.gold`.

`HighlightStrip` — the dedication half:

```jsx
{ded ? (
  // Keyed on the item, NOT on the model's tick. A shul with one dedication would otherwise
  // fade the same name back in every 6.5 seconds forever — a pulse on a wall board with
  // nothing behind it. Keying on the id replays the fade only when the name actually
  // changes, which for two or three dedications still animates. Same fix as
  // shabbat/DedicationCard.jsx.
  <div key={ded.id} style={{ animation: 'roshFade .7s ease' }}>
    <div style={leadStyle}>{ded.lead}</div>
    <div style={namesStyle}>{ded.names}</div>
    {ded.note && <div style={noteStyle}>{ded.note}</div>}
  </div>
) : (
  <div style={namesStyle}>לוח החג טרם הוקדש</div>
)}
```

with the static footer `להקדשת הלוחות הבאים — חג או שבת — נא לפנות לגבאי` below it either way.

`ShofarCard` and `TashlichCard` render a quiet placeholder — `—` for the time, no countdown — when their row is missing, rather than unmounting: the strip is a three-column grid and dropping one member reflows the other two.

- [ ] **Step 4: `RoshDisplay.jsx`**

Mirror `ShabbatDisplay.jsx` exactly: `useCanvasScale`, the absolute 1920x1080 box with `transform: translate(-50%,-50%) scale(${scale})`, and `inset: ${insetY}px ${insetX}px` from `safeArea`. `dir="rtl"`. Inject `KEYFRAMES` and the Google Fonts link once:

```jsx
// The board's two faces and its keyframes, injected here rather than in index.css: the other
// two boards render neither, and a wall panel should not download a font it never draws.
<style>{KEYFRAMES}</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;600;700;800&family=Frank+Ruhl+Libre:wght@400;500;700;900&display=swap" />
```

- [ ] **Step 5: Route it**

In `client/src/pages/TvDisplay.jsx`, import `RoshDisplay`, extend `previewScreen` and the render:

```js
// A third value, and the one that is only ever reachable by typing it: useScheduledScreen
// answers 'weekday' or 'shabbat' and nothing else, so ראש השנה never arrives on its own. That
// is deliberate and permanent — the gabbai switches the set to it when the חג comes in, and a
// plain /tv reload always returns to the schedule.
//
// It is also the only correct answer this year. In 5787 יום א׳ דראש השנה IS Shabbat, so a
// calendar rule would put two boards on one Saturday.
const previewScreen = () => {
  const value = new URLSearchParams(window.location.search).get('screen');
  return value === 'shabbat' || value === 'weekday' || value === 'rosh' ? value : null;
};
```

```jsx
{screen === 'rosh' ? (
  <RoshDisplay safeArea={TV_SAFE_AREA} />
) : screen === 'shabbat' ? (
  <ShabbatDisplay safeArea={TV_SAFE_AREA} />
) : (
  <SynagogueDisplay safeArea={TV_SAFE_AREA} showToggle={false} />
)}
```

- [ ] **Step 6: Verify in the browser**

Run: `npm run dev` at the repo root, then open `http://localhost:5173/tv?screen=rosh`.

Check: the three candle times read **18:32 / 19:28 / 19:27**; the שופר card counts down and names יום ב׳; the תשליך card reads `תשליך · יום שבת` / `17:00` / `בבית משפחת רחמין`; the מכירות strip shows five dots and cycles day one then day two; the masthead reads `רֹאשׁ הַשָּׁנָה תשפ״ז`.

Then confirm nothing else moved: `/tv` still shows the scheduled board, `/tv?screen=shabbat` the שבת board, and `/` is unchanged.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/rosh client/src/pages/RoshDisplay.jsx client/src/pages/TvDisplay.jsx
git commit -m "feat(rosh): the ראש השנה wall board on /tv?screen=rosh"
```

---

## Task 8: The admin's board dimension

**Files:**
- Create: `client/src/pages/Admin/boards.js`, `client/src/pages/Admin/BoardPanels.jsx`
- Modify: `client/src/pages/Admin/AdminHome.jsx`, `client/src/pages/Admin/panelMeta.js`, `client/src/App.jsx`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: `BOARDS: [{id, title, icon, panels: string[], settings?: string}]`, `BOARD_BY_ID`, `boardOfPanel(panelKey) → boardId | null`. Routes `/adminGabbai` and `/adminGabbai/board/:board`.

- [ ] **Step 1: `boards.js`**

```js
import { PANEL_META } from './panelMeta';

// Which board each panel belongs to, and the order both levels of the admin are listed in.
//
// A CLIENT-side registry: the server knows nothing about boards. `PANELS` stays flat and
// `PANEL_KEYS` stays a flat array, because grouping is presentation — the same reason
// panelMeta.js owns the Hebrew rather than deriving it from the schema.
//
// This is the file a future חג board adds ONE line to. יום כיפור, סוכות, פסח and שבועות each
// need their panel schemas, their seeds and their own layout; none of them needs a new route,
// a new controller or a new admin screen.
export const BOARDS = [
  // First, and holding the panels the gabbai edits weekly. The חג boards below are the ones he
  // touches twice a year, so the daily work stays one tap from the home screen.
  { id: 'general', title: 'כללי', icon: '🗂', panels: ['announcements', 'mazal', 'azkarot', 'ticker'] },
  { id: 'weekday', title: 'חול', icon: '📅', panels: ['shiurim'] },
  { id: 'shabbat', title: 'שבת', icon: '🕯', panels: ['shiurimShabbat', 'dedication'], settings: 'shabbat' },
  { id: 'rosh', title: 'ראש השנה', icon: '🍎', panels: ['roshDay1', 'roshDay2', 'roshMechirot', 'roshDedication', 'roshTicker'], settings: 'rosh' },
];

export const BOARD_BY_ID = Object.fromEntries(BOARDS.map((b) => [b.id, b]));

// Which board a panel screen should send its ‹ חזרה link back to. A panel missing from every
// board returns null and the caller falls back to the admin home, so a key added to panelMeta
// but not yet to a board is a dead link nowhere — it just goes up one level.
export const boardOfPanel = (panel) => BOARDS.find((b) => b.panels.includes(panel))?.id || null;

// Every panel a board lists must exist in PANEL_META, or the board screen renders a row that
// leads to "פאנל לא קיים". Cheap to assert at module load and impossible to get wrong twice.
if (import.meta.env?.DEV) {
  for (const board of BOARDS) {
    for (const panel of board.panels) {
      if (!PANEL_META[panel]) console.error(`boards.js: לוח "${board.id}" מפנה לפאנל לא מוכר "${panel}"`);
    }
  }
}
```

- [ ] **Step 2: Five `panelMeta.js` entries**

```js
const ROSH_ROW_FIELDS = [
  { key: 'name', label: 'שם השורה', type: 'text', required: true, placeholder: 'שחרית' },
  // Not required, and the hint says so: four rows on the board carry no time because they
  // follow the row above them.
  { key: 'time', label: 'שעה (אפשר להשאיר ריק)', type: 'time', required: false },
  { key: 'chazan', label: 'חזן / פרטים', type: 'text', required: false, placeholder: 'החזן ישובץ בהמשך' },
  {
    key: 'kind',
    label: 'סוג השורה',
    type: 'select',
    required: false,
    options: [
      { value: 'regular', label: 'רגילה' },
      { value: 'shiur', label: 'שיעור / דבר תורה' },
      { value: 'shofar', label: 'תקיעת שופר' },
      { value: 'tashlich', label: 'תשליך' },
      { value: 'piyut', label: 'פיוט / מעמד מיוחד' },
      { value: 'mechirot', label: 'מכירת מצוות' },
    ],
  },
];

const ROSH_ROW_SUMMARY = (item) => (item.time ? `${item.name} · ${item.time}` : item.name);
```

```js
  // ראש השנה. Two day panels because the gabbai edits "the יום ב׳ list", not "a row with a day
  // flag" — the same reasoning that split שיעורי חול from שיעורי שבת.
  roshDay1: {
    title: 'יום א׳ דראש השנה',
    icon: '📜',
    addLabel: 'הוסף שורה ליום א׳',
    emptyLabel: 'אין שורות ליום א׳',
    fields: ROSH_ROW_FIELDS,
    summary: ROSH_ROW_SUMMARY,
    sub: (item) => item.chazan,
  },
  roshDay2: {
    title: 'יום ב׳ דראש השנה',
    icon: '📜',
    addLabel: 'הוסף שורה ליום ב׳',
    emptyLabel: 'אין שורות ליום ב׳',
    fields: ROSH_ROW_FIELDS,
    summary: ROSH_ROW_SUMMARY,
    sub: (item) => item.chazan,
  },
  roshMechirot: {
    title: 'מכירת מצוות',
    icon: '🔨',
    addLabel: 'הוסף מצווה',
    emptyLabel: 'אין מצוות למכירה',
    fields: [
      { key: 'label', label: 'שם המצווה', type: 'text', required: true, placeholder: 'עלייה · שלישי' },
      {
        key: 'day',
        label: 'יום',
        type: 'select',
        required: false,
        options: [
          { value: 'day1', label: 'יום א׳ דראש השנה' },
          { value: 'day2', label: 'יום ב׳ דראש השנה' },
        ],
      },
      {
        key: 'kind',
        label: 'סוג המכירה',
        type: 'select',
        required: false,
        options: [
          { value: 'auction', label: 'מכירה פומבית' },
          { value: 'general', label: 'מכירה כללית · פנו לגבאי' },
        ],
      },
    ],
    summary: (item) => item.label,
    sub: (item) => (item.day === 'day2' ? 'יום ב׳' : 'יום א׳'),
  },
  roshDedication: {
    title: 'הקדשת לוח החג',
    icon: '🕍',
    addLabel: 'הוסף הקדשה',
    // A list, and the board rotates through it — more than one dedication needs no code.
    emptyLabel: 'אין הקדשה — הלוח יזמין לפנות לגבאי',
    fields: [
      { key: 'lead', label: 'נוסח ההקדשה', type: 'text', required: true, placeholder: 'מוקדש להצלחת' },
      { key: 'names', label: 'שם המוקדש', type: 'text', required: true, placeholder: 'משפחת מזוז' },
      { key: 'note', label: 'סיומת', type: 'text', required: false, placeholder: 'בכל העניינים' },
    ],
    summary: (item) => item.names,
    sub: (item) => [item.lead, item.note].filter(Boolean).join(' · '),
  },
  roshTicker: {
    title: 'פס תחתון · ראש השנה',
    icon: '📜',
    addLabel: 'הוסף שורה',
    emptyLabel: 'אין שורות בפס — הפס לא יוצג',
    fields: [
      { key: 'text', label: 'תוכן השורה', type: 'text', required: true, placeholder: 'שנה טובה ומבורכת לכל בית ישראל' },
    ],
    summary: (item) => item.text,
    sub: () => '',
  },
```

Retitle the existing shared ticker so the two are unambiguous on the board screens:

```js
    title: 'פס תחתון · חול ושבת',
```

- [ ] **Step 3: `AdminHome.jsx` lists boards**

```jsx
import { Link } from 'react-router-dom';
import { BOARDS } from './boards';
import * as S from './adminStyles';

// The admin's first level: which board, not which panel.
//
// It was a flat list of every panel until ראש השנה arrived. That does not survive the boards
// coming after it — יום כיפור, סוכות, פסח and שבועות would push it past twenty rows on a phone
// — so the level exists now, while there are four boards to test it with rather than eight.
//
// No counts here, deliberately: a board has no single number, and fetching the whole document
// to sum five panels would make the first screen wait on a request it has nothing to show from.
// The counts live one level down, where they mean something.
export default function AdminHome() {
  return (
    <div style={S.screen}>
      <h1 style={S.title}>ניהול תוכן</h1>
      {BOARDS.map((board) => (
        <Link key={board.id} to={`/adminGabbai/board/${board.id}`} style={S.row}>
          <span style={{ fontSize: '26px' }}>{board.icon}</span>
          <span style={{ flex: 1, fontSize: '19px', fontWeight: 600 }}>{board.title}</span>
          <span style={S.muted}>‹</span>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: `BoardPanels.jsx`**

The old `AdminHome` body, scoped to one board: fetch `getContent()` once, count that board's panels, and render a row each plus the settings row when the board has one.

```jsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getContent } from '../../services/content';
import { PANEL_META } from './panelMeta';
import { BOARD_BY_ID } from './boards';
import { SETTINGS_META } from './timesMeta';
import * as S from './adminStyles';

export default function BoardPanels() {
  const { board: boardId } = useParams();
  const board = BOARD_BY_ID[boardId];
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!board) return;
    let cancelled = false;
    getContent()
      .then((doc) => {
        if (cancelled) return;
        setCounts(Object.fromEntries(board.panels.map((key) => [key, (doc[key] || []).length])));
      })
      .catch(() => {
        if (!cancelled) setError('לא ניתן להתחבר לשרת');
      });
    return () => { cancelled = true; };
  }, [board]);

  if (!board) {
    return (
      <div style={S.screen}>
        <Link to="/adminGabbai" style={S.backLink}>‹ חזרה</Link>
        <p style={S.muted}>לוח לא קיים</p>
      </div>
    );
  }

  return (
    <div style={S.screen}>
      <Link to="/adminGabbai" style={S.backLink}>‹ חזרה</Link>
      <h1 style={S.title}>{board.title}</h1>
      {error && <div style={S.error}>{error}</div>}

      {board.panels.map((key) => (
        <Link key={key} to={`/adminGabbai/${key}`} style={S.row}>
          <span style={{ fontSize: '26px' }}>{PANEL_META[key].icon}</span>
          <span style={{ flex: 1, fontSize: '19px', fontWeight: 600 }}>{PANEL_META[key].title}</span>
          <span style={{ color: S.COLORS.gold, fontSize: '18px' }}>{counts ? counts[key] : '…'}</span>
          <span style={S.muted}>‹</span>
        </Link>
      ))}

      {/* A single record rather than a list, so it carries no count. */}
      {board.settings && (
        <Link to={`/adminGabbai/settings/${board.settings}`} style={{ ...S.row, marginTop: '18px' }}>
          <span style={{ fontSize: '26px' }}>{SETTINGS_META[board.settings].icon}</span>
          <span style={{ flex: 1, fontSize: '19px', fontWeight: 600 }}>{SETTINGS_META[board.settings].title}</span>
          <span style={S.muted}>‹</span>
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Routes**

In `client/src/App.jsx`:

```jsx
<Route path="/adminGabbai" element={<AdminHome />} />
{/* Above /:panel for the reader's benefit only. React Router ranks static segments over
    dynamic ones regardless of order, unlike Express — see routes/content.js, where the same
    shape of collision DOES depend on declaration order. */}
<Route path="/adminGabbai/board/:board" element={<BoardPanels />} />
{/* The bare path is kept as an alias for שבת: it is what the gabbai's phone has bookmarked. */}
<Route path="/adminGabbai/settings" element={<TimesForm />} />
<Route path="/adminGabbai/settings/:group" element={<TimesForm />} />
<Route path="/adminGabbai/:panel" element={<PanelList />} />
<Route path="/adminGabbai/:panel/new" element={<ItemForm />} />
<Route path="/adminGabbai/:panel/:id" element={<ItemForm />} />
```

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Admin/boards.js client/src/pages/Admin/BoardPanels.jsx client/src/pages/Admin/AdminHome.jsx client/src/pages/Admin/panelMeta.js client/src/App.jsx
git commit -m "feat(admin): a board level above the panels, ready for the חגים after this one"
```

---

## Task 9: The generalised times form, select fields and reordering UI

**Files:**
- Create: `client/src/pages/Admin/timesMeta.js`, `client/src/pages/Admin/TimesForm.jsx`
- Delete: `client/src/pages/Admin/ShabbatTimesForm.jsx`
- Modify: `client/src/pages/Admin/ItemForm.jsx`, `client/src/pages/Admin/PanelList.jsx`

**Interfaces:**
- Consumes: Tasks 4, 5, 8.
- Produces: `SETTINGS_META: Record<group, {title, icon, intro, rows: [{key,label,auto}], load: () => Promise<Record<string,string|null>>}>`.

- [ ] **Step 1: `timesMeta.js`**

```js
import { getZmanim, getParasha, getHolidayCalendar } from '../../services/hebcal';
import {
  SHABBAT_CONFIG,
  resolveShabbatTimes,
  shabbatAnchors,
  upcomingSaturday,
  israelToday,
} from '../../components/display/displayData';
import {
  HOLIDAY_WINDOW_BACK_DAYS,
  HOLIDAY_WINDOW_DAYS,
  ROSH_HASHANAH,
  holidayAnchors,
  resolveRoshTimes,
} from '../../components/rosh/roshData';

// One descriptor per settings group. `rows` names the stored key, its Hebrew label, and which
// key of `load`'s output holds the automatic value — they differ because the stored override
// is `mincha` while the computed value is `shabMincha`.
//
// `load` resolves with NO overrides applied: what each row would show if its field were left
// empty, which is exactly the number the gabbai's decision turns on.
export const SETTINGS_META = {
  shabbat: {
    title: 'זמני שבת',
    icon: '🕯',
    intro: 'שדה ריק מחושב אוטומטית מזמני היום. מילוי שעה קובע אותה על הלוח עד שתנקה אותה.',
    rows: [
      { key: 'candles', label: 'הדלקת נרות', auto: 'shabCandles' },
      { key: 'kabbalat', label: 'מנחה וקבלת שבת', auto: 'shabKabbalat' },
      { key: 'shacharit', label: 'שחרית', auto: 'shabShacharit' },
      { key: 'mincha', label: 'מנחה', auto: 'shabMincha' },
      { key: 'arvit', label: 'ערבית מוצ״ש', auto: 'shabArvit' },
    ],
    load: async () => {
      const saturday = upcomingSaturday(new Date());
      const [parasha, satZmanim] = await Promise.allSettled([
        getParasha(SHABBAT_CONFIG.candleLightingMinBeforeSunset),
        getZmanim(saturday),
      ]);
      const value = (r) => (r.status === 'fulfilled' ? r.value : null);
      return resolveShabbatTimes({
        ...shabbatAnchors(value(parasha), saturday),
        saturdaySunset: value(satZmanim)?.times?.sunset,
      });
    },
  },
  rosh: {
    title: 'זמני ראש השנה',
    icon: '🍎',
    intro: 'שדה ריק נמשך אוטומטית מלוח השנה עבור ניצן. מילוי שעה קובע אותה על הלוח עד שתנקה אותה.',
    rows: [
      { key: 'candles1', label: 'הדלקת נרות · ערב יום א׳', auto: 'candles1' },
      { key: 'candles2', label: 'הדלקת נרות · ליל יום ב׳', auto: 'candles2' },
      { key: 'havdalah', label: 'מוצאי החג', auto: 'havdalah' },
    ],
    load: async () => {
      const from = israelToday(new Date());
      const start = new Date(from.getFullYear(), from.getMonth(), from.getDate() - HOLIDAY_WINDOW_BACK_DAYS, 12, 0, 0, 0);
      const response = await getHolidayCalendar(start, HOLIDAY_WINDOW_DAYS);
      return resolveRoshTimes(holidayAnchors(response, ROSH_HASHANAH), {});
    },
  },
};

export const DEFAULT_SETTINGS_GROUP = 'shabbat';
```

- [ ] **Step 2: `TimesForm.jsx`**

Copy `ShabbatTimesForm.jsx` and make four changes, keeping every comment that explains *why* it is built the way it is:

1. `const { group = DEFAULT_SETTINGS_GROUP } = useParams();` and `const meta = SETTINGS_META[group];` — render `הגדרות לא קיימות` when `meta` is missing.
2. `ROWS` → `meta.rows`; `BLANK` derived from them inside the component.
3. Load `getSettings()` and read `stored?.[group]`; save `updateSettings({ [group]: values })`.
4. Back link to `/adminGabbai/board/{the board whose settings is this group}`, found from `BOARDS`.

Both effects keep their existing shapes and their comments — in particular the automatic values must stay in a **separate** effect that nothing waits on, so a slow Hebcal cannot disable the form.

Then `git rm client/src/pages/Admin/ShabbatTimesForm.jsx` and update its import in `App.jsx`.

- [ ] **Step 3: `ItemForm.jsx` gains `select`**

Beside the existing `rich` and `textarea` branches:

```jsx
) : field.type === 'select' ? (
  // Native, not a custom listbox: this admin is used on a phone, and a native select gets
  // the platform's own picker.
  <select
    id={field.key}
    value={values[field.key] || field.options[0].value}
    onChange={(e) => setField(field.key, e.target.value)}
    style={S.input}
  >
    {field.options.map((option) => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
  </select>
) : (
```

A new item's initial value is `''` (see the `emptyValues` builder at the top of the file), and `value={values[key] || field.options[0].value}` makes the first option the visible default without a second source of truth for it.

- [ ] **Step 4: `PanelList.jsx` gains reordering and a board-aware back link**

```jsx
import { reorderPanel } from '../../services/content';
import { boardOfPanel } from './boards';
```

```jsx
const backTo = boardOfPanel(panel) ? `/adminGabbai/board/${boardOfPanel(panel)}` : '/adminGabbai';
```

```jsx
// Optimistic, like the isActive toggle above: the row moves under the finger and rolls back if
// the save fails. The whole id list goes to the server, which rejects an order computed
// against a list it no longer holds — see reorderPanel in the controller.
const move = async (index, delta) => {
  const target = index + delta;
  if (target < 0 || target >= items.length) return;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];

  const previous = items;
  setItems(next);
  setError('');
  try {
    await reorderPanel(panel, next.map((it) => it.id));
  } catch {
    setItems(previous);
    setError('הסדר לא נשמר');
  }
};
```

Two buttons on each card's action row, disabled at the ends:

```jsx
<button type="button" onClick={() => move(index, -1)} disabled={index === 0} style={{ ...S.button, opacity: index === 0 ? 0.35 : 1 }}>▲</button>
<button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} style={{ ...S.button, opacity: index === items.length - 1 ? 0.35 : 1 }}>▼</button>
```

`items.map((item) => …)` becomes `items.map((item, index) => …)`.

- [ ] **Step 5: Verify the whole admin by hand**

Run: `npm run dev` at the root, then walk `/adminGabbai`:

1. Four boards listed. `ראש השנה` → five panels with counts 11 / 10 / 18 / 1 / 5, plus `זמני ראש השנה`.
2. `זמני ראש השנה` shows `אוטומטי · חישוב: 18:32`, `19:28`, `19:27` under its three fields.
3. Pin `הדלקת נרות · ערב יום א׳` to `18:15`, save, and confirm on `/tv?screen=rosh` within 30s.
4. Open `זמני שבת`, save it unchanged, then reopen `זמני ראש השנה` — **`18:15` must still be there.** This is the group-merge regression and it is the single most important check in the plan.
5. Clear the pin and confirm the board returns to `18:32`.
6. `יום א׳ דראש השנה` → move `תשליך` up one, reload, order holds.
7. Edit a row's `סוג השורה` to `תקיעת שופר` and confirm the שופר card follows it.
8. Every panel's `‹ חזרה` lands on its own board, not the home screen.

- [ ] **Step 6: Full test suite and build**

Run: `npm test` at the root, then `npm --prefix client run build` and `npm --prefix client run lint`.
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add -A client/src/pages/Admin client/src/App.jsx
git commit -m "feat(admin): one times form per board, select fields and row reordering"
```

---

## Self-Review

**Spec coverage.** Spec §1 → Tasks 1, 3. §2 → Tasks 2, 5. §3 → Tasks 5, 6, 7. §4 → Tasks 8, 9. §5 → Task 4. §6 → Task 3. §7 → Task 8's `boards.js`. §8 → the test steps in Tasks 1–5 plus the manual walk in Tasks 7 and 9. §9 needs no task. No gaps.

**Placeholders.** None: every code step carries the code, every test step the assertions, every verification step the command and its expected output.

**Type consistency.** `holidayAnchors` returns `{day1Date, day2Date, lastDate, candles1, candles2, havdalah}` in Task 5 and is destructured with exactly those names in Tasks 6 and 9. `resolveRoshTimes(anchors, overrides)` keeps its argument order at all three call sites. `mechirotPages(items, perPage)` returns `[{day, rows}]` and is read as `page.rows` / `page.day`. `rowStyle(kind)` returns the object `DayListCard` reads as `row.style.*`. `reorderPanel(panel, ids)` is the same name on both sides of the wire. `SETTINGS_META[group].rows[].auto` indexes the output of the same descriptor's `load()` — `shabCandles…` for שבת and `candles1…` for ראש השנה, matching each resolver's own output keys.

**One known behaviour change**, flagged rather than hidden: a `PUT /content/settings` whose body carries no `shabbat` key no longer clears the stored שבת overrides — it leaves them alone. No client ever sends that body, but Task 2 Step 1 exists to catch an existing test that asserted the old semantics.
