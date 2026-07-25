// Inline styles for the phone layout, matching components/display/* and
// pages/Admin/adminStyles.js. Tailwind is non-functional in this repo (v3 directives
// against a v4 install) — do not reach for utility classes.
//
// Same palette as the wall, smaller everything: the wall is read from across a hall at
// a fixed 1920x1080, a phone from 30cm at whatever width it happens to be.
export const COLORS = {
  gold: '#c9a86a',
  goldText: '#e6c98a',
  goldLight: '#f4ead2',
  goldPale: '#f2e7cf',
  text: '#e8ecf3',
  textBright: '#eef2f7',
  muted: '#8b95a7',
  dim: '#5f6878',
  line: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(201,168,106,0.22)',
};

// index.css pins body and #root to overflow:hidden for the TV, and the wall layout
// depends on that. Rather than relax global CSS, the phone page becomes its own scroll
// container — exactly what /adminGabbai already does (adminStyles.screen).
export const screen = {
  position: 'fixed',
  inset: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  color: COLORS.text,
  fontFamily: "'Assistant',sans-serif",
  direction: 'rtl',
  background:
    'radial-gradient(600px 420px at 50% -6%,rgba(201,168,106,0.16),transparent 62%),' +
    'linear-gradient(180deg,#0d121d 0%,#0a0e16 55%,#080b12 100%)',
};

export const page = {
  padding: '18px 18px 34px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

// The standard glass card, the phone-sized sibling of display/cardStyle.js.
export const card = {
  background: 'linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.012))',
  border: `1px solid ${COLORS.cardBorder}`,
  borderRadius: '20px',
  padding: '18px',
};

// Centred variant used by the three rotating cards and by בדיחות ליאור.
export const centeredCard = {
  ...card,
  textAlign: 'center',
};

// Large gold section heading (זמני תפילות, שיעורי תורה, זמני היום).
export const sectionTitle = {
  fontFamily: "'Frank Ruhl Libre',serif",
  fontWeight: 700,
  fontSize: '21px',
  color: COLORS.goldText,
};

// Small tracked-out gold label above a rotating card's body.
export const eyebrow = {
  fontSize: '12px',
  fontWeight: 700,
  color: COLORS.gold,
  letterSpacing: '2px',
};

// One name/time line inside a card. The first row drops its rule so the list does not
// start with a line immediately under the heading.
export const row = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '13px 2px',
  borderTop: `1px solid ${COLORS.line}`,
};

export const rowName = { fontSize: '19px', fontWeight: 600, color: '#eaeef5' };

export const rowTime = {
  fontSize: '22px',
  fontWeight: 800,
  color: COLORS.goldText,
  fontVariantNumeric: 'tabular-nums',
};

// חול / שבת pills. Real <button>s, so reset the UA's own chrome first — this is a
// control a person actually taps, unlike the wall's, which nobody ever touches.
const toggleBase = {
  appearance: 'none',
  border: 'none',
  fontFamily: 'inherit',
  fontWeight: 700,
  fontSize: '14px',
  padding: '8px 18px',
  borderRadius: '999px',
  cursor: 'pointer',
  transition: 'all .3s',
  letterSpacing: '1px',
};

export const toggleActive = {
  ...toggleBase,
  background: 'linear-gradient(180deg,#e9cf94,#c9a86a)',
  color: '#241b0e',
  boxShadow: '0 3px 12px rgba(201,168,106,0.35)',
};

export const toggleIdle = {
  ...toggleBase,
  background: 'transparent',
  color: '#9aa4b5',
};

// A full-width header that is also a button (the זמני היום accordion). Same reset.
export const plainButton = {
  appearance: 'none',
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  textAlign: 'inherit',
  width: '100%',
};

export const empty = { fontSize: '15px', color: COLORS.muted, marginTop: '10px' };
