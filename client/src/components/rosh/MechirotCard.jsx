import { C, CARD, SERIF } from './roshStyle';
import { WreathIcon } from './icons';

// מכירת המצוות, one day's page at a time.
//
// The badge copy is per kind rather than per item: `general` is the מצווה sold as one blessing
// for the whole shul, which the gabbai arranges privately, and everything else goes under the
// hammer on the night.
const BADGE = {
  general: {
    text: 'מכירה כללית · פנו לגבאי',
    color: C.pomegranate,
    bg: 'rgba(125,34,51,0.08)',
    border: 'rgba(125,34,51,0.35)',
  },
  auction: {
    text: 'מכירה פומבית',
    color: '#7a6122',
    bg: 'rgba(176,135,63,0.1)',
    border: 'rgba(176,135,63,0.4)',
  },
};

const badgeFor = (kind) =>
  (Object.prototype.hasOwnProperty.call(BADGE, kind) ? BADGE[kind] : BADGE.auction);

const MechirotCard = ({ rows, dayLabel, pageIndex, pageCount }) => (
  <div style={{ ...CARD, padding: '14px 22px' }}>
    <div style={{ textAlign: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: '26px', color: C.pomegranate }}>
      מְכִירַת הַמִּצְווֹת
    </div>

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '6px 0 0' }}>
      <div style={{ width: '60px', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(176,135,63,0.6))' }} />
      <WreathIcon />
      <div style={{ width: '60px', height: '1px', background: 'linear-gradient(270deg,transparent,rgba(176,135,63,0.6))' }} />
    </div>

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '3px' }}>
      <div style={{ fontFamily: SERIF, fontSize: '24px', fontWeight: 700, color: C.pomegranate }}>{dayLabel}</div>
      <div style={{ width: '5px', height: '5px', transform: 'rotate(45deg)', background: C.gold }} />
      <div style={{ fontSize: '24px', color: C.inkMuted }}>סדר המכירה</div>
    </div>

    {/* Keyed on the page so each turn re-mounts and replays the fade. This one DOES ride the
        shared tick — unlike the dedication card, which holds one item and would pulse — because
        the page genuinely changes every 6.5 seconds. */}
    <div
      key={pageIndex}
      style={{
        display: 'grid',
        gridAutoRows: 'minmax(0,1fr)',
        alignContent: 'start',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        marginTop: '2px',
        animation: 'omFade .6s ease',
      }}
    >
      {rows.length === 0 && (
        <div style={{ alignSelf: 'center', textAlign: 'center', fontSize: '24px', color: C.inkMuted }}>
          סדר המכירה ייקבע בהמשך
        </div>
      )}
      {rows.map((item) => {
        const badge = badgeFor(item.kind);
        return (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0 4px',
              minHeight: 0,
              borderBottom: `1px solid ${C.rule}`,
            }}
          >
            {/* The position in this day's running order — derived at render by mechirotPages,
                so inserting a מצווה renumbers the rest for free. */}
            <div
              style={{
                width: '34px',
                height: '34px',
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: 'rgba(176,135,63,0.14)',
                border: '1px solid rgba(176,135,63,0.5)',
                fontFamily: SERIF,
                fontSize: '24px',
                fontWeight: 700,
                color: C.pomegranate,
              }}
            >
              {item.num}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 600, color: C.ink, lineHeight: 1.1, flex: 1, minWidth: 0 }}>
              {item.label}
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: badge.color,
                background: badge.bg,
                border: `1px solid ${badge.border}`,
                borderRadius: '999px',
                padding: '2px 13px',
                lineHeight: 1.2,
                flex: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {badge.text}
            </div>
          </div>
        );
      })}
    </div>

    {/* One diamond per page. A single page draws a single dot rather than none, which reads as
        "this is all of it" rather than as a missing control. */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', marginTop: '6px' }}>
      {Array.from({ length: pageCount }, (_, i) => (
        <div
          key={i}
          style={{
            width: '7px',
            height: '7px',
            transform: 'rotate(45deg)',
            background: i === pageIndex ? C.gold : 'rgba(176,135,63,0.3)',
          }}
        />
      ))}
    </div>
  </div>
);

export default MechirotCard;
