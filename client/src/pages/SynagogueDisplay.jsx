import { useState, useEffect } from 'react';
import { getZmanim, getParasha } from '../services/hebcal';
import {
  WEEKDAY_PRAYERS,
  SHABBAT_PRAYERS,
  SHABBAT_CONFIG,
  ZMANIM_ROWS,
  SHIURIM,
  ANNOUNCEMENTS,
  MAZAL,
  AZKAROT,
  PARNAS,
  TICKER,
  resolvePrayers,
  computeNextMinyan,
  governingThursday,
  weeklyMinchaTime,
  upcomingSaturday,
  shabbatAnchors,
  resolveShabbatTimes,
  screenSegment,
  israelParts,
  israelToday,
  toClock,
} from '../components/display/displayData';
import TopBar from '../components/display/TopBar';
import PrayerTimesPanel from '../components/display/PrayerTimesPanel';
import ZmanimPanel from '../components/display/ZmanimPanel';
import ShiurimPanel from '../components/display/ShiurimPanel';
import AnnouncementsPanel from '../components/display/AnnouncementsPanel';
import { NextMinyanPanel, ParnasPanel, MazalPanel, AzkarotPanel } from '../components/display/CenterCards';
import Ticker from '../components/display/Ticker';

const ROTATE_MS = 6500;
const ZMANIM_REFRESH_MS = 21600000; // 6 hours

const pad = (n) => String(n).padStart(2, '0');

const SynagogueDisplay = () => {
  // null = follow the calendar; { screen, segmentKey } = a TopBar override, live only
  // while the calendar is still inside that same schedule segment. See below.
  const [override, setOverride] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [scale, setScale] = useState(1);
  const [annIdx, setAnnIdx] = useState(0);
  const [mazIdx, setMazIdx] = useState(0);
  const [azkIdx, setAzkIdx] = useState(0);
  const [zmanimTimes, setZmanimTimes] = useState(null);
  const [minchaTime, setMinchaTime] = useState(null);
  const [shabbatTimes, setShabbatTimes] = useState({});
  const [parasha, setParasha] = useState('');

  // Scale the fixed 1920x1080 canvas to fit the screen.
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Tick the clock / date every second.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Rotate announcements / mazal / azkarot.
  useEffect(() => {
    const r = setInterval(() => {
      setAnnIdx((i) => (i + 1) % ANNOUNCEMENTS.length);
      setMazIdx((i) => (i + 1) % MAZAL.length);
      setAzkIdx((i) => (i + 1) % AZKAROT.length);
    }, ROTATE_MS);
    return () => clearInterval(r);
  }, []);

  // Live zmanim (Nitzan) + this week's parasha, candle lighting and havdalah.
  //
  // allSettled, not all: the four requests feed four independent parts of the
  // screen, and one failing must not blank or freeze the other three. Every branch
  // also *assigns* — a rejected leg is written back as null so its panel falls to
  // "--:--". Leaving the previous value in place would quietly post last week's
  // times through an outage, which is worse than showing nothing.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // All three dates come off Israel's calendar, not the device's: east of Israel
      // `new Date()` has already rolled over for part of every evening, so "today's
      // zmanim" would be tomorrow's and `upcomingSaturday` would skip to next week's
      // Shabbat while the hall was still sitting in this one. Each helper takes the
      // raw instant — they do the conversion themselves.
      const instant = new Date();
      const today = israelToday(instant);
      const saturday = upcomingSaturday(instant);
      const [z, zThu, zSat, p] = await Promise.allSettled([
        getZmanim(today),
        getZmanim(governingThursday(instant)),
        getZmanim(saturday),
        getParasha(SHABBAT_CONFIG.candleLightingMinBeforeSunset),
      ]);
      if (cancelled) return;
      const value = (r) => (r.status === 'fulfilled' ? r.value : null);
      const failures = [z, zThu, zSat, p].filter((r) => r.status === 'rejected');
      if (failures.length) {
        console.error('Failed to load display data:', failures.map((r) => r.reason));
      }
      setZmanimTimes(value(z)?.times || null);
      setMinchaTime(weeklyMinchaTime(value(zThu)?.times?.sunset));
      setShabbatTimes(
        resolveShabbatTimes({
          ...shabbatAnchors(value(p), saturday),
          saturdaySunset: value(zSat)?.times?.sunset,
        })
      );
      const parashaItem = value(p)?.items?.find((it) => it.category === 'parashat');
      setParasha(parashaItem?.hebrew || '');
    };
    load();
    const id = setInterval(load, ZMANIM_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Follow the calendar: שבת from Friday 09:00, back to חול at Sunday 00:00. The TV
  // stays powered for weeks, so a page opened on Tuesday must not still be showing
  // weekday times on Shabbat.
  //
  // A TopBar tap pins itself to the schedule *segment* it was overriding — the screen
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
  const screen = override && override.segmentKey === segmentKey ? override.screen : scheduled;
  const setScreen = (value) => setOverride({ screen: value, segmentKey });

  // Israel's wall clock and calendar, never the device's — see israelParts. A TV
  // whose timezone was set wrong at install must not read 16:43 above a זמנים panel
  // posting שקיעה 19:43.
  const nowIL = israelParts(now);
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
  // Each schedule gets its own computed map — both lists would otherwise collide
  // on a key named `mincha` holding different values.
  const prayers = resolvePrayers(
    isShab ? SHABBAT_PRAYERS : WEEKDAY_PRAYERS,
    zmanimTimes,
    isShab ? shabbatTimes : { mincha: minchaTime }
  );
  const prayersTitle = isShab ? 'זמני תפילות · שבת' : 'זמני תפילות · חול';
  const prayersSub = isShab ? parasha || 'שבת קודש' : weekday;
  const next = computeNextMinyan(now, prayers);

  // Same Asia/Jerusalem formatter the prayer rows use, so the two panels can never
  // disagree by an hour on a device whose timezone is set wrong.
  const zmanimRows = ZMANIM_ROWS.map((r) => ({
    name: r.name,
    time: (zmanimTimes && toClock(zmanimTimes[r.field])) || '--:--',
  }));

  const maz = MAZAL[mazIdx] || {};
  const azk = AZKAROT[azkIdx] || {};

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#070a10' }}>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '1920px',
          height: '1080px',
          transform: `translate(-50%,-50%) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <div
          dir="rtl"
          style={{
            position: 'absolute',
            inset: 0,
            padding: '38px 46px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            fontFamily: "'Assistant',sans-serif",
            color: '#e8ecf3',
            background:
              'radial-gradient(1300px 720px at 50% -12%,rgba(201,168,106,0.13),transparent 62%),radial-gradient(1500px 950px at 50% 118%,rgba(38,58,92,0.28),transparent 60%),linear-gradient(180deg,#0d121d 0%,#0a0e16 60%,#080b12 100%)',
          }}
        >
          <TopBar
            weekday={weekday}
            hebDate={hebDate}
            greg={greg}
            parasha={parasha}
            screen={screen}
            onSetChol={() => setScreen('weekday')}
            onSetShab={() => setScreen('shabbat')}
          />

          {/* Clock */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px' }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(201,168,106,0.55))' }} />
            <div style={{ fontSize: '100px', fontWeight: 800, letterSpacing: '3px', fontVariantNumeric: 'tabular-nums', color: '#f4ead2', textShadow: '0 6px 34px rgba(201,168,106,0.28)', lineHeight: 1 }}>
              {clock}
            </div>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(270deg,transparent,rgba(201,168,106,0.55))' }} />
          </div>

          {/* Main grid */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '452px 1fr 452px', gap: '20px', minHeight: 0, paddingBottom: '6px' }}>
            {/* Right: prayer times */}
            <PrayerTimesPanel title={prayersTitle} sub={prayersSub} prayers={prayers} />

            {/* Center */}
            <div style={{ display: 'grid', gridTemplateRows: '1.02fr 0.98fr 1fr', gap: '20px', minHeight: 0 }}>
              <AnnouncementsPanel ann={ANNOUNCEMENTS[annIdx]} annKey={annIdx} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: 0 }}>
                <NextMinyanPanel next={next} />
                <ParnasPanel parnas={PARNAS} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: 0 }}>
                <MazalPanel maz={maz} mazKey={mazIdx} />
                <AzkarotPanel azk={azk} azkKey={azkIdx} />
              </div>
            </div>

            {/* Left: zmanim + shiurim */}
            <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '20px', minHeight: 0 }}>
              <ZmanimPanel rows={zmanimRows} />
              <ShiurimPanel shiurim={SHIURIM} />
            </div>
          </div>

          {/* Ticker */}
          <Ticker text={TICKER} />
        </div>
      </div>
    </div>
  );
};

export default SynagogueDisplay;
