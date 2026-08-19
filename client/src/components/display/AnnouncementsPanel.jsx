import Panel from './Panel';
import RichDoc from '../RichDoc';

// `annKey` changes on each rotation so the content re-mounts and replays the fade.
//
// Takes the whole item rather than its text: an announcement may now carry a rich
// document, and RichDoc falls back to the plain text when it does not.
const AnnouncementsPanel = ({ ann, annKey }) => (
  <Panel title="הודעות" titleSize={28} padding="16px 26px">
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden' }}>
      <div
        key={annKey}
        style={{ animation: 'omFade .7s ease', fontSize: '31px', fontWeight: 600, lineHeight: 1.45, textAlign: 'center', color: '#eef2f7', width: '100%', maxHeight: '100%', minHeight: 0 }}
      >
        <RichDoc doc={ann?.doc} text={ann?.text} />
      </div>
    </div>
  </Panel>
);

export default AnnouncementsPanel;
