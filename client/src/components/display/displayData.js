// Static, editable content for the synagogue display dashboard.
// (Prayer schedule, shiurim, announcements, mazal tov, azkarot, parnas, ticker.)
// The zmanim panel is wired to live Hebcal data — see ZMANIM_ROWS below.
import { format } from 'date-fns';

// Weekday (חול) prayers. Each entry is one of:
//   { time: 'HH:MM' }                     — a fixed clock time
//   { from: '<zmanim field>', offsetMin } — derived from TODAY's zmanim
//                                           (e.g. sunrise = הנץ)
//   { computed: '<key>' }                 — a value the container computes and
//                                           passes to resolvePrayers (e.g. the
//                                           weekly מנחה time)
//   { text, afterName }                   — literal text shown instead of a
//                                           time; the countdown follows afterName
export const WEEKDAY_PRAYERS = [
  { name: 'שחרית מניין א׳ (הנץ)', from: 'sunrise' },
  { name: 'שחרית מניין ב׳', time: '08:15' },
  { name: 'מנחה', computed: 'mincha' },
  { name: 'ערבית', text: 'מיד לאחר מנחה', afterName: 'מנחה' },
];

// Every tunable Shabbat value in one place. When the admin panel lands, only the
// SOURCE of this object changes (static import → fetched state); the computation
// below stays as-is.
export const SHABBAT_CONFIG = {
  kabbalatAfterCandlesMin: { summer: 2, winter: 5 },
  shacharit: { summer: '07:45', winter: '07:30' },
  minchaBeforeSunsetMin: 90,
  arvitBeforeHavdalahMin: { summer: 3, winter: 10 },
};

// Five rows, all resolved by resolveShabbatTimes below. סוף זמן ק״ש and מנחה גדולה
// were dropped — both already appear in the זמנים panel — and שיעור בפרשה moved to
// the שיעורים panel.
export const SHABBAT_PRAYERS = [
  { name: 'הדלקת נרות', computed: 'shabCandles' },
  { name: 'מנחה וקבלת שבת', computed: 'shabKabbalat' },
  { name: 'שחרית', computed: 'shabShacharit' },
  { name: 'מנחה', computed: 'shabMincha' },
  { name: 'ערבית מוצ״ש', computed: 'shabArvit' },
];

// Maps each displayed zman to its Hebcal `times` field. Times come live from
// Hebcal for Nitzan (see services/hebcal.js LOCATION).
export const ZMANIM_ROWS = [
  { name: 'עלות השחר', field: 'alotHaShachar' },
  { name: 'הנץ החמה', field: 'sunrise' },
  { name: 'סוזק״ש מג״א', field: 'sofZmanShmaMGA' },
  { name: 'סוזק״ש גר״א', field: 'sofZmanShma' },
  { name: 'סו״ז תפילה', field: 'sofZmanTfilla' },
  { name: 'חצות היום', field: 'chatzot' },
  { name: 'מנחה גדולה', field: 'minchaGedola' },
  { name: 'שקיעת החמה', field: 'sunset' },
  { name: 'צאת הכוכבים', field: 'tzeit85deg' },
  { name: 'צאת ר״ת', field: 'tzeit72min' },
];

export const SHIURIM = [
  { name: 'דף היומי', time: '06:45', by: 'הרב יגאל' },
  { name: 'הלכה יומית', time: '13:15', by: 'הרב מוטה' },
  { name: 'עין יעקב', time: '17:30', by: 'הרב שלום' },
  { name: 'שיעור לנשים', time: '16:45', by: 'הרב ורהפטיג' },
  { name: 'שיעור הלכה', time: '20:00', by: 'הרב יגאל' },
];

export const ANNOUNCEMENTS = [
  'שיעורו של הרב מוטה יתקיים הערב\nבשעה 20:00 בבית המדרש',
  'יישר כח למשפחת פרידמן\nעל תרומת המעקה לבימת הכהנים',
  'ניתן להירשם לשיעור הדף היומי\nאצל הגבאי · 054-848-7595',
];

export const MAZAL = [
  { names: 'משפחת בן חמו', occasion: 'להולדת הבן — מזל טוב!' },
  { names: 'משפחת אזולאי', occasion: 'לרגל האירוסין — בשעה טובה' },
  { names: 'ר׳ יוסי נעים הי״ו', occasion: 'לרגל יום ההולדת' },
];

export const AZKAROT = [
  { name: 'משה בן פרטונה ז״ל', detail: 'נתרם ע״י יעל ורמון בראון', date: 'י״ח באלול' },
  { name: 'חנה נינט ריין בת פרטונה ז״ל', detail: 'תנצב״ה', date: "ה' בתמוז" },
  { name: 'רוברט ישראל בן רוזי ז״ל', detail: 'לעילוי נשמת', date: 'כ״ג בטבת' },
];

export const PARNAS = {
  name: 'הרב יחזקאל ישעי שליט״א',
  detail: 'נדבת ידידנו הנכבד\nרודף צדקה וחסד',
};

export const TICKER =
  'בית כנסת נווה רחמים  •  נא לכבד את קדושת בית הכנסת ולכבות את הטלפונים  •  נדבת משפחת בן חמו לעילוי נשמת משה בן פרטונה  •  לתרומות והנצחות פנו לגבאי · 054-848-7595  •  ';

// Resolves prayer entries against today's zmanim into { name, time, clock }.
// `time` is what to display (may be text like "מיד לאחר מנחה"); `clock` is the
// 'HH:MM' used for ordering / countdown (null when there is no real time yet).
function toClock(iso, offsetMin) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (offsetMin) d.setMinutes(d.getMinutes() + offsetMin);
    return format(d, 'HH:mm');
  } catch {
    return null;
  }
}

// שעון קיץ vs שעון חורף, decided by Israel's real UTC offset on the anchor date.
// Deliberately NOT from the device clock: a display panel with a misconfigured
// timezone would otherwise show winter times all summer, silently and forever.
// Hebcal timestamps carry the offset, e.g. "2026-07-24T19:15:00+03:00".
export function isSummerTime(iso) {
  if (typeof iso === 'string') {
    const m = iso.match(/([+-])(\d{2}):?(\d{2})$/);
    if (m) {
      const sign = m[1] === '-' ? -1 : 1;
      return sign * (Number(m[2]) * 60 + Number(m[3])) === 180;
    }
  }
  // A bare date-time ("...T19:15:00" — no "Z", no explicit offset) would otherwise
  // be parsed by `new Date` as local time on THIS device, reintroducing the very
  // device-clock dependency this function exists to avoid. Hebcal never actually
  // sends this shape (it always carries an offset), but pin it to UTC anyway so
  // the fallback below can't be fooled if that ever changes.
  let anchor = iso;
  if (typeof iso === 'string' && /T/.test(iso) && !/Z$/.test(iso)) {
    anchor = `${iso}Z`;
  }
  // Fallback for a "Z" or date-only string: ask Intl for Jerusalem's offset then.
  try {
    const d = new Date(anchor);
    if (Number.isNaN(d.getTime())) return false;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      timeZoneName: 'shortOffset',
    }).formatToParts(d);
    return parts.find((p) => p.type === 'timeZoneName')?.value === 'GMT+3';
  } catch {
    return false;
  }
}

export function resolvePrayers(entries, zmanimTimes, computed = {}) {
  const base = entries.map((e) => {
    let clock = null;
    if (e.time) clock = e.time;
    else if (e.computed) clock = computed[e.computed] || null;
    else if (e.from) clock = zmanimTimes ? toClock(zmanimTimes[e.from], e.offsetMin) : null;
    return { ...e, clock };
  });
  // Entries anchored to another prayer (afterName) inherit its clock for the
  // countdown, while still showing their own text.
  return base.map((e) => {
    let clock = e.clock;
    if (e.afterName) {
      const ref = base.find((x) => x.name === e.afterName);
      clock = ref ? ref.clock : null;
    }
    return { name: e.name, time: e.text || clock || '--:--', clock };
  });
}

// The Thursday whose sunset governs this week's מנחה. מנחה is refreshed each
// Friday for the week ending on the following Thursday, so from any day we look
// forward to that week's Thursday. (Weekday מנחה isn't shown Fri/Sat anyway.)
export function governingThursday(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const daysSinceFriday = (d.getDay() - 5 + 7) % 7; // Fri = 5
  const friday = new Date(d);
  friday.setDate(d.getDate() - daysSinceFriday);
  const thursday = new Date(friday);
  thursday.setDate(friday.getDate() + 6);
  return thursday;
}

// The Saturday of the current Shabbat: today if today is Saturday, else the next
// one. The Shabbat panel is reachable any weekday via the TopBar toggle, so מנחה
// must anchor to that Saturday's שקיעה, not to today's.
export function upcomingSaturday(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return d;
}

// Hebcal's /shabbat response (already fetched for the parasha) also carries the
// candle-lighting and havdalah timestamps — no extra request needed for either.
export function shabbatAnchors(shabbatResponse) {
  const items = shabbatResponse?.items || [];
  const pick = (category) => items.find((it) => it.category === category)?.date || null;
  return { candles: pick('candles'), havdalah: pick('havdalah') };
}

// Three anchors in, five display times out. Any missing anchor yields null, which
// resolvePrayers renders as "--:--" — never a stale or invented time.
export function resolveShabbatTimes(
  { candles, havdalah, saturdaySunset },
  config = SHABBAT_CONFIG
) {
  const season = isSummerTime(candles || saturdaySunset || havdalah) ? 'summer' : 'winter';
  return {
    shabCandles: toClock(candles),
    shabKabbalat: toClock(candles, config.kabbalatAfterCandlesMin[season]),
    shabShacharit: config.shacharit[season],
    shabMincha: toClock(saturdaySunset, -config.minchaBeforeSunsetMin),
    shabArvit: toClock(havdalah, -config.arvitBeforeHavdalahMin[season]),
  };
}

// מנחה = the governing Thursday's sunset minus 20 minutes, fixed for the week.
export function weeklyMinchaTime(thursdaySunsetIso) {
  return toClock(thursdaySunsetIso, -20);
}

// Finds the next prayer after `now` from a resolved `list` (uses each entry's
// `clock`) and returns its name, clock time, and an HH:MM:SS countdown. If none
// remain today, rolls to the first one tomorrow.
export function computeNextMinyan(now, list) {
  const timed = list.filter((it) => it.clock);
  if (!timed.length) return { name: '', time: '', countdown: '--:--:--' };
  const mins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  let target = null;
  for (const it of timed) {
    const [h, m] = it.clock.split(':').map(Number);
    if (h * 60 + m > mins) {
      target = it;
      break;
    }
  }
  const base = new Date(now);
  if (target) {
    const [h, m] = target.clock.split(':').map(Number);
    base.setHours(h, m, 0, 0);
  } else {
    target = timed[0];
    const [h, m] = target.clock.split(':').map(Number);
    base.setDate(base.getDate() + 1);
    base.setHours(h, m, 0, 0);
  }
  const diff = Math.max(0, Math.floor((base - now) / 1000));
  const pad = (n) => String(n).padStart(2, '0');
  const countdown = `${pad(Math.floor(diff / 3600))}:${pad(Math.floor((diff % 3600) / 60))}:${pad(diff % 60)}`;
  return { name: target.name, time: target.clock, countdown };
}
