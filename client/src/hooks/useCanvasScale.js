import { useEffect, useState } from 'react';

// The scale that fits the fixed 1920x1080 board canvas onto this screen.
//
// Both wall boards need it and neither owns it: pages/SynagogueDisplay.jsx (dark, every day)
// and pages/ShabbatDisplay.jsx (light, שבת on /tv) are one canvas rendered two ways, so the
// arithmetic that fits that canvas belongs to neither of them.
//
// It prefers a WHOLE number of device pixels per canvas pixel, and that preference is the
// reason this is a hook and not a bare division. The boards are drawn almost entirely in
// hairlines — 1px card borders, 1px row dividers, the שבת tallit band — and a hairline only
// stays a hairline if one canvas pixel covers a whole number of device pixels. At a fractional
// scale the browser has to resample it across two, each at partial coverage, so it comes out
// twice as wide at half the contrast. Measured on the shul's panel: a divider that renders as
// one device pixel at intensity 171 when the scale is exact renders as two, at 85 and 91, when
// the scale is 0.92. Across a hall that reads as a soft, pixelated board.
//
// The panels this actually runs on land on a whole number for free. A 1080p set reports
// 960x540 at devicePixelRatio 2 and fits at 0.5, which is exactly 1 device pixel per canvas
// pixel; a 4K set gives exactly 2. Snapping costs them nothing.
//
// TOLERANCE is why the snap does not fire everywhere. A window that fits at 1.33 would have to
// drop to 1.0 to reach a whole number, and giving up a quarter of the board's size is a bad
// trade for a wall display that is read from across the room — sharpness is worth very little
// if the text is too small to reach the back row. So the snap is taken only when it costs
// almost nothing, which is precisely the exact-fit case the TVs are in, and a desktop browser
// at some arbitrary window size keeps filling its window as it always has.
//
// Overscan is deliberately NOT handled here. It used to be: a safeArea fraction was multiplied
// into this fit, which is what pinned the shul's TV at 0.92 and blurred every line on it. It is
// padding inside the canvas now — see the two pages — because holding content off the edges is
// a layout concern and has no business changing the raster scale.
const TOLERANCE = 0.95;

export default function useCanvasScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const raw = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      // Device pixels per canvas pixel. Below 1:1 there is no whole number to snap to — a
      // 1920 canvas cannot map one-to-one into a 1280px panel — so the fit stands as it is.
      const perPixel = raw * dpr;
      const whole = Math.floor(perPixel);
      setScale(whole >= 1 && whole / perPixel >= TOLERANCE ? whole / dpr : raw);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return scale;
}
