import { CARD_STYLE } from './cardStyle';

const smallTitle = {
  fontFamily: "'Frank Ruhl Libre',serif",
  fontWeight: 700,
  fontSize: '26px',
  color: '#e6c98a',
};

// The centered glass card used by jokes / mazal / azkarot (no inset highlight).
const centeredCard = {
  ...CARD_STYLE,
  boxShadow: '0 12px 30px rgba(0,0,0,0.38)',
  padding: '16px 20px',
  alignItems: 'center',
  textAlign: 'center',
};

export const NextMinyanPanel = ({ next }) => (
  <div
    style={{
      background: 'linear-gradient(180deg,rgba(201,168,106,0.18),rgba(201,168,106,0.04))',
      border: '1px solid rgba(201,168,106,0.5)',
      borderRadius: '16px',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      animation: 'omGlow 4s ease-in-out infinite',
      minHeight: 0,
    }}
  >
    <div style={smallTitle}>המניין הבא</div>
    <div style={{ fontSize: '32px', fontWeight: 700, color: '#f4ead2', marginTop: '6px' }}>{next.name}</div>
    <div style={{ fontSize: '68px', fontWeight: 800, color: '#f2e7cf', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginTop: '2px' }}>{next.time}</div>
    <div style={{ fontSize: '24px', fontWeight: 600, color: '#c9a86a', fontVariantNumeric: 'tabular-nums', marginTop: '6px' }}>בעוד {next.countdown}</div>
  </div>
);

// בדיחות ליאור. The pool is scraped and filtered server-side (server/src/jokes/), so
// nothing here validates or truncates.
//
// The 26px below is half of the fit guarantee; the other half is the filter's 110-character
// cap and its flattening of jokes to a single line. Measured in this panel: 386px of width,
// 163px of height for the text, ~29 characters and 35.1px per visual line — so the worst
// case is 4 lines / 140px. Changing this font size without re-measuring MAX_LEN in
// server/src/jokes/filter.js is what puts text back outside the card.
//
// overflow:hidden is deliberate belt-and-braces: if that coupling is ever broken, a long
// joke clips inside its own card instead of spilling across the panel beside it.
export const JokesPanel = ({ joke, jokeKey }) => (
  <div style={{ ...centeredCard, overflow: 'hidden' }}>
    <div style={smallTitle}>בדיחות ליאור</div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
      <div
        key={jokeKey}
        style={{
          animation: 'omFade .7s ease',
          fontSize: '26px',
          fontWeight: 600,
          color: '#f4ead2',
          lineHeight: 1.35,
        }}
      >
        {joke ? joke.text : 'אין בדיחות להצגה כרגע'}
      </div>
    </div>
  </div>
);

export const MazalPanel = ({ maz, mazKey }) => (
  <div style={centeredCard}>
    <div style={smallTitle}>שמחות ומזל טוב</div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
      <div key={mazKey} style={{ animation: 'omFade .7s ease' }}>
        <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: '29px', fontWeight: 700, color: '#f4ead2', lineHeight: 1.25 }}>{maz.names}</div>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#c9a86a', marginTop: '6px' }}>{maz.occasion}</div>
      </div>
    </div>
  </div>
);

export const AzkarotPanel = ({ azk, azkKey }) => (
  <div style={centeredCard}>
    <div style={smallTitle}>לעילוי נשמת</div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
      <div key={azkKey} style={{ animation: 'omFade .7s ease' }}>
        <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: '28px', fontWeight: 700, color: '#f4ead2', lineHeight: 1.25 }}>{azk.name}</div>
        <div style={{ fontSize: '21px', fontWeight: 400, color: '#a7b0bf', marginTop: '6px' }}>{azk.detail}</div>
        <div style={{ fontSize: '20px', fontWeight: 600, color: '#c9a86a', marginTop: '5px' }}>{azk.date}</div>
      </div>
    </div>
  </div>
);
