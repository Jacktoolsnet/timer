# Jacktools Stopwatch

Static Astro + TypeScript stopwatch for https://stopwatch.jacktools.net.
Four interface languages: German, English, Spanish, French. Legal pages follow
Clock's German original / English translation convention (explicit EN links).

## Local development

```bash
export NVM_DIR="$HOME/.config/nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.17.0
npm ci
npm run dev -- --port 4323
```

Open http://localhost:4323/de/. `npm run build` checks types and builds `dist/`.
No deployment has been performed. Deploy only `dist/` to the configured host.
HTTPS is required for Screen Wake Lock; support depends on browser/device.

Start, pause/resume, laps (individual and cumulative), confirmed reset while
paused, focus/fullscreen and optional keep-awake while running. Timing uses
wall-clock timestamps, not update counts; device clock changes can affect it.
Measurements and laps are never persisted and are lost on navigation/reload.
Appearance and wake preference are stored only with explicit storage consent.
No backend, advertising, analytics, external fonts or external time service.
Hosting/statistics/logging statements are copied from Clock unchanged.

Tests: `node --experimental-strip-types --test tests/engine.test.ts` and
`npx playwright test` (requires installed Chromium).
