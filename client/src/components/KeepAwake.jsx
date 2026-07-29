import { useEffect, useRef, useState } from 'react';

// Holds the screen for as long as /tv is mounted.
//
// The box this runs on cannot be told to stay awake. Its sleep setting is already off, and
// the screensaver timeout offers 5, 15 and 30 minutes with no "never", so after a few
// minutes the screensaver covers the display and no setting prevents it. An active wake
// lock suppresses both display sleep and the screensaver regardless of that timeout.
//
// Nothing here is load-bearing for rendering: every failure path ends with /tv drawn
// exactly as before and merely not holding the screen.
//
// Imported by pages/TvDisplay.jsx and nowhere else, which is what keeps the wake lock
// scoped to /tv — no other route can request one without an import that does not exist.

// navigator.wakeLock is [SecureContext], so on a plain-http origin the property is not
// inert, it is absent. That makes one check cover both cases worth covering: an old WebView
// without the API, and the TV pointed at a LAN address over http rather than at the HTTPS
// deployment.
const hasWakeLock = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator;

// A 64x64 black H.264 clip, two frames, ~1.5KB. Constrained Baseline / yuv420p is the
// profile an Android TV decodes in hardware, and hardware decode is what makes the platform
// hold the screen for it.
//
// Inline rather than a file under public/ so the fallback costs no second HTTP request on
// the least reliable device in the deployment, and so there is no window where the page is
// up but the asset has not arrived.
const KEEP_AWAKE_MP4 = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAMHbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAB9AAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAlZ0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAB9AAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAEAAAABAAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAfQAAAAAAABAAAAAAHObWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAABAAAAAgABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABeW1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAATlzdGJsAAAAuXN0c2QAAAAAAAAAAQAAAKlhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAEAAQABIAAAASAAAAAAAAAABDExhdmMgbGlieDI2NAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAAL2F2Y0MBQsAe/+EAF2dCwB7ZBCbARAAAAwAEAAADAAg8WLkgAQAFaMuDyyAAAAAQcGFzcAAAAAEAAAABAAAAFGJ0cnQAAAAAAAAKcAAACnAAAAAYc3R0cwAAAAAAAAABAAAAAgAAQAAAAAAUc3RzcwAAAAAAAAABAAAAAQAAABxzdHNjAAAAAAAAAAEAAAABAAAAAgAAAAEAAAAcc3RzegAAAAAAAAAAAAAAAgAAApIAAAAKAAAAFHN0Y28AAAAAAAAAAQAAAzcAAAA9dWR0YQAAADVtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAAhpbHN0AAAACGZyZWUAAAKkbWRhdAAAAnAGBf//bNxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjQgcjMxNzIgYzFjOTkzMSAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjMgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0wIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDE6MHgxMTEgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTAgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz0yIGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MCB3ZWlnaHRwPTAga2V5aW50PTI1MCBrZXlpbnRfbWluPTEgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD00MCByYz1jcmYgbWJ0cmVlPTEgY3JmPTIzLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IGlwX3JhdGlvPTEuNDAgYXE9MToxLjAwAIAAAAAaZYiEBb///w9FAAFPfycnJ1111111111114AAAAAGQZo4CvhG';

// Laid out at 1x1 in a corner and hidden with opacity — deliberately not `display: none`
// and not `visibility: hidden`. A video taken out of layout is one the engine may stop
// decoding, and a suspended video holds no wake lock, which would leave the fallback
// present in the DOM and doing nothing.
const HIDDEN_VIDEO = {
  position: 'fixed',
  bottom: 0,
  right: 0,
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: 'none',
};

export default function KeepAwake() {
  const [useVideo, setUseVideo] = useState(() => !hasWakeLock());
  const sentinelRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!hasWakeLock()) return undefined;

    let cancelled = false;
    let pending = false;

    const acquire = async () => {
      const current = sentinelRef.current;
      if (cancelled || pending || (current && !current.released)) return;

      pending = true;
      try {
        const sentinel = await navigator.wakeLock.request('screen');

        // request() is async and unmount can win the race. Releasing here matters more than
        // it looks: the alternative is a sentinel stored to a ref nobody will ever release,
        // holding the screen awake after the route is gone — a leak in the direction that
        // looks like success, so nothing would ever surface it.
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }

        sentinelRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
        });
      } catch {
        // Present but refusing — some WebView builds expose the object and decline the
        // request. Feature detection alone would leave those devices with no lock and no
        // fallback, so a rejection is treated as unsupported rather than as an error. It is
        // swallowed: there is nothing the congregation could do with it.
        if (!cancelled) setUseVideo(true);
      } finally {
        pending = false;
      }
    };

    // The lock is dropped automatically whenever the document hides, and is NOT restored on
    // return. Without this it dies the first time anything takes the foreground — an app
    // switch, a launcher overlay, an input change — and never comes back, which reads as
    // "it stopped working after a while" rather than as a failure with a moment attached.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) sentinel.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Both belt and braces. React has historically set `muted` as an attribute rather than a
    // property, which autoplay policy does not honour, and some WebViews want an explicit
    // play() even with `autoplay` present.
    video.muted = true;
    const played = video.play();
    if (played) played.catch(() => {});
  }, [useVideo]);

  if (!useVideo) return null;

  return (
    <video
      ref={videoRef}
      src={KEEP_AWAKE_MP4}
      muted
      loop
      autoPlay
      playsInline
      aria-hidden="true"
      tabIndex={-1}
      style={HIDDEN_VIDEO}
    />
  );
}
