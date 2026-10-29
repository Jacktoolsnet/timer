# Jacktools Metronome

Static Astro tool for **https://metronome.jacktools.net**. Same layout, appearance preferences and hosting model as the existing Jacktools tools. No backend, external fonts, microphone access or remote audio assets.

## Development

Use Node **>=24.17.0** (the system Node may be older).

```sh
cd metronome
npm ci
npm run dev -- --port 4348
npm test
npm run test:e2e
npm run build
```

Browser tests use their own port 4347. Install Playwright Chromium if it is not already available (`npx playwright install chromium`).

## Version 1

- Orbit, pendulum, beat-strip and bouncing-ball views driven by the audio clock; system reduced-motion preference plus an explicit less-movement setting.
- Optional static backgrounds: the twelve local Clock motifs with thumbnail previews and theme-aware image softening (45–95%, default 70%). Available in normal and focus views; no background by default, no seasonal simulation or location access. Changes do not interrupt playback.
- 20–300 BPM, numeric input, slider, ±1 controls and median-filtered tap tempo.
- 1–12 beats per bar; each beat cycles accented → normal → silent.
- The beat strip highlights the current beat and subdivision; muted beats stay pale. The ball lands on numbered beat stations exactly on each beat, with a return hop at the bar boundary. Reduced motion replaces hopping with stationary beat-to-beat positions.
- Equal subdivisions: 1, 2, 3 or 4 per beat. Silent beats mute subdivisions too.
- Locally synthesized wood, digital and soft sounds, volume control and visual-only playback.
- Gap practice: 1–16 audible bars followed by 1–8 silent bars, optionally without visual timing cues.
- Full-viewport focus view with floating controls (side-by-side in short landscape layouts), keyboard shortcuts, DE/EN/ES/FR interfaces and usage guides, DE/EN legal/privacy pages.
- Settings are kept only for the current page unless browser storage is explicitly enabled in the shared settings menu. Disabling or clearing it deletes all tool-specific keys. Playback never resumes automatically after reload.

Focus view automatically requests a Screen Wake Lock, even while playback is stopped. Leaving focus or hiding/unloading the page releases it; returning to a visible focus view requests it again. Requires browser support and a secure context (HTTPS or localhost); system policies or battery-saving settings may reject or release it. A visible status reports availability. This is not a guarantee against manual locking or device sleep.

## Timing and lifecycle

Web Audio schedules clicks 100 ms ahead on a 25 ms scheduling loop. Visuals follow the same clock via requestAnimationFrame. Stop cancels scheduled audio nodes immediately. Rhythm edits restart at beat 1 of a new bar; view and reduced-motion changes do not interrupt playback. Space starts/stops; T taps; Escape exits focus. Native control keyboard behavior takes priority while controls have focus.

Changing tabs, locking the device, suspending audio or a prolonged scheduler stall stops playback rather than producing a burst of delayed clicks. Restart manually. Browser/device/audio-output latency can vary; physical-device listening checks (especially Safari/iOS and Bluetooth) remain advisable. If Web Audio is unavailable, the tool falls back to visual-only operation.

## Deployment

Run `npm ci && npm run build`, then upload the **complete contents of `dist/`** to the subdomain's document root on the existing 1blu Ubuntu/Plesk setup. No Node process is needed on the server. Configure DNS/HTTPS and serve `sitemap.xml` as `application/xml`; retain `robots.txt` and localized directory indexes. Check inherited operator/privacy details against the actual hosting configuration before publication.

The build does not deploy anything. No hosting or DNS changes have been performed.
