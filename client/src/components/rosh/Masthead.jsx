import { C, SANS, SERIF } from './roshStyle';
import { ShofarIcon, SprigIcon } from './icons';

// The shul's own name, hard-coded exactly as it is on the other three surfaces —
// display/TopBar.jsx, shabbat/Masthead.jsx and mobile/MobileHeader.jsx. One shul, one board
// per חג; if it ever becomes configurable it becomes configurable in all four at once.
const SHUL = 'בית כנסת נווה רחמים';
const NUSACH = 'נוסח עדות המזרח · ב״ה';
// Liturgy, not content: true of every ראש השנה, so there is nothing here for a gabbai to edit.
const GREETING = 'שָׁנָה טוֹבָה וּמְתוּקָה';
const BLESSING = 'תִּכְלֶה שָׁנָה וְקִלְלוֹתֶיהָ · תָּחֵל שָׁנָה וּבִרְכוֹתֶיהָ';

// `hebrewYear` arrives already lettered ('תשפ״ז') from the model — see hebrewYearOf. Blank
// through a Hebcal outage, and the title then reads 'רֹאשׁ הַשָּׁנָה' rather than trailing off
// after the word, which is the same fallback the שבת masthead makes for a missing parasha.
const Masthead = ({ hebDate, greg, clock, hebrewYear }) => (
  <div
    style={{
      flex: 'none',
      position: 'relative',
      overflow: 'hidden',
      background: C.masthead,
      padding: '26px 46px 30px',
    }}
  >
    {/* The sunrise behind the greeting — a new year coming up over the top edge. */}
    <div
      style={{
        position: 'absolute',
        top: '-120px',
        left: '50%',
        width: '900px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(closest-side,rgba(224,190,124,0.55),transparent)',
        animation: 'omRoshSunrise 7s ease-in-out infinite',
        pointerEvents: 'none',
      }}
    />

    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '30px' }}>
      <div style={{ flex: 1, textAlign: 'right' }}>
        <div style={{ fontSize: '24px', fontWeight: 600, color: C.goldLight, letterSpacing: '1px' }}>{hebDate}</div>
        <div style={{ fontSize: '24px', color: C.onDeepSoft, marginTop: '2px' }}>{greg}</div>
        <div style={{ fontSize: '46px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#ffffff', marginTop: '4px', lineHeight: 1 }}>
          {clock}
        </div>
      </div>

      <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', gap: '26px' }}>
        <ShofarIcon />
        <div>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: '66px', color: '#ffffff', lineHeight: 1 }}>
            {GREETING}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
            <SprigIcon />
            <div style={{ width: '56px', height: '1px', background: 'rgba(224,190,124,0.7)' }} />
            <div style={{ fontFamily: SERIF, fontSize: '25px', fontWeight: 700, color: C.goldLight, letterSpacing: '3px' }}>
              {hebrewYear ? `רֹאשׁ הַשָּׁנָה ${hebrewYear}` : 'רֹאשׁ הַשָּׁנָה'}
            </div>
            <div style={{ width: '56px', height: '1px', background: 'rgba(224,190,124,0.7)' }} />
            <SprigIcon flip />
          </div>
        </div>
        <ShofarIcon flip delay={0.9} />
      </div>

      <div style={{ flex: 1, textAlign: 'left', fontFamily: SANS }}>
        <div style={{ fontFamily: SERIF, fontSize: '28px', fontWeight: 700, color: '#ffffff' }}>{SHUL}</div>
        <div style={{ fontSize: '24px', color: C.onDeepSoft, marginTop: '3px' }}>{NUSACH}</div>
        <div style={{ fontSize: '24px', color: C.goldLight, marginTop: '6px' }}>{BLESSING}</div>
      </div>
    </div>
  </div>
);

export default Masthead;
