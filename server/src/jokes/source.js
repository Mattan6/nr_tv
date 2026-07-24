// Fetches and parses yo-yoo.co.il joke pages. Knows nothing about what makes a joke
// acceptable — that is filter.js — and nothing about storage — that is refresh.js.
//
// Two things about this site drive the whole module:
//   1. It serves windows-1255, not UTF-8. Read as UTF-8, every joke is mojibake.
//   2. Its markup is legacy but stable: one <div class="everyDesc"> per joke.

const BASE = 'https://www.yo-yoo.co.il/jokes/';

// windows-1255 percent-encodings of the Hebrew category names, read off the site's own
// category links rather than hand-encoded: קרש and נקיות.
const CATEGORIES = ['%F7%F8%F9', '%F0%F7%E9%E5%FA'];
const PAGES_PER_CATEGORY = 6;

// robots.txt asks bingbot for Crawl-delay: 1. Nothing binds us to it as a generic agent,
// but a wall display has no reason to be greedier than a search engine.
const DELAY_MS = 1000;
const TIMEOUT_MS = 15000;
const USER_AGENT = 'synagogue-display/1.0 (+shul wall display; one request per second)';

const pageUrl = (category, page) => `${BASE}?cat=${category}&page=${page}`;

// Node's TextDecoder carries the legacy encodings via full-ICU, which ships by default —
// hence no iconv-lite dependency. Do not replace this with response.text(): that decodes
// as UTF-8 and turns every joke into replacement characters.
const decodePage = (buffer) => new TextDecoder('windows-1255').decode(buffer);

// Returns raw inner HTML per joke; normalization and screening happen in filter.js so this
// stays a parser and nothing more.
const parseJokes = (html) =>
  [...html.matchAll(/<div class="everyDesc">([\s\S]*?)<\/div>/g)].map((m) => m[1]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPage(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseJokes(decodePage(await response.arrayBuffer()));
}

// Walks every page of every category sequentially. A page that fails is logged and
// skipped: the display is unattended, so a partial harvest beats an empty one.
async function fetchAll({
  fetchImpl = fetch,
  delayMs = DELAY_MS,
  categories = CATEGORIES,
  pages = PAGES_PER_CATEGORY,
} = {}) {
  const collected = [];
  let first = true;
  for (const category of categories) {
    for (let page = 1; page <= pages; page += 1) {
      if (!first && delayMs) await sleep(delayMs);
      first = false;
      const url = pageUrl(category, page);
      try {
        collected.push(...(await fetchPage(url, fetchImpl)));
      } catch (err) {
        console.error(`Jokes: failed to fetch ${url}: ${err.message}`);
      }
    }
  }
  return collected;
}

module.exports = { decodePage, parseJokes, pageUrl, fetchAll, CATEGORIES, PAGES_PER_CATEGORY };
