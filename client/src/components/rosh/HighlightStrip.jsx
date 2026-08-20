import { C, SANS, SERIF } from './roshStyle';

// The three cards across the top of the board: who it is dedicated for, when the שופר is
// blown, and where תשליך is.
//
// None of them unmounts when its data is missing. The strip is a three-column grid, so
// dropping one member reflows the other two into a layout nobody designed; each shows a quiet
// placeholder instead. That is the same call the שבת board's cards make.

// Static copy, as on the שבת board — both lines exist to sell the next dedication, and neither
// is a fact about this חג that a gabbai would ever want to change per year.
const CONTACT = 'להקדשת הלוחות הבאים — חג או שבת — נא לפנות לגבאי';
const UNDEDICATED = 'לוח החג טרם הוקדש';

const corner = {
  position: 'absolute',
  width: '22px',
  height: '22px',
  transform: 'rotate(45deg)',
  border: '1px solid rgba(176,135,63,0.45)',
  borderRadius: '5px',
};

export const DedicationCard = ({ ded }) => (
  <div
    style={{
      position: 'relative',
      overflow: 'hidden',
      background: C.cardCream,
      border: `1px solid ${C.goldEdgeStrong}`,
      borderRadius: '16px',
      padding: '12px 24px',
      boxShadow: '0 8px 24px rgba(120,95,45,0.1)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      textAlign: 'center',
    }}
  >
    {/* Two corner marks, diagonally opposed — the printed-certificate cue that says this card
        is an honour rather than a notice. Physical top/right and bottom/left, not the logical
        properties: dir=rtl must not mirror them or they stop being diagonal. */}
    <div style={{ ...corner, top: '8px', right: '12px' }} />
    <div style={{ ...corner, bottom: '8px', left: '12px' }} />

    {ded ? (
      // Keyed on the item, NOT on the model's `tick` like the מכירות page is. This list
      // usually holds exactly ONE dedication, and re-mounting it on the shared 6.5s counter
      // would fade the same family name back in every 6.5 seconds forever — a pulse on a wall
      // board with nothing behind it. Keying on the id replays the fade only when the name on
      // screen actually changes, which for the two or three the gabbai sells still animates.
      // Same fix, same reason, as shabbat/DedicationCard.jsx.
      <div key={ded.id} style={{ animation: 'omFade .7s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div style={{ width: '34px', height: '1px', background: 'linear-gradient(90deg,transparent,#b0873f)' }} />
          <div style={{ fontSize: '24px', fontWeight: 700, color: C.gold, letterSpacing: '5px' }}>{ded.lead}</div>
          <div style={{ width: '34px', height: '1px', background: 'linear-gradient(270deg,transparent,#b0873f)' }} />
        </div>
        <div style={{ fontFamily: SERIF, fontSize: '36px', fontWeight: 900, color: C.pomegranate, lineHeight: 1.15, marginTop: '2px' }}>
          {ded.names}
        </div>
        {/* Dropped rather than left as a gap: plenty of dedications end at the name. */}
        {ded.note && (
          <div style={{ fontSize: '24px', fontWeight: 600, color: C.goldDeep, lineHeight: 1.2 }}>{ded.note}</div>
        )}
      </div>
    ) : (
      <div style={{ fontFamily: SERIF, fontSize: '32px', fontWeight: 900, color: C.pomegranate, lineHeight: 1.15 }}>
        {UNDEDICATED}
      </div>
    )}

    <div
      style={{
        fontSize: '16px',
        color: '#8a7136',
        lineHeight: 1.35,
        marginTop: '7px',
        paddingTop: '7px',
        borderTop: '1px solid rgba(176,135,63,0.35)',
        textWrap: 'pretty',
      }}
    >
      {CONTACT}
    </div>
  </div>
);

// Derived from the row the gabbai marked `תקיעת שופר`, so its time and the row in the day list
// are one fact — see findKind in hooks/useRoshModel.js.
export const ShofarCard = ({ shofar }) => (
  <div
    style={{
      background: C.masthead,
      border: '1px solid rgba(90,21,34,0.85)',
      borderRadius: '16px',
      padding: '12px 24px',
      textAlign: 'center',
      boxShadow: '0 10px 28px rgba(125,34,51,0.25)',
      fontFamily: SANS,
    }}
  >
    <div style={{ fontSize: '24px', fontWeight: 700, color: C.goldLight, letterSpacing: '4px' }}>תְּקִיעַת שׁוֹפָר</div>
    <div style={{ fontFamily: SERIF, fontSize: '24px', fontWeight: 700, color: '#f6dfe0', marginTop: '2px', minHeight: '29px' }}>
      {shofar.label || 'טרם נקבעה שעה'}
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '24px' }}>
      <div style={{ fontSize: '58px', fontWeight: 800, color: '#ffffff', fontVariantNumeric: 'tabular-nums', lineHeight: 1.05 }}>
        {shofar.time || '--:--'}
      </div>
      {/* Empty unless there is something worth counting — the model decides (see
          shofarCountdown): nothing once the שופר has been blown, and nothing while the חג is
          still more than a day out, because '574:43:29' is not a duration anyone reads. */}
      {shofar.countdown && (
        <div style={{ fontSize: '25px', fontWeight: 700, color: C.goldLight, fontVariantNumeric: 'tabular-nums' }}>
          בעוד {shofar.countdown}
        </div>
      )}
    </div>
  </div>
);

// Derived from the row marked `תשליך`. Its detail field carries the LOCATION rather than a
// חזן — the one row where that column means a place.
export const TashlichCard = ({ tashlich }) => (
  <div
    style={{
      background: C.card,
      border: '1px solid rgba(176,135,63,0.32)',
      borderRadius: '16px',
      padding: '14px 22px',
      boxShadow: C.shadow,
      fontFamily: SANS,
    }}
  >
    <div style={{ fontSize: '24px', fontWeight: 700, color: C.gold, letterSpacing: '3px' }}>{tashlich.label}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginTop: '4px' }}>
      <div style={{ fontSize: '38px', fontWeight: 800, color: C.gold, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {tashlich.time || '--:--'}
      </div>
      <div style={{ fontFamily: SERIF, fontSize: '24px', fontWeight: 700, color: C.pomegranate }}>
        {tashlich.place || 'המיקום ייקבע בהמשך'}
      </div>
    </div>
  </div>
);

const HighlightStrip = ({ ded, shofar, tashlich }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr', gap: '20px', flex: 'none' }}>
    <DedicationCard ded={ded} />
    <ShofarCard shofar={shofar} />
    <TashlichCard tashlich={tashlich} />
  </div>
);

export default HighlightStrip;
