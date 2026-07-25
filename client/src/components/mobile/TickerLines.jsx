import { COLORS } from './mobileStyles';

// The wall's bottom marquee, unrolled. A phone has no room to scroll text sideways and no
// reason to — the lines fit stacked.
//
// This is the shape the data is actually in: the lines are separate items in the פס תחתון
// panel of /adminGabbai, and the wall is the one that has to flatten them into a single
// marquee string. Keyed by id, so two identical lines do not collide.
const TickerLines = ({ items }) => {
  if (!items.length) return null;

  return (
    <div style={{ textAlign: 'center', fontSize: '13px', color: COLORS.dim, lineHeight: 1.6, padding: '6px 10px 0' }}>
      {items.map((item) => (
        <div key={item.id}>{item.text}</div>
      ))}
    </div>
  );
};

export default TickerLines;
