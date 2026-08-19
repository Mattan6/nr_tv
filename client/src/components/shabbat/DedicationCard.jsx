import { C, CARD, SERIF } from './shabbatStyle';

// הקדשת הלוח — who this week's board is dedicated for. It sits where הודעות הקהילה used to,
// bottom of the right-hand column, and is the only card on the board addressed to the reader
// rather than describing the day: the two lines of copy below both exist to sell the next
// dedication.
//
// הודעות did not move somewhere else on this board — they are gone from it. The dark board
// (/) and the phone still show them, which is where a congregant reads them; the שבת board is
// the one people stand in front of once a week, and it now sells that minute instead.
const CONTACT = 'להקדשת הלוחות הבאים נא לפנות לגבאי';
// The undedicated state, which is where every install starts: the panel is seeded empty on
// purpose (see defaultContent.js). "הלוחות הבאים" would be wrong here — this one is still
// going spare — so the invitation is phrased for the board in front of the reader.
const UNDEDICATED = 'לוח השבת טרם הוקדש — להקדשה נא לפנות לגבאי';

// `parasha` is Hebcal's own string, which already carries the word פרשת ("פרשת כי תבוא"), so
// the title reads לוח שבת פרשת כי תבוא. Through a Hebcal outage it arrives blank and the
// title falls back to the parasha-less form rather than trailing off after "שבת" — the same
// blank ShabbatDisplay hands the Masthead, resolved differently because "לוח שבת שבת קודש"
// is not a sentence.
const DedicationCard = ({ ded, parasha }) => (
  <div
    style={{
      ...CARD,
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(165deg,#ffffff,#f2f6fa)',
      border: `1px solid ${C.goldEdge}`,
      padding: '12px 24px',
      justifyContent: 'center',
      textAlign: 'center',
    }}
  >
    {/* Two corner marks, diagonally opposed — the printed-certificate cue that says this card
        is an honour rather than a notice. Physical top/right and bottom/left, not the logical
        properties: dir=rtl must not mirror them, or they would swap corners with the board's
        one LTR element and stop being diagonal. */}
    <div style={{ ...corner, top: '9px', right: '13px' }} />
    <div style={{ ...corner, bottom: '9px', left: '13px' }} />

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '11px' }}>
      <div style={{ width: '38px', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(200,168,105,0.9))' }} />
      <div style={{ fontSize: '24px', fontWeight: 700, color: C.goldDeep, letterSpacing: '5px' }}>
        {parasha ? `לוּחַ שַׁבַּת ${parasha}` : 'לוּחַ הַשַּׁבָּת'}
      </div>
      <div style={{ width: '38px', height: '1px', background: 'linear-gradient(270deg,transparent,rgba(200,168,105,0.9))' }} />
    </div>

    {ded ? (
      <>
        {/* Keyed on the item, not on the model's `tick` like מזל טוב and מן הפרשה are. Those
            lists hold a handful of items and genuinely advance every 6.5s; this one usually
            holds exactly ONE, and re-mounting it on the tick would fade the same name back in
            every 6.5 seconds forever — a pulse on a wall board with nothing behind it. Keying
            on the id replays the fade only when the dedication on screen actually changes,
            which for a shul that pins two or three still animates. */}
        <div key={ded.id} style={{ animation: 'omFade .7s ease' }}>
          <div style={{ fontSize: '24px', fontWeight: 600, color: C.steel, letterSpacing: '2px', marginTop: '2px' }}>
            {ded.lead}
          </div>
          <div style={{ fontFamily: SERIF, fontSize: '36px', fontWeight: 900, color: C.navy, lineHeight: 1.15 }}>
            {ded.names}
          </div>
          {/* Optional, and dropped rather than rendered blank — an empty div here would push
              the name off the card's optical centre for no reason. */}
          {ded.note && (
            <div style={{ fontSize: '24px', fontWeight: 600, color: C.goldDeep, lineHeight: 1.2 }}>{ded.note}</div>
          )}
        </div>
        <div
          style={{
            fontSize: '16px',
            color: C.muted,
            lineHeight: 1.35,
            marginTop: '7px',
            paddingTop: '7px',
            borderTop: '1px solid rgba(200,168,105,0.4)',
            textWrap: 'pretty',
          }}
        >
          {CONTACT}
        </div>
      </>
    ) : (
      // No rule above it: the hairline exists to separate the invitation from a dedication,
      // and with nothing to separate it from it would read as a card that failed to load.
      <div style={{ fontSize: '22px', color: C.steel, lineHeight: 1.45, marginTop: '10px', textWrap: 'pretty' }}>
        {UNDEDICATED}
      </div>
    )}
  </div>
);

const corner = {
  position: 'absolute',
  width: '22px',
  height: '22px',
  transform: 'rotate(45deg)',
  border: '1px solid rgba(200,168,105,0.5)',
  borderRadius: '5px',
};

export default DedicationCard;
