// The light שבת palette, in one file because eleven components share it.
//
// The dark board keeps its colours inline in each component and that is fine there: on black,
// two greys three percent apart are indistinguishable. On white they read as a printing error,
// so this board needs its tokens to be literally the same string everywhere.
export const C = {
  ink: '#2f3742',
  inkSoft: '#3f4d5c',
  muted: '#7f93a8',
  navy: '#17436b',
  navySoft: '#3f5a75',
  steel: '#5a7da0',
  line: 'rgba(60,95,135,0.13)',
  edge: 'rgba(90,125,160,0.26)',
  gold: '#c8a869',
  goldLight: '#d7bb85',
  // Gold text on white. #c8a869 fails legibility across a hall; this is the same hue darkened.
  goldDeep: '#8a7136',
  deep: 'linear-gradient(165deg,#20486e,#12304c)',
  onDeep: '#ffffff',
  onDeepSoft: '#94aec9',
  onDeepBright: '#dbe9f6',
  page: 'linear-gradient(180deg,#fdfefe 0%,#f4f7fa 58%,#eaeff5 100%)',
  pageFlat: '#eef2f6',
};

export const SERIF = "'Frank Ruhl Libre',serif";
export const SANS = "'Assistant',sans-serif";

// The white card every panel on this board sits in.
export const CARD = {
  background: '#ffffff',
  border: `1px solid ${C.edge}`,
  borderRadius: '18px',
  boxShadow: '0 8px 24px rgba(40,70,105,0.08)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};

// The two dark cards — מניין הבא and מן הפרשה — which invert the palette to carry the eye.
export const DEEP_CARD = {
  background: C.deep,
  border: '1px solid rgba(15,47,77,0.85)',
  borderRadius: '18px',
  boxShadow: '0 10px 28px rgba(20,60,98,0.22)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};
