// The explicit .js matters: this module is reached by `node --test`, whose ESM loader does not
// resolve extensionless paths the way Vite does. Same reason parashaHighlights.js spells out
// its own import.
import { israelParts, localYmd, toClock } from '../display/displayData.js';

const pad2 = (n) => String(n).padStart(2, '0');

// The window the board asks Hebcal for.
//
// The three days back are what keep the board correct DURING the חג itself and the morning
// after — without them, the first item in range on the second day of יום טוב would be next
// year's. The four hundred forward guarantee exactly one ראש השנה is in range whatever day of
// the year someone switches the TV to this board.
export const HOLIDAY_WINDOW_BACK_DAYS = 3;
export const HOLIDAY_WINDOW_DAYS = 400;

// The חג this board is about, in the shape holidayAnchors takes.
//
// `title` is matched with startsWith because Hebcal names the two days differently —
// 'Rosh Hashana 5787' and 'Rosh Hashana II'. It is Hebcal's English title rather than anything
// Hebrew: see getHolidayCalendar on why that request carries no `lg=he`.
export const ROSH_HASHANAH = { title: 'Rosh Hashana', days: 2 };

const EMPTY_ANCHORS = {
  day1Date: null,
  day2Date: null,
  lastDate: null,
  candles1: null,
  candles2: null,
  havdalah: null,
};

// A local-noon Date from a 'YYYY-MM-DD' prefix.
//
// Noon rather than midnight so a DST jump in the DEVICE's own zone cannot slide the date back
// a day — the same convention israelDateAtNoon uses in displayData.js. Every Date this module
// returns follows it, which is why consumers must read them with LOCAL getters and format them
// WITHOUT a timeZone option: the Israel calendar fields are already baked in, and pushing one
// through a Jerusalem formatter would convert what is already converted.
function dateFromYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(typeof ymd === 'string' ? ymd : '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

const shiftDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0, 0);

// One חג out of a getHolidayCalendar response: its dates, and the candle/הבדלה timestamps that
// bracket it. Timestamps come back RAW, as shabbatAnchors returns them, so `toClock` can format
// them on Jerusalem's clock rather than on whatever the panel's own is set to.
//
// `yomtov: true` is what makes the match safe, and it is not decoration. 'Erev Rosh Hashana' is
// ALSO category 'holiday' with subcat 'major', and it lands a day EARLIER — so a matcher keyed
// on category and title alone takes ערב ראש השנה as day one and slides the entire board back
// twenty-four hours, silently and plausibly. Only the real חג days carry the flag.
//
// The anchors are matched to DATES rather than taken by position, for the reason shabbatAnchors
// already documents: a window holding ראש השנה also holds the Shabbat after it, with its own
// candles and הבדלה further down the same array. A missing item yields null, which every card
// renders as '--:--' — a חג board must never post a time from last year.
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
    // ליל יום ב׳ — lit ON day one, at nightfall, and on ראש השנה always from an existing flame,
    // which is what the card's own note says. Absent for a one-day חג; that is what `days` is
    // for, and it is how this generalises to יום כיפור.
    candles2: days > 1 ? on('candles', day1Date) : null,
    havdalah: on('havdalah', lastDate),
  };
}

// The gabbai's pinned times applied to this year's anchors. Blank means "compute it".
//
// Resolved at RENDER rather than inside the fetch, the same split resolveShabbatTimes makes and
// for the same reason: the overrides arrive on the 30-second content poll while the anchors
// arrive on a six-hour one, so resolving inside the fetch would leave a time the gabbai just
// pinned unshown for up to six hours, and adding the overrides to the effect's dependencies
// would re-request Hebcal on every poll instead. It is string arithmetic and costs nothing.
export function resolveRoshTimes(anchors = {}, overrides = {}) {
  // An override is a stated fact, not a derivation, so it short-circuits ahead of the anchor —
  // a pinned row is strictly more robust than the computed one it replaces and shows through a
  // total Hebcal outage.
  const pin = (key, auto) => overrides?.[key] || auto;
  return {
    candles1: pin('candles1', toClock(anchors.candles1)),
    candles2: pin('candles2', toClock(anchors.candles2)),
    havdalah: pin('havdalah', toClock(anchors.havdalah)),
  };
}

export const MECHIRA_DAY_ORDER = ['day1', 'day2'];

// מכירת המצוות, split into the pages the card rotates through.
//
// The arithmetic is the mockup's, reproduced rather than improved: a page count from `perPage`,
// then a size from the page count. For ten items that gives 4 + 4 + 2 and not an even
// 4 + 3 + 3, which is the shape the card was laid out around.
//
// The two days never share a page, and each is numbered from one — the numbers are positions in
// that day's running order, which is what the gabbai calls out during the auction. Numbering
// here rather than storing it means inserting a מצווה renumbers the rest for free.
export function mechirotPages(items, perPage = 4) {
  const pages = [];
  for (const day of MECHIRA_DAY_ORDER) {
    const rows = (items || [])
      // A missing day reads as day1 rather than vanishing off the board.
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
// documents at length: an epoch difference would have to read the current instant through the
// DEVICE's clock, which is the dependency this whole board is built without. It inherits that
// function's DST caveat too — a countdown spanning one of Israel's four transitions is off by
// the offset until the transition passes. ראש השנה falls nowhere near one.
//
// Both Dates are local-noon (see dateFromYmd), so their difference is a clean multiple of a day
// even across a DST change in the device's own zone; Math.round absorbs a 23h or 25h day.
//
// Clamped at zero rather than allowed to go negative: once the שופר has been blown the card
// shows 00:00:00, not a count upward from an event that has passed.
export function countdownTo(now, targetDate, clock) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(typeof clock === 'string' ? clock : '');
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

// Hebrew numerals, largest first. Used only for the year on the masthead.
const GEMATRIA = [
  [400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'],
  [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'],
  [40, 'מ'], [30, 'ל'], [20, 'כ'], [10, 'י'],
  [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'], [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א'],
];

// 5787 → 'תשפ״ז'.
//
// Written by hand rather than asked of Intl, which is not the obvious choice and needs its
// reason recorded: `Intl.DateTimeFormat('he-u-ca-hebrew', {year: 'numeric'})` answers '5787'
// on Node's ICU build, and `Intl.NumberFormat('he', {numberingSystem: 'hebr'})` answers
// '5,787' — the Hebrew numbering data simply is not there. A browser with full ICU may answer
// correctly, and that is the problem: a masthead reading 'ראש השנה תשפ״ז' on the TV and
// 'ראש השנה 5787' under test is worse than one that never asked. Twenty lines buys the same
// answer everywhere, and a test that pins it.
//
// The millennium is dropped, as it is written: 5787 is תשפ״ז, not ה׳תשפ״ז, on a שנה טובה sign.
export function hebrewYearLetters(year) {
  if (!Number.isInteger(year) || year <= 0) return '';
  let n = year % 1000;
  let out = '';

  for (const [value, letter] of GEMATRIA) {
    // טו and טז, never יה and יו — those spell divine names and are not written as numbers.
    if (n === 15 || n === 16) {
      out += n === 15 ? 'טו' : 'טז';
      n = 0;
      break;
    }
    while (n >= value) {
      out += letter;
      n -= value;
    }
  }

  if (!out) return '';
  // A gershayim before the last letter, or a geresh after a lone one.
  return out.length > 1 ? `${out.slice(0, -1)}״${out.slice(-1)}` : `${out}׳`;
}

// The lettered Hebrew year of one of the local-noon Dates above.
//
// Asked in `en-u-ca-hebrew` rather than `he-…` deliberately: the English locale is what
// guarantees Latin digits come back to be parsed, whatever numbering system the runtime would
// otherwise prefer for Hebrew. No timeZone option — see dateFromYmd.
export function hebrewYearOf(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  try {
    const year = Number(new Intl.DateTimeFormat('en-u-ca-hebrew', { year: 'numeric' }).format(date));
    return hebrewYearLetters(year);
  } catch {
    return '';
  }
}

// The Hebrew weekday of one of the local-noon Dates above.
//
// Hebrew's long form already carries the word יום — 'יום שבת', not 'שבת' — and the board needs
// both halves of that: the תשליך card reads 'תשליך · יום שבת' while the מכירות heading reads
// 'יום א׳ דראש השנה · שבת'. Interpolating the long form into the second would give
// 'יום א׳ דראש השנה · יום שבת'.
//
// `short` is not the answer for the bare form: it yields 'שבת' for Saturday but 'יום א׳' for
// Sunday, which collides with the heading's own 'יום א׳ דראש השנה'. Stripping the prefix off
// the long form is the only variant that reads correctly on every day of the week.
export function weekdayName(date, { bare = false } = {}) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  try {
    const name = new Intl.DateTimeFormat('he', { weekday: 'long' }).format(date);
    return bare ? name.replace(/^יום /, '') : name;
  } catch {
    return '';
  }
}

const SANS = "'Assistant',sans-serif";
const SERIF = "'Frank Ruhl Libre',serif";

// The row treatments, transcribed from the mockup's `_row`.
//
// It chose between these by running regexes over the row's Hebrew NAME; the stored `kind`
// chooses now — see ROW_KINDS in server/src/store/panels.js for why that had to change.
//
// `tashlich` and `piyut` are deliberately identical here. They are separate kinds because only
// תשליך feeds a card, not because they look different: the mockup styled עת שערי רצון and
// תשליך with one regex, fusing appearance with meaning, and this is where they come apart.
export const ROW_STYLES = {
  regular: {
    font: SANS,
    nameColor: '#3a352c',
    subColor: '#6b6553',
    timeColor: '#b0873f',
    rowBg: 'transparent',
    rowAccent: '0',
    rowRadius: '0',
  },
  shiur: {
    font: SANS,
    nameColor: '#5f1a28',
    subColor: '#7d4453',
    timeColor: '#5f1a28',
    rowBg: 'rgba(125,34,51,0.07)',
    rowAccent: '4px solid #9c3348',
    rowRadius: '8px',
  },
  shofar: {
    font: SANS,
    nameColor: '#7a3a05',
    subColor: '#a06a2c',
    timeColor: '#7a3a05',
    rowBg: 'linear-gradient(90deg,rgba(214,138,32,0.26),rgba(214,138,32,0.07))',
    rowAccent: '5px solid #d68a20',
    rowRadius: '10px',
  },
  tashlich: {
    font: SERIF,
    nameColor: '#1f4f6b',
    subColor: '#5a8299',
    timeColor: '#1f4f6b',
    rowBg: 'rgba(31,79,107,0.10)',
    rowAccent: '4px solid #2f7ea6',
    rowRadius: '8px',
  },
  piyut: {
    font: SERIF,
    nameColor: '#1f4f6b',
    subColor: '#5a8299',
    timeColor: '#1f4f6b',
    rowBg: 'rgba(31,79,107,0.10)',
    rowAccent: '4px solid #2f7ea6',
    rowRadius: '8px',
  },
  mechirot: {
    font: SERIF,
    nameColor: '#6d5316',
    subColor: '#8a7136',
    timeColor: '#6d5316',
    rowBg: 'rgba(176,135,63,0.16)',
    rowAccent: '4px solid #b0873f',
    rowRadius: '8px',
  },
};

// An unknown or blank kind reads as `regular`, so a row written straight through the API
// without one still renders. hasOwnProperty rather than a bare lookup: otherwise 'constructor'
// and 'toString' would resolve to a function and the row would try to spread it.
export const rowStyle = (kind) =>
  (typeof kind === 'string' && Object.prototype.hasOwnProperty.call(ROW_STYLES, kind)
    ? ROW_STYLES[kind]
    : ROW_STYLES.regular);
