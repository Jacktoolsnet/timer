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
Press Play to enable audio. One orbit = four beats, sixteen steps. All eight orbits are enabled initially. Expand a track and toggle “Enable orbit” to add or remove it; points are preserved while disabled. Orbit spacing and drawing zones adapt to enabled tracks.
Draw on Flow: vertical position selects the instrument, horizontal position the beat; drawing toggles each touched beat once per gesture; quick motion also toggles an adjacent beat, turns change the pentatonic marimba pitch. The trail fades; the pattern remains.
Click orbit points or expand an instrument for keyboard-accessible step controls, mute and volume.
Focus exits via its button or Escape. Playback pauses on hidden tabs. Reduced-motion preference suppresses waves and wedge trails.
DE, EN, ES, FR, eight shared palettes, four visual styles, light/dark/automatic, optional appearance persistence. Drawn trails are session-only. Patterns and tool settings are saved locally only with the optional Remember settings choice.

## Prototype scope
Eighteen synthesized instruments selectable per orbit (expand an instrument row): Kick, Snare, Hi-Hat, Bass, Marimba, Clap, Tom, Rimshot, Shaker, Glockenspiel, Kalimba, Pluck synth, Synth bass, Piano, Strings, Guitar, Organ and Soft pad. Switching preserves beat points; melodic instruments share a C-minor pentatonic scale. Instrument choices follow the optional Remember settings choice; no recording/export yet. Web Audio lookahead scheduling. Shared JackTools appearance. Canonicals, language alternates, robots and sitemap target sound.jacktools.net.

## Random evolution
The evolution icon starts playback if stopped. Every 2–8 revolutions (4/4 bars), it toggles 1–3 points on enabled, unmuted tracks at the next scheduled bar boundary. Kick quarter-note anchors are protected; changes avoid emptying or completely filling tracks. No tempo, instrument, pitch or volume changes. Drawing remains available. Toggle evolution off to retain the current loop; pausing or hiding the tab also disables evolution. It never starts automatically after reload.

Focus view requests a screen wake lock (HTTPS/localhost and browser support required), releases it on exit or page hide, and requests it again on returning to a visible focused page. Unsupported or rejected requests display a localized warning. Browser energy-saving rules and manual device locking remain outside the app's control.

The atmospheric canvas behind the playing surface uses the active orbit colours, scheduled note hits, track/master volume and current tempo for drifting light clouds and expanding waves. Muted/disabled tracks do not contribute; reduced motion disables drift, pulses and waves while retaining a static colour wash.

## Music styles
Choose Electronic, House, Pop, Rock, Classical or Ambient above the instruments. A preset replaces the eight-track setup (including enabled states, instrument choices, levels and pattern), tempo, scale and melodic contour. While playing it is queued for the next 16-step bar boundary; a later selection replaces the queued one. Reset restores the selected preset. Random patterns and ongoing evolution use its rhythmic grid and density; Classical/Ambient evolution can shift melodic pitches within the selected scale. All instruments remain freely selectable.
Piano, strings, guitar and organ are additive synthesized approximations, not recorded acoustic instruments. No remote samples, downloads or additional dependencies.

Focus requests browser fullscreen on user activation, with a normal focus-view fallback if unsupported or denied. The Hide controls button hides controls and the drawing surface and the orbit fills the centre of the viewport. Activity restores the normal focus layout; the first touch in idle view only wakes it. Held pointers do not trigger idle mode. Escape or leaving fullscreen exits focus. The screen wake lock remains requested throughout idle focus mode.

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

Style-specific synthesized timbre profiles now shape brightness and transients. Jazz/Coffeehouse use a lower low-pass cutoff, softer attacks, stronger fundamental/triangle-body piano and guitar patches, and shorter/quieter metallic partials. Electronic/House/Sport retain brighter attacks. Glockenspiel remains intentionally bell-like; these are still synthesized approximations rather than recorded acoustic instruments. Per-voice filter routing is released when its final sound source ends.


Remember settings now persists versioned music/tool settings alongside appearance: style, tempo, master and track volumes, eight instrument/point configurations, direction modes, phases, random dynamics, current timbre blend and animation selections (including Random/Off). Restore validates local data and requires consent. It never starts playback, Random Play, fullscreen or focus automatically. Turning consent off or clearing local settings removes the record and cancels queued saves. Storage failures do not prevent playing. Drawn light trails are never saved.

Jazz harmony now shares a 12-bar I–IV–V frame across melodic voices, favouring sixth/ninth chord tones instead of freely combining the minor-blues tritone. Bass follows root/fifth/sixth walking figures, organ sustains the shared root and piano/guitar use chord-tone melodies. Swing stays unchanged; this deliberately favours a softer lounge-jazz sound over tense blue-note combinations.

All non-jazz presets now use a shared slow chord frame, role-aware bass/pad notes and repeating eight-note motifs rather than independently adding scale offsets. A motif changes by at most one degree at one position once per journey. Jazz retains its dedicated shared 12-bar frame. Motifs are included in optional local preferences; older saved records without motifs restore a preset-derived phrase. Styles retain their existing instruments, rhythm grids, swing and gain profiles.

Drawing now edits the repeating melodic motif directly: horizontal position selects the phrase slot and height within the selected orbit's band chooses a consonant low/high degree. Percussion gestures also shape the nearest enabled melodic orbit using overall drawing height. Point toggling remains once per gesture. Jazz, bass and sustained melodic instruments now honour phrase edits too. Gesture edits reset the global pitch offset for predictable height control and remain eligible for optional local saving.

## Generative song form
Random Play now creates an endless sequence of song forms: Intro → Verse → Chorus → Verse → Chorus → optional Bridge/Chorus → Outro. Verse/chorus lengths vary in 4-bar blocks; a new random form grows from the current music after the outro. Section-specific instrumentation levels make verses restrained, choruses full and bridges contrasting; the outro fades toward the next intro. Phrase and level changes blend over two bars without changing the user's master/track settings.
Chorus point/motif/pitch snapshots are recalled on each return; verse material evolves separately. Drawing or manually editing points in a refrain updates its memory, so the edited hook returns. Existing multi-cycle timbre journeys continue underneath. A localized section/bar readout is shown only while Random Play is active, and hides with the focus controls. Normal Play remains a loop. Song progression itself is not persisted or auto-started.

Random Play also adds a gentle melodic conversation when at least two unmuted,
audible melodic tracks are available (excluding bass and sustained harmony).
The first two trade emphasis over four bars; the answer retains its own live
motif and moves only its final degree towards the question. Drawing on either
track therefore remains effective; no extra notes are inserted into silent
patterns. Existing song transitions and remembered refrains remain intact.
Slow, phase-offset filter and attack variations gently evolve timbre during
Random Play without boosting volume. Normal playback keeps its fixed timbre.

Random Play chooses restrained arrangement variations every four bars: at most one
non-foundation track takes a softly faded one-bar breath, and another may play
one quiet neighbouring note near the phrase end. Bass and kick never take these
breaks; muted, disabled and cleared tracks are respected. These are playback-only
variations, not changes to stored patterns or chorus memories. Drawing or editing
a step protects its track for two bars so the intervention is heard immediately.

All playback now has restrained style-aware room reverb and a filtered dotted-eighth
echo, generated locally with a shared procedural convolution room. Slow, narrow
stereo motion keeps kick and bass centred. Effect returns pass through the master
gain and compressor, so stopping/master mute also silences tails. Voice sends
and panners are disconnected after their sources end. Random Play gradually opens
the filter over the two bars before a chorus and settles over its first two bars,
with a small dynamic breath rather than a volume boost. Drawn motifs are unchanged;
visual hit energy follows the same dynamics. No additional animation is forced on.

Six additional styles bring the total to sixteen: Hip-Hop/Rap (88 BPM, swung
backbeat and synth bass), Lo-Fi (74 BPM, softened piano and loose swing), Funk
(108 BPM, syncopated bass/guitar), Reggae/Dub (76 BPM, one-drop and offbeat chops
with stronger echo), Drum & Bass (168 BPM, broken drums and sparse pads), and
Latin/Bossa Nova (104 BPM, interlocking rim/shaker and warm guitar).
Each uses the same drawing, song and Random Play engines. Random instrument
morphs retain percussion/melody roles in these styles. Rap is instrumental,
not generated vocals. Ambient, Focus and Sport remain at the end of the list.

Acoustic voices now use local procedural models instead of plain triangle layers:
fractional-delay plucked strings for guitar/bass, decaying harmonic modes for
piano, marimba and kalimba, and bowed harmonics with a slow attack, release and
restrained vibrato for strings. Velocity selects softer/brighter excitation
layers. A bounded 40-buffer cache avoids repeatedly synthesizing the same note;
oscillator recurrences keep synthesis costs low. These remain synthesized sounds,
not recordings of real instruments. Percussion and electronic voices are unchanged.

The remaining twelve voice recipes were reviewed as well. Drums now have distinct
body/transient layers, a faster kick/tom pitch settling, a staggered filtered clap,
short metallic hi-hat components and softer shaker onset. Noise has a short attack
rather than jumping from silence; a shared noise buffer avoids per-hit allocations.
Synth bass and pluck retain their electronic character with quieter supporting
partials. Bells have shorter upper modes; organ and pad use sustain/release
envelopes rather than immediately fading like struck instruments. Above-Nyquist
modal partials are omitted. All eighteen instrument paths have browser smoke tests;
these checks validate rendering/runtime, not a substitute for listening.

Four additional synthesized instruments bring the selection to 22, with names in
all four languages: saxophone (reed-like harmonics, tapered breath and delayed
vibrato), harp (longer plucked-string resonance), double bass (damped low strings)
and electric piano (soft body and short tine partials). Jazz adds saxophone and
double bass; Coffeehouse uses electric piano/double bass, Lo-Fi and Hip-Hop use
electric piano, and Classical/Ambient add harp. Manual selection remains available
on every orbit. The double bass follows bass harmony, stays centred and is excluded
from melodic call/response and arrangement rests. Existing instrument IDs and saved
selections are unchanged. These are synthesized approximations, not sampled acoustic
recordings; saxophone notes do not yet use inter-note legato.

Wordless Solo Voice, Choir and Vocal Pad expand the selection to 25. A harmonic
glottal source is shaped by interpolated Ah/Oh/Uh formants, with tapered breath,
gentle delayed vibrato and soft release. Choir/pad use two slightly detuned layers.
Random Play slowly changes the vowel between notes; normal Play retains a fixed
vowel character. Melodies and drawing use the existing harmonic engine; choir/pad
act as sustained harmony and solo voice participates in call/response. Pop adds a
quiet solo voice, Classical a choir and Ambient a vocal pad. All three are selectable
on any orbit, translated and covered by existing optional settings persistence.
No text, speech service, voice cloning, recordings or remote downloads are used.

All style presets now enable eight tracks. Added supporting tracks start with one
quiet, style-aligned note each; primary preset rhythms are unchanged. Random Play
can develop these tracks without requiring manual activation. Restored settings
still retain every saved enabled/mute choice; playback does not re-enable tracks.
