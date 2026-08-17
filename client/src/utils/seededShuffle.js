// A shuffle that is random per seed and identical for the same seed.
//
// It exists for the jokes panel. The pool is ~150 jokes the server returns in a fixed order
// — it appends scraped jokes with `push` and never reorders — and the panel used to walk it
// from index 0 on every mount. So every page load opened on the same joke and showed the
// same handful; a congregant looking at their phone for two minutes never saw the other
// hundred and forty.
//
// **Determinism is the load-bearing property, not an implementation detail.**
// `useDisplayContent` polls every 30 seconds and hands back a brand-new array object each
// time, so anything derived from it is recomputed constantly. An ordinary `Math.random()`
// shuffle would therefore reorder the pool twice a minute and throw the viewer to an
// unrelated joke mid-read. Seeding instead means the caller holds one random number for the
// life of the mount, recomputes as often as it likes, and always gets the same order back.
// That also removes any need to memoize it.
//
// The order does change when the pool itself changes — a scrape adds jokes and every
// position moves. That happens once every twenty-four hours (server/src/jokes/refresh.js),
// which is a price worth paying for having no cache to invalidate.

// mulberry32: a small, well-distributed 32-bit PRNG. Chosen over `(seed * 9301 + 49297) % 233280`
// and friends because those degenerate badly for small seeds — and 0 is a seed the caller can
// legitimately draw. Its `|= 0` / `>>> 0` arithmetic keeps everything in 32-bit integer space.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher–Yates, walked backwards, over a copy.
//
// A copy because the caller's array belongs to useDisplayContent's cache, and mutating it
// would reorder the pool every consumer sees. Fisher–Yates rather than `sort(() => rand - 0.5)`
// because the latter is not a uniform shuffle and, worse, is not even a permutation under
// some engines' sort implementations — and dropping or duplicating a joke would be a worse
// bug than the one this fixes.
export default function seededShuffle(list, seed) {
  const out = [...list];
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
