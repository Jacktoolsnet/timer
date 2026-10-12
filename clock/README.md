# jacktools.net Clock

Static Astro clock, no backend. Analog, digital and combined views, four languages,
IANA time zones, theme/style/font settings, optional local persistence, fullscreen
and Screen Wake Lock. Time is taken from the device, not an external time server.

```bash
export NVM_DIR="$HOME/.config/nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.17.0
npm ci
npm run dev -- --port 4322
```

Open http://localhost:4322. Build with `npm run build`; deploy only contents of dist/
to clock.jacktools.net. Use HTTPS for Wake Lock. Keep the test deployment password
protected until clock-specific hosting/privacy details are complete.

Clock settings include twelve local SVG backgrounds for normal and focus view; remembering
the selected motif follows the existing storage consent. Run background picker
regression tests with `npm run test:e2e` (requires Playwright Chromium installed).

The additional "Year simulation" background is a local, dynamic SVG landscape.
It follows the selected time zone and a north/south hemisphere setting, with
blended seasonal colors, foliage, snow, flowers, stars and moving sun/moon.
Without location, daily phases use fixed local times: morning 05–08, day 08–17, evening 17–20,
otherwise night. The illustrative sun is above the horizon 06–18; these are not
astronomical rise/set times or a calculated moon phase. The optional location switch explicitly requests a single browser position (HTTPS).
Coordinates and location mode are memory-only, never persisted, and cleared on
switch-off, background change, preference clearing or reload. SunCalc v2 is
bundled locally to calculate apparent sun/moon positions in degrees; no remote
lookup is made. Clock display keeps the selected zone. Location mode derives
hemisphere from latitude and uses solar altitude for twilight, including polar
day/night. The fixed crescent is decorative, not a moon-phase calculation.
Reduced-motion mode holds celestial positions steady within each hour.

The one-shot browser alarm uses the selected IANA time zone, Web Audio tones,
optional Vibration API, a three-second test and five-minute elapsed-time snooze.
It requires an open page and must not be relied upon for critical wakeups.
Audio/vibration stop after two minutes; triggers over five minutes late are
reported as missed. DST gaps are skipped and folds use the next future instant.
Only time, volume and vibration preference persist with storage consent under
`jacktools.clock.alarm.v1`; activation/due times/snooze are memory-only.
