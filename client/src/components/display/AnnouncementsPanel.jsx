import Panel from './Panel';

// `annKey` changes on each rotation so the text re-mounts and replays the fade.
const AnnouncementsPanel = ({ ann, annKey }) => (
  <Panel title="הודעות" titleSize={28} padding="16px 26px">
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
      <div
        key={annKey}
        style={{ animation: 'omFade .7s ease', fontSize: '31px', fontWeight: 600, lineHeight: 1.45, textAlign: 'center', whiteSpace: 'pre-line', color: '#eef2f7' }}
      >
        {ann}
      </div>
    </div>
  </Panel>
);

export default AnnouncementsPanel;
