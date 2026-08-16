// Static, editable content for the synagogue display dashboard.
// (Prayer schedule and ticker.)
// The zmanim panel is wired to live Hebcal data — see ZMANIM_ROWS below.

// Weekday (חול) prayers. Each entry is one of:
//   { time: 'HH:MM' }                     — a fixed clock time
//   { from: '<zmanim field>', offsetMin } — derived from TODAY's zmanim. No entry uses
//                                           this today: הנץ moved to `computed` when it
//                                           began posting TOMORROW's sunrise from 07:30
//                                           (see netzPrayerDate). Kept as the way to
//                                           declare a row that does track today.
//   { computed: '<key>' }                 — a value the container computes and
//                                           passes to resolvePrayers (e.g. the
//                                           weekly מנחה time, or the הנץ of whichever
//                                           date netzPrayerDate picks)
//   { text, afterName }                   — literal text shown instead of a
//                                           time; the countdown follows afterName
export const WEEKDAY_PRAYERS = [
  { name: 'שחרית מניין א׳ (הנץ)', computed: 'netz' },
  { name: 'שחרית מניין ב׳', time: '08:15' },
  { name: 'מנחה', computed: 'mincha' },
  { name: 'ערבית', text: 'מיד לאחר מנחה', afterName: 'מנחה' },
];

// צאת הכוכבים as this shul reckons it: a fixed 18 minutes after שקיעה, in every
// season. Deliberately NOT one of Hebcal's own tzeit fields — `tzeit85deg` (sun 8.5°
// below the horizon) is the one the זמנים panel used to read, and it runs 22 minutes
// later than this in July — so the row is computed off `sunset` instead of read off
// the response. Exported because /zmanim posts the same zman and must post the same
// number; it is also the anchor summer's ערבית מוצ״ש counts back from.
export const TZEIT_AFTER_SUNSET_MIN = 18;

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
  tzeitAfterSunsetMin: TZEIT_AFTER_SUNSET_MIN,
  // ערבית מוצ״ש counts back from a DIFFERENT anchor in each season, which is why this
  // is a rule per season and not one number per season: קיץ from צאת הכוכבים
  // (שקיעה + tzeitAfterSunsetMin), חורף from Hebcal's הבדלה (8.5°), which falls later
  // than צאת. Flattening both onto one anchor would move a posted time by ~10 minutes
  // in one season or the other, so the anchor has to travel with the offset.
  arvitBefore: {
    summer: { anchor: 'tzeit', minBefore: 3 },
    winter: { anchor: 'havdalah', minBefore: 10 },
  },
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

// Maps each displayed zman to its Hebcal `times` field, plus an optional `offsetMin`
// applied to it. Times come live from Hebcal for Nitzan (see services/hebcal.js
// LOCATION). Only צאת הכוכבים carries an offset: the shul reckons it as שקיעה+18
// rather than by any of Hebcal's tzeit fields (see TZEIT_AFTER_SUNSET_MIN). צאת ר״ת
// below is Hebcal's own — a fixed 72 minutes after שקיעה — and is unaffected.
//
// `id` is the stable handle consumers select and key rows by — the mobile hero picks
// three of these by id. Neither of the other two columns can do that job: `field` is
// ambiguous (שקיעת החמה and צאת הכוכבים are both 'sunset', differing only by offset),
// and `name` is display copy that a future edit is free to reword.
export const ZMANIM_ROWS = [
  { id: 'alot', name: 'עלות השחר', field: 'alotHaShachar' },
  { id: 'sunrise', name: 'הנץ החמה', field: 'sunrise' },
  { id: 'shmaMGA', name: 'סוזק״ש מג״א', field: 'sofZmanShmaMGA' },
  { id: 'shmaGRA', name: 'סוזק״ש גר״א', field: 'sofZmanShma' },
  { id: 'tfilla', name: 'סו״ז תפילה', field: 'sofZmanTfilla' },
  { id: 'chatzot', name: 'חצות היום', field: 'chatzot' },
  { id: 'minchaGedola', name: 'מנחה גדולה', field: 'minchaGedola' },
  { id: 'sunset', name: 'שקיעת החמה', field: 'sunset' },
  { id: 'tzeit', name: 'צאת הכוכבים', field: 'sunset', offsetMin: TZEIT_AFTER_SUNSET_MIN },
  { id: 'tzeitRT', name: 'צאת ר״ת', field: 'tzeit72min' },
];

// שיעורים / הודעות / מזל טוב / אזכרות / הפס התחתון are no longer static — they are edited
// in /adminGabbai and served from the API, as are the שבת time overrides applied by
// resolveShabbatTimes below. בדיחות ליאור travels in the same document but is scraped and
// filtered by the server (server/src/jokes/) rather than edited by anyone. Seed values for
// all of them live in server/src/store/defaultContent.js; the display fetches them via
// useDisplayContent. Nothing on either screen is a literal in this file any more.

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
  // No `% 24` guard here against an ICU build rendering midnight as hour "24" (contrast
  // israelParts below) — harmless today because no prayer row or zman ever lands exactly
  // at 00:00, not because the two formatters are equally hardened.
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

// The Friday of the current Shabbat — the day before `upcomingSaturday`, by the same
// Israel-calendar arithmetic and for the same reason.
//
// The שבת board's candle card prints a שקיעה under הדלקת נרות, and the שקיעה that belongs to
// הדלקת נרות is Friday's — on Saturday just as much as on Friday itself, because the card is
// a statement about the Shabbat being kept and not a countdown to anything.
//
// Deliberately not derived as `candles + candleLightingMinBeforeSunset`. That identity holds
// only while the row is automatic; the moment the gabbai pins הדלקת נרות to a fixed time in
// /adminGabbai, a "sunset" derived from his number would move with it and stop being a sunset.
export function shabbatFriday(now) {
  const p = israelParts(now);
  return israelDateAtNoon(p, ((6 - p.weekday + 7) % 7) - 1);
}

// The date whose הנץ the שחרית מניין א׳ row posts: today until 07:30 Israel time, tomorrow
// from 07:30 on. The minyan davens before six, so a row that only turned over at midnight
// spent the whole day posting a time that had already passed — and the מניין הבא countdown,
// which rolls forward to that row every evening, inherited the same stale minute.
//
// Continuous across midnight, which is what makes one boundary enough: at 00:00 "tomorrow"
// becomes "today" and the same calendar date stays on screen, so the displayed date changes
// at 07:30 and nowhere else. There is no second boundary and no window where two rules
// disagree.
//
// Friday is deliberately NOT special-cased. The weekday board shows until 09:00 (see
// screenSegment), so between 07:30 and 09:00 this posts Saturday's הנץ rather than Sunday's,
// and this shul has no הנץ minyan on Shabbat. That is about a minute, in a ninety-minute
// window, once a week — cheaper to accept than a permanent day-of-week rule here.
//
// Israel's clock, never the device's, like every other date helper above it: a TV whose
// timezone was set wrong at install has to cross this boundary at 07:30 in Nitzan.
export const NETZ_NEXT_DAY_FROM_MIN = 7 * 60 + 30;
export function netzPrayerDate(now) {
  const p = israelParts(now);
  return israelDateAtNoon(p, p.hour * 60 + p.minute >= NETZ_NEXT_DAY_FROM_MIN ? 1 : 0);
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

// Adds minutes to an 'HH:MM' string.
//
// Needed only because an override carries no date: `toClock` does its arithmetic on the
// epoch, which a bare clock time cannot be fed into, and קבלת שבת has to be derivable from
// a הדלקת נרות the gabbai typed as readily as from one Hebcal sent.
//
// Wraps at midnight rather than rendering '24:05' for 23:50 + 15.
export function addMinutesToClock(clock, minutes) {
  if (typeof clock !== 'string') return null;
  const parts = clock.match(/^(\d{1,2}):(\d{2})$/);
  if (!parts) return null;
  const total = ((((Number(parts[1]) * 60 + Number(parts[2]) + minutes) % 1440) + 1440) % 1440);
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

// Three anchors in, five display times out. Any missing anchor yields null, which
// resolvePrayers renders as "--:--" — never a stale or invented time. An
// undetermined season does the same to the three rows that depend on one.
//
// `overrides` are the fixed times the gabbai pinned in /adminGabbai (content.json's
// settings.shabbat), keyed by the five short names. A blank means "compute it", which is
// the default for every row.
export function resolveShabbatTimes(
  { candles, havdalah, saturdaySunset } = {},
  config = SHABBAT_CONFIG,
  overrides = {}
) {
  const summer = isSummerTime(candles || saturdaySunset || havdalah);
  const season = summer === null ? null : summer ? 'summer' : 'winter';
  // An override is a stated fact, not a derivation, so it needs neither Hebcal nor a known
  // season to have worked. `pin` therefore short-circuits ahead of every automatic branch,
  // including the three that blank when the season is undetermined — a pinned row is
  // strictly more robust than the computed one it replaces.
  const pin = (key, auto) => overrides[key] || auto;

  // Resolved first because קבלת שבת is derived from it, and must be derived from what the
  // row ABOVE actually says. Chaining off Hebcal's timestamp while הדלקת נרות displayed
  // the gabbai's number would put two contradicting times side by side.
  const shabCandles = pin('candles', toClock(candles));

  return {
    shabCandles,
    shabKabbalat: pin(
      'kabbalat',
      season && shabCandles ? addMinutesToClock(shabCandles, config.kabbalatAfterCandlesMin[season]) : null
    ),
    shabShacharit: pin('shacharit', season ? config.shacharit[season] : null),
    shabMincha: pin('mincha', toClock(saturdaySunset, -config.minchaBeforeSunsetMin)),
    shabArvit: pin('arvit', arvitTime(season, { havdalah, saturdaySunset }, config)),
  };
}

// ערבית מוצ״ש, whose anchor changes with the season (SHABBAT_CONFIG.arvitBefore):
// קיץ counts back from צאת הכוכבים, חורף from הבדלה. So this row now blanks for a
// different reason in each half of the year — in קיץ when the Saturday-zmanim request
// failed, in חורף when /shabbat did — where before it was always /shabbat. Worth
// knowing when reading a half-blank panel: in summer ערבית and מנחה go together and
// הדלקת נרות survives; in winter it is the other way round.
//
// The קיץ branch folds both hops into ONE offset off שקיעה rather than chaining:
// `toClock` returns 'HH:MM', not an instant, so its output cannot be fed back in.
function arvitTime(season, { havdalah, saturdaySunset }, config) {
  if (!season) return null;
  const { anchor, minBefore } = config.arvitBefore[season];
  return anchor === 'tzeit'
    ? toClock(saturdaySunset, config.tzeitAfterSunsetMin - minBefore)
    : toClock(havdalah, -minBefore);
}

// מנחה = the governing Thursday's sunset minus 20 minutes, fixed for the week.
export function weeklyMinchaTime(thursdaySunsetIso) {
  return toClock(thursdaySunsetIso, -20);
}

// Which schedule the wall display should be showing at `now`, and *which run of that
// schedule* — Israel's calendar, not the device's. The TV stays powered for weeks, so
// the screen has to follow the calendar rather than the boot moment. שבת from Friday
// 09:00 through the end of Saturday; חול from Sunday 00:00.
//
// The calendar therefore alternates between two kinds of segment:
//
//   חול   Sunday 00:00 → Friday 09:00
//   שבת   Friday 09:00 → Sunday 00:00
//
// `key` names the *specific* segment `now` falls in — the screen plus the calendar
// date the segment began on, e.g. "shabbat@2026-07-24" or "weekday@2026-07-26". It is
// what a TopBar override is pinned to. Pinning to the screen *value* alone (the old
// `insteadOf`) is not enough: 'shabbat' comes round again every single week, so an
// override that merely stopped applying at the next boundary would silently resurrect
// at the one after it, and every week thereafter. A date-stamped key can never recur.
const SHABBAT_SCREEN_FROM_HOUR = 9; // Friday
export function screenSegment(now) {
  const p = israelParts(now);
  let screen = 'weekday';
  if (p.weekday === 6) screen = 'shabbat';
  else if (p.weekday === 5 && p.hour >= SHABBAT_SCREEN_FROM_HOUR) screen = 'shabbat';
  // Days back to the start of this segment: Sunday for a חול run; the Friday that
  // opened it for a שבת run (today when it is Friday, yesterday when it is Saturday).
  const back = screen === 'shabbat' ? p.weekday - 5 : p.weekday;
  const start = israelDateAtNoon(p, -back);
  return { screen, key: `${screen}@${localYmd(start)}` };
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
  // Wall-clock arithmetic on Israel's clock: `daysAhead` is multiplied by a flat 1440
  // (24h), so a roll-forward that spans an Israel DST transition inherits that day's
  // real length of 23h or 25h, and the countdown is off by the DST offset until the
  // transition itself passes — e.g. Thursday 2026-03-26 19:20 shows "10:20:00" when
  // the true remaining time is 9:20:00. Measured over two years on Asia/Jerusalem:
  // ~1,600 minutes here and ~15,740 for the Shabbat list, all inside the evening
  // window before one of Israel's four DST transitions in that span. The old
  // epoch-difference version (`(base - now) / 1000`) had no such gap — epoch ms don't
  // move with DST — but it read the epoch through the *device's* clock, which is the
  // dependency this rewrite exists to remove. Only this countdown pays for that
  // trade; the prayer name and displayed clock time are unaffected.
  const diffMs =
    (daysAhead * 1440 + h * 60 + m) * 60000 - ((p.hour * 60 + p.minute) * 60000 + p.second * 1000 + p.ms);
  const diff = Math.max(0, Math.floor(diffMs / 1000));
  const pad = (n) => String(n).padStart(2, '0');
  const countdown = `${pad(Math.floor(diff / 3600))}:${pad(Math.floor((diff % 3600) / 60))}:${pad(diff % 60)}`;
  return { name: target.name, time: target.clock, countdown };
}
