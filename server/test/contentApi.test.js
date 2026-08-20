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

// --- Rich הודעות ------------------------------------------------------------------

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

// --- Reordering a panel ------------------------------------------------------------
//
// The ordering trap the settings pair at the top of this file documents applies here too, and
// harder: PUT /content/:panel/order must be declared before PUT /content/:panel/:id, or the
// request lands in updateItem trying to edit an item whose id is 'order' and answers 404.
// The first test below is what catches that if the declaration order is ever lost.

test('PUT /api/content/:panel/order reaches the reorder handler, not updateItem', async () => {
  const before = await (await fetch(`${base}/roshDay1`)).json();
  const ids = before.map((it) => it.id);
  const swapped = [ids[1], ids[0], ...ids.slice(2)];

  const res = await send('PUT', `${base}/roshDay1/order`, { ids: swapped });
  const body = await res.json();

  assert.strictEqual(res.status, 200, 'expected the reorder handler, got the item 404 instead');
  assert.deepStrictEqual(body.map((it) => it.id), swapped);

  const after = await (await fetch(`${base}/roshDay1`)).json();
  assert.deepStrictEqual(after.map((it) => it.id), swapped);
  // The items themselves travelled intact — this reorders, it does not rebuild.
  assert.strictEqual(after[0].name, before[1].name);
  assert.strictEqual(after[0].chazan, before[1].chazan);
});

// A permutation check rather than a positional patch. Two admin tabs open on one phone is an
// ordinary thing to happen, and an order computed against a list the server no longer holds
// must be refused whole rather than partly applied.
test('reorder refuses anything that is not a permutation, and writes nothing', async () => {
  const before = await (await fetch(`${base}/roshDay1`)).json();
  const ids = before.map((it) => it.id);

  const rejected = [
    ids.slice(1), // short
    [ids[0], ids[0], ...ids.slice(2)], // a duplicate, which would clone one row over another
    ['no-such-id', ...ids.slice(1)], // unknown
    [...ids, ids[0]], // long
  ];

  for (const bad of rejected) {
    const res = await send('PUT', `${base}/roshDay1/order`, { ids: bad });
    assert.strictEqual(res.status, 400, `expected 400 for ${JSON.stringify(bad).slice(0, 40)}`);
  }

  const after = await (await fetch(`${base}/roshDay1`)).json();
  assert.deepStrictEqual(after.map((it) => it.id), ids);
});

test('reorder rejects a missing or non-array ids field', async () => {
  for (const body of [{}, { ids: 'a,b' }, { ids: null }, undefined]) {
    assert.strictEqual((await send('PUT', `${base}/roshDay1/order`, body)).status, 400);
  }
});

test('reorder on an unknown panel is a 404', async () => {
  assert.strictEqual((await send('PUT', `${base}/parnas/order`, { ids: [] })).status, 404);
});

test('reorder works on any panel, not just the חג ones', async () => {
  const before = await (await fetch(`${base}/roshTicker`)).json();
  const reversed = before.map((it) => it.id).reverse();

  const res = await send('PUT', `${base}/roshTicker/order`, { ids: reversed });

  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(
    (await (await fetch(`${base}/roshTicker`)).json()).map((it) => it.id),
    reversed
  );
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

// --- Settings are grouped per board ------------------------------------------------
//
// `settings` holds one group per board that has pinnable times — `shabbat` and now `rosh`.
// The group is the unit of replacement, and the asymmetry is the whole point:
//
//   within a group  every key is written whether or not the body carried it, so a blank
//                   really does clear a pin (the two tests above rely on that);
//   across groups   a group the body did not name is left exactly as it was.
//
// Without the second half every save on the זמני שבת screen would silently blank the חג
// overrides, because that form posts `{shabbat: …}` and nothing else.

test('a settings PUT carrying only shabbat leaves rosh untouched', async () => {
  await send('PUT', `${base}/settings`, {
    rosh: { candles1: '18:32', candles2: '19:28', havdalah: '19:27' },
  });
  await send('PUT', `${base}/settings`, {
    shabbat: { candles: '18:05', kabbalat: '', shacharit: '', mincha: '', arvit: '' },
  });

  const after = await (await fetch(`${base}/settings`)).json();
  assert.strictEqual(after.shabbat.candles, '18:05');
  assert.strictEqual(after.rosh.candles1, '18:32');
  assert.strictEqual(after.rosh.havdalah, '19:27');
});

test('a settings PUT carrying only rosh leaves shabbat untouched', async () => {
  await send('PUT', `${base}/settings`, {
    shabbat: { candles: '18:05', kabbalat: '', shacharit: '', mincha: '', arvit: '' },
  });
  await send('PUT', `${base}/settings`, {
    rosh: { candles1: '', candles2: '', havdalah: '' },
  });

  const after = await (await fetch(`${base}/settings`)).json();
  assert.strictEqual(after.shabbat.candles, '18:05');
  assert.strictEqual(after.rosh.candles1, '');
});

test('within the rosh group a blank clears a pinned time', async () => {
  await send('PUT', `${base}/settings`, {
    rosh: { candles1: '18:32', candles2: '19:28', havdalah: '19:27' },
  });
  await send('PUT', `${base}/settings`, {
    rosh: { candles1: '', candles2: '19:28', havdalah: '19:27' },
  });

  const after = await (await fetch(`${base}/settings`)).json();
  assert.strictEqual(after.rosh.candles1, '');
  assert.strictEqual(after.rosh.candles2, '19:28');
});

test('a malformed rosh time is a 400 and writes nothing', async () => {
  await send('PUT', `${base}/settings`, {
    rosh: { candles1: '18:32', candles2: '', havdalah: '' },
  });

  const res = await send('PUT', `${base}/settings`, {
    rosh: { candles1: '6pm', candles2: '', havdalah: '' },
  });
  const body = await res.json();

  assert.strictEqual(res.status, 400);
  assert.ok(body.errors.candles1);
  assert.strictEqual((await (await fetch(`${base}/settings`)).json()).rosh.candles1, '18:32');
});

// --- The dedication panel ---------------------------------------------------------
//
// Seeded empty, unlike every other panel — so this is also the one place the API's
// "a panel starts as []" path is exercised end to end.

test('dedication starts empty and round-trips through the panel routes', async () => {
  assert.deepStrictEqual(await (await fetch(`${base}/dedication`)).json(), []);

  const created = await (
    await send('POST', `${base}/dedication`, {
      lead: 'מוקדש להצלחת',
      names: 'משפחת מזוז',
      note: 'בכל העניינים',
    })
  ).json();
  assert.strictEqual(created.isActive, true);
  assert.strictEqual(created.names, 'משפחת מזוז');

  const del = await send('DELETE', `${base}/dedication/${created.id}`);
  assert.strictEqual(del.status, 200);
  assert.deepStrictEqual(await (await fetch(`${base}/dedication`)).json(), []);
});

test('dedication accepts a blank closing note but not a blank name', async () => {
  const ok = await send('POST', `${base}/dedication`, { lead: 'מוקדש לרפואת', names: 'משפחת כהן', note: '' });
  assert.strictEqual(ok.status, 201);
  assert.strictEqual((await ok.json()).note, '');

  const bad = await send('POST', `${base}/dedication`, { lead: 'מוקדש לרפואת', names: '  ', note: '' });
  assert.strictEqual(bad.status, 400);
  assert.ok((await bad.json()).errors.names);
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
