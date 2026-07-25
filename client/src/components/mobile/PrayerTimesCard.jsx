import * as S from './mobileStyles';

// The חול/שבת toggle writes the same segment-pinned override the wall's does — the screen
// follows the calendar (שבת from Friday 09:00 to Sunday 00:00) and a tap holds only until
// the calendar leaves the segment it overrode. See useDisplayModel.
//
// Real <button>s rather than the wall's role="button" divs: this one is tapped.
//
// The heading is 'זמני תפילות' alone, where the wall's reads 'זמני תפילות · חול'. Which
// schedule is showing is said twice over here — by the lit pill and by the sub-line — and
// a third copy in the heading pushes the toggle off a 360px-wide phone.
const PrayerTimesCard = ({ sub, prayers, screen, onSetChol, onSetShab }) => {
  const isShab = screen === 'shabbat';
  return (
    <div style={{ ...S.card, padding: '18px 18px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={S.sectionTitle}>זמני תפילות</div>
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '4px',
            background: 'rgba(0,0,0,0.35)',
            borderRadius: '999px',
            border: '1px solid rgba(201,168,106,0.2)',
            flex: 'none',
          }}
        >
          <button type="button" onClick={onSetChol} aria-pressed={!isShab} style={isShab ? S.toggleIdle : S.toggleActive}>
            חול
          </button>
          <button type="button" onClick={onSetShab} aria-pressed={isShab} style={isShab ? S.toggleActive : S.toggleIdle}>
            שבת
          </button>
        </div>
      </div>

      {sub && <div style={{ fontSize: '14px', color: S.COLORS.muted, marginTop: '4px' }}>{sub}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: '12px' }}>
        {prayers.map((p) => (
          <div key={p.name} style={S.row}>
            <div style={S.rowName}>{p.name}</div>
            <div style={S.rowTime}>{p.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrayerTimesCard;
