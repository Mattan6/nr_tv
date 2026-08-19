import TopBar from '../components/display/TopBar';
import PrayerTimesPanel from '../components/display/PrayerTimesPanel';
import ZmanimPanel from '../components/display/ZmanimPanel';
import ShiurimPanel from '../components/display/ShiurimPanel';
import AnnouncementsPanel from '../components/display/AnnouncementsPanel';
import { NextMinyanPanel, JokesPanel, MazalPanel, AzkarotPanel } from '../components/display/CenterCards';
import Ticker from '../components/display/Ticker';
import useDisplayModel from '../hooks/useDisplayModel';
import useCanvasScale from '../hooks/useCanvasScale';

// The wall display: a fixed 1920x1080 canvas scaled to whatever screen it is on. Every
// value it renders comes from useDisplayModel, which the phone layout also calls — see
// pages/MobileDisplay.jsx. The fit itself lives in hooks/useCanvasScale.js: pages/ShabbatDisplay.jsx
// needs the identical arithmetic, and it belongs to neither page.
//
// safeArea holds back a margin for TVs that crop their own edges — pages/TvDisplay.jsx passes
// it. It is padding inside the canvas, NOT a factor on the scale: shrinking the scale to make
// room was what pinned the shul's panel at 0.92 device pixels per canvas pixel and smeared
// every hairline on the board. See hooks/useCanvasScale.js. Zero is a no-op, so / is unchanged.
const SynagogueDisplay = ({ safeArea = { x: 0, y: 0 }, showToggle = true }) => {
  const scale = useCanvasScale();
  // Whole canvas pixels, so the content box lands on the grid the snapped scale just bought.
  const insetX = Math.round(1920 * safeArea.x);
  const insetY = Math.round(1080 * safeArea.y);
  const {
    screen,
    setScreen,
    clock,
    hebDate,
    greg,
    weekday,
    parasha,
    prayers,
    prayersTitle,
    prayersSub,
    next,
    zmanimRows,
    shiurim,
    ticker,
    ann,
    maz,
    azk,
    joke,
    tick,
    jokeTick,
  } = useDisplayModel();

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
            inset: `${insetY}px ${insetX}px`,
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
            showToggle={showToggle}
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
              <AnnouncementsPanel ann={ann?.text || ''} annKey={tick} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: 0 }}>
                <NextMinyanPanel next={next} />
                <JokesPanel joke={joke} jokeKey={jokeTick} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: 0 }}>
                <MazalPanel maz={maz} mazKey={tick} />
                <AzkarotPanel azk={azk} azkKey={tick} />
              </div>
            </div>

            {/* Left: zmanim + shiurim */}
            <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '20px', minHeight: 0 }}>
              <ZmanimPanel rows={zmanimRows} />
              <ShiurimPanel shiurim={shiurim} />
            </div>
          </div>

          {/* Ticker */}
          <Ticker items={ticker} />
        </div>
      </div>
    </div>
  );
};

export default SynagogueDisplay;
