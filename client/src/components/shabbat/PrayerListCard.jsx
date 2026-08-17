import { C, CARD, SERIF } from './shabbatStyle';
import { Rosette } from './icons';
import { EMPHASIS } from './prayerEmphasis';

// One component, mounted twice: ערב שבת and יום השבת. The two lists differ only in their rows
// and their headings, and a second component would be the same forty lines with two strings
// changed — which is exactly how the two lists would drift apart.
//
// Three rows carry the weight of the whole board: the moment Shabbat is accepted and the moment
// it is released. They are picked out by name rather than by a flag on the data, because the
// data is SHABBAT_PRAYERS and adding a presentation flag there would push a styling decision
// into the schedule.
//
// EMPHASIS's own `הדלקת נרות` alternative can never match here: ShabbatDisplay filters that row
// out of `rows` before either card mounts (it has its own card above). Kept anyway because this
// component is generic — it renders whatever `rows` it is handed and does not know its one
// caller pre-filters — so a future caller that doesn't would need it. EMPHASIS itself lives in
// ./prayerEmphasis.js rather than here, so client/test/screenSegment.test.js can import the
// exact regex instead of a copy retyped into the test.

const PrayerListCard = ({ title, sub, rows }) => (
  <div style={{ ...CARD, padding: '14px 24px' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: '29px', color: C.navy }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: 600, color: C.steel, letterSpacing: '2px' }}>{sub}</div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '7px 0 3px' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(200,168,105,0.75))' }} />
      <Rosette />
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(270deg,transparent,rgba(200,168,105,0.75))' }} />
    </div>

    {/* grid-auto-rows:1fr spreads however many rows there are over the card's height, so the
        one-row ערב שבת card and the three-row יום השבת card both fill their box. */}
    <div style={{ display: 'grid', gridAutoRows: '1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {rows.map((p) => {
        const strong = EMPHASIS.test(p.name);
        const color = strong ? C.navy : C.inkSoft;
        return (
          <div
            key={p.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 6px',
              minHeight: 0,
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <div style={{ fontSize: '25px', fontWeight: strong ? 800 : 600, color, lineHeight: 1.1 }}>{p.name}</div>
            <div style={{ fontSize: '27px', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
              {p.time}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default PrayerListCard;
