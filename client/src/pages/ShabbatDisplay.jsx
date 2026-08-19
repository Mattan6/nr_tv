import Masthead from '../components/shabbat/Masthead';
import LightTicker from '../components/shabbat/LightTicker';
import { CandleCard, NextPrayerCard, HavdalahCard } from '../components/shabbat/EdgeCards';
import PrayerListCard from '../components/shabbat/PrayerListCard';
import ZmanimGrid from '../components/shabbat/ZmanimGrid';
import ShiurimCard from '../components/shabbat/ShiurimCard';
import MazalCard from '../components/shabbat/MazalCard';
import ParashaVerseCard from '../components/shabbat/ParashaVerseCard';
import DedicationCard from '../components/shabbat/DedicationCard';
import { C, SANS } from '../components/shabbat/shabbatStyle';
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
  const scale = useCanvasScale();
  // Padding inside the canvas rather than a factor on the scale — see SynagogueDisplay and
  // hooks/useCanvasScale.js. Whole canvas pixels keep the content box on the pixel grid.
  const insetX = Math.round(1920 * safeArea.x);
  const insetY = Math.round(1080 * safeArea.y);
  // Takes maz, pasuk and ded off the model, and pointedly not azk, joke or ann: לעילוי נשמת
  // and בדיחות ליאור are absent from this board by design, not omission, and הודעות left it
  // when הקדשת הלוח took the third slot in the right-hand column. All three still appear on
  // the weekday board and the phone, which is where a congregant reads them.
  const { clock, hebDate, greg, ticker, haftara, parasha, shabbatCards, next, prayers, zmanimRows, shiurim, maz, pasuk, ded, tick } =
    useDisplayModel('shabbat');

  // The שבת list spans two days and each row is already tagged with the day it happens on —
  // `day` exists because computeNextMinyan needs it, and the two cards get it for free.
  //
  // הדלקת נרות is filtered out of ערב שבת because it has its own card above. That leaves one
  // row there, which is the layout the design calls for: a duplicated time and an over-full
  // card are both worse than a card with room in it.
  const erev = prayers.filter((p) => p.day === 5 && p.name !== 'הדלקת נרות');
  const yom = prayers.filter((p) => p.day === 6);

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

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '18px', padding: '20px 46px 0', minHeight: 0 }}>
            {/* Under dir=rtl the first column is the rightmost: נרות right, מניין הבא centre,
                מוצאי שבת left — the two ends of Shabbat flanking the thing happening next. */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr', gap: '20px', flex: 'none' }}>
              <CandleCard candles={shabbatCards.candles} sunset={shabbatCards.fridaySunset} />
              <NextPrayerCard next={next} />
              <HavdalahCard havdalah={shabbatCards.havdalah} tzeitRT={shabbatCards.tzeitRT} />
            </div>

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr', gap: '20px', minHeight: 0, paddingBottom: '4px' }}>
              <div style={{ display: 'grid', gridTemplateRows: '0.8fr 1.2fr', gap: '20px', minHeight: 0 }}>
                <PrayerListCard title="עֶרֶב שַׁבָּת" sub="יום שישי · קבלת שבת" rows={erev} />
                <PrayerListCard title="יוֹם הַשַּׁבָּת" sub="שחרית · מנחה · ערבית" rows={yom} />
              </div>

              <div style={{ display: 'grid', gridTemplateRows: '0.72fr 1.28fr', gap: '20px', minHeight: 0 }}>
                <ZmanimGrid rows={zmanimRows} />
                <ShiurimCard shiurim={shiurim} />
              </div>

              <div style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: '20px', minHeight: 0 }}>
                <MazalCard maz={maz} rotationKey={tick} />
                <ParashaVerseCard pasuk={pasuk} rotationKey={tick} />
                {/* No rotationKey: this card fades on the dedication changing, not on the
                    shared 6.5s tick. See DedicationCard. */}
                <DedicationCard ded={ded} parasha={parasha} />
              </div>
            </div>
          </div>

          <LightTicker items={ticker} />
        </div>
      </div>
    </div>
  );
};

export default ShabbatDisplay;
