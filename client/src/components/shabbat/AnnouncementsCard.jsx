import { C, CARD, SERIF } from './shabbatStyle';
import { Rosette } from './icons';

// whiteSpace:'pre-line' because the gabbai's announcements carry their own line breaks — the
// dark board's AnnouncementsPanel does the same, and dropping it would run two lines together.
const AnnouncementsCard = ({ ann, rotationKey }) => (
  <div style={{ ...CARD, padding: '14px 24px' }}>
    <div style={{ textAlign: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: '25px', color: C.navy }}>
      הוֹדָעוֹת הַקְּהִלָּה
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '6px 0 0' }}>
      <div style={{ width: '56px', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(200,168,105,0.8))' }} />
      <Rosette />
      <div style={{ width: '56px', height: '1px', background: 'linear-gradient(270deg,transparent,rgba(200,168,105,0.8))' }} />
    </div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden' }}>
      <div
        key={rotationKey}
        style={{
          animation: 'omFade .8s ease',
          fontSize: '25px',
          fontWeight: 600,
          lineHeight: 1.45,
          textAlign: 'center',
          whiteSpace: 'pre-line',
          color: C.ink,
          textWrap: 'pretty',
        }}
      >
        {ann?.text || ''}
      </div>
    </div>
  </div>
);

export default AnnouncementsCard;
