import { useEffect, useState } from 'react';
import { screenSegment } from '../components/display/displayData';

// 30 seconds, not one. This drives a whole-page layout swap at Friday 09:00 and at Saturday
// midnight, and being up to half a minute late at either is invisible in a room. The one-second
// tick inside useDisplayModel exists because a clock renders seconds; nothing here does.
const SAMPLE_MS = 30000;

// Which board /tv should be showing, on Israel's calendar. Nothing else: no fetching, no
// content, no rotation.
//
// Deliberately not `useDisplayModel().screen`. That hook owns six network legs, four timers and
// the rotation counters, and a second instance of it mounted purely to read one string would
// double all of it for the life of the page — a page that stays open for weeks.
//
// The cost of keeping them separate is that the two boards unmount and remount at the boundary,
// so useDisplayModel re-fetches and the rotations restart. That happens twice a week on a screen
// that already reloads itself nightly (components/NightlyReload.jsx).
export default function useScheduledScreen() {
  const [screen, setScreen] = useState(() => screenSegment(new Date()).screen);

  useEffect(() => {
    const id = setInterval(() => setScreen(screenSegment(new Date()).screen), SAMPLE_MS);
    return () => clearInterval(id);
  }, []);

  return screen;
}
