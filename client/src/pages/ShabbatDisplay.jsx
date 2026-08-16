import Masthead from '../components/shabbat/Masthead';
import LightTicker from '../components/shabbat/LightTicker';
import { C } from '../components/shabbat/shabbatStyle';
import useDisplayModel from '../hooks/useDisplayModel';
import useCanvasScale from '../hooks/useCanvasScale';

// The שבת wall board: the same fixed 1920x1080 canvas the dark board uses, scaled to whatever
// screen it is on, in a light palette built for Friday afternoon through Saturday night.
//
// Mounted only by pages/TvDisplay.jsx. `/` on a desktop and `/` on a phone keep the dark board
// in every hour of the week — this layout is a /tv decision, not a viewport one.
//
// It calls useDisplayModel('shabbat') rather than useDisplayModel(): it IS the שבת board, so
// asking it to resolve חול prayers would be incoherent, and the ?screen=shabbat preview would
// otherwise post weekday times under שבת headings on any day but Saturday.
const ShabbatDisplay = ({ safeArea = { x: 0, y: 0 } }) => {
  const scale = useCanvasScale(safeArea);
  const { clock, hebDate, greg, ticker, haftara, parasha } = useDisplayModel('shabbat');

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
            inset: 0,
            fontFamily: "'Assistant',sans-serif",
            color: C.ink,
            background: C.page,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Masthead hebDate={hebDate} greg={greg} clock={clock} parasha={parasha || 'שַׁבַּת קֹדֶשׁ'} haftara={haftara} />

          {/* The tallit band: three woven stripes under the masthead. Purely decorative, and the
              one element on the board that carries no data at all. */}
          <div
            style={{
              flex: 'none',
              height: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '2px',
              padding: '0 46px',
              background: '#ffffff',
              borderBottom: '1px solid rgba(90,125,160,0.22)',
            }}
          >
            <div style={{ height: '4px', background: C.navy }} />
            <div style={{ height: '2px', background: C.navy }} />
            <div style={{ height: '4px', background: C.navy }} />
          </div>

          {/* Panels land here in Tasks 6-9. */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '18px', padding: '20px 46px 0', minHeight: 0 }} />

          <LightTicker items={ticker} />
        </div>
      </div>
    </div>
  );
};

export default ShabbatDisplay;
