# TV route with a fixed viewport — design

## The problem

Opened in an Android TV browser (TV Bro, Puffin, the built-in Google TV WebView), the
site serves the phone layout instead of the wall layout.

Android TV WebViews run at ~320dpi on a 1080p panel, so the layout viewport reports
roughly 960x540 CSS pixels. The responsive logic sees a small screen and answers
correctly for a small screen.

This is not a User-Agent problem. Overriding the browser's UA string to a desktop one
changes nothing, because the layout decision is driven by viewport size. No UA sniffing.

## What the codebase actually does

Two facts from the current code change the shape of the fix.

**The wall layout is already resolution-independent.** `SynagogueDisplay` renders a fixed
1920x1080 canvas and scales it with `Math.min(innerWidth / 1920, innerHeight / 1080)`. It
is correct at any viewport, 960 included. Nothing about a small viewport breaks it.

**So the only thing sending the TV to the phone layout is the picker**, `useIsMobile`:

    (max-width: 820px), (max-height: 500px)

At 960x540 the width clause does not fire — 960 is above 820. The clause that fires is
the height one: 540 CSS px minus a browser URL bar of ~48px lands near 492, under 500.
That is the tripwire in TV Bro.

The practical consequence: a TV in fullscreen or kiosk mode may render the wall layout
correctly today and flip to the phone layout the moment browser chrome appears. The fix
below clears both clauses with margin, so it holds either way.

## JS layout audit

Requested as part of the work: find every layout decision made in JavaScript rather than
CSS, since a viewport override fixes CSS but JS may read stale or unscaled values.

The client contains exactly two, and both are safe:

| Site | Reads | Subscribed? |
|---|---|---|
| `hooks/useIsMobile.js:19,25` | `matchMedia(MOBILE_QUERY)` | yes — `change` |
| `pages/SynagogueDisplay.jsx:42` | `innerWidth` / `innerHeight` | yes — `resize` |

Both read `window` live and both re-run on change, so both observe the overridden
viewport rather than a value cached at boot. There is no UA sniffing, no
`devicePixelRatio` arithmetic, and no measurement captured once and reused. Nothing to
fix.

One non-layout defect surfaced and is in scope for D-pad support: the חול/שבת toggles in
`components/display/TopBar.jsx:54-55` are `div[role=button]` with `onClick` only. They
take focus, but a D-pad OK button sends Enter, which does not fire `onClick` on a div.
They are the only interactive elements on the wall display, so a focus ring without
keyboard activation would leave them decorative.

## Design

### Route and shell

A new `client/src/pages/TvDisplay.jsx` at `/tv`. It renders `SynagogueDisplay` directly
rather than through `DisplayRoot`, so `useIsMobile` is bypassed entirely and the wall
layout is unconditional on `/tv` — a TV reporting a viewport the meta tag cannot rescue
still gets the wall. It stamps `data-tv` on its wrapper, which is what scopes the TV
stylesheet.

### Viewport override

> **Superseded — see "Revision: the override was the bug" at the end of this document.**
> Testing on the actual TV showed the WebView honours a fixed width for layout and then
> declines to zoom out to fit it, which crops the display. `/tv` ships with plain
> `width=device-width`. The rest of this section records the reasoning that was tried.

`client/index.html` gets a pathname-gated inline script that rewrites the meta tag before
the SPA boots, so there is no first-paint reflow:

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script>
      if (location.pathname === '/tv' || location.pathname === '/tv/')
        document.querySelector('meta[name=viewport]').setAttribute('content', 'width=1280');
    </script>

`TvDisplay` applies the same override on mount and restores the original string on
unmount, which covers client-side navigation both onto and away from `/tv`.

**`width=1280` carries no `initial-scale`, deliberately.** When both are present Chromium
resolves the layout viewport to `max(width, deviceWidth / initial-scale)` and pins zoom to
1 — a 1280px layout viewport with only 960px of it on screen, i.e. a cropped display.
`width` alone lets the browser fit-to-width: zoom 0.75, layout viewport 1280x720,
1.5 device pixels per CSS pixel.

**1280, not 1920.** At 1920 on a 1080p panel the mapping is 1:1 and text is physically
unreadable from couch distance. 1280 gives a full desktop layout at roughly 1.5x.

1280x720 also clears both clauses of `MOBILE_QUERY` — 1280 > 820, 720 > 500 — with enough
headroom that browser chrome cannot push it back over the line.

### Overscan safe area

`SynagogueDisplay` gains one optional prop:

    safeArea = { x: 0, y: 0 }

    const fit = () => setScale(Math.min(
      (window.innerWidth  * (1 - 2 * safeArea.x)) / 1920,
      (window.innerHeight * (1 - 2 * safeArea.y)) / 1080,
    ));

The default is a mathematical no-op, so `/` is byte-identical to today. `/tv` passes
`{ x: 0.04, y: 0.03 }`.

Two alternatives were rejected. A padded wrapper fails because the component measures
`window`, not its container: it would keep the full-window scale and crop the canvas
rather than shrink it. A `transform: scale()` on a wrapper fails because 4% horizontal
against 3% vertical is a non-uniform scale, which distorts the text.

At 1280x720 this resolves to scale 0.613 and a 1177x662 canvas: about 51px clear on each
side and 29px top and bottom. The binding axis wins, so both margins meet or exceed the
requested minimum.

### D-pad focus

Focus state is the cursor on a TV. A scoped block in `index.css`, reachable only beneath
the TV wrapper:

    [data-tv] :is(a, button, [role="button"], input, select, textarea):focus-visible {
      outline: 3px solid #e9cf94;
      outline-offset: 4px;
      border-radius: 999px;
    }

Paired with Enter/Space activation on TopBar's toggles. That change is additive — it adds
a keyboard path to an element that already had a pointer path, with no visual change on
any route.

Tab order needs no work. The two toggles are the only focusable elements on the wall
display, and their DOM order (חול, then שבת) already matches their visual order.

## Constraints and how they are met

- **Reuse existing page components, no forks.** `/tv` renders the same
  `SynagogueDisplay` instance the desktop route does, differing only by one prop.
- **No viewport change on any existing route.** The inline script is gated on
  `location.pathname`; `TvDisplay` restores the original meta content on unmount.
- **No currently-static route becomes dynamic.** This is a Vite SPA — one
  `index.html`, client-rendered, served by `express.static` with an SPA fallback
  (`server/src/app.js:47`). There is no static/dynamic distinction to change, and the
  design adds no server-side templating: `server/src/app.js` and `vite.config.js` are
  untouched, and `/tv` is served by the same fallback as `/zmanim`.
- **TV styling scoped to `/tv`.** Every TV rule sits under the `[data-tv]` attribute,
  which only `TvDisplay` sets.

## Files

| File | Change |
|---|---|
| `client/index.html` | pathname-gated viewport script |
| `client/src/App.jsx` | `/tv` route |
| `client/src/pages/TvDisplay.jsx` | new |
| `client/src/pages/SynagogueDisplay.jsx` | optional `safeArea` prop, default no-op |
| `client/src/components/display/TopBar.jsx` | Enter/Space activation |
| `client/src/index.css` | `[data-tv]` focus block |

## Verification

A caveat that determines whether the checks mean anything: **desktop browsers ignore the
viewport meta tag.** In a plain resized window `/tv` renders identically to `/` and the
test passes for the wrong reason. Every viewport check below requires the Chrome DevTools
device toolbar (device emulation) to be on, which honors the meta tag.

1. `/` at 960x540 emulated — phone layout, unchanged from today.
2. `/tv` at 960x540 emulated — wall layout; `window.innerWidth` reports 1280 and
   `innerHeight` 720.
3. `/tv` at 960x540 emulated — canvas inset roughly 4% horizontally and 3% vertically,
   nothing touching the panel edge.
4. Tab through `/tv` with the keyboard only — a gold ring is visible at every stop;
   Enter and Space both toggle חול/שבת.
5. Navigate `/tv` -> `/` in-app — the viewport meta reads `width=device-width` again.
6. `/`, `/zmanim`, `/adminGabbai` at desktop and phone sizes — unchanged.
7. `git diff` confirms no change to `server/`, `vite.config.js`, or `useIsMobile.js`.

## Revision: the override was the bug

On the actual TV the wall layout arrived cropped — roughly a quarter of it hanging off the
right and bottom edges, the `זמני תפילות` panel sliced and the ticker gone entirely.

Measured against known canvas geometry the rendered canvas scale was about 0.87 rather
than the 0.61 the formula produces at 1280x720, and the canvas centre sat right of and
below the centre of the screen: it had been fitted to something larger than the visible
area and then centred in it.

Reproduced by pinning Chromium's page scale factor to 1 while leaving the meta tag in
place, which is what an Android WebView does with `useWideViewPort` set and
`loadWithOverviewMode` not set — the width is honoured for layout, the fit-to-width zoom
never happens:

| route | meta | layout vp | visual vp | canvas | overflow |
|---|---|---|---|---|---|
| `/tv` | `width=1280` | 1280x720 | 960x540 | 1178x662 | right 269, bottom 151 |
| `/` | `width=device-width` | 960x540 | 960x540 | 960x540 | none |

The root cause is the override itself. `SynagogueDisplay` fits its canvas to
`window.innerWidth/innerHeight`, which report the *layout* viewport, so it correctly filled
1280x720 while the panel could only ever show 960x540 of it. A fixed width can only crop
here; nothing downstream can compensate, because the layout viewport is the only size the
page can see.

It also turns out the override was never load-bearing:

- **It was not what produced the wall layout.** `TvDisplay` renders `SynagogueDisplay`
  directly and never consults `useIsMobile`, so the route forces the wall layout by
  construction. That was already true.
- **It did not make anything physically bigger,** which was its entire justification. The
  canvas fills the panel either way, so a 100px canvas glyph lands at 100 device pixels
  under both: `0.5 x 100 x dpr 2` at device-width, `0.667 x 100 x 1.5` at width 1280.

So `/tv` keeps `width=device-width` like every other route, and `client/index.html` is back
to a single unconditional meta tag. Everything else in this design stands: the route, the
safe area, the scoped focus ring and the TopBar key activation are unchanged.

The lesson for anyone tempted to re-add a fixed width: on a TV, a viewport wider than the
panel is not a zoom instruction, it is a promise the browser may decline to keep.

### Verification, revised

19 checks, all passing, in Edge/Chromium with `isMobile: true`:

- `/tv` fits inside the visible area with the zoom disabled at 960x540, 960x492 and
  1280x720 — the case that was broken.
- Safe-area margins hold at 4.0% and 4.0% of the panel.
- `/tv` renders the wall layout at 960x492, 820x460 and even 390x844.
- `/` still answers wall at 960x540 and 1920x1080, phone at 960x492 and 390x844.
- `/`, `/tv`, `/zmanim` and `/adminGabbai` all report `width=device-width`.
- Both toggles ring gold at 3px; Enter and Space each activate them; `/` never picks up
  the TV ring.
