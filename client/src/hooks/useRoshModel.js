import { useEffect, useState } from 'react';
import { getHolidayCalendar } from '../services/hebcal';
import { israelParts, israelToday } from '../components/display/displayData';
import {
  HOLIDAY_WINDOW_BACK_DAYS,
  HOLIDAY_WINDOW_DAYS,
  ROSH_HASHANAH,
  holidayAnchors,
  resolveRoshTimes,
  mechirotPages,
  countdownTo,
  rowStyle,
  hebrewYearOf,
  weekdayName,
} from '../components/rosh/roshData';
import useDisplayContent from './useDisplayContent';

const ROTATE_MS = 6500;
const ZMANIM_REFRESH_MS = 21600000; // 6 hours
const MECHIROT_PER_PAGE = 4;

const pad = (n) => String(n).padStart(2, '0');

const DAY_TITLES = { day1: 'יום א׳ דראש השנה', day2: 'יום ב׳ דראש השנה' };

// Everything the ראש השנה board shows.
//
// A hook of its own rather than a fourth branch of useDisplayModel. That hook is 380 lines
// carrying six network legs, four timers and three rotation counters, and this board shares
// none of it: no parasha, no מן הפרשה, no הנץ rollover, no weekly מנחה, no jokes, no חול/שבת
// toggle, no computeNextMinyan. Branching it would add a fourth schedule to a file that
// already documents at length how carefully its three existing ones interact, in exchange for
// reusing a clock tick.
//
// What it DOES reuse is every pure helper — israelParts, israelToday, toClock and
// useDisplayContent — so there is still exactly one definition of what time it is in Nitzan,
// and it serves all three boards.
export default function useRoshModel() {
  const [now, setNow] = useState(() => new Date());
  // One counter for the whole board, as the other two have: the מכירות pages and the הקדשה
  // advance together. The modulo is taken at render against the CURRENT list, because the
  // lists are editable and one the gabbai shortens must not leave an index past its end.
  const [tick, setTick] = useState(0);
  const [anchors, setAnchors] = useState({});

  const { roshDay1, roshDay2, roshMechirot, roshDedication, roshTicker, settings } =
    useDisplayContent();

  // Israel's wall clock and calendar, never the device's — see israelParts. Hoisted above the
  // effects because the Hebcal load depends on the calendar DAY: `now` changes every second,
  // this string changes once, at 00:00 Israel time.
  const nowIL = israelParts(now);
  const israelDayKey = `${nowIL.year}-${pad(nowIL.month)}-${pad(nowIL.day)}`;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const r = setInterval(() => setTick((v) => v + 1), ROTATE_MS);
    return () => clearInterval(r);
  }, []);

  // This year's ראש השנה, and the candle/הבדלה times bracketing it.
  //
  // Keyed on Israel's calendar day so the whole effect tears down and re-runs within a second
  // of 00:00, with the six-hour interval as a backstop for a failed load — the same shape and
  // the same reasoning as useDisplayModel's, minus its 07:30 boundary, which no row on this
  // board needs. The interval alone would not do: setInterval is phased from mount, so a TV
  // opened at 23:58 would serve the previous day's answer for six hours after midnight.
  //
  // A failed request deliberately leaves the previous anchors in state. This board is watched
  // by a room full of people for two days; it must keep showing the times it has rather than
  // blanking because a third party was briefly unreachable.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const today = israelToday(new Date());
        const from = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - HOLIDAY_WINDOW_BACK_DAYS,
          12, 0, 0, 0
        );
        const response = await getHolidayCalendar(from, HOLIDAY_WINDOW_DAYS);
        if (cancelled) return;
        setAnchors(holidayAnchors(response, ROSH_HASHANAH));
      } catch {
        /* keep whatever anchors are already on screen */
      }
    };

    load();
    const id = setInterval(load, ZMANIM_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [israelDayKey]);

  const clock = `${pad(nowIL.hour)}:${pad(nowIL.minute)}:${pad(nowIL.second)}`;
  let hebDate = '';
  let greg = '';
  try {
    // These two format `now`, a real instant, so they MUST be read in Jerusalem. Contrast
    // hebrewYearOf and weekdayName below, which format the local-noon Dates holidayAnchors
    // returns and must NOT be — those already carry Israel's calendar fields.
    const opts = { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'long', year: 'numeric' };
    hebDate = new Intl.DateTimeFormat('he-u-ca-hebrew', opts).format(now);
    greg = new Intl.DateTimeFormat('he', opts).format(now);
  } catch {
    /* Intl calendar unsupported — leave the header dates blank */
  }

  const decorate = (rows) => rows.map((r) => ({ ...r, style: rowStyle(r.kind) }));
  const day1 = decorate(roshDay1);
  const day2 = decorate(roshDay2);

  const candles = resolveRoshTimes(anchors, settings.rosh);

  // The two derived cards. Each reads the row the gabbai marked with that kind, so the fact
  // lives in exactly one place and the card cannot contradict the list beside it.
  //
  // Day two is searched first because that is where both landmarks fall in a year whose first
  // day is Shabbat — there is no שופר on Shabbat — but either day is accepted, so a year that
  // puts them on day one needs no code change.
  const findKind = (kind) => {
    const inDay2 = day2.find((r) => r.kind === kind);
    if (inDay2) return { row: inDay2, date: anchors.day2Date, ordinal: 'ב׳' };
    const inDay1 = day1.find((r) => r.kind === kind);
    if (inDay1) return { row: inDay1, date: anchors.day1Date, ordinal: 'א׳' };
    return null;
  };

  const shofarHit = findKind('shofar');
  const shofar = shofarHit
    ? {
        label: [`יום ${shofarHit.ordinal} דחג`, shofarHit.row.chazan].filter(Boolean).join(' · '),
        time: shofarHit.row.time || '',
        countdown: countdownTo(now, shofarHit.date, shofarHit.row.time),
      }
    : { label: '', time: '', countdown: '--:--:--' };

  const tashlichHit = findKind('tashlich');
  const tashlichWeekday = tashlichHit ? weekdayName(tashlichHit.date) : '';
  const tashlich = tashlichHit
    ? {
        // 'תשליך · יום שבת'. weekdayName's long form already carries the word יום.
        label: tashlichWeekday ? `תשליך · ${tashlichWeekday}` : 'תשליך',
        time: tashlichHit.row.time || '',
        place: tashlichHit.row.chazan || '',
      }
    : { label: 'תשליך', time: '', place: '' };

  const pages = mechirotPages(roshMechirot, MECHIROT_PER_PAGE);
  const pageCount = pages.length;
  const pageIndex = pageCount ? tick % pageCount : -1;
  const page = pageCount ? pages[pageIndex] : null;
  const pageDate = page ? (page.day === 'day2' ? anchors.day2Date : anchors.day1Date) : null;

  // הקדשת הלוח. Null rather than {} when the list is empty, because the card renders a
  // different body for that state rather than a blank line.
  const ded = roshDedication.length ? roshDedication[tick % roshDedication.length] : null;

  return {
    clock,
    hebDate,
    greg,
    hebrewYear: hebrewYearOf(anchors.day1Date),
    day1,
    day2,
    // The bare form here — the card headings read 'יום א׳ דראש השנה · שבת', so a second יום
    // would be one too many. See weekdayName.
    day1Weekday: weekdayName(anchors.day1Date, { bare: true }),
    day2Weekday: weekdayName(anchors.day2Date, { bare: true }),
    candles,
    shofar,
    tashlich,
    mechirot: page ? page.rows : [],
    mechirotDay: page
      ? [DAY_TITLES[page.day], weekdayName(pageDate, { bare: true })].filter(Boolean).join(' · ')
      : '',
    pageIndex,
    pageCount,
    ded,
    ticker: roshTicker,
    // Doubles as a React key, so a rotating panel re-mounts and replays its fade on each turn.
    tick,
  };
}
