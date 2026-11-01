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
Press Play to enable audio. One orbit = four beats, sixteen steps. Eight available orbits, five enabled initially. Expand a track and toggle “Enable orbit” to add or remove it; points are preserved while disabled. Orbit spacing and drawing zones adapt to enabled tracks.
Draw on Flow: vertical position selects the instrument, horizontal position the beat; drawing toggles each touched beat once per gesture; quick motion also toggles an adjacent beat, turns change the pentatonic marimba pitch. The trail fades; the pattern remains.
Click orbit points or expand an instrument for keyboard-accessible step controls, mute and volume.
Focus exits via its button or Escape. Playback pauses on hidden tabs. Reduced-motion preference suppresses waves and wedge trails.
DE, EN, ES, FR, eight shared palettes, four visual styles, light/dark/automatic, optional appearance persistence. Drawings and patterns are session-only.

## Prototype scope
Fourteen synthesized instruments selectable per orbit (expand an instrument row): Kick, Snare, Hi-Hat, Bass, Marimba, Clap, Tom, Rimshot, Shaker, Glockenspiel, Kalimba, Pluck synth, Synth bass and Soft pad. Switching preserves beat points; melodic instruments share a C-minor pentatonic scale. Instrument choices are session-only; no recording/export yet. Web Audio lookahead scheduling. Shared JackTools appearance. Canonicals, language alternates, robots and sitemap target sound.jacktools.net.

## Random evolution
The evolution icon starts playback if stopped. Every 2–8 revolutions (4/4 bars), it toggles 1–3 points on enabled, unmuted tracks at the next scheduled bar boundary. Kick quarter-note anchors are protected; changes avoid emptying or completely filling tracks. No tempo, instrument, pitch or volume changes. Drawing remains available. Toggle evolution off to retain the current loop; pausing or hiding the tab also disables evolution. It never starts automatically after reload.

Focus view requests a screen wake lock (HTTPS/localhost and browser support required), releases it on exit or page hide, and requests it again on returning to a visible focused page. Unsupported or rejected requests display a localized warning. Browser energy-saving rules and manual device locking remain outside the app's control.

The atmospheric canvas behind the playing surface uses the active orbit colours, scheduled note hits, track/master volume and current tempo for drifting light clouds and expanding waves. Muted/disabled tracks do not contribute; reduced motion disables drift, pulses and waves while retaining a static colour wash.
