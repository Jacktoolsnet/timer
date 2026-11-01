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
Eighteen synthesized instruments selectable per orbit (expand an instrument row): Kick, Snare, Hi-Hat, Bass, Marimba, Clap, Tom, Rimshot, Shaker, Glockenspiel, Kalimba, Pluck synth, Synth bass, Piano, Strings, Guitar, Organ and Soft pad. Switching preserves beat points; melodic instruments share a C-minor pentatonic scale. Instrument choices are session-only; no recording/export yet. Web Audio lookahead scheduling. Shared JackTools appearance. Canonicals, language alternates, robots and sitemap target sound.jacktools.net.

## Random evolution
The evolution icon starts playback if stopped. Every 2–8 revolutions (4/4 bars), it toggles 1–3 points on enabled, unmuted tracks at the next scheduled bar boundary. Kick quarter-note anchors are protected; changes avoid emptying or completely filling tracks. No tempo, instrument, pitch or volume changes. Drawing remains available. Toggle evolution off to retain the current loop; pausing or hiding the tab also disables evolution. It never starts automatically after reload.

Focus view requests a screen wake lock (HTTPS/localhost and browser support required), releases it on exit or page hide, and requests it again on returning to a visible focused page. Unsupported or rejected requests display a localized warning. Browser energy-saving rules and manual device locking remain outside the app's control.

The atmospheric canvas behind the playing surface uses the active orbit colours, scheduled note hits, track/master volume and current tempo for drifting light clouds and expanding waves. Muted/disabled tracks do not contribute; reduced motion disables drift, pulses and waves while retaining a static colour wash.

## Music styles
Choose Electronic, House, Pop, Rock, Classical or Ambient above the instruments. A preset replaces the eight-track setup (including enabled states, instrument choices, levels and pattern), tempo, scale and melodic contour. While playing it is queued for the next 16-step bar boundary; a later selection replaces the queued one. Reset restores the selected preset. Random patterns and ongoing evolution use its rhythmic grid and density; Classical/Ambient evolution can shift melodic pitches within the selected scale. All instruments remain freely selectable.
Piano, strings, guitar and organ are additive synthesized approximations, not recorded acoustic instruments. No remote samples, downloads or additional dependencies.

Focus requests browser fullscreen on user activation, with a normal focus-view fallback if unsupported or denied. After three seconds without pointer, touch or keyboard activity, controls and drawing surface disappear and the orbit fills the centre of the viewport. Activity restores the normal focus layout; the first touch in idle view only wakes it. Held pointers do not trigger idle mode. Escape or leaving fullscreen exits focus. The screen wake lock remains requested throughout idle focus mode.

Orbit playback uses one continuous coloured comet per enabled orbit instead of a radial playhead. Comets brighten on audible note hits; muted or zero-volume tracks stay dim. Comets stop when playback pauses and are suppressed by the Orbit animation switch or reduced-motion preference.

Random patterns also assign phase offsets to non-kick tracks. Each evolution gently shifts one enabled, unmuted non-kick orbit by a sequencer subdivision (two for Ambient). The visual comet and audio scheduling use the same offset; this is not a visual-only effect. Tempo and loop length stay shared. Applying/resetting a style restores zero offsets.

Each instrument has manual volume with a percentage readout and an optional Random dynamics slide toggle (off by default). When enabled, each scheduled note gets a random velocity from 45% to 100% of the selected track volume. The master gain is never randomized. Note gain, orbit hit pulses, comet glow and atmospheric pulse energy share that velocity. Switches remain session-only and are independent of random pattern evolution.

Each non-kick track can play Forward, Reverse or Random. Reverse traverses the 16 steps backwards and reverses the comet and its trail together. Manual changes while playing are applied at a bar boundary. Random-mode tracks have a 40% reversal chance during each evolution; fixed modes never reverse automatically. Kick direction is locked forward. Resetting a preset restores forward playback.

The old centre dot is replaced by an independently switchable Centre animation. Its soft contour follows the direction and phase of each active, audible track; note hits, pitch and gain increase the local radial height and determine the dominant blended colours. The shape stays inside the innermost orbit. Reduced motion keeps it static; disabling it removes the centre artwork entirely.

Centre artwork now uses three compact icon tiles instead of a toggle: Pulse ring (default), Sound sun and Off. The segmented ring uses active track colours and pulses locally with note velocity and volume. Both centre variants honour reduced motion and are independent of the background and orbit animation switches.

All visual choices now live in a separate Animations panel below the playing surface, grouped into Orbit, Background and Centre cards. This panel is hidden in focus view. Orbit offers Comet trail, Light dot, Pulse halo and Off; direction, phase and audible-hit energy remain synchronized in all modes. Evolution may choose another enabled orbit variant but never re-enables Off.

Random Play now owns all musical variation without per-track opt-in: directions (including kick), note velocities, phase offsets, pitches, occasional instrument replacements within the chosen preset's palette, small tempo variations around that preset, and enabled visual variants. Manual direction/dynamics settings are shown as automatic while active and become available again when disabled. Master volume, disabled/muted tracks and visual Off choices stay protected. Instrument/tempo changes remain sparse and bar-aligned.

Each animation category now includes an explicit Random tile. It picks a variant immediately and continues changing every 2–8 bars in either normal playback or Random Play, independently of musical evolution. Random never picks Off; fixed selections and Off are protected even during Random Play. The Random tile remains highlighted while its resolved visual variant changes.

Random Play now evolves through 4–6-cycle musical journeys. One track crossfades between old/new synthesized instruments in gradual stages, interpolated over a bar with constant total blend gain. Pitch moves at most one scale step and tempo at most 2 BPM per cycle toward nearby targets. Only one point changes on a separate track; phase OR direction may change on at most one other track. Random-Play note velocity slews by at most 0.06 per hit rather than jumping freely. Manual instrument/style changes override an in-progress morph. The separate random-pattern button still deliberately makes an immediate new pattern.

Focus and Sport add two purpose presets (eight style tiles, four columns on desktop). Focus starts at 80 BPM with quiet pad/bass/pluck/shaker/kalimba, sparse patterns, 4–8-bar evolution spacing and 6–8-cycle timbre journeys. Sport starts at 136 BPM with a four-on-the-floor kick, snare, hat, synth bass, pluck and clap; its kick remains a forward rhythmic anchor and random instrument changes preserve percussion/melodic roles. Music-style backgrounds and explicit Random visual selections use appropriate gentle/energetic variants; fixed visual selections remain untouched.

Jazz & Blues (92 BPM) adds a minor blues scale, piano, walking-style bass, light hi-hat/snare and organ with 20% eighth-note swing. Coffeehouse (78 BPM) adds a gentler major-blues colour, piano/guitar/bass/shaker/organ and 12% swing, with slower journeys. The shared audio/visual subdivision clock accounts for long-short eighth pairs so note hits and orbit heads stay aligned while bar duration stays unchanged. Background selection remains independent.
