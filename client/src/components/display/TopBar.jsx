const TOGGLE_BASE = {
  fontFamily: "'Assistant',sans-serif",
  fontWeight: 700,
  fontSize: '20px',
  padding: '7px 22px',
  borderRadius: '999px',
  cursor: 'pointer',
  transition: 'all .3s',
  letterSpacing: '2px',
};
const TOGGLE_ACTIVE = {
  ...TOGGLE_BASE,
  background: 'linear-gradient(180deg,#e9cf94,#c9a86a)',
  color: '#241b0e',
  border: '1px solid #e9cf94',
  boxShadow: '0 4px 16px rgba(201,168,106,0.4)',
};
const TOGGLE_IDLE = {
  ...TOGGLE_BASE,
  background: 'rgba(255,255,255,0.04)',
  color: '#aab3c2',
  border: '1px solid rgba(201,168,106,0.28)',
};

const TopBar = ({ weekday, hebDate, greg, parasha, screen, onSetChol, onSetShab }) => {
  const isShab = screen === 'shabbat';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
      {/* Right: dates */}
      <div style={{ flex: 1, textAlign: 'right' }}>
        <div style={{ fontSize: '32px', fontWeight: 800, color: '#f1f4f9', lineHeight: 1.1 }}>{weekday}</div>
        <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: '27px', fontWeight: 700, color: '#e6c98a', marginTop: '2px' }}>{hebDate}</div>
        <div style={{ fontSize: '19px', fontWeight: 400, color: '#8b95a7', marginTop: '2px' }}>{greg}</div>
      </div>

      {/* Center: logo + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div style={{ width: '66px', height: '66px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, transform: 'rotate(45deg)', border: '2px solid rgba(201,168,106,0.7)', borderRadius: '14px', background: 'linear-gradient(135deg,rgba(201,168,106,0.22),rgba(201,168,106,0.02))' }} />
          <div style={{ position: 'absolute', inset: '11px', transform: 'rotate(45deg)', border: '1px solid rgba(201,168,106,0.4)', borderRadius: '9px' }} />
          <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontWeight: 900, fontSize: '25px', color: '#e6c98a', position: 'relative' }}>נ״ר</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontWeight: 900, fontSize: '42px', color: '#f2e7cf', lineHeight: 1, letterSpacing: '0.5px' }}>בית כנסת נווה רחמים</div>
          <div style={{ fontSize: '21px', fontWeight: 600, color: '#9aa4b5', marginTop: '5px', letterSpacing: '2px' }}>
            נוסח עדות המזרח&nbsp;&nbsp;•&nbsp;&nbsp;{parasha}
          </div>
        </div>
      </div>

      {/* Left: chol/shabbat toggle + BH */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div role="button" tabIndex={0} onClick={onSetChol} style={isShab ? TOGGLE_IDLE : TOGGLE_ACTIVE}>חול</div>
          <div role="button" tabIndex={0} onClick={onSetShab} style={isShab ? TOGGLE_ACTIVE : TOGGLE_IDLE}>שבת</div>
        </div>
        <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: '19px', color: '#6f7889', letterSpacing: '1px' }}>ב״ה</div>
      </div>
    </div>
  );
};

export default TopBar;
