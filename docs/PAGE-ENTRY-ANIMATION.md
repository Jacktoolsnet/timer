# Page entrance animation

Company and all ten tools (including SceneScript) import shared/page-entry.css
through their shared layouts. Homepages, tool variants, legal documents and
layout-based error pages use the same effect. NullTopic already has its own
reference implementation and is unchanged.

The main content fades in over 0.6 seconds. The footer follows after 0.6 seconds,
fading in over 0.35 seconds. Only opacity is animated: no transforms, position
changes or layout shifts, and no per-frame JavaScript. The header stays stable.
There is no permanent opacity:0 rule, so content never waits for JavaScript.

Reduced motion, forced colours and printing receive no entrance animation.
Focus/fullscreen/recording mode uses zero duration/delay with the same animation
name so that returning from focus does not restart the entrance timeline.

Build all eleven projects, then run from timer:
npm run test:e2e -- --config playwright.page-entry.config.ts
Tests serve builds on ports 4390–4400, block external traffic, and cover
desktop/mobile, legal pages, motion preferences and no-JavaScript readability.
