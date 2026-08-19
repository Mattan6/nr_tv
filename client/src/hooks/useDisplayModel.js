import { useEffect, useMemo, useState } from 'react';
import { getZmanim, getParasha } from '../services/hebcal';
import seededShuffle from '../utils/seededShuffle';
import {
  WEEKDAY_PRAYERS,
  SHABBAT_PRAYERS,
  SHABBAT_CONFIG,
  ZMANIM_ROWS,
  resolvePrayers,
  computeNextMinyan,
  governingThursday,
  netzPrayerDate,
  weeklyMinchaTime,
  upcomingSaturday,
  shabbatFriday,
  shabbatAnchors,
  shabbatCardTimes,
  resolveShabbatTimes,
  screenSegment,
  israelParts,
  israelToday,
  toClock,
} from '../components/display/displayData';
import useDisplayContent from './useDisplayContent';
import { parashaHighlights } from '../components/display/parashaHighlights';

const ROTATE_MS = 6500;
// Jokes rotate on their own, slower clock: 6.5s is not long enough to read a joke and
// reach its punch line.
const JOKE_ROTATE_MS = 30000;
const ZMANIM_REFRESH_MS = 21600000; // 6 hours

const pad = (n) => String(n).padStart(2, '0');

// Everything both display layouts show, computed once.
//
// This lives in a hook rather than in the wall page because there are now two layouts —
// the 1920x1080 wall canvas and the phone column — and they must never post different
// times. A second copy of this logic would diverge the first time either the shul's
// schedule or Hebcal's response shape changed, and the divergence would be invisible
// until someone stood in front of the TV holding their phone. There is one מנחה here, so
// there is one מנחה on screen.
//
// Layout state deliberately stays OUT: the wall's canvas scale and the phone's accordion
// are properties of a viewport, not of the shul's day.
//
// `forceScreen` pins the schedule instead of reading it off the calendar. pages/ShabbatDisplay
// passes 'shabbat', because it IS the שבת board — asking it to render חול prayers would be
// incoherent, and without this the `?screen=shabbat` preview on a Tuesday would post weekday
// times under שבת headings. It bypasses the TopBar override too, which is harmless: the only
// caller that forces has no TopBar.
export default function useDisplayModel(forceScreen) {
  // null = follow the calendar; { screen, segmentKey } = a toggle override, live only
  // while the calendar is still inside that same schedule segment. See below.
  const [override, setOverride] = useState(null);
  const [now, setNow] = useState(() => new Date());
  // One counter, not one per panel: the rotating panels have always advanced in
  // lockstep. The modulo is taken at render time against the CURRENT list (see
  // `pick`), because the lists are editable now (via /adminGabbai) and a list that
  // shrinks must not leave an index pointing past its end.
  const [tick, setTick] = useState(0);
  // Jokes get their own counter because they rotate on their own clock — see
  // JOKE_ROTATE_MS. Same render-time modulo as `pick` below, for the same reason: the pool
  // grows when the server scrapes, and an index must never point past the current list.
  const [jokeTick, setJokeTick] = useState(0);
  // One random number for the life of this mount, and the only source of randomness on the
  // board. It orders the joke pool (see below) — drawn once in a lazy initialiser so React
  // cannot redraw it on a re-render, which would reshuffle mid-view.
  const [jokeSeed] = useState(() => Math.floor(Math.random() * 2 ** 32));
  // Two שיעורים lists arrive; one is chosen below, on the day rather than on the layout.
  const {
    announcements,
    shiurim: weekdayShiurim,
    shiurimShabbat,
    mazal,
    azkarot,
    dedication,
    jokes,
    ticker,
    settings,
  } = useDisplayContent();
  const [zmanimTimes, setZmanimTimes] = useState(null);
  const [minchaTime, setMinchaTime] = useState(null);
  // The הנץ the שחרית row posts, already formatted. Its own state rather than a field on
  // zmanimTimes: from 07:30 it is TOMORROW's sunrise, while zmanimTimes stays on today for
  // the זמנים panel. Folding them together would make one object mean two dates depending on
  // which consumer asked, and the difference would be invisible at both call sites.
  const [netzTime, setNetzTime] = useState(null);
  // The raw Hebcal anchors, NOT the five resolved שבת times. They are kept apart because
  // the overrides that turn anchors into displayed times arrive on the 30-second content
  // poll while these arrive on a six-hour one: resolving inside the fetch would leave a
  // time the gabbai just pinned unshown for up to six hours, and adding the overrides to
  // the effect's dependencies would instead re-request Hebcal four times every poll.
  // Resolved at render instead — it is string arithmetic, and it costs nothing.
  const [shabbatAnchorTimes, setShabbatAnchorTimes] = useState({});
  const [parasha, setParasha] = useState('');

  // Israel's wall clock and calendar, never the device's — see israelParts. A TV whose
  // timezone was set wrong at install must not read 16:43 above a זמנים panel posting
  // שקיעה 19:43.
  //
  // Hoisted above the effects because the Hebcal load below depends on the calendar DAY.
  // `now` changes every second; this string changes once, at 00:00 Israel time.
  const nowIL = israelParts(now);
  const israelDayKey = `${nowIL.year}-${pad(nowIL.month)}-${pad(nowIL.day)}`;

  // The second boundary the load effect below has to re-run at: 07:30, when the הנץ row
  // switches to tomorrow's sunrise (netzPrayerDate). Derived from `now` for the same reason
  // israelDayKey is — `now` already ticks once a second, so React re-runs the effect on the
  // tick that crosses the boundary. A setTimeout aimed at 07:30 would have to survive
  // backgrounding, throttling and remounts; a derived key has nothing to survive.
  // Reading Date getters here is safe and not an exception to the rule above: netzPrayerDate
  // baked Israel's calendar fields into a local-noon Date, so building and reading back in the
  // same zone are exact inverses — the same trick localYmd uses in displayData.js.
  const netzDate = netzPrayerDate(now);
  const netzDayKey = `${netzDate.getFullYear()}-${pad(netzDate.getMonth() + 1)}-${pad(netzDate.getDate())}`;

  // Tick the clock / date every second.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Rotate announcements / mazal / azkarot / dedication. The counter only ever increases;
  // the modulo is taken at render time against the current list (see `pick`).
  useEffect(() => {
    const r = setInterval(() => setTick((t) => t + 1), ROTATE_MS);
    return () => clearInterval(r);
  }, []);

  // Jokes rotate independently of the 6.5s panels.
  useEffect(() => {
    const j = setInterval(() => setJokeTick((t) => t + 1), JOKE_ROTATE_MS);
    return () => clearInterval(j);
  }, []);

  // Live zmanim (Nitzan) + this week's parasha, candle lighting and havdalah.
  //
  // allSettled, not all: the six requests feed six independent parts of the
  // screen, and one failing must not blank or freeze the other five. Every branch
  // also *assigns* — a rejected leg is written back as null so its panel falls to
  // "--:--". Leaving the previous value in place would quietly post last week's
  // times through an outage, which is worse than showing nothing.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // All five dates come off Israel's calendar, not the device's: east of Israel
      // `new Date()` has already rolled over for part of every evening, so "today's
      // zmanim" would be tomorrow's and `upcomingSaturday` would skip to next week's
      // Shabbat while the hall was still sitting in this one. Each helper takes the
      // raw instant — they do the conversion themselves.
      const instant = new Date();
      const today = israelToday(instant);
      const saturday = upcomingSaturday(instant);
      const [z, zThu, zSat, zNetz, zFri, p] = await Promise.allSettled([
        getZmanim(today),
        getZmanim(governingThursday(instant)),
        getZmanim(saturday),
        // Requested unconditionally, including before 07:30 when this is the same date the
        // first leg already asked for. One uniform path, at the cost of a duplicated request
        // twice a day — the branch that would save it has to be right on both sides of
        // a boundary that moves once a day, which is more than the request is worth.
        getZmanim(netzPrayerDate(instant)),
        // Friday's, for the שקיעה the שבת board prints under הדלקת נרות. Duplicates the first
        // leg on Fridays, and is accepted for the same reason the line above is.
        getZmanim(shabbatFriday(instant)),
        getParasha(SHABBAT_CONFIG.candleLightingMinBeforeSunset),
      ]);
      if (cancelled) return;
      const value = (r) => (r.status === 'fulfilled' ? r.value : null);
      const failures = [z, zThu, zSat, zNetz, zFri, p].filter((r) => r.status === 'rejected');
      if (failures.length) {
        console.error('Failed to load display data:', failures.map((r) => r.reason));
      }
      setZmanimTimes(value(z)?.times || null);
      setMinchaTime(weeklyMinchaTime(value(zThu)?.times?.sunset));
      // toClock already answers null for a missing or unparsable time, which resolvePrayers
      // renders as "--:--" — the row blanks rather than holding yesterday's number.
      setNetzTime(toClock(value(zNetz)?.times?.sunrise));
      setShabbatAnchorTimes({
        ...shabbatAnchors(value(p), saturday),
        saturdaySunset: value(zSat)?.times?.sunset,
        // Two more fields off a response already in hand. resolveShabbatTimes destructures only
        // the three keys it needs, so these pass through it unread.
        saturdayTzeit72: value(zSat)?.times?.tzeit72min,
        fridaySunset: value(zFri)?.times?.sunset,
      });
      const parashaItem = value(p)?.items?.find((it) => it.category === 'parashat');
      setParasha(parashaItem?.hebrew || '');
    };
    load();
    const id = setInterval(load, ZMANIM_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // Keyed on Israel's calendar day, so the whole effect tears down and re-runs within a
    // second of 00:00. Everything it fetches is date-stamped — today's zmanim, this week's
    // parasha, the anchors for `upcomingSaturday` — and none of it was being re-read at the
    // boundary where it changes.
    //
    // The interval alone could not cover this. setInterval is phased from mount, and since
    // 6h divides 24h that phase never drifts: a TV whose browser was opened at 23:58
    // refreshed at 05:58 every night thereafter, so from 00:00 it served the previous day's
    // data for just under six hours, permanently, with nothing on screen to say so. Zmanim
    // drift only a minute a day, but `upcomingSaturday` jumps a whole week at Sunday 00:00 —
    // that window posted last week's parasha and last Shabbat's candle lighting.
    //
    // It still runs every 6h as a backstop for a failed load; keying it here just means the
    // phase is now anchored to midnight rather than to whenever someone opened the browser.
    //
    // netzDayKey adds the second boundary, 07:30, where the הנץ row switches to tomorrow's
    // sunrise. Re-running restarts the six-hour interval, so its phase now hangs off both
    // boundaries: loads land at 00:00, 06:00, 07:30, 13:30 and 19:30 — never more than six
    // hours apart, which is the only thing that interval was ever there to guarantee.
    //
    // The load schedule above describes / and the phone; /tv runs unattended for weeks and
    // reloads at 03:30 via NightlyReload.jsx, which remounts this hook and re-phases the
    // six-hour interval. Loads there land at 00:00, 03:30, 07:30, 13:30 and 19:30 instead,
    // but the never-more-than-six-hours-apart guarantee still holds.
  }, [israelDayKey, netzDayKey]);

  // Follow the calendar: שבת from Friday 09:00, back to חול at Sunday 00:00. The TV
  // stays powered for weeks, so a page opened on Tuesday must not still be showing
  // weekday times on Shabbat.
  //
  // A toggle tap pins itself to the schedule *segment* it was overriding — the screen
  // plus the date that run of it started on — rather than replacing the screen
  // outright. Kept derived, so it cannot be stomped by the next one-second tick, nor
  // lost to a remount, nor missed because a backgrounded tab throttled a timer.
  //
  // The segment key, not merely the screen value, is what makes it expire. 'shabbat'
  // comes round again every week: an override compared against the value alone would
  // stop applying at the next boundary and then quietly resurrect at the one after,
  // so a Saturday tap of חול would hold every following Friday 09:00 for as long as
  // the TV stayed on. A date-stamped segment key never recurs, so once `now` leaves
  // the segment the override was cast in, it is gone for good.
  const { screen: scheduled, key: segmentKey } = screenSegment(now);
  const screen = forceScreen || (override && override.segmentKey === segmentKey ? override.screen : scheduled);
  const setScreen = (value) => setOverride({ screen: value, segmentKey });

  // nowIL is declared above the effects — see the note there on israelDayKey.
  const clock = `${pad(nowIL.hour)}:${pad(nowIL.minute)}:${pad(nowIL.second)}`;
  let hebDate = '';
  let greg = '';
  let weekday = '';
  try {
    const dateOpts = { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'long', year: 'numeric' };
    hebDate = new Intl.DateTimeFormat('he-u-ca-hebrew', dateOpts).format(now);
    greg = new Intl.DateTimeFormat('he', dateOpts).format(now);
    weekday = new Intl.DateTimeFormat('he', { timeZone: 'Asia/Jerusalem', weekday: 'long' }).format(now);
  } catch {
    /* Intl calendar unsupported — leave header dates blank */
  }

  const isShab = screen === 'shabbat';
  // The gabbai's pinned שבת times (blank = compute it) applied to this week's anchors.
  // See the comment on shabbatAnchorTimes above for why this is not done in the fetch.
  const shabbatTimes = resolveShabbatTimes(shabbatAnchorTimes, SHABBAT_CONFIG, settings.shabbat);
  // Each schedule gets its own computed map — both lists would otherwise collide
  // on a key named `mincha` holding different values.
  const prayers = resolvePrayers(
    isShab ? SHABBAT_PRAYERS : WEEKDAY_PRAYERS,
    zmanimTimes,
    isShab ? shabbatTimes : { mincha: minchaTime, netz: netzTime }
  );
  const prayersTitle = isShab ? 'זמני תפילות · שבת' : 'זמני תפילות · חול';
  const prayersSub = isShab ? parasha || 'שבת קודש' : weekday;
  const next = computeNextMinyan(now, prayers);

  // Which שיעורים list reaches a screen is decided by the DAY, not by the layout — the same
  // `isShab` that already picks the prayer schedule two lines up.
  //
  // That distinction is the whole design. The dark board is not "the weekday board": it is
  // what `/` and every phone show on Shabbat too, so keying off the layout would post
  // weekday שיעורים to a congregant checking his phone in shul on Shabbat morning. Keying
  // off the day means all three layouts agree, and the חול/שבת toggle on `/` moves the
  // שיעורים along with the prayer times rather than leaving them contradicting each other.
  //
  // Returned as plain `shiurim`, so ShiurimPanel, the phone's ShiurimCard and the שבת
  // board's ShiurimCard all keep reading one key and none of them had to change.
  const shiurim = isShab ? shiurimShabbat : weekdayShiurim;

  // Same Asia/Jerusalem formatter the prayer rows use, so the two panels can never
  // disagree by an hour on a device whose timezone is set wrong.
  const zmanimRows = ZMANIM_ROWS.map((r) => ({
    id: r.id,
    name: r.name,
    time: (zmanimTimes && toClock(zmanimTimes[r.field], r.offsetMin)) || '--:--',
  }));

  // The three edge cards. `candles` comes from the resolved prayer row rather than from the
  // anchors, so a הדלקת נרות the gabbai pinned in /adminGabbai shows on the card as well as in
  // the list — one number, two places.
  const shabbatCards = {
    candles: shabbatTimes.shabCandles,
    ...shabbatCardTimes(shabbatAnchorTimes),
  };

  // מן הפרשה. Always an entry — parashaHighlights falls back rather than returning null — so
  // the card renders through a Hebcal outage and through a Shabbat that has no parasha at all.
  const highlights = parashaHighlights(parasha);
  const haftara = highlights.haftara;

  // Advance through each list with one shared counter; an empty list yields null so
  // its panel renders a quiet placeholder rather than crashing.
  const index = (list) => (list.length ? tick % list.length : -1);
  const pick = (list) => (list.length ? list[tick % list.length] : null);
  const ann = pick(announcements);
  const maz = pick(mazal) || {};
  const azk = pick(azkarot) || {};
  // הקדשת הלוח. Null rather than {} when the list is empty, because empty is the normal
  // state here — the panel is seeded empty — and the card renders a different body for it
  // rather than three blank lines. See DedicationCard.
  const ded = pick(dedication);
  // Its own counter, so `pick` (which is on the 6.5s tick) can't be reused here.
  //
  // Shuffled per mount rather than walked in the order the server sends. That order is fixed
  // — jokes/refresh.js appends with `push` and never reorders — so a counter starting at zero
  // opened every single page load on the same joke and showed the same handful after it. With
  // ~150 jokes in the pool and a 30-second rotation, a congregant glancing at their phone
  // never saw any of the rest.
  //
  // The other rotating panels deliberately do NOT get this. הודעות, מזל טוב and אזכרות hold a
  // handful of items each that the gabbai wants all of, so a fixed order is a feature there;
  // the jokes pool is two orders of magnitude deeper and the entry point is what decides
  // whether most of it is ever seen.
  //
  // Memoized against the pool's identity, so the shuffle runs on the 30-second poll rather
  // than on the one-second clock tick. Correctness does not depend on that: seededShuffle is
  // a pure function of the pool and the seed, so a recomputation returns the same order. The
  // memo is only there to keep 150 swaps off a page that stays open for weeks.
  const shuffledJokes = useMemo(() => seededShuffle(jokes, jokeSeed), [jokes, jokeSeed]);
  const joke = shuffledJokes.length ? shuffledJokes[jokeTick % shuffledJokes.length] : null;
  // Rotates on the shared 6.5s counter, like ann/maz/azk — one clock for the whole board.
  const pasuk = highlights.pesukim.length ? highlights.pesukim[tick % highlights.pesukim.length] : null;

  return {
    // Calendar and clock
    clock,
    hebDate,
    greg,
    weekday,
    parasha,
    // Which schedule is showing, and how to override it
    screen,
    setScreen,
    // Times
    prayers,
    prayersTitle,
    prayersSub,
    next,
    zmanimRows,
    shabbatCards,
    // Admin-edited content
    shiurim,
    ticker,
    ann,
    maz,
    azk,
    ded,
    joke,
    haftara,
    pasuk,
    // Rotation. The counters double as React keys, so a panel re-mounts and replays
    // its fade on every rotation. annCount/annIndex drive the mobile dot strip, which
    // needs the position in the list that `ann` was picked from.
    tick,
    jokeTick,
    annCount: announcements.length,
    annIndex: index(announcements),
  };
}
