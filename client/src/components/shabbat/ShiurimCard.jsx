import { C, CARD } from './shabbatStyle';
import { DiamondHeading } from './ZmanimGrid';

// The שבת שיעורים list, edited in /adminGabbai as its own panel. `useDisplayModel` picks
// which of the two lists to hand over on the day rather than on the layout, so this heading
// describes what is in the card rather than filtering it.
//
// Empty is a normal state here, not a failure: the שבת list ships empty so an upgrading
// shul's weekday שיעורים are never copied onto its שבת board, and it stays empty until the
// gabbai fills it. Without the line below the card would be a heading over a blank box,
// which reads as a broken panel rather than an unfilled one.
const ShiurimCard = ({ shiurim }) => (
  <div style={{ ...CARD, padding: '14px 24px' }}>
    <DiamondHeading>שִׁעוּרִים בְּשַׁבָּת</DiamondHeading>
    <div style={{ display: 'grid', gridAutoRows: '1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {shiurim.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: C.muted }}>
          אין שיעורים בשבת
        </div>
      )}
      {shiurim.map((s) => (
        <div
          key={s.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '0 6px',
            minHeight: 0,
            borderBottom: `1px solid ${C.line}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '26px', fontWeight: 600, color: C.inkSoft, lineHeight: 1 }}>{s.name}</div>
            <div style={{ fontSize: '20px', color: C.muted, lineHeight: 1 }}>{s.by}</div>
          </div>
          <div style={{ fontSize: '29px', fontWeight: 700, color: C.goldDeep, fontVariantNumeric: 'tabular-nums', flex: 'none' }}>
            {s.time}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ShiurimCard;
