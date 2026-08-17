import SynagogueDisplay from './SynagogueDisplay';
import ShabbatDisplay from './ShabbatDisplay';
import KeepAwake from '../components/KeepAwake';
import NightlyReload from '../components/NightlyReload';
import useScheduledScreen from '../hooks/useScheduledScreen';

// TVs crop the panel edges, and how much varies by set. Pulling the canvas in by this
// much costs a little size and buys back the top bar and the ticker, which sit at the
// very edge of the 1920x1080 canvas and are the first things an overscanning set eats.
const TV_SAFE_AREA = { x: 0.04, y: 0.03 };

// The wall display for a TV browser.
//
// What this route is for is the layout choice, not the viewport. An Android TV WebView
// reports about 960x540, and with browser chrome over it the height falls under the 500px
// clause in hooks/useIsMobile.js, so / answers with the phone layout. Rendering whichever of
// the two boards belongs here directly settles that: the wall layout regardless of what the
// set reports.
//
// It deliberately does NOT override the viewport width, and adding one back will break the
// display. Both boards scale a fixed 1920x1080 canvas to window.innerWidth/Height, so at
// device-width it already fills the panel exactly — a 960x540 viewport at 2x device pixels IS
// 1920x1080 of real pixels, and text lands at precisely the size a 1:1 render would give. A
// wider viewport cannot make it physically bigger, because the canvas fills the panel either
// way. What it does do is lay the page out at a width the WebView then declines to zoom out to
// fit (useWideViewPort without loadWithOverviewMode), leaving a quarter of the display hanging
// off the right and bottom edges.

// A typed URL can pin the board: /tv?screen=shabbat, /tv?screen=weekday. Read once, at mount.
//
// Not the חול/שבת toggle coming back through a side door. Reaching it takes a keyboard, so a
// remote cannot arrive here by accident, and a reload of the plain /tv address always restores
// the schedule — the toggle's override, by contrast, outlived the segment it was cast in.
// It is how this layout gets reviewed on a Tuesday.
//
// The two values are NOT symmetric, and that is intentional. `?screen=shabbat` mounts
// ShabbatDisplay, which calls useDisplayModel('shabbat') — forceScreen pins both the layout
// AND the schedule it shows, so this previews Shabbat cleanly on any day. `?screen=weekday`
// mounts SynagogueDisplay, whose model has no forceScreen and so still follows the calendar —
// this pins only the LAYOUT. On a Saturday, `?screen=weekday` therefore shows the dark board
// running the Shabbat prayer list, not the weekday one. That is the one combination this query
// param cannot preview in isolation, and it is correct: SynagogueDisplay never stops following
// the calendar just because a URL asked to see it.
const previewScreen = () => {
  const value = new URLSearchParams(window.location.search).get('screen');
  return value === 'shabbat' || value === 'weekday' ? value : null;
};

const TvDisplay = () => {
  // The query wins when it is present, and it can only be present if someone typed it.
  const scheduled = useScheduledScreen();
  const screen = previewScreen() || scheduled;
  return (
    // Holds no layout of its own — only the attribute the TV-only focus rules in index.css
    // hang off. Whichever of the two boards below is mounted positions itself against the
    // viewport exactly as on /.
    <div data-tv>
      {/* The box's screensaver takes the screen after a few minutes and its firmware offers no
          "never", so the page has to hold the screen itself. Mounted only here: this is the
          one import site, which is what keeps the wake lock off every other route. */}
      <KeepAwake />
      {/* Nothing else ever reloads this page, so a deploy would never reach the TV — and
          KeepAwake removes the sleep/wake cycles that used to do it by accident. Same one
          import site rule: a phone must never reload under the reader. */}
      <NightlyReload />
      {screen === 'shabbat' ? (
        <ShabbatDisplay safeArea={TV_SAFE_AREA} />
      ) : (
        <SynagogueDisplay safeArea={TV_SAFE_AREA} showToggle={false} />
      )}
    </div>
  );
};

export default TvDisplay;
