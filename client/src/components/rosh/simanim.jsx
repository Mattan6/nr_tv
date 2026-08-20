// סימני השנה — the foods eaten on ראש השנה night, each with its יהי רצון.
//
// Fixed content, and deliberately not gabbai-editable: this is the same eight every year in
// every Sephardi shul, drawn rather than typed. It is the board's decoration, the counterpart
// of the שבת board's tallit band, and the one strip on it carrying no data at all.
export const SIMANIM = [
  {
    name: 'רִמּוֹן',
    draw: (
      <>
        <path d="M29 12 C40 12 47 21 47 32 C47 43 39 51 29 51 C19 51 11 43 11 32 C11 21 18 12 29 12 Z" fill="#a8283c" />
        <path d="M29 12 L25 4 M29 12 L33 5 M29 12 L29 3" stroke="#7d2233" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="23" cy="30" r="3.1" fill="#f3c9cf" />
        <circle cx="34" cy="29" r="3.1" fill="#f3c9cf" />
        <circle cx="28" cy="39" r="3.1" fill="#f3c9cf" />
        <circle cx="37" cy="38" r="2.6" fill="#f3c9cf" />
        <circle cx="20" cy="39" r="2.6" fill="#f3c9cf" />
      </>
    ),
  },
  {
    name: 'תַּפּוּחַ בִּדְבַשׁ',
    draw: (
      <>
        <path d="M29 14 C39 14 46 22 46 33 C46 44 38 52 29 52 C20 52 12 44 12 33 C12 22 19 14 29 14 Z" fill="#c8362f" />
        <path d="M29 14 C27 9 28 5 31 3 C32 7 31 11 29 14 Z" fill="#5f9a45" />
        <path d="M20 24 C23 20 27 19 30 20" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M13 44 C22 50 36 50 45 44 C40 55 18 55 13 44 Z" fill="#e0a93a" />
      </>
    ),
  },
  {
    name: 'רֹאשׁ דָּג',
    draw: (
      <>
        <path d="M8 30 C16 18 32 15 44 22 C52 27 52 33 44 38 C32 45 16 42 8 30 Z" fill="#7fa8c4" />
        <path d="M44 22 C50 17 54 16 56 17 C53 22 52 26 52 30 C52 34 53 38 56 43 C54 44 50 43 44 38" fill="#5f88a6" />
        <circle cx="20" cy="28" r="2.6" fill="#f6f9fc" />
        <path d="M26 24 C30 30 30 33 26 38" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      </>
    ),
  },
  {
    name: 'רֻבִּיָּא',
    draw: (
      <>
        <path d="M12 44 C10 30 16 20 27 18 C39 16 47 24 47 34 C47 42 41 47 33 47 Z" fill="#c9a86a" stroke="#8a6a2f" strokeWidth="1.6" />
        <circle cx="23" cy="26" r="4.4" fill="#a9702f" />
        <circle cx="33" cy="31" r="4.4" fill="#a9702f" />
        <circle cx="24" cy="37" r="4.4" fill="#a9702f" />
        <circle cx="35" cy="41" r="4" fill="#a9702f" />
        <path d="M12 44 L33 47" stroke="#b8ae94" strokeWidth="2" />
      </>
    ),
  },
  {
    name: 'כַּרְתִּי',
    draw: (
      <>
        <path d="M29 52 C25 42 25 34 29 26 C33 34 33 42 29 52 Z" fill="#cfe0b0" stroke="#4a7c33" strokeWidth="1.6" />
        <path d="M29 27 C22 20 16 12 17 5 C25 9 30 17 30 27 Z" fill="#5f9a45" />
        <path d="M29 27 C36 20 42 12 41 5 C33 9 28 17 28 27 Z" fill="#7fb63f" />
        <path d="M29 30 C24 26 20 20 20 14" fill="none" stroke="#4a7c33" strokeWidth="1.8" />
      </>
    ),
  },
  {
    name: 'סִלְקָא',
    draw: (
      <>
        <path d="M29 52 L29 30" stroke="#c94f5e" strokeWidth="4" strokeLinecap="round" />
        <path d="M29 32 C18 30 10 22 10 12 C21 13 28 21 29 32 Z" fill="#4f8c3a" />
        <path d="M29 32 C40 30 48 22 48 12 C37 13 30 21 29 32 Z" fill="#6aa947" />
        <path d="M29 44 C24 43 21 40 20 36" fill="none" stroke="#c94f5e" strokeWidth="2.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: 'תָּמָר',
    draw: (
      <>
        <ellipse cx="29" cy="36" rx="11" ry="16" fill="#a9702f" />
        <path d="M22 26 C26 32 26 40 23 46" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.2" />
        <path d="M29 20 L29 14" stroke="#6f4a1d" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M29 15 C22 12 16 12 12 15 M29 15 C36 12 42 12 46 15" fill="none" stroke="#5f9a45" strokeWidth="2.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: 'רֹאשׁ כֶּבֶשׂ',
    draw: (
      <>
        <path d="M14 46 C12 34 18 24 29 23 C40 24 46 34 44 46 Z" fill="#c9a86a" stroke="#8a6a2f" strokeWidth="1.6" />
        <path d="M20 23 C16 17 17 11 22 8 C24 13 24 19 22 23" fill="#a9702f" />
        <path d="M38 23 C42 17 41 11 36 8 C34 13 34 19 36 23" fill="#a9702f" />
        <circle cx="24" cy="34" r="2.4" fill="#8a8172" />
        <circle cx="34" cy="34" r="2.4" fill="#8a8172" />
        <path d="M26 41 C28 43 30 43 32 41" fill="none" stroke="#8a8172" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
];
