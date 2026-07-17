// Bottom marquee. The text is doubled so the loop reads continuously.
const Ticker = ({ text }) => (
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

export default Ticker;
