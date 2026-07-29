import SynagogueDisplay from './SynagogueDisplay';
import KeepAwake from '../components/KeepAwake';

// TVs crop the panel edges, and how much varies by set. Pulling the canvas in by this
// much costs a little size and buys back the top bar and the ticker, which sit at the
// very edge of the 1920x1080 canvas and are the first things an overscanning set eats.
const TV_SAFE_AREA = { x: 0.04, y: 0.03 };

// The wall display for a TV browser.
//
// What this route is for is the layout choice, not the viewport. An Android TV WebView
// reports about 960x540, and with browser chrome over it the height falls under the 500px
// clause in hooks/useIsMobile.js, so / answers with the phone layout. Rendering
// SynagogueDisplay here directly settles that: the wall layout regardless of what the set
// reports.
//
// It deliberately does NOT override the viewport width, and adding one back will break the
// display. SynagogueDisplay scales a fixed 1920x1080 canvas to window.innerWidth/Height,
// so at device-width it already fills the panel exactly — a 960x540 viewport at 2x device
// pixels IS 1920x1080 of real pixels, and text lands at precisely the size a 1:1 render
// would give. A wider viewport cannot make it physically bigger, because the canvas fills
// the panel either way. What it does do is lay the page out at a width the WebView then
// declines to zoom out to fit (useWideViewPort without loadWithOverviewMode), leaving a
// quarter of the display hanging off the right and bottom edges.
const TvDisplay = () => (
  // Holds no layout of its own — only the attribute the TV-only focus rules in index.css
  // hang off. SynagogueDisplay positions itself against the viewport exactly as on /.
  <div data-tv>
    {/* The box's screensaver takes the screen after a few minutes and its firmware offers no
        "never", so the page has to hold the screen itself. Mounted only here: this is the
        one import site, which is what keeps the wake lock off every other route. */}
    <KeepAwake />
    <SynagogueDisplay safeArea={TV_SAFE_AREA} />
  </div>
);

export default TvDisplay;
