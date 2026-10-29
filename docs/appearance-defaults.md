# Default appearance and automatic system theme

Company, Timer, Clock, Stopwatch, Calculator, Breathe, Relax, Lava, SceneScript and
the MessageDrop public website default to **green / technical / Auto / 100%**.
Auto follows `prefers-color-scheme` and listens for OS changes while the page is
open, including scheduled changes made by the operating system. Explicit Light
and Dark choices ignore subsequent OS changes.

`shared/ThemeInit.astro` resolves the preference synchronously in the head, before
content paints. `shared/theme.ts` synchronizes buttons and notifies existing tool
listeners with the resolved boolean `theme-change` event. `shared/theme.css`
styles the three choices and provides a CSS-only system fallback without JS.
MessageDrop keeps equivalent local copies so its repository deploys independently.

Optional appearance storage now includes `themeMode: 'auto' | 'light' | 'dark'`.
The resolved `dark` boolean is retained for compatibility, but a valid themeMode
always takes precedence. Old saved booleans migrate to explicit Light/Dark, so
existing manual preferences are respected. Older Timer/Clock settings retain
their consent/remember checks. Without storage opt-in, choices last only on the
current page; automatic system changes never write to storage themselves.

Build all ten sites, then run with Node >=24.17.0 and Company's Playwright Chromium:

```sh
node scripts/check-appearance-defaults.mjs
```

The check covers static HTML, desktop/mobile visits, OS changes, saved Auto,
manual overrides, legacy migration, consent gating and the no-JavaScript CSS
fallback. MessageDrop is expected at `../messagedrop/platform/messagedrop`.
Print views and fixed social-preview artwork remain unchanged.
