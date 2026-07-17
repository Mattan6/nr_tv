import Panel from './Panel';

const PrayerTimesPanel = ({ title, sub, prayers }) => (
  <Panel title={title} titleSize={29} padding="20px 24px">
    <div style={{ textAlign: 'center', fontSize: '20px', color: '#8b95a7', marginTop: '3px' }}>{sub}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '14px', flex: 1, justifyContent: 'space-between' }}>
      {prayers.map((p) => (
        <div
          key={p.name}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', borderBottom: '1px solid rgba(255,255,255,0.055)' }}
        >
          <div style={{ fontSize: '28px', fontWeight: 600, color: '#eaeef5' }}>{p.name}</div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#e6c98a', fontVariantNumeric: 'tabular-nums', letterSpacing: '1px' }}>{p.time}</div>
        </div>
      ))}
    </div>
  </Panel>
);

export default PrayerTimesPanel;
