# Keeping the TV awake on /tv — design

## The problem

The `/tv` route runs continuously on an Android TV box. The device's sleep setting is
already disabled, and the system screensaver still takes the screen after a few minutes
and covers the display.

The timeout cannot be raised out of the way. The firmware exposes 5, 15 and 30 minutes,
with no "never", so there is no setting that fixes this. Whatever holds the screen has to
come from the page.

## The fix

Hold a screen wake lock for as long as `/tv` is mounted. An active wake lock suppresses
both display sleep and screensaver activation regardless of the system timeout, which is
exactly the gap the firmware leaves open.

This is an enhancement and never a hard dependency. Every failure path below ends with
`/tv` rendering normally and merely not holding the screen.

## Two paths, because one API is not enough

`navigator.wakeLock` is declared `[SecureContext]`, so on a non-secure origin the property
is not merely inert — it is `undefined`. Older WebView builds omit it outright. Between
those two, a TV box is a realistic place for the API to simply not exist.

So the design has a primary path and a fallback, chosen at runtime:

| Condition | Path |
|---|---|
| `'wakeLock' in navigator` and `request()` resolves | Wake Lock API |
| property absent (old WebView, or plain-http origin) | hidden video |
| property present but `request()` rejects | hidden video |

The third row is the one feature detection alone misses. A WebView can expose the object
and refuse the request; detecting the property and then trusting it would leave that
device with no wake lock and no fallback. The rejection handler and the detection miss
funnel to the same place.

The fallback rests on a platform behaviour rather than an API: active video playback holds
a wake lock at the Android level, which is why a film does not get interrupted by the
screensaver. A muted, looping, autoplaying video is that same signal with nothing to look
at.

## Design

### One component, imported once

`client/src/components/KeepAwake.jsx`. `TvDisplay` renders it beside `SynagogueDisplay`;
nothing else in the client imports it.

That single import site is what enforces "only `/tv`". The requirement is not a rule
someone has to remember while editing other routes — a wake lock cannot appear on `/` or
`/zmanim` without someone adding an import that is not there.

It is a component rather than a hook under `hooks/` because in the fallback path it owns
DOM. A hook returning "now render a video" would split one decision across two files and
put the styling requirements — which are load-bearing, see below — somewhere other than
the logic that depends on them.

### Wake Lock path

    mount            -> acquire()
    visibilitychange -> if visible and the sentinel is missing or released, acquire()
    unmount          -> drop the listener, release the sentinel, swallow any rejection

The `visibilitychange` re-acquisition is not defensive coding. A wake lock is released
automatically whenever the document becomes hidden, and it is **not** restored when the
document comes back. Without re-acquisition the lock dies the first time anything takes
the foreground — an app switch, a launcher overlay, an HDMI input change — and never
returns, which reads as "the fix stopped working after a while" rather than as a bug with
a moment attached to it.

Two guards beyond the stated requirements:

**A cancellation flag.** `request()` is async and unmount can win the race. Without the
flag a sentinel that resolves after unmount is stored to a ref nobody will ever release
again, and the screen stays awake after leaving `/tv` — a leak in the direction that looks
like success, so it would not be noticed. The flag makes the late resolver release
immediately.

**Rejection falls through to the video.** As above: `request()` throwing is treated as
"unsupported", not as "supported and broken".

Every `catch` is silent. A rejection here must never surface to the congregation or
interrupt rendering, and there is nothing a viewer could do about it.

### Fallback video

Rendered only when the wake lock path is unavailable, so a device where the API works
decodes nothing.

    <video src={KEEP_AWAKE_MP4} muted loop autoPlay playsInline aria-hidden tabIndex={-1}
           style={{ position: 'fixed', bottom: 0, right: 0, width: 1, height: 1,
                    opacity: 0, pointerEvents: 'none' }} />

`muted` and `playsInline` are what make autoplay permissible: an unmuted video is blocked
by autoplay policy, and without `playsInline` iOS-lineage WebViews take the video
fullscreen, which would cover the display with a black rectangle.

**Hidden with `opacity`, never `display: none`.** This is the subtle one. A video removed
from the layout — `display: none`, or `visibility: hidden` — is a video the engine is free
to stop decoding, and a suspended video holds no wake lock. The element stays laid out at
1x1 in the corner with `opacity: 0` and `pointer-events: none`: present and playing as far
as the compositor is concerned, invisible and inert as far as the viewer is concerned.

`aria-hidden` and `tabIndex={-1}` keep it off the accessibility tree and out of the D-pad
focus order, which `/tv` already has scoped rules for.

Two belt-and-braces steps on mount, via a ref: set `video.muted = true` as a property, and
call `play()` with the rejection swallowed. React has historically set `muted` as an
attribute rather than a property, which autoplay policy does not honour, and some WebViews
want an explicit `play()` even with `autoplay` present.

### The video asset

A ~1KB black 64x64 MP4, H.264/`yuv420p`, embedded as a `data:` URI constant in the
component.

Inline rather than a file under `client/public/` for two reasons. It costs no second HTTP
request on a device that is already the least reliable thing in the deployment, and there
is no window in which the page is up but the asset has not arrived. The bytes are small
enough that the bundle does not care.

Generated once with ffmpeg pulled through a throwaway `npm install` outside the repo, so
no dependency enters `package.json` in either direction — the constraint is no new
**runtime** dependencies, and this leaves no build-time one either.

A video that does not decode is a fallback that silently does nothing, which is the exact
failure this section exists to prevent, so the asset is checked by decoding rather than by
reading its metadata: `ffmpeg -f rawvideo` expands it to 24576 raw bytes, which is
`64 x 64 x 3 x 2` frames, all of them black. The base64 is then injected into the component
by script, not by hand, and decoded back out of the written file to confirm it is
byte-identical to the source — a transcription slip in a 1988-character string is
invisible on review and would fail the same silent way.

H.264 rather than VP8/WebM because it is the codec an Android TV decoder is guaranteed to
have in hardware, and hardware decode is what makes the platform wake lock apply.

## Secure context

The Wake Lock API requires one. Railway serves the site over HTTPS
(`DEPLOY.md:85` — `*.up.railway.app` with a certificate), so the primary path is available
in production, as it is on `localhost`, which counts as secure regardless of scheme.

**If the TV box is pointed at a LAN address over plain http** — `http://192.168.x.x:5000`
— that origin is not secure, `navigator.wakeLock` is `undefined`, and the primary path
never runs. The feature still works, entirely through the video fallback. This is the most
common reason a wake lock appears to fail silently, and it is worth knowing which of the
two paths a given box is actually on before concluding anything from the checks below.

## Files

| File | Change |
|---|---|
| `client/src/components/KeepAwake.jsx` | new |
| `client/src/pages/TvDisplay.jsx` | render `<KeepAwake />` |

No other route, component or server file is touched.

## Verification

The client has no test framework. These were run against the production build
(`vite preview`) driven through `playwright-core` against the installed Edge — the real
API in a real browser, not a mock. 16 checks, all passing.

The sentinel lives in a ref and is deliberately not exposed on `window`, so the harness
wraps `navigator.wakeLock.request` before the app boots and inspects the actual objects the
component acquires.

**Wake lock path** — `localhost` is a secure context, so this is the path that runs:

1. On load, one sentinel, `type === 'screen'`, `released === false`. No video mounted.
2. After releasing that sentinel and delivering a `visibilitychange`, a *second* sentinel
   is acquired and `released` is `false` — the re-acquisition works rather than sitting on
   a dead lock. A fresh load of `/tv` acquires cleanly too.
3. Client-side navigation off `/tv` leaves the last sentinel `released === true`.
4. No console errors.

**Fallback path** — `navigator.wakeLock` deleted before load:

5. The video mounts, and `paused === false` with `readyState === 4`: it is decoding, not
   merely present. `currentTime` advances 0.15 -> 1.67 over 1.5s.
6. `muted`, `loop` and `playsInline` all read `true` as *properties*, which is what
   autoplay policy consults.
7. Computed style is `display: block`, `visibility: visible`, `opacity: 0`, 1px x 1px —
   hidden without leaving the layout.
8. No console errors.

**Scoping:** `/`, `/zmanim` and `/adminGabbai` each acquire zero sentinels and mount no
video.

Two notes on what these checks do *not* cover. Autoplay was verified under Chromium's
**default** policy — no `--autoplay-policy` override — so `muted` is carrying it, as
intended. And Playwright cannot genuinely background a page (`bringToFront` leaves
`visibilityState` at `visible`), so check 2 reproduces the state a hide leaves behind — a
released sentinel — rather than triggering the platform's auto-release itself. The
auto-release is spec'd browser behaviour; the half worth testing is the handler's response
to it, which is what is tested.

Neither the Android TV box nor its screensaver can be exercised from here. The remaining
confirmation is on the device: leave `/tv` up past the configured screensaver timeout and
see that it stays.

Pre-existing `/api/content` 500s under `vite preview` (no backend behind it) are filtered
from the console assertions; they appear on `/` identically and predate this change.
