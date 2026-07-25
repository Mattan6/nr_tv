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

// Placed last deliberately: it fills a panel to MAX_ITEMS, which would break any
// later test that expects to create in the same panel.
test('POST refuses to add to a panel already at MAX_ITEMS', async () => {
  const { contentStore } = require('../src/store/contentStore');
  const { MAX_ITEMS } = require('../src/store/panels');

  // Top the panel up to the cap through the store directly, in one write — MAX_ITEMS
  // individual HTTP round trips would make this test needlessly slow.
  await contentStore.update((draft) => {
    while (draft.azkarot.length < MAX_ITEMS) {
      draft.azkarot.push({
        id: `bulk-${draft.azkarot.length}`,
        name: 'ממולא',
        detail: '',
        date: 'א',
        isActive: true,
      });
    }
  });

  const res = await send('POST', `${base}/azkarot`, { name: 'חדש', detail: '', date: 'ב' });
  const body = await res.json();

  assert.strictEqual(res.status, 400);
  assert.ok(body.message.includes(String(MAX_ITEMS)), 'expected the Hebrew message to name the limit');

  const list = await (await fetch(`${base}/azkarot`)).json();
  assert.strictEqual(list.length, MAX_ITEMS, 'the over-limit item must not have been added');
});

// --- Shabbat settings -------------------------------------------------------------
//
// A single record, not a panel, reached through its own two routes. The ordering test
// below is the one that matters: /settings is declared before /:panel, and if that
// ordering is ever lost the request lands in getPanel, where isPanel('settings') is
// false and the answer becomes a 404.

test('GET /api/content/settings reaches the settings, not the panel handler', async () => {
  const res = await fetch(`${base}/settings`);
  const settings = await res.json();

  assert.strictEqual(res.status, 200);
  assert.ok(settings.shabbat, 'expected a shabbat record, got the panel 404 instead');
  assert.strictEqual(settings.shabbat.mincha, '');
});

test('PUT /api/content/settings round-trips', async () => {
  const res = await send('PUT', `${base}/settings`, {
    shabbat: { candles: '18:00', kabbalat: '', shacharit: '', mincha: '17:30', arvit: '' },
  });

  assert.strictEqual(res.status, 200);
  const after = await (await fetch(`${base}/settings`)).json();
  assert.strictEqual(after.shabbat.candles, '18:00');
  assert.strictEqual(after.shabbat.mincha, '17:30');
  assert.strictEqual(after.shabbat.arvit, '');

  // Clearing a field is how a gabbai goes back to the automatic value.
  await send('PUT', `${base}/settings`, {
    shabbat: { candles: '', kabbalat: '', shacharit: '', mincha: '', arvit: '' },
  });
  assert.strictEqual((await (await fetch(`${base}/settings`)).json()).shabbat.candles, '');
});

test('PUT /api/content/settings rejects a malformed time with a field error', async () => {
  const res = await send('PUT', `${base}/settings`, { shabbat: { mincha: '25:61' } });
  const body = await res.json();

  assert.strictEqual(res.status, 400);
  assert.ok(body.errors.mincha);
  // Nothing was written.
  assert.strictEqual((await (await fetch(`${base}/settings`)).json()).shabbat.mincha, '');
});

// --- The ticker panel -------------------------------------------------------------

test('ticker is a panel like any other', async () => {
  const created = await (await send('POST', `${base}/ticker`, { text: 'שורה חדשה בפס' })).json();
  assert.strictEqual(created.isActive, true);
  assert.strictEqual(created.text, 'שורה חדשה בפס');

  const hidden = await (
    await send('PUT', `${base}/ticker/${created.id}`, { text: 'שורה חדשה בפס', isActive: false })
  ).json();
  assert.strictEqual(hidden.isActive, false);

  const del = await send('DELETE', `${base}/ticker/${created.id}`);
  assert.strictEqual(del.status, 200);

  const list = await (await fetch(`${base}/ticker`)).json();
  assert.strictEqual(list.some((it) => it.id === created.id), false);
});

test('ticker rejects a blank line', async () => {
  const res = await send('POST', `${base}/ticker`, { text: '   ' });

  assert.strictEqual(res.status, 400);
  assert.ok((await res.json()).errors.text);
});
