import { useEffect, useState } from 'react';

// Which of the two layouts `/` should answer with.
//
// The height clause is not decoration. A phone held landscape is 844x390: wide enough to
// pass a width-only breakpoint, and far too short for the 1920x1080 wall canvas, which
// would scale to 0.36 there — the exact unreadability the phone layout exists to remove.
//
//   the TV        1920x1080  wall
//   laptop        1366x768   wall
//   iPad portrait  820x1180  mobile
//   iPad landscape 1180x820  wall
//   iPhone         390x844   mobile
//   iPhone rotated 844x390   mobile (height clause)
export const MOBILE_QUERY = '(max-width: 820px), (max-height: 500px)';

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );

  // Subscribed rather than measured once: rotating a phone has to re-pick the layout,
  // and so does dragging a desktop window across the breakpoint while testing.
  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isMobile;
}
