// Static, editable content for the synagogue display dashboard.
// (Prayer schedule, shiurim, announcements, mazal tov, azkarot, parnas, ticker.)
// The zmanim panel is wired to live Hebcal data — see ZMANIM_ROWS below.

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
  // Minutes before שקיעה that הדלקת נרות is called. Sent to Hebcal as `b=` rather
  // than left to its per-location default, so the posted time can only change when
  // this number does.
  candleLightingMinBeforeSunset: 20,
  kabbalatAfterCandlesMin: { summer: 2, winter: 5 },
  shacharit: { summer: '07:45', winter: '07:30' },
  minchaBeforeSunsetMin: 90,
  arvitBeforeHavdalahMin: { summer: 3, winter: 10 },
};

// Five rows, all resolved by resolveShabbatTimes below. סוף זמן ק״ש and מנחה גדולה
// were dropped — both already appear in the זמנים panel — and שיעור בפרשה moved to
// the שיעורים panel.
//
// `day` (0 = Sunday … 6 = Saturday) marks which day each row happens on. The list
// spans two days, so without it computeNextMinyan would offer Friday's הדלקת נרות
// to a hall sitting in shul on Saturday morning.
export const SHABBAT_PRAYERS = [
  { name: 'הדלקת נרות', computed: 'shabCandles', day: 5 },
  { name: 'מנחה וקבלת שבת', computed: 'shabKabbalat', day: 5 },
  { name: 'שחרית', computed: 'shabShacharit', day: 6 },
  { name: 'מנחה', computed: 'shabMincha', day: 6 },
  { name: 'ערבית מוצ״ש', computed: 'shabArvit', day: 6 },
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

// Every clock time on the display is rendered in Israel's timezone, never the
// device's — the prayer rows and זמנים rows through `toClock` below, and the header
// clock, the header dates, the countdown and the schedule boundary through
// `israelParts`. Season detection is already deliberately device-independent, so
// formatting has to be too: on a panel misconfigured to Europe/Athens the computed
// rows would otherwise all shift an hour while the fixed שחרית string stayed put —
// a visibly self-contradicting panel. Built lazily so a runtime without the tz
// database fails to one null time rather than to a blank module.
let jerusalemClock = null;
function formatJerusalem(date) {
  if (!jerusalemClock) {
    jerusalemClock = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return jerusalemClock.format(date);
}

// The display's own notion of "now": the wall clock, the calendar date and the
// weekday as they read in Nitzan, never as they read on the TV's own clock.
// Everything that asks "what time is it" goes through here — the header clock, the
// header date strings, the מניין הבא countdown, the Friday/Sunday schedule boundary
// and the Saturday/Thursday anchors — so a panel whose timezone was set wrong at
// install cannot show 16:43 in the clock while the זמנים rows post שקיעה 19:43.
//
// `ms` is read straight off the Date because milliseconds are the same in every
// zone. `weekday` is derived from the Israel calendar date through a UTC Date, so
// the device's zone cannot nudge it either.
//
// Falls back to the device's own fields if the runtime has no tz database: that
// degrades to the pre-Israel-time behaviour rather than throwing and blanking the
// whole screen.
let israelPartsFormat = null;
export function israelParts(date) {
  const d = date instanceof Date ? date : new Date(date);
  const ms = Number.isNaN(d.getTime()) ? 0 : d.getMilliseconds();
  try {
    if (!israelPartsFormat) {
      israelPartsFormat = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    }
    const f = {};
    for (const p of israelPartsFormat.formatToParts(d)) f[p.type] = p.value;
    const year = Number(f.year);
    const month = Number(f.month);
    const day = Number(f.day);
    // Some ICU builds render midnight as hour 24 under hour12:false.
    const hour = Number(f.hour) % 24;
    const minute = Number(f.minute);
    const second = Number(f.second);
    if (![year, month, day, hour, minute, second].every(Number.isFinite)) throw new Error('unparsable');
    return {
      year,
      month,
      day,
      hour,
      minute,
      second,
      ms,
      weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    };
  } catch {
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      second: d.getSeconds(),
      ms,
      weekday: d.getDay(),
    };
  }
}

// A device-local Date whose calendar fields spell out an Israel calendar date,
// shifted by `dayShift` days. The consumers of these dates — date-fns `format` in
// the Hebcal service and `localYmd` below — both read local fields, so this is the
// shape they need. Noon rather than midnight, so a DST jump in the *device's* own
// zone cannot slide the date back a day.
function israelDateAtNoon(parts, dayShift = 0) {
  return new Date(parts.year, parts.month - 1, parts.day + dayShift, 12, 0, 0, 0);
}

// Israel's current calendar day, as a Date the Hebcal service can format. On a TV
// east of Israel, `new Date()` is already tomorrow for part of every evening.
export function israelToday(now) {
  return israelDateAtNoon(israelParts(now));
}

// `offsetMin` is applied to the epoch, not to local calendar fields, so it can
// never pick up an extra hour from a DST shift in the device's own timezone.
export function toClock(iso, offsetMin) {
  if (!iso) return null;
  try {
    const ms = new Date(iso).getTime();
    if (Number.isNaN(ms)) return null;
    return formatJerusalem(new Date(ms + (offsetMin || 0) * 60000));
  } catch {
    return null;
  }
}

// שעון קיץ vs שעון חורף, decided by Israel's real UTC offset on the anchor date.
// Deliberately NOT from the device clock: a display panel with a misconfigured
// timezone would otherwise show winter times all summer, silently and forever.
// Hebcal timestamps carry the offset, e.g. "2026-07-24T19:15:00+03:00".
//
// Returns true (קיץ), false (חורף), or null when the season genuinely could not be
// determined. null must not collapse to false: a failed detection in July would
// otherwise post שחרית 07:30 plus winter offsets — three confidently wrong times,
// with nothing on screen to say so.
export function isSummerTime(iso) {
  if (typeof iso !== 'string') return null;
  const m = iso.match(/([+-])(\d{2}):?(\d{2})$/);
  if (m) {
    const sign = m[1] === '-' ? -1 : 1;
    return sign * (Number(m[2]) * 60 + Number(m[3])) === 180;
  }
  // A bare date-time ("...T19:15:00" — no "Z", no explicit offset) would otherwise
  // be parsed by `new Date` as local time on THIS device, reintroducing the very
  // device-clock dependency this function exists to avoid. Hebcal never actually
  // sends this shape (it always carries an offset), but pin it to UTC anyway so
  // the lookup below can't be fooled if that ever changes.
  const anchor = /T/.test(iso) && !/Z$/.test(iso) ? `${iso}Z` : iso;
  // No offset in the string ("Z", UTC-pinned, or date-only): ask Intl what
  // Jerusalem's offset was at that moment.
  try {
    const d = new Date(anchor);
    if (Number.isNaN(d.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      timeZoneName: 'shortOffset',
    }).formatToParts(d);
    const zone = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (zone === 'GMT+3') return true;
    if (zone === 'GMT+2') return false;
    return null;
  } catch {
    return null;
  }
}

// Resolves prayer entries against today's zmanim into { name, time, clock, day }.
// `time` is what to display (may be text like "מיד לאחר מנחה"); `clock` is the
// 'HH:MM' used for ordering / countdown (null when there is no real time yet);
// `day` passes each entry's weekday through to computeNextMinyan, undefined when
// the list belongs to a single day.
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
    return { name: e.name, time: e.text || clock || '--:--', clock, day: e.day };
  });
}

// The Thursday whose sunset governs this week's מנחה. מנחה is refreshed each
// Friday for the week ending on the following Thursday, so from any day we look
// forward to that week's Thursday. (Weekday מנחה isn't shown Fri/Sat anyway.)
// Counted off Israel's weekday, not the device's.
export function governingThursday(now) {
  const p = israelParts(now);
  const daysSinceFriday = (p.weekday - 5 + 7) % 7; // Fri = 5
  return israelDateAtNoon(p, 6 - daysSinceFriday);
}

// The Saturday of the current Shabbat: today if today is Saturday, else the next
// one. The Shabbat panel is reachable any weekday via the TopBar toggle, so מנחה
// must anchor to that Saturday's שקיעה, not to today's.
//
// Israel's weekday again: on a TV set to Pacific/Auckland this is called at 04:43
// on the device's Sunday while Nitzan is still at Saturday 19:43, and the device's
// own calendar would answer with *next* Saturday — blanking every candle/havdalah
// row while שחרית and מנחה quietly described the wrong Shabbat.
export function upcomingSaturday(now) {
  const p = israelParts(now);
  return israelDateAtNoon(p, (6 - p.weekday + 7) % 7);
}

// Calendar date ('YYYY-MM-DD') of one of the Israel-anchored Dates above, for
// comparing against the first ten characters of a Hebcal timestamp. Built from the
// date's own fields rather than toISOString(), which would answer in UTC and slide a
// day backwards for anything before 02:00/03:00 local.
function localYmd(d) {
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Hebcal's /shabbat response (already fetched for the parasha) also carries the
// candle-lighting and havdalah timestamps — no extra request needed for either.
//
// The response's range starts at TODAY and runs through the whole Shabbat block, so
// any week containing a Yom Tov carries two of each category: the festival's and
// Shabbat's. Taking the first `candles` posts the festival's time — e.g. Pesach
// 5786 returns 1 Apr 18:40 and 3 Apr 18:42, and Shabbat is the 4th. Items are
// therefore matched to the actual Friday/Saturday of `saturday`, by local calendar
// date, and a missing item yields null rather than someone else's time.
export function shabbatAnchors(shabbatResponse, saturday) {
  const empty = { candles: null, havdalah: null };
  if (!(saturday instanceof Date) || Number.isNaN(saturday.getTime())) return empty;
  const items = shabbatResponse?.items || [];
  const on = (category, ymd) =>
    items.find((it) => it.category === category && typeof it.date === 'string' && it.date.slice(0, 10) === ymd)
      ?.date || null;
  const satYmd = localYmd(saturday);
  // Noon, so the subtraction can't be nudged across midnight by a DST shift.
  const friYmd = localYmd(new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() - 1, 12));
  return {
    candles: on('candles', friYmd),
    // When Shabbat runs straight into Yom Tov (Rosh Hashanah 2026-09-12, Sukkot
    // 2027-10-02) there is no Saturday-night havdalah — Hebcal emits a candle
    // lighting instead and havdalah lands Sunday night, ~24h from every other row
    // and not a minyan time. ערבית still davens Saturday night at roughly the usual
    // מוצ״ש hour, so that night's candle lighting is the anchor.
    havdalah: on('havdalah', satYmd) || on('candles', satYmd),
  };
}

// Three anchors in, five display times out. Any missing anchor yields null, which
// resolvePrayers renders as "--:--" — never a stale or invented time. An
// undetermined season does the same to the three rows that depend on one.
export function resolveShabbatTimes(
  { candles, havdalah, saturdaySunset } = {},
  config = SHABBAT_CONFIG
) {
  const summer = isSummerTime(candles || saturdaySunset || havdalah);
  const season = summer === null ? null : summer ? 'summer' : 'winter';
  return {
    shabCandles: toClock(candles),
    shabKabbalat: season ? toClock(candles, config.kabbalatAfterCandlesMin[season]) : null,
    shabShacharit: season ? config.shacharit[season] : null,
    shabMincha: toClock(saturdaySunset, -config.minchaBeforeSunsetMin),
    shabArvit: season ? toClock(havdalah, -config.arvitBeforeHavdalahMin[season]) : null,
  };
}

// מנחה = the governing Thursday's sunset minus 20 minutes, fixed for the week.
export function weeklyMinchaTime(thursdaySunsetIso) {
  return toClock(thursdaySunsetIso, -20);
}

// Which schedule the wall display should be showing at `now`. The TV stays powered
// for weeks, so the screen has to follow the calendar rather than the boot moment.
// שבת from Friday 09:00 through the end of Saturday; חול from Sunday 00:00.
// Israel's calendar decides the boundary, not the device's: on a TV set to UTC the
// device is still on Saturday at Israel's Sunday 00:00, and the screen would sit on
// the Shabbat schedule for another two hours every week.
const SHABBAT_SCREEN_FROM_HOUR = 9; // Friday
export function scheduledScreen(now) {
  const p = israelParts(now);
  if (p.weekday === 6) return 'shabbat';
  if (p.weekday === 5) return p.hour >= SHABBAT_SCREEN_FROM_HOUR ? 'shabbat' : 'weekday';
  return 'weekday';
}

// Finds the next prayer after `now` from a resolved `list` (uses each entry's
// `clock`) and returns its name, clock time, and an HH:MM:SS countdown.
//
// Entries may carry `day` (0 = Sunday … 6 = Saturday) when the list spans more than
// one day, as the Shabbat schedule does: only entries belonging to the current day
// are candidates today, and when none of them remain we roll forward to the next day
// that has any. An entry without `day` belongs to every day, so an untagged list —
// the weekday schedule — behaves exactly as it always has: the first entry later
// than now, else the first entry tomorrow.
export function computeNextMinyan(now, list) {
  const timed = list.filter((it) => it.clock);
  if (!timed.length) return { name: '', time: '', countdown: '--:--:--' };
  // Israel's wall clock and weekday: the rows are Israel times, so the "is it still
  // ahead of us?" comparison has to be made against the same clock they are on.
  const p = israelParts(now);
  const mins = p.hour * 60 + p.minute + p.second / 60;
  const clockMins = (it) => {
    const [h, m] = it.clock.split(':').map(Number);
    return h * 60 + m;
  };
  const onDay = (d) => timed.filter((it) => it.day == null || it.day === d);

  const today = p.weekday;
  let target = onDay(today).find((it) => clockMins(it) > mins) || null;
  let daysAhead = 0;
  for (let i = 1; i <= 7 && !target; i += 1) {
    const later = onDay((today + i) % 7);
    if (later.length) {
      target = later[0];
      daysAhead = i;
    }
  }
  if (!target) return { name: '', time: '', countdown: '--:--:--' };

  const [h, m] = target.clock.split(':').map(Number);
  // Wall-clock arithmetic on Israel's clock, the same shape the device-local version
  // used: minutes-of-day plus whole days. (It therefore carries the same pre-existing
  // approximation across a DST shift in a multi-day roll-forward.)
  const diffMs =
    (daysAhead * 1440 + h * 60 + m) * 60000 - ((p.hour * 60 + p.minute) * 60000 + p.second * 1000 + p.ms);
  const diff = Math.max(0, Math.floor(diffMs / 1000));
  const pad = (n) => String(n).padStart(2, '0');
  const countdown = `${pad(Math.floor(diff / 3600))}:${pad(Math.floor((diff % 3600) / 60))}:${pad(diff % 60)}`;
  return { name: target.name, time: target.clock, countdown };
}
