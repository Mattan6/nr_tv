import { C, SERIF } from './roshStyle';

// הדלקת נרות of both nights and מוצאי החג — the three times on this board the calendar fixes
// rather than the gabbai, pulled live from Hebcal for Nitzan.
//
// The three labels and the note are literals because they are true of every ראש השנה, in every
// year: the second night's candles are always lit from an existing flame (it is Yom Tov, so no
// fire may be made), and שהחיינו on the second night is always said over a new fruit. There is
// nothing here for a gabbai to edit — only the times, and those he pins in זמני ראש השנה if he
// ever needs to.
const ROWS = [
  { key: 'candles1', label: 'ערב יום א׳ דחג' },
  { key: 'candles2', label: 'ליל יום ב׳ דחג · מנר קיים' },
  { key: 'havdalah', label: 'מוצאי החג' },
];

const NOTE = 'בליל שני מדליקים מאש קיימת בלבד · שהחיינו על פרי חדש';

const CandlesCard = ({ candles }) => (
  <div
    style={{
      position: 'relative',
      overflow: 'hidden',
      background: C.cardWarm,
      border: `1px solid ${C.goldEdgeStrong}`,
      borderRadius: '18px',
      padding: '16px 24px',
    }}
  >
    <div style={{ textAlign: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: '26px', color: C.pomegranate }}>
      הַדְלָקַת נֵרוֹת
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
      {ROWS.map((row) => (
        <div key={row.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '24px', color: C.inkSteel }}>{row.label}</div>
          {/* '--:--' rather than a blank, and rather than last year's number. Unlike the day
              lists, every row here HAS a time — so an empty one means Hebcal could not be
              reached, and saying so is the honest answer. */}
          <div style={{ fontSize: '26px', fontWeight: 800, color: C.gold, fontVariantNumeric: 'tabular-nums' }}>
            {candles[row.key] || '--:--'}
          </div>
        </div>
      ))}
    </div>

    <div style={{ fontSize: '16px', color: '#6b6553', marginTop: '6px', lineHeight: 1.25, textAlign: 'center' }}>
      {NOTE}
    </div>
  </div>
);

export default CandlesCard;
