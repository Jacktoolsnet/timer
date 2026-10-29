# Sticky tool headers

Timer, Clock, Stopwatch, Calculator, Breathe, Relax, Lava and SceneScript import
`shared/sticky-header.css` and `shared/sticky-header.ts` through their layouts.
Company retains its own combined navigation/header design.

Headers stay at the top with opaque, palette-aware backgrounds. A ResizeObserver
keeps anchor offsets and the mobile preferences panel aligned with the actual
header height. Existing focus/fullscreen/recording display rules are preserved;
headers are explicitly hidden for printing. SceneScript's sticky preview/library
receive an offset so they do not slide underneath the header.

Build all eight tools, then run with Node >=24.17.0:

```sh
node scripts/check-sticky-headers.mjs
```

The check starts temporary Python static servers for the local builds and uses
Company's installed Playwright Chromium. It checks desktop/mobile scrolling,
settings placement, focus visibility, SceneScript fullscreen/recording visibility
and print visibility, and reports uncaught browser errors. No deployment occurs.
