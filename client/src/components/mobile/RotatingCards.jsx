import * as S from './mobileStyles';
import RichDoc from '../RichDoc';

// The four cards whose contents change on a timer, phone-sized siblings of
// display/AnnouncementsPanel.jsx and display/CenterCards.jsx. Each takes the rotation
// counter as a React `key` so the body re-mounts and replays `omFade` (index.css) —
// the same trick the wall uses, and the reason the counters are returned at all.

// הודעות, with one dot per announcement so it is clear the text is a rotation and not
// the whole of what the gabbai wrote.
export const AnnouncementCard = ({ ann, annKey, count, index }) => (
  <div style={{ ...S.card, padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'center' }}>
    <div
      style={{
        width: '34px',
        height: '34px',
        flex: 'none',
        borderRadius: '10px',
        background: 'rgba(201,168,106,0.16)',
        border: '1px solid rgba(201,168,106,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Frank Ruhl Libre',serif",
        fontSize: '17px',
        color: S.COLORS.goldText,
        fontWeight: 700,
      }}
    >
      !
    </div>

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={S.eyebrow}>הודעות</div>
      <div
        key={annKey}
        style={{
          animation: 'omFade .6s ease',
          fontSize: '17px',
          fontWeight: 600,
          lineHeight: 1.4,
          color: S.COLORS.textBright,
          marginTop: '3px',
        }}
      >
        <RichDoc doc={ann?.doc} text={ann?.text} imageMaxHeight="none" />
      </div>
    </div>

    {count > 1 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 'none' }}>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: i === index ? S.COLORS.goldText : 'rgba(201,168,106,0.3)',
            }}
          />
        ))}
      </div>
    )}
  </div>
);

export const MazalCard = ({ maz, mazKey }) => (
  <div
    style={{
      ...S.centeredCard,
      background: 'linear-gradient(160deg,rgba(201,168,106,0.13),rgba(255,255,255,0.014))',
      border: '1px solid rgba(201,168,106,0.3)',
    }}
  >
    <div style={S.eyebrow}>שמחות ומזל טוב</div>
    <div key={mazKey} style={{ animation: 'omFade .6s ease', marginTop: '8px' }}>
      <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: '22px', fontWeight: 700, color: S.COLORS.goldLight, lineHeight: 1.3 }}>
        {maz.names}
      </div>
      <div style={{ fontSize: '16px', fontWeight: 600, color: S.COLORS.gold, marginTop: '4px' }}>{maz.occasion}</div>
    </div>
  </div>
);

export const AzkarotCard = ({ azk, azkKey }) => (
  <div style={S.centeredCard}>
    <div style={S.eyebrow}>לעילוי נשמת</div>
    <div key={azkKey} style={{ animation: 'omFade .6s ease', marginTop: '8px' }}>
      <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: '21px', fontWeight: 700, color: S.COLORS.goldLight, lineHeight: 1.3 }}>
        {azk.name}
      </div>
      <div style={{ fontSize: '15px', color: '#a7b0bf', marginTop: '4px' }}>{azk.detail}</div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: S.COLORS.gold, marginTop: '3px' }}>{azk.date}</div>
    </div>
  </div>
);

// בדיחות ליאור — the slot the imported mock filled with פרנס היום, which this display
// dropped in favour of jokes on 2026-07-24. The pool is scraped and filtered server-side
// (server/src/jokes/), so nothing here validates or truncates.
//
// The wall's 110-character ingest cap was measured against its own 26px/386px column
// (see display/CenterCards.jsx); at 17px across a phone's full width that same cap has
// room to spare, so no phone-specific limit is needed. overflow:hidden stays anyway, as
// belt-and-braces, for the same reason it is on the wall.
export const JokesCard = ({ joke, jokeKey }) => (
  <div style={{ ...S.centeredCard, overflow: 'hidden' }}>
    <div style={S.eyebrow}>בדיחות ליאור</div>
    <div
      key={jokeKey}
      style={{
        animation: 'omFade .6s ease',
        marginTop: '8px',
        fontSize: '17px',
        fontWeight: 600,
        color: S.COLORS.goldLight,
        lineHeight: 1.45,
      }}
    >
      {joke ? joke.text : 'אין בדיחות להצגה כרגע'}
    </div>
  </div>
);
