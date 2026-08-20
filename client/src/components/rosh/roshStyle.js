// The ראש השנה board's palette, transcribed from the mockup.
//
// Its own module rather than a branch in shabbatStyle.js: the two boards share not one colour
// — that one is navy and steel for a Shabbat afternoon, this one is pomegranate and gold for
// a Yom Tov — and a single file holding both would be two palettes in a trench coat.
//
// The fonts are NOT re-imported here. index.css already loads Assistant and Frank Ruhl Libre
// for the two existing boards, and both are exactly what the mockup asks for.
export const C = {
  pomegranate: '#7d2233',
  pomegranateDeep: '#5a1522',
  pomegranateDark: '#5f1a28',
  // The pink that reads on the deep pomegranate masthead, and nowhere else.
  onDeepSoft: '#e3b9be',
  gold: '#b0873f',
  goldLight: '#e0be7c',
  goldDeep: '#6d5316',
  goldEdge: 'rgba(176,135,63,0.3)',
  goldEdgeStrong: 'rgba(176,135,63,0.5)',
  rule: 'rgba(120,95,45,0.14)',
  page: 'linear-gradient(180deg,#fdfaf1 0%,#f8f2e4 58%,#f4ecd9 100%)',
  // The flat colour behind the scaled canvas, so the letterboxing either side of a board that
  // does not exactly fit is the board's own cream rather than the browser's white.
  pageFlat: '#f6efe0',
  ink: '#3a352c',
  inkMuted: '#6b6553',
  inkSteel: '#5b5344',
  card: '#ffffff',
  cardWarm: 'linear-gradient(180deg,#fbf5e7,#f4ead4)',
  cardCream: 'linear-gradient(165deg,#fffdf7,#f8eed8)',
  masthead: 'linear-gradient(165deg,#7d2233,#5a1522)',
  shadow: '0 8px 24px rgba(120,95,45,0.08)',
};

export const SANS = "'Assistant',sans-serif";
export const SERIF = "'Frank Ruhl Libre',serif";

// The shared white card. minHeight:0 is load-bearing on every one of them — these sit in grid
// rows that must be allowed to shrink, or a long list pushes the board past 1080px.
export const CARD = {
  background: C.card,
  border: `1px solid ${C.goldEdge}`,
  borderRadius: '18px',
  padding: '16px 24px',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  boxShadow: C.shadow,
};

// The gold rule with a device in the middle, used under both day-card titles and above the
// מכירות list. `grow` makes the rules fill the card; the מכירות one uses fixed stubs instead.
export const DIVIDER_LINE = (direction) => ({
  height: '1px',
  background: `linear-gradient(${direction}deg,transparent,rgba(176,135,63,0.6))`,
});
