import { useState, useEffect } from 'react';
import { getZmanim, getParasha } from '../services/hebcal';
import {
  WEEKDAY_PRAYERS,
  SHABBAT_PRAYERS,
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

// Friday (5) and Saturday (6) default to the Shabbat schedule.
const isShabbatDay = (d) => d.getDay() === 5 || d.getDay() === 6;
const pad = (n) => String(n).padStart(2, '0');

const SynagogueDisplay = () => {
  const [screen, setScreen] = useState(() => (isShabbatDay(new Date()) ? 'shabbat' : 'weekday'));
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

  // Live zmanim (Nitzan) + this week's parasha from Hebcal.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const today = new Date();
        const [z, zThu, zSat, p] = await Promise.all([
          getZmanim(today),
          getZmanim(governingThursday(today)),
          getZmanim(upcomingSaturday(today)),
          getParasha(),
        ]);
        if (cancelled) return;
        setZmanimTimes(z.times || null);
        setMinchaTime(weeklyMinchaTime(zThu?.times?.sunset));
        setShabbatTimes(
          resolveShabbatTimes({
            ...shabbatAnchors(p),
            saturdaySunset: zSat?.times?.sunset,
          })
        );
        const parashaItem = p.items?.find((it) => it.category === 'parashat');
        setParasha(parashaItem?.hebrew || '');
      } catch (error) {
        console.error('Failed to load display data:', error);
      }
    };
    load();
    const id = setInterval(load, ZMANIM_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  let hebDate = '';
  let greg = '';
  let weekday = '';
  try {
    hebDate = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    greg = new Intl.DateTimeFormat('he', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    weekday = new Intl.DateTimeFormat('he', { weekday: 'long' }).format(now);
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
