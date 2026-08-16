import { C, DEEP_CARD, SERIF } from './shabbatStyle';
import { SeferTorah } from './icons';

// מן הפרשה. The verses come from client/src/components/display/parashaHighlights.js, keyed on
// the parasha Hebcal already reports — nobody types anything and nobody maintains a schedule.
//
// `pasuk` is null only if a table entry somehow carries no pesukim; the lookup itself always
// returns an entry, falling back to generic Shabbat verses when the week has no parasha at all.
// The card renders empty rather than crashing in that case.
const ParashaVerseCard = ({ pasuk, rotationKey }) => (
  <div style={{ ...DEEP_CARD, padding: '16px 24px', textAlign: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <SeferTorah />
      <div style={{ fontSize: '24px', fontWeight: 700, color: C.goldLight, letterSpacing: '5px' }}>מִן הַפָּרָשָׁה</div>
    </div>
    <div key={rotationKey} style={{ animation: 'omFade .9s ease', marginTop: '8px' }}>
      <div style={{ fontFamily: SERIF, fontSize: '29px', fontWeight: 700, color: C.onDeep, lineHeight: 1.4 }}>
        {pasuk?.text || ''}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 600, color: C.goldLight, marginTop: '6px' }}>{pasuk?.ref || ''}</div>
    </div>
  </div>
);

export default ParashaVerseCard;
