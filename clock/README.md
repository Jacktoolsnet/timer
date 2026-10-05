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
