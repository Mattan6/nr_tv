import { useEffect, useState } from 'react';

// The scale that fits the fixed 1920x1080 board canvas onto this screen, less a safe area.
//
// Both wall boards need it and neither owns it: pages/SynagogueDisplay.jsx (dark, every day)
// and pages/ShabbatDisplay.jsx (light, שבת on /tv) are one canvas rendered two ways, so the
// arithmetic that fits that canvas belongs to neither of them.
//
// `safeArea` holds back a fraction of each axis before fitting, for TVs that crop their own
// edges — pages/TvDisplay.jsx passes it, and zero is a no-op. It is a scale input rather than
// padding on a wrapper because the fit measures the WINDOW, not the component's box: an inset
// wrapper would keep the full-window scale and crop the canvas instead of shrinking it.
//
// Depends on the two numbers rather than the object, so a caller passing an inline literal
// does not re-subscribe on every render.
export default function useCanvasScale({ x: safeX = 0, y: safeY = 0 } = {}) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () =>
      setScale(
        Math.min(
          (window.innerWidth * (1 - 2 * safeX)) / 1920,
          (window.innerHeight * (1 - 2 * safeY)) / 1080
        )
      );
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [safeX, safeY]);

  return scale;
}
