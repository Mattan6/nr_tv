// Shared building blocks for the display dashboard cards.
import { CARD_STYLE } from './cardStyle';

const Diamond = () => (
  <div style={{ width: '8px', height: '8px', transform: 'rotate(45deg)', background: '#c9a86a' }} />
);

// Centered gold title flanked by two small diamonds.
export const DiamondTitle = ({ children, size = 29 }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
    <Diamond />
    <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontWeight: 700, fontSize: `${size}px`, color: '#e6c98a' }}>
      {children}
    </div>
    <Diamond />
  </div>
);

// A glass card with a diamond title header.
const Panel = ({ title, titleSize = 29, padding = '18px 22px', children, style }) => (
  <div style={{ ...CARD_STYLE, padding, ...style }}>
    {title && <DiamondTitle size={titleSize}>{title}</DiamondTitle>}
    {children}
  </div>
);

export default Panel;
