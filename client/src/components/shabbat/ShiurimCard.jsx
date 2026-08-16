import { C, CARD } from './shabbatStyle';
import { DiamondHeading } from './ZmanimGrid';

// The same שיעורים list the dark board shows, edited in /adminGabbai. There is one list, not a
// weekday one and a Shabbat one, so this heading is a heading and not a filter.
const ShiurimCard = ({ shiurim }) => (
  <div style={{ ...CARD, padding: '14px 24px' }}>
    <DiamondHeading>שִׁעוּרִים בְּשַׁבָּת</DiamondHeading>
    <div style={{ display: 'grid', gridAutoRows: '1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
