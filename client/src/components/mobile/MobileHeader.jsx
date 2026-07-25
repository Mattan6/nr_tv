import { COLORS } from './mobileStyles';

// Sticky header: the נ״ר mark, the shul's name, and today's date.
//
// No clock, deliberately — the wall carries one because a hall full of people has no
// other, and a phone already shows the time two centimetres above this bar. The live
// countdown in the hero below covers the only clock question this screen is asked.
const MobileHeader = ({ weekday, hebDate }) => (
  <div
    style={{
      position: 'sticky',
      top: 0,
      zIndex: 5,
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      background: 'linear-gradient(180deg,rgba(10,14,22,0.94),rgba(10,14,22,0.72))',
      borderBottom: `1px solid ${COLORS.cardBorder}`,
      padding: '16px 20px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: '13px',
    }}
  >
    <div style={{ width: '44px', height: '44px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: 'rotate(45deg)',
          border: '1.5px solid rgba(201,168,106,0.7)',
          borderRadius: '10px',
          background: 'linear-gradient(135deg,rgba(201,168,106,0.24),rgba(201,168,106,0.02))',
        }}
      />
      <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontWeight: 900, fontSize: '16px', color: COLORS.goldText, position: 'relative' }}>
        נ״ר
      </div>
    </div>

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontWeight: 900, fontSize: '21px', color: COLORS.goldPale, lineHeight: 1.1 }}>
        בית כנסת נווה רחמים
      </div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.muted, letterSpacing: '0.6px', marginTop: '2px' }}>
        {weekday} · {hebDate}
      </div>
    </div>

    <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: '13px', color: '#6f7889', flex: 'none' }}>ב״ה</div>
  </div>
);

export default MobileHeader;
