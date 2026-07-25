// Bottom marquee. The lines are edited in /adminGabbai (the פס תחתון panel) and joined
// back into one string here; the phone footer renders the same items one per line.
//
// The joined text is doubled so the loop reads continuously. The '  •  ' spacing is two
// spaces either side — what the hardcoded TICKER string used before the lines became
// editable, so the gaps look exactly as they always have.
const Ticker = ({ items }) => {
  // An empty list hides the bar rather than scrolling an empty one, so hiding every line
  // in the admin turns the ticker off outright.
  if (!items.length) return null;
  const text = `${items.map((it) => it.text).join('  •  ')}  •  `;

  return (
    <div
      style={{
        height: '54px',
        flex: 'none',
        margin: '0 -46px',
        background: 'linear-gradient(90deg,rgba(201,168,106,0.14),rgba(201,168,106,0.05),rgba(201,168,106,0.14))',
        borderTop: '1px solid rgba(201,168,106,0.35)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{ whiteSpace: 'nowrap', fontSize: '24px', fontWeight: 600, color: '#f0e6ce', animation: 'omTicker 44s linear infinite' }}>
        {text + text}
      </div>
    </div>
  );
};

export default Ticker;
