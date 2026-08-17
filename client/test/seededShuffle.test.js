import test from 'node:test';
import assert from 'node:assert/strict';
import seededShuffle from '../src/utils/seededShuffle.js';

const pool = (n) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, text: `joke ${i}` }));

// The property the jokes panel actually depends on. useDisplayContent replaces the jokes
// array with a fresh object every 30 seconds, so the shuffle is recomputed constantly; if
// it were not deterministic the viewer would be thrown to a different joke twice a minute.
test('the same list and seed always produce the same order', () => {
  const list = pool(150);
  const a = seededShuffle(list, 12345);
  const b = seededShuffle(list, 12345);
  assert.deepEqual(a.map((j) => j.id), b.map((j) => j.id));

  // A fresh array with equal contents — what every poll hands over — must not reorder.
  const repolled = list.map((j) => ({ ...j }));
  assert.deepEqual(
    seededShuffle(repolled, 12345).map((j) => j.id),
    a.map((j) => j.id)
  );
});

// The whole point of the change: a different page load gets a different order.
test('different seeds produce different orders', () => {
  const list = pool(150);
  const first = seededShuffle(list, 1).map((j) => j.id);
  const orders = new Set();
  for (let seed = 1; seed <= 20; seed += 1) orders.add(seededShuffle(list, seed).map((j) => j.id).join(','));
  assert.ok(orders.size >= 19, `expected ~20 distinct orders from 20 seeds, got ${orders.size}`);
  // And not merely a rotation of the original — every seed must actually shuffle.
  assert.notDeepEqual(first, list.map((j) => j.id));
});

// The failure that would be worse than the bug: a shuffle that drops or repeats a joke.
test('the result is a true permutation — nothing dropped, nothing duplicated', () => {
  const list = pool(150);
  for (let seed = 1; seed <= 50; seed += 1) {
    const out = seededShuffle(list, seed);
    assert.equal(out.length, list.length, `seed ${seed}: length changed`);
    assert.deepEqual(
      out.map((j) => j.id).sort(),
      list.map((j) => j.id).sort(),
      `seed ${seed}: not a permutation`
    );
    assert.equal(new Set(out.map((j) => j.id)).size, list.length, `seed ${seed}: duplicate entry`);
  }
});

test('does not mutate its input', () => {
  const list = pool(20);
  const before = list.map((j) => j.id);
  seededShuffle(list, 7);
  assert.deepEqual(list.map((j) => j.id), before);
});

test('empty and single-item lists are returned unharmed', () => {
  assert.deepEqual(seededShuffle([], 3), []);
  assert.deepEqual(seededShuffle([{ id: 'only' }], 3).map((j) => j.id), ['only']);
});

// Every seed the hook can generate must behave. A PRNG seeded with 0 that degenerates to a
// fixed sequence would put every viewer who drew 0 on the same order — the original bug,
// surviving in one branch.
test('every seed the hook can produce shuffles, including 0', () => {
  const list = pool(150);
  for (const seed of [0, 1, 2 ** 31, 2 ** 32 - 1]) {
    const out = seededShuffle(list, seed).map((j) => j.id);
    assert.equal(new Set(out).size, list.length, `seed ${seed}: not a permutation`);
    assert.notDeepEqual(out, list.map((j) => j.id), `seed ${seed}: returned the input order`);
  }
});
