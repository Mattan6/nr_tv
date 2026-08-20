import Masthead from '../components/rosh/Masthead';
import HighlightStrip from '../components/rosh/HighlightStrip';
import DayListCard from '../components/rosh/DayListCard';
import CandlesCard from '../components/rosh/CandlesCard';
import MechirotCard from '../components/rosh/MechirotCard';
import SimanimStrip from '../components/rosh/SimanimStrip';
import RoshTicker from '../components/rosh/RoshTicker';
import { C, SANS } from '../components/rosh/roshStyle';
import useRoshModel from '../hooks/useRoshModel';
import useCanvasScale from '../hooks/useCanvasScale';

// The ראש השנה wall board: the same fixed 1920x1080 canvas the other two use, scaled to
// whatever screen it is on, in the pomegranate-and-gold palette the חג was designed in.
//
// Mounted only by pages/TvDisplay.jsx, and only for `?screen=rosh` — a value
// hooks/useScheduledScreen.js never returns. This board is NOT on the calendar and will not
// be: the gabbai switches the set to it when the חג comes in and reloads /tv afterwards.
//
// That is also the only correct answer for תשפ״ז. יום א׳ דראש השנה falls on Shabbat this year,
// so a schedule rule would have this board and the שבת board both claiming one Saturday.
//
// The two Torah-reading subtitles are literals: בראשית כ״א and the עקדה are the readings of the
// two days in every year, and they are not a gabbai's to change.
const RoshDisplay = ({ safeArea = { x: 0, y: 0 } }) => {
  const scale = useCanvasScale();
  // Padding inside the canvas rather than a factor on the scale — see hooks/useCanvasScale.js,
  // which documents at length why folding overscan into the raster scale blurred every hairline
  // on the shul's panel. Whole canvas pixels keep the content box on the pixel grid.
  const insetX = Math.round(1920 * safeArea.x);
  const insetY = Math.round(1080 * safeArea.y);

  const {
    clock,
    hebDate,
    greg,
    hebrewYear,
    day1,
    day2,
    day1Weekday,
    day2Weekday,
    candles,
    shofar,
    tashlich,
    mechirot,
    mechirotDay,
    pageIndex,
    pageCount,
    ded,
    ticker,
  } = useRoshModel();

  const daySub = (base, weekday) => [base, weekday].filter(Boolean).join(' · ');

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: C.pageFlat }}>
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
            fontFamily: SANS,
            color: C.ink,
            background: C.page,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Masthead hebDate={hebDate} greg={greg} clock={clock} hebrewYear={hebrewYear} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', padding: '18px 46px 0', minHeight: 0 }}>
            <HighlightStrip ded={ded} shofar={shofar} tashlich={tashlich} />

            {/* Under dir=rtl the first column is the rightmost: יום א׳ right, יום ב׳ centre,
                and the two derived cards left — the חג read from its first minute to its last. */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr', gap: '20px', minHeight: 0, paddingBottom: '4px' }}>
              <DayListCard
                title="יוֹם א׳ דְּרֹאשׁ הַשָּׁנָה"
                sub={daySub('א׳ תשרי · בראשית כ״א', day1Weekday)}
                rows={day1}
              />
              <DayListCard
                title="יוֹם ב׳ דְּרֹאשׁ הַשָּׁנָה"
                sub={daySub('ב׳ תשרי · קריאת העקדה', day2Weekday)}
                rows={day2}
              />

              <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: '20px', minHeight: 0 }}>
                <CandlesCard candles={candles} />
                <MechirotCard
                  rows={mechirot}
                  dayLabel={mechirotDay}
                  pageIndex={pageIndex}
                  pageCount={pageCount}
                />
              </div>
            </div>
          </div>

          <SimanimStrip />
          <RoshTicker items={ticker} />
        </div>
      </div>
    </div>
  );
};

export default RoshDisplay;
