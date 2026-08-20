import { C, CARD, SERIF } from './roshStyle';
import { WreathIcon } from './icons';

// One day of the חג. Mounted twice — יום א׳ and יום ב׳ — from the two panels the gabbai edits.
//
// Rows arrive pre-decorated with a `style` from rowStyle(kind); this component never looks at
// the row's NAME. That is the whole point of the kind field: the mockup picked these colours
// by running regexes over the Hebrew, which breaks the moment a row is reworded.
// The card's chrome — padding, title, sub and divider — is trimmed from the mockup's, and every
// pixel of it goes to the rows. See RoshDisplay for the whole budget.
const DayListCard = ({ title, sub, rows }) => (
  <div style={{ ...CARD, padding: '11px 22px 8px' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: '25px', color: C.pomegranate }}>{title}</div>
      <div style={{ fontSize: '21px', fontWeight: 600, color: C.gold, letterSpacing: '2px' }}>{sub}</div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 2px' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(176,135,63,0.6))' }} />
      <WreathIcon size={18} />
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(270deg,transparent,rgba(176,135,63,0.6))' }} />
    </div>

    {/* gridAutoRows:1fr with overflow hidden is what lets eleven rows and ten rows fill the
        same card height without either scrolling: the rows divide the space they are given
        rather than claiming their own. minHeight:0 on both this and the rows is required for
        that — without it the grid takes its content's height and pushes the board past 1080. */}
    <div style={{ display: 'grid', gridAutoRows: '1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {rows.length === 0 && (
        <div style={{ alignSelf: 'center', textAlign: 'center', fontSize: '24px', color: C.inkMuted }}>
          הזמנים ייקבעו בהמשך
        </div>
      )}
      {rows.map((row) => (
        <div
          key={row.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 6px',
            minHeight: 0,
            borderBottom: `1px solid ${C.rule}`,
            background: row.style.rowBg,
            // Physical border-right: under dir=rtl this is the accent on the leading edge of
            // the row, which is where the mockup draws it.
            borderRight: row.style.rowAccent,
            borderRadius: row.style.rowRadius,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 700,
                lineHeight: 1.05,
                whiteSpace: 'nowrap',
                color: row.style.nameColor,
                fontFamily: row.style.font,
              }}
            >
              {row.name}
            </div>
            <div
              style={{
                fontSize: '24px',
                lineHeight: 1.05,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
                color: row.style.subColor,
                fontFamily: row.style.font,
              }}
            >
              {row.chazan}
            </div>
          </div>
          {/* A blank time renders BLANK, never '--:--'. Four rows on this board carry no time
              by design — they follow the row above — and a placeholder there would read as a
              time the shul failed to publish rather than one it never had. */}
          <div
            style={{
              fontSize: '26px',
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.05,
              flex: 'none',
              color: row.style.timeColor,
            }}
          >
            {row.time}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default DayListCard;
