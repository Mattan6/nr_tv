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

test('the served image is cacheable forever and unsniffable', async () => {
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
