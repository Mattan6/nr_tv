// The board's drawings, transcribed path-for-path from the mockup. Every `d`, `fill` and
// stroke value below is the mockup's; only the attribute casing is JSX's.
//
// Inline SVG rather than an icon font or images, for the same reason components/shabbat/icons
// is: the board is a fixed 1920x1080 canvas that gets scaled, so anything raster would soften
// at 4K, and a wall panel should not wait on a network request to draw a pomegranate.

// The pair of שופרות flanking the greeting, drifting on a staggered loop.
//
// The flip lives on a WRAPPER rather than on the svg, which is the one place this departs from
// the mockup's markup — and it is a fix, not a liberty. The mockup puts `transform:scaleX(-1)`
// on the same element it runs `omShofar` on, and the keyframes set `transform` too, so the
// running animation overrides the flip outright: the second שופר never actually mirrors, it
// just drifts 0.9s behind an identical copy of the first. Splitting the two transforms across
// two elements gives both, which is what the design draws.
export const ShofarIcon = ({ flip = false, delay = 0 }) => (
  <span style={{ flex: 'none', display: 'inline-flex', transform: flip ? 'scaleX(-1)' : undefined }}>
    <svg
      width="92"
      height="54"
      viewBox="0 0 92 54"
      aria-hidden="true"
      style={{ display: 'block', animation: `omShofar 4.5s ease-in-out infinite ${delay}s` }}
    >
      <path
        d="M4 36 C18 47 37 49 54 40 C69 32 80 20 88 6 C79 22 66 34 51 32 C36 30 21 29 4 36 Z"
        fill="#e0be7c"
      />
    </svg>
  </span>
);

// The four-petal gold rosette that splits a card title from its list.
export const WreathIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 26 26" style={{ flex: 'none' }} aria-hidden="true">
    <path d="M13 3 C15.6 7.4 15.6 10.2 13 13 C10.4 10.2 10.4 7.4 13 3 Z" fill="rgba(176,135,63,0.75)" />
    <path d="M23 13 C18.6 15.6 15.8 15.6 13 13 C15.8 10.4 18.6 10.4 23 13 Z" fill="rgba(176,135,63,0.55)" />
    <path d="M13 23 C10.4 18.6 10.4 15.8 13 13 C15.6 15.8 15.6 18.6 13 23 Z" fill="rgba(176,135,63,0.75)" />
    <path d="M3 13 C7.4 10.4 10.2 10.4 13 13 C10.2 15.6 7.4 15.6 3 13 Z" fill="rgba(176,135,63,0.55)" />
    <circle cx="13" cy="13" r="1.8" fill="rgba(176,135,63,0.9)" />
  </svg>
);

// The little branch-and-fruit sprig either side of 'ראש השנה תשפ״ז' on the masthead.
export const SprigIcon = ({ flip = false }) => (
  <svg
    width="34"
    height="18"
    viewBox="0 0 34 18"
    aria-hidden="true"
    style={{ flex: 'none', transform: flip ? 'scaleX(-1)' : undefined }}
  >
    <path d="M2 16 C12 15 20 10 26 2" fill="none" stroke="rgba(224,190,124,0.8)" strokeWidth="1.3" />
    <path d="M13 14 C10 8 13 4 19 3 C20 9 18 13 13 14 Z" fill="rgba(224,190,124,0.5)" />
    <circle cx="29" cy="5" r="3.4" fill="none" stroke="rgba(224,190,124,0.85)" strokeWidth="1.2" />
    <circle cx="29" cy="5" r="1.3" fill="rgba(224,190,124,0.85)" />
  </svg>
);
