import { C } from './shabbatStyle';

// The board's five SVGs. Flat markup, no props: each appears at exactly one size in exactly one
// place, and a size prop would be a parameter with one argument.
//
// The flames animate through `omFlame` (client/src/index.css). The offset second flame on the
// masthead is deliberate — two candles flickering in lockstep read as a loop, not as fire.

export const MastheadCandle = ({ delay = '0s' }) => (
  <svg width="70" height="86" viewBox="0 0 70 86" style={{ flex: 'none' }} aria-hidden="true">
    <ellipse cx="35" cy="80" rx="20" ry="4.5" fill={C.goldLight} />
    <path d="M31 76 C31 60 28 52 28 44 h14 c0 8 -3 16 -3 32 Z" fill={C.gold} />
    <rect x="30" y="36" width="10" height="9" rx="2" fill={C.goldLight} />
    <g style={{ animation: `omFlame 2.4s ease-in-out infinite ${delay}`, transformOrigin: '35px 32px' }}>
      <path d="M35 16 C40 24 39 31 35 34 C31 31 30 24 35 16 Z" fill="#ffd98a" />
      <path d="M35 22 C37.5 27 37 30.5 35 32 C33 30.5 32.5 27 35 22 Z" fill="#fff6dc" />
    </g>
  </svg>
);

export const TwinCandles = () => (
  <svg width="46" height="42" viewBox="0 0 46 42" style={{ flex: 'none' }} aria-hidden="true">
    <ellipse cx="15" cy="38" rx="8" ry="2.4" fill={C.gold} />
    <ellipse cx="31" cy="38" rx="8" ry="2.4" fill={C.gold} />
    <rect x="12.5" y="18" width="5" height="19" rx="1.6" fill="#e0d3b4" stroke={C.goldDeep} strokeWidth="1.1" />
    <rect x="28.5" y="18" width="5" height="19" rx="1.6" fill="#e0d3b4" stroke={C.goldDeep} strokeWidth="1.1" />
    <g style={{ animation: 'omFlame 2.4s ease-in-out infinite', transformOrigin: '15px 14px' }}>
      <path d="M15 4 C19 10 18 15 15 17 C12 15 11 10 15 4 Z" fill="#f0b03c" />
    </g>
    <g style={{ animation: 'omFlame 2.4s ease-in-out infinite .8s', transformOrigin: '31px 14px' }}>
      <path d="M31 4 C35 10 34 15 31 17 C28 15 27 10 31 4 Z" fill="#f0b03c" />
    </g>
  </svg>
);

export const HavdalahSet = () => (
  <svg width="46" height="42" viewBox="0 0 46 42" style={{ flex: 'none' }} aria-hidden="true">
    <path d="M6 12 h13 l-2 12 a4.5 4.5 0 0 1 -9 0 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth="1.2" />
    <path d="M12.5 28 v6" stroke={C.goldDeep} strokeWidth="1.8" />
    <ellipse cx="12.5" cy="36" rx="7" ry="2.4" fill={C.gold} />
    <path d="M30 37 c-1-8 -1-14 0-19 M36 37 c1-8 1-14 0-19" stroke="#e0d3b4" strokeWidth="4" strokeLinecap="round" />
    <path d="M30 20 c2-3 4-3 6 0" fill="none" stroke={C.goldDeep} strokeWidth="1.3" />
    <g style={{ animation: 'omFlame 2.4s ease-in-out infinite', transformOrigin: '33px 14px' }}>
      <path d="M33 3 C38 10 37 15 33 17 C29 15 28 10 33 3 Z" fill="#f0b03c" />
    </g>
  </svg>
);

export const SeferTorah = () => (
  <svg width="30" height="32" viewBox="0 0 30 32" style={{ flex: 'none' }} aria-hidden="true">
    <path d="M4 4 h9 a2 2 0 0 1 2 2 v22 a2 2 0 0 0 -2 -2 h-9 Z" fill="#33587e" stroke={C.goldLight} strokeWidth="1.3" />
    <path d="M26 4 h-9 a2 2 0 0 0 -2 2 v22 a2 2 0 0 1 2 -2 h9 Z" fill="#3f6a94" stroke={C.goldLight} strokeWidth="1.3" />
    <path d="M15 6 v22" stroke={C.goldLight} strokeWidth="1.3" />
  </svg>
);

export const Rosette = () => (
  <svg width="24" height="24" viewBox="0 0 26 26" style={{ flex: 'none' }} aria-hidden="true">
    <path d="M13 3 C15.6 7.4 15.6 10.2 13 13 C10.4 10.2 10.4 7.4 13 3 Z" fill="rgba(200,168,105,0.85)" />
    <path d="M23 13 C18.6 15.6 15.8 15.6 13 13 C15.8 10.4 18.6 10.4 23 13 Z" fill="rgba(90,125,160,0.6)" />
    <path d="M13 23 C10.4 18.6 10.4 15.8 13 13 C15.6 15.8 15.6 18.6 13 23 Z" fill="rgba(200,168,105,0.85)" />
    <path d="M3 13 C7.4 10.4 10.2 10.4 13 13 C10.2 15.6 7.4 15.6 3 13 Z" fill="rgba(90,125,160,0.6)" />
    <circle cx="13" cy="13" r="1.7" fill="rgba(200,168,105,0.95)" />
  </svg>
);
