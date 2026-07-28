import { useEffect } from 'react';
import SynagogueDisplay from './SynagogueDisplay';

// Both mirror index.html, which applies the same override in the head so that a direct
// load of /tv gets its first paint at the right viewport. This effect exists for the
// other way in — a client-side navigation, where the head script has already run against
// some other pathname and will not run again.
const TV_VIEWPORT = 'width=1280';
const DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1.0';

// TVs crop the panel edges, and how much varies by set. Pulling the canvas in by this
// much costs a little size and buys back the top bar and the ticker, which sit at the
// very edge of the 1920x1080 canvas and are the first things an overscanning set eats.
const TV_SAFE_AREA = { x: 0.04, y: 0.03 };

// The wall display for a TV browser. Deliberately renders SynagogueDisplay itself rather
// than going through App's DisplayRoot: the viewport override should be enough to make
// useIsMobile answer 'wall', but a set that reports something stranger than 960x540 would
// still land on the phone layout, and this route exists precisely to not do that.
const TvDisplay = () => {
  useEffect(() => {
    const meta = document.querySelector('meta[name=viewport]');
    if (!meta) return undefined;

    meta.setAttribute('content', TV_VIEWPORT);
    // Restored to the constant, not to whatever was there on mount: on a direct load of
    // /tv the head script has already written TV_VIEWPORT, so capturing the previous
    // value would 'restore' the override and leak it into / on the way out.
    return () => meta.setAttribute('content', DEFAULT_VIEWPORT);
  }, []);

  return (
    // Undersized on purpose — it holds no layout, only the attribute the TV-only focus
    // rules in index.css hang off. SynagogueDisplay positions itself against the viewport
    // exactly as it does on /.
    <div data-tv>
      <SynagogueDisplay safeArea={TV_SAFE_AREA} />
    </div>
  );
};

export default TvDisplay;
