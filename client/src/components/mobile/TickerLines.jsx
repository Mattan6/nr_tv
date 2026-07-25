import { COLORS } from './mobileStyles';

// The wall's bottom marquee, unrolled. A phone has no room to scroll text sideways and
// no reason to — the whole string fits stacked. Split on the marquee's own • separators;
// TICKER ends with one so the loop reads continuously, hence filter(Boolean).
const TickerLines = ({ text }) => {
  const lines = text
    .split('•')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div style={{ textAlign: 'center', fontSize: '13px', color: COLORS.dim, lineHeight: 1.6, padding: '6px 10px 0' }}>
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
};

export default TickerLines;
