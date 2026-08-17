import Panel from './Panel';

// The list `useDisplayModel` hands over for the current day — חול on a weekday, שבת on
// Shabbat. This board is shown on `/` and on every phone in every hour of the week, so it
// renders both lists at different times; the title stays generic because it has to.
//
// The empty line matters now that it can: the שבת list ships empty and stays that way until
// the gabbai fills it, so on the first Shabbat after this feature lands, this panel has
// nothing to draw. A heading over a blank box reads as a broken panel rather than an
// unfilled one.
const ShiurimPanel = ({ shiurim }) => (
  <Panel title="שיעורי תורה" titleSize={29} padding="18px 22px">
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '12px', flex: 1, justifyContent: 'space-between' }}>
      {shiurim.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#8b95a7' }}>
          אין שיעורים
        </div>
      )}
      {shiurim.map((s) => (
        <div
          key={s.id}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#eaeef5', lineHeight: 1.15 }}>{s.name}</div>
            <div style={{ fontSize: '18px', fontWeight: 400, color: '#8b95a7', lineHeight: 1.15 }}>{s.by}</div>
          </div>
          <div style={{ fontSize: '25px', fontWeight: 700, color: '#e6c98a', fontVariantNumeric: 'tabular-nums' }}>{s.time}</div>
        </div>
      ))}
    </div>
  </Panel>
);

export default ShiurimPanel;
