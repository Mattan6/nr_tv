import Panel from './Panel';

const ZmanimPanel = ({ rows }) => (
  <Panel title="זמני היום" titleSize={29} padding="18px 22px">
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 22px', marginTop: '12px', flex: 1, alignContent: 'space-between' }}>
      {rows.map((z) => (
        <div
          key={z.name}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div style={{ fontSize: '24px', fontWeight: 400, color: '#cdd5e0' }}>{z.name}</div>
          <div style={{ fontSize: '25px', fontWeight: 700, color: '#e6c98a', fontVariantNumeric: 'tabular-nums' }}>{z.time}</div>
        </div>
      ))}
    </div>
  </Panel>
);

export default ZmanimPanel;
