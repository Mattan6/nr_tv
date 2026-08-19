import { C, SERIF } from './shabbatStyle';

// `rotationKey` is the model's `tick`. Changing it remounts the inner div, which replays the
// fade — the same trick every rotating panel on the dark board uses, and the reason this board
// needs one `omFade` keyframe rather than the mock's alternating pair.
const MazalCard = ({ maz, rotationKey }) => (
  <div
    style={{
      background: 'linear-gradient(180deg,#e9f0f8,#dbe7f3)',
      border: `1px solid ${C.goldEdge}`,
      borderRadius: '18px',
      padding: '14px 24px',
      textAlign: 'center',
    }}
  >
    <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: '25px', color: C.navy }}>שְׂמָחוֹת וּמַזָּל טוֹב</div>
    <div style={{ width: '54px', height: '1px', background: 'rgba(200,168,105,0.85)', margin: '6px auto 0' }} />
    <div key={rotationKey} style={{ animation: 'omFade .7s ease', marginTop: '6px' }}>
      <div style={{ fontFamily: SERIF, fontSize: '27px', fontWeight: 700, color: C.navy, lineHeight: 1.25 }}>{maz.names}</div>
      <div style={{ fontSize: '20px', fontWeight: 600, color: C.goldDeep, marginTop: '4px' }}>{maz.occasion}</div>
    </div>
  </div>
);

export default MazalCard;
