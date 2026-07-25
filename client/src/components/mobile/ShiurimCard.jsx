import * as S from './mobileStyles';

// Edited in /adminGabbai, same list the wall's ShiurimPanel renders.
const ShiurimCard = ({ shiurim }) => (
  <div style={{ ...S.card, padding: '18px 18px 8px' }}>
    <div style={S.sectionTitle}>שיעורי תורה</div>

    {shiurim.length === 0 && <div style={S.empty}>אין שיעורים</div>}

    <div style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
      {shiurim.map((s) => (
        <div key={s.id} style={{ ...S.row, padding: '12px 2px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#eaeef5', lineHeight: 1.25 }}>{s.name}</div>
            <div style={{ fontSize: '14px', color: S.COLORS.muted }}>{s.by}</div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: S.COLORS.goldText, fontVariantNumeric: 'tabular-nums', flex: 'none' }}>
            {s.time}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ShiurimCard;
