import { Fragment } from 'react';
import { COLORS } from './mobileStyles';

// Three zmanim under the countdown, picked by id rather than by name or field: 'sunset'
// is the source field for two rows (שקיעת החמה and צאת הכוכבים at +18), and the names are
// display copy a future edit is free to reword. These three are live every day of the
// week, unlike the candle-lighting / מוצ״ש pair, which is blank or irrelevant for five
// of them.
const HERO_ZMANIM = ['sunrise', 'chatzot', 'sunset'];

const Divider = () => <div style={{ width: '1px', background: 'rgba(201,168,106,0.2)' }} />;

// The one thing a phone is opened to find out: when the next minyan is.
const NextMinyanHero = ({ next, zmanimRows }) => {
  const strip = HERO_ZMANIM.map((id) => zmanimRows.find((r) => r.id === id)).filter(Boolean);

  return (
    <div
      style={{
        background: 'linear-gradient(165deg,rgba(201,168,106,0.22),rgba(201,168,106,0.04))',
        border: '1px solid rgba(201,168,106,0.5)',
        borderRadius: '22px',
        padding: '22px 20px 20px',
        textAlign: 'center',
        animation: 'omGlow 4s ease-in-out infinite',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.gold, letterSpacing: '3px' }}>המניין הבא</div>
      <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: '25px', fontWeight: 700, color: COLORS.goldLight, marginTop: '7px' }}>
        {next.name}
      </div>
      <div
        style={{
          fontSize: '72px',
          fontWeight: 800,
          color: '#f6eed9',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          marginTop: '4px',
          letterSpacing: '1px',
        }}
      >
        {next.time}
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '14px',
          padding: '8px 18px',
          borderRadius: '999px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(201,168,106,0.3)',
        }}
      >
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLORS.goldText }} />
        <div style={{ fontSize: '17px', fontWeight: 700, color: COLORS.goldText, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.5px' }}>
          בעוד {next.countdown}
        </div>
      </div>

      <div
        style={{
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid rgba(201,168,106,0.22)',
          display: 'flex',
          justifyContent: 'space-around',
        }}
      >
        {strip.map((z, i) => (
          <Fragment key={z.id}>
            {i > 0 && <Divider />}
            <div>
              <div style={{ fontSize: '12px', color: '#9aa4b5', fontWeight: 600 }}>{z.name}</div>
              <div style={{ fontSize: '19px', fontWeight: 700, color: '#f0e6ce', fontVariantNumeric: 'tabular-nums' }}>{z.time}</div>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export default NextMinyanHero;
