const { randomUUID } = require('node:crypto');
const { screen, normalize } = require('./filter');
const { fetchAll: fetchAllJokes } = require('./source');

// Well under the store's MAX_ITEMS (500). The pool only has to be large enough that the
// wall does not visibly repeat inside a visit; one refresh of both categories yields
// roughly 350 candidates, so this fills on the first successful run.
const MAX_POOL = 150;

const REFRESH_MS = 24 * 60 * 60 * 1000;
// Late enough that a slow or hanging site cannot delay the server accepting requests.
const BOOT_DELAY_MS = 30000;

// Mutates `draft`, returns how many jokes were added.
//
// `draft.jokes` is created here rather than declared in contentStore's PANEL_ARRAY_KEYS on
// purpose: adding it there would make every content.json written before this feature
// "wrong-shaped", quarantining the gabbai's real announcements and azkarot and serving the
// seed in their place. server/test/jokesRefresh.test.js pins that upgrade path.
function mergeJokes(draft, incoming) {
  if (!Array.isArray(draft.jokes)) draft.jokes = [];
  // Dedup on normalized text on BOTH sides, not the raw scrape, so the same joke with
  // different whitespace or markup is recognised as a duplicate. Normalizing the stored
  // side too matters for pools written before jokes were flattened to a single line:
  // otherwise "שורה\nשנייה" and "שורה שנייה" would both be kept.
  const seen = new Set(draft.jokes.map((j) => normalize(j.text)));
  let added = 0;
  for (const raw of incoming) {
    if (draft.jokes.length >= MAX_POOL) break;
    const verdict = screen(raw);
    if (!verdict.ok || seen.has(verdict.text)) continue;
    seen.add(verdict.text);
    draft.jokes.push({ id: randomUUID(), text: verdict.text, isActive: true });
    added += 1;
  }
  return added;
}

// Never rejects. The display is unattended and the content API must keep serving even when
// yo-yoo is down, has changed its markup, or is returning nothing usable. Any failure
// leaves the existing pool exactly as it was — stale jokes beat a blank card.
async function refreshJokes(store, { fetchAll = fetchAllJokes } = {}) {
  try {
    const incoming = await fetchAll();
    if (!incoming.length) {
      console.error('Jokes: refresh returned no jokes; keeping the existing pool.');
      return { added: 0, total: (await store.read()).jokes?.length || 0 };
    }
    let added = 0;
    await store.update((draft) => {
      added = mergeJokes(draft, incoming);
    });
    const total = (await store.read()).jokes.length;
    console.log(
      `Jokes: refreshed — ${added} added from ${incoming.length} scraped, pool now ${total}.`
    );
    return { added, total };
  } catch (err) {
    console.error(`Jokes: refresh failed, keeping the existing pool: ${err.message}`);
    const doc = await store.read().catch(() => ({}));
    return { added: 0, total: doc.jokes?.length || 0 };
  }
}

function startJokeRefresh(store) {
  const run = () => refreshJokes(store);
  // unref so neither timer holds the process open — matters for tests and for a clean
  // shutdown, not for the TV.
  setTimeout(run, BOOT_DELAY_MS).unref();
  setInterval(run, REFRESH_MS).unref();
}

module.exports = { mergeJokes, refreshJokes, startJokeRefresh, MAX_POOL };
