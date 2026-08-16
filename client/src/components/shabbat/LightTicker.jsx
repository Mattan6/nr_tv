// The dark board's Ticker with the light palette and no negative margin: this one is a direct
// child of an unpadded root, so it is already full-bleed and has nothing to bleed past.
// Same contract, same doubling, same '  •  ' spacing, same empty-list behaviour.
const LightTicker = ({ items }) => {
  if (!items.length) return null;
  const text = `${items.map((it) => it.text).join('  •  ')}  •  `;

  return (
    <div
      style={{
        height: '52px',
        flex: 'none',
        background: 'linear-gradient(90deg,#dfe8f2,#f2f6fb,#dfe8f2)',
        borderTop: '1px solid rgba(200,168,105,0.65)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{ whiteSpace: 'nowrap', fontSize: '23px', fontWeight: 600, color: '#274866', animation: 'omTicker 48s linear infinite' }}>
        {text + text}
      </div>
    </div>
  );
};

export default LightTicker;
