// Inline styles, matching components/display/*. Tailwind is non-functional in this
// repo (v3 directives against a v4 install) — do not reach for utility classes.
export const COLORS = {
  gold: '#c9a86a',
  goldLight: '#f4ead2',
  text: '#e8ecf3',
  muted: '#8b95a7',
  border: 'rgba(255,255,255,0.10)',
  card: 'rgba(255,255,255,0.04)',
  danger: '#d98a8a',
};

// index.css pins body and #root to overflow:hidden for the TV. Rather than change
// global CSS the display depends on, the admin becomes its own scroll container.
export const screen = {
  position: 'fixed',
  inset: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  background: '#0a0e16',
  color: COLORS.text,
  fontFamily: "'Assistant',sans-serif",
  direction: 'rtl',
  padding: '18px 16px 48px',
};

export const title = {
  fontFamily: "'Frank Ruhl Libre',serif",
  fontSize: '26px',
  fontWeight: 700,
  color: COLORS.goldLight,
  margin: '4px 0 18px',
};

export const backLink = {
  display: 'inline-block',
  color: COLORS.gold,
  fontSize: '17px',
  textDecoration: 'none',
  marginBottom: '14px',
};

export const card = {
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '14px',
  padding: '14px 16px',
  marginBottom: '12px',
};

export const row = {
  ...card,
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  color: COLORS.text,
  textDecoration: 'none',
};

const baseButton = {
  border: `1px solid ${COLORS.border}`,
  borderRadius: '12px',
  padding: '13px 18px',
  fontSize: '17px',
  fontFamily: 'inherit',
  cursor: 'pointer',
  background: 'transparent',
  color: COLORS.text,
  minHeight: '48px', // comfortable phone tap target
};

export const button = baseButton;

export const primaryButton = {
  ...baseButton,
  width: '100%',
  background: 'linear-gradient(180deg,rgba(201,168,106,0.28),rgba(201,168,106,0.10))',
  borderColor: 'rgba(201,168,106,0.55)',
  color: COLORS.goldLight,
  fontWeight: 700,
};

export const dangerButton = { ...baseButton, color: COLORS.danger, padding: '8px 12px' };

export const label = {
  display: 'block',
  fontSize: '15px',
  color: COLORS.muted,
  marginBottom: '6px',
};

export const input = {
  width: '100%',
  background: 'rgba(0,0,0,0.30)',
  border: `1px solid ${COLORS.border}`,
  borderRadius: '10px',
  padding: '12px 14px',
  fontSize: '17px', // below 16px iOS Safari zooms the page on focus
  fontFamily: 'inherit',
  color: COLORS.text,
  direction: 'rtl',
};

export const error = {
  background: 'rgba(217,138,138,0.12)',
  border: '1px solid rgba(217,138,138,0.45)',
  borderRadius: '10px',
  padding: '10px 14px',
  color: COLORS.danger,
  fontSize: '16px',
  marginBottom: '14px',
};

export const fieldError = { color: COLORS.danger, fontSize: '14px', marginTop: '5px' };

export const muted = { color: COLORS.muted, fontSize: '16px' };
