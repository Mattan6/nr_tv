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

    {/* The day alone. 'סדר המכירה' used to follow it and has been dropped: the card is already
        titled מְכִירַת הַמִּצְווֹת and the rows are already numbered, so the phrase said nothing
        the reader could not see — and it cost a line the rows needed. */}
    <div style={{ textAlign: 'center', marginTop: '3px' }}>
      <div style={{ fontFamily: SERIF, fontSize: '23px', fontWeight: 700, color: C.pomegranate }}>{dayLabel}</div>
    </div>

    {/* Keyed on the page so each turn re-mounts and replays the fade. This one DOES ride the
        shared tick — unlike the dedication card, which holds one item and would pulse — because
        the page genuinely changes every 6.5 seconds. */}
    <div
      key={pageIndex}
      style={{
        display: 'grid',
        // 1fr tracks, so the rows divide the card however many of them this page holds — a
        // four-row page and a five-row page both fill it, which is what keeps the dot strip
        // pinned to the bottom instead of sliding about as the pages turn.
        gridAutoRows: 'minmax(0,1fr)',
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
                so inserting a מצווה renumbers the rest for free.

                This whole row runs smaller than the day lists beside it, and deliberately: a
                מכירה row carries three things where a prayer row carries two, and the badge is
                the longest string on the board. At the day lists' 26px the three of them
                crowded each other and the badge pushed the label into an ellipsis. */}
            <div
              style={{
                width: '28px',
                height: '28px',
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: 'rgba(176,135,63,0.14)',
                border: '1px solid rgba(176,135,63,0.5)',
                fontFamily: SERIF,
                fontSize: '19px',
                fontWeight: 700,
                color: C.pomegranate,
              }}
            >
              {item.num}
            </div>
            <div style={{ fontSize: '21px', fontWeight: 600, color: C.ink, lineHeight: 1.1, flex: 1, minWidth: 0 }}>
              {item.label}
            </div>
            <div
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: badge.color,
                background: badge.bg,
                border: `1px solid ${badge.border}`,
                borderRadius: '999px',
                padding: '2px 10px',
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
