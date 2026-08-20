// The bottom marquee, in the חג's palette.
//
// Same contract as display/Ticker.jsx and shabbat/LightTicker.jsx: one item per line, joined
// with '  •  ', doubled so the loop has no visible seam, and nothing rendered at all when the
// list is empty. It reads roshTicker rather than the shared ticker — the חול and שבת boards
// keep sharing that one.
//
// 46s rather than the שבת board's 48s: the חג lines are shorter and the mockup was timed at 46.
const RoshTicker = ({ items }) => {
  if (!items.length) return null;
  const text = `${items.map((it) => it.text).join('  •  ')}  •  `;

  return (
    <div
      style={{
        height: '52px',
        flex: 'none',
        background: 'linear-gradient(90deg,#f0e2c4,#faf3e2,#f0e2c4)',
        borderTop: '1px solid rgba(176,135,63,0.45)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          whiteSpace: 'nowrap',
          fontSize: '24px',
          fontWeight: 600,
          color: '#4a3a1c',
          animation: 'omTicker 46s linear infinite',
        }}
      >
        {text + text}
      </div>
    </div>
  );
};

export default RoshTicker;
