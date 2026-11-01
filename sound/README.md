# JackTools Sound – prototype
Static Astro tool for https://sound.jacktools.net. No backend or API keys.

## Development
Node >=24.17 and npm >=9.6.5, as in metronome.
- npm ci
- npm run dev
- npm run build
- npm run preview
- npm test

Upload the contents of dist/ to the subdomain document root. No server process is needed. Not deployed automatically.

## Playing
Press Play to enable audio. One orbit = four beats, sixteen steps.
Draw on Flow: vertical position selects the instrument, horizontal position the beat; quick motion adds an adjacent beat, turns change the pentatonic marimba pitch. The trail fades; the pattern remains.
Click orbit points or expand an instrument for keyboard-accessible step controls, mute and volume.
Focus exits via its button or Escape. Playback pauses on hidden tabs. Reduced-motion preference suppresses waves and wedge trails.
DE, EN, ES, FR, eight shared palettes, four visual styles, light/dark/automatic, optional appearance persistence. Drawings and patterns are session-only.

## Prototype scope
Synthesized Kick, Snare, Hi-Hat, Bass and Marimba; no recording/export yet. Web Audio lookahead scheduling. Shared JackTools appearance. Canonicals, language alternates, robots and sitemap target sound.jacktools.net.
