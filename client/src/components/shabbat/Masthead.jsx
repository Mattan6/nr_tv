import { C, SERIF } from './shabbatStyle';
import { MastheadCandle } from './icons';

const rule = (deg) => ({
  width: '90px',
  height: '1px',
  background: `linear-gradient(${deg}deg,transparent,rgba(200,168,105,0.85))`,
});

// `haftara` is { ref, name } or null — null on a Shabbat whose reading is a festival's, where
// the generic fallback entry cannot name one. The line is dropped rather than left blank so the
// block above it does not float over a gap.
const Masthead = ({ hebDate, greg, clock, parasha, haftara }) => (
  <div
    style={{
      flex: 'none',
      position: 'relative',
      overflow: 'hidden',
      background: C.deep,
      padding: '24px 46px 22px',
      borderBottom: '2px solid rgba(200,168,105,0.65)',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: '-140px',
        left: '50%',
        width: '1000px',
        height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(closest-side,rgba(215,187,133,0.42),transparent)',
        animation: 'omGlowSoft 8s ease-in-out infinite',
        pointerEvents: 'none',
      }}
    />
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '30px' }}>
      <div style={{ flex: 1, textAlign: 'right' }}>
        <div style={{ fontSize: '23px', fontWeight: 600, color: C.goldLight, letterSpacing: '1px' }}>{hebDate}</div>
        <div style={{ fontSize: '24px', color: C.onDeepSoft, marginTop: '2px' }}>{greg}</div>
        <div style={{ fontSize: '46px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: C.onDeep, marginTop: '4px', lineHeight: 1 }}>
          {clock}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '26px' }}>
        <MastheadCandle />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: '62px', color: C.onDeep, lineHeight: 1, letterSpacing: '2px' }}>
            {parasha}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '11px' }}>
            <div style={rule(90)} />
            <div style={{ fontFamily: SERIF, fontSize: '25px', fontWeight: 700, color: C.goldLight, letterSpacing: '3px' }}>
              שַׁבַּת שָׁלוֹם וּמְבֹרָךְ
            </div>
            <div style={rule(270)} />
          </div>
        </div>
        <MastheadCandle delay=".8s" />
      </div>

      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ fontFamily: SERIF, fontSize: '28px', fontWeight: 700, color: C.onDeep }}>בית כנסת נווה רחמים</div>
        <div style={{ fontSize: '24px', color: C.onDeepSoft, marginTop: '3px' }}>נוסח עדות המזרח · ב״ה</div>
        {haftara && (
          <div style={{ fontSize: '24px', color: C.goldLight, marginTop: '6px' }}>
            הפטרה: {haftara.ref} · {haftara.name}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default Masthead;
