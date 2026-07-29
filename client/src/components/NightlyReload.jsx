import { useEffect, useRef } from 'react';
import { israelParts } from './display/displayData';

// Reloads /tv once a night, in the small hours.
//
// The TV browser is opened once and left for weeks, and nothing in the app ever reloads it,
// so the running bundle is frozen at whatever was deployed the last time someone physically
// opened it. Every fix pushed to Railway since then sits there unreached. Display sleep and
// screensaver wake cycles used to knock the WebView into reloading occasionally, which was
// an accidental update path; components/KeepAwake.jsx deliberately removes it, so this is
// what replaces it.
//
// A reload also bounds a page that has otherwise been re-rendering once a second for weeks —
// see the one-second clock tick in hooks/useDisplayModel.js.
//
// Imported by pages/TvDisplay.jsx and nowhere else. The same reasoning as KeepAwake: the
// congregation's phones must never have the page reload under them mid-scroll, and the one
// import site is what guarantees it cannot.

const CHECK_MS = 30000;
// 03:30 in Nitzan. After the latest ערבית and well before the earliest שחרית, so the two
// seconds of black screen land in front of nobody.
const RELOAD_AFTER_MIN = 3 * 60 + 30;

const dayKey = (p) => `${p.year}-${p.month}-${p.day}`;
const israelNow = () => israelParts(new Date());

export default function NightlyReload() {
  // The Israel day this page instance started on. After a reload the component mounts fresh
  // and records the NEW day, which is what stops the reload from repeating: without it the
  // page would come back up still inside 03:30, match the condition again, and reload in a
  // loop until 03:31. No storage needed — a remount is exactly the reset this wants.
  const startedOn = useRef(dayKey(israelNow()));

  useEffect(() => {
    const check = () => {
      const p = israelNow();
      // Both clauses are required. The day test alone would fire at 00:00, in the middle of
      // the rollover the display is busy handling; the time test alone would fire every
      // 30 seconds from 03:30 to 03:59 on the day the browser was opened.
      if (dayKey(p) === startedOn.current) return;
      // A floor, not a window. If the box were suspended through 03:30 the reload lands
      // whenever it next wakes, which may be an awkward hour — but bounding the other end
      // would trade two seconds of black screen for the feature silently never running,
      // which is the failure it exists to remove.
      if (p.hour * 60 + p.minute < RELOAD_AFTER_MIN) return;
      window.location.reload();
    };

    const id = setInterval(check, CHECK_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
