import { C, CARD, SERIF } from './shabbatStyle';

// The diamond-flanked heading the two cards in this column share. Exported because ShiurimCard
// uses it too and a second copy would be the place they drift apart.
export const DiamondHeading = ({ children }) => (
  <>
    <div style={{ textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: '28px', color: C.navy }}>{children}</div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '6px 0 2px' }}>
      <div style={{ width: '56px', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(200,168,105,0.8))' }} />
      <div style={{ width: '7px', height: '7px', transform: 'rotate(45deg)', background: C.gold }} />
      <div style={{ width: '56px', height: '1px', background: 'linear-gradient(270deg,transparent,rgba(200,168,105,0.8))' }} />
    </div>
  </>
);

// Titled זְמַנֵּי הַיּוֹם and not זמני השבת, and the difference is not cosmetic: these are TODAY's
// zmanim, and the board is up from Friday morning. Calling Friday's סוף זמן קריאת שמע "שבת's"
// would be wrong for the first fifteen hours of every run.
//
// The ten rows are ZMANIM_ROWS, unchanged — shared with the dark board and the phone, so the
// three can never post a different זמנים table.
const ZmanimGrid = ({ rows }) => (
  <div style={{ ...CARD, padding: '14px 24px' }}>
    <DiamondHeading>זְמַנֵּי הַיּוֹם</DiamondHeading>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridAutoRows: '1fr',
        gap: '0 20px',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {rows.map((z) => (
        <div
          key={z.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 4px',
            minHeight: 0,
            borderBottom: `1px solid ${C.line}`,
          }}
        >
          <div style={{ fontSize: '21px', lineHeight: 1.1, color: C.inkSoft }}>{z.name}</div>
          <div style={{ fontSize: '22px', lineHeight: 1.1, fontWeight: 700, color: C.goldDeep, fontVariantNumeric: 'tabular-nums' }}>
            {z.time}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ZmanimGrid;
