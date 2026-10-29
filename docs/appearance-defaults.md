# Default appearance

Company, Timer, Clock, Stopwatch, Calculator, Breathe, Relax, Lava, SceneScript and
the MessageDrop public website default to **green / technical / dark / 100%**.
The initial HTML includes these settings, so they also work without JavaScript
and there is no initial light-theme flash. Palette/style radios and theme buttons
agree with these defaults before the client scripts run.

Explicitly saved appearance settings still take precedence when storage consent
is present, including a saved `dark: false`. Invalid or absent settings fall back
to the defaults; changing appearance does not opt the user into persistence.
Timer/Clock legacy appearance settings retain their existing consent rules.
Print views and the fixed social preview artwork remain unchanged.

Build all ten sites, then run with Node >=24.17.0 and Company's Playwright Chromium:

```sh
node scripts/check-appearance-defaults.mjs
```

This checks static HTML plus fresh desktop/mobile visits, initial controls,
no implicit storage writes, persisted light/blue/soft overrides and the default
when a stored appearance has no consent. MessageDrop is expected in the sibling
repository at `../messagedrop/platform/messagedrop`.
