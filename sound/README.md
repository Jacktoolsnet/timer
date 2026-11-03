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
Press Play to enable audio. One orbit = one bar: four beats / sixteen sixteenth-note positions, or three beats / twelve positions for Waltz. All eight orbits are enabled initially. Expand a track and toggle “Enable orbit” to add or remove it; points are preserved while disabled. Orbit spacing and drawing zones adapt to enabled tracks.
Draw on Flow: vertical position selects the instrument, horizontal position the beat; drawing toggles each touched beat once per gesture; quick motion also toggles an adjacent beat, turns change the pentatonic marimba pitch. The trail fades; the pattern remains.
Click orbit points or expand an instrument for keyboard-accessible step controls, mute and volume.
Focus exits via its button or Escape. Playback pauses on hidden tabs. Reduced-motion preference suppresses waves and wedge trails.
DE, EN, ES, FR, eight shared palettes, four visual styles, light/dark/automatic, optional appearance persistence. Drawn trails are session-only. Patterns and tool settings are saved locally only with the optional Remember settings choice.

## Prototype scope
Eighteen synthesized instruments selectable per orbit (expand an instrument row): Kick, Snare, Hi-Hat, Bass, Marimba, Clap, Tom, Rimshot, Shaker, Glockenspiel, Kalimba, Pluck synth, Synth bass, Piano, Strings, Guitar, Organ and Soft pad. Switching preserves beat points; melodic instruments share a C-minor pentatonic scale. Instrument choices follow the optional Remember settings choice; JSON project export/import and native MP4 recording are available from the header file dialog. Web Audio lookahead scheduling. Shared JackTools appearance. Canonicals, language alternates, robots and sitemap target sound.jacktools.net.

## Random evolution
The evolution icon starts playback if stopped. Every 2–8 revolutions (4/4 bars), it toggles 1–3 points on enabled, unmuted tracks at the next scheduled bar boundary. Kick quarter-note anchors are protected; changes avoid emptying or completely filling tracks. No tempo, instrument, pitch or volume changes. Drawing remains available. Toggle evolution off to retain the current loop; pausing or hiding the tab also disables evolution. It never starts automatically after reload.

Focus view requests a screen wake lock (HTTPS/localhost and browser support required), releases it on exit or page hide, and requests it again on returning to a visible focused page. Unsupported or rejected requests display a localized warning. Browser energy-saving rules and manual device locking remain outside the app's control.

The atmospheric canvas behind the playing surface uses the active orbit colours, scheduled note hits, track/master volume and current tempo for drifting light clouds and expanding waves. Muted/disabled tracks do not contribute; reduced motion disables drift, pulses and waves while retaining a static colour wash.

## Music styles
Choose Electronic, House, Pop, Rock, Classical or Ambient above the instruments. A preset replaces the eight-track setup (including enabled states, instrument choices, levels and pattern), tempo, scale and melodic contour. While playing it is queued for the next bar boundary; a later selection replaces the queued one. Reset restores the selected preset. Random patterns and ongoing evolution use its rhythmic grid and density; Classical/Ambient evolution can shift melodic pitches within the selected scale. All instruments remain freely selectable.
Piano, strings, guitar and organ are additive synthesized approximations, not recorded acoustic instruments. No remote samples, downloads or additional dependencies.

Focus requests browser fullscreen on user activation, with a normal focus-view fallback if unsupported or denied. The Hide controls button hides controls and the drawing surface and the orbit fills the centre of the viewport. Activity restores the normal focus layout; the first touch in idle view only wakes it. Held pointers do not trigger idle mode. Escape or leaving fullscreen exits focus. The screen wake lock remains requested throughout idle focus mode.

Orbit playback uses one continuous coloured comet per enabled orbit instead of a radial playhead. Comets brighten on audible note hits; muted or zero-volume tracks stay dim. Comets stop when playback pauses and are suppressed by the Orbit animation switch or reduced-motion preference.

Random patterns also assign phase offsets to non-kick tracks. Each evolution gently shifts one enabled, unmuted non-kick orbit by a sequencer subdivision (two for Ambient). The visual comet and audio scheduling use the same offset; this is not a visual-only effect. Tempo and loop length stay shared. Applying/resetting a style restores zero offsets.

Each instrument has manual volume with a percentage readout and an optional Random dynamics slide toggle (off by default). When enabled, each scheduled note gets a random velocity from 45% to 100% of the selected track volume. The master gain is never randomized. Note gain, orbit hit pulses, comet glow and atmospheric pulse energy share that velocity. Switches remain session-only and are independent of random pattern evolution.

Each non-kick track can play Forward, Reverse or Random. Reverse traverses the active 12 or 16 steps backwards and reverses the comet and its trail together. Manual changes while playing are applied at a bar boundary. Random-mode tracks have a 40% reversal chance during each evolution; fixed modes never reverse automatically. Kick direction is locked forward. Resetting a preset restores forward playback.

The old centre dot is replaced by an independently switchable Centre animation. Its soft contour follows the direction and phase of each active, audible track; note hits, pitch and gain increase the local radial height and determine the dominant blended colours. The shape stays inside the innermost orbit. Reduced motion keeps it static; disabling it removes the centre artwork entirely.

Centre artwork now uses three compact icon tiles instead of a toggle: Pulse ring (default), Sound sun and Off. The segmented ring uses active track colours and pulses locally with note velocity and volume. Both centre variants honour reduced motion and are independent of the background and orbit animation switches.

All visual choices now live in a separate Animations panel below the playing surface, grouped into Orbit, Background and Centre cards. This panel is hidden in focus view. Orbit offers Comet trail, Light dot, Pulse halo and Off; direction, phase and audible-hit energy remain synchronized in all modes. Evolution may choose another enabled orbit variant but never re-enables Off.

Random Play now owns all musical variation without per-track opt-in: directions (including kick), note velocities, phase offsets, pitches, occasional instrument replacements within the chosen preset's palette, small tempo variations around that preset, and enabled visual variants. Manual direction/dynamics settings are shown as automatic while active and become available again when disabled. Master volume, disabled/muted tracks and visual Off choices stay protected. Instrument/tempo changes remain sparse and bar-aligned.

Each animation category now includes an explicit Random tile. It picks a variant immediately and continues changing every 2–8 bars in either normal playback or Random Play, independently of musical evolution. Random never picks Off; fixed selections and Off are protected even during Random Play. The Random tile remains highlighted while its resolved visual variant changes.

Random Play now evolves through 4–6-cycle musical journeys. One track crossfades between old/new synthesized instruments in gradual stages, interpolated over a bar with constant total blend gain. Pitch moves at most one scale step and tempo at most 2 BPM per cycle toward nearby targets. Only one point changes on a separate track; phase OR direction may change on at most one other track. Random-Play note velocity slews by at most 0.06 per hit rather than jumping freely. Manual instrument/style changes override an in-progress morph. The separate random-pattern button still deliberately makes an immediate new pattern.

Focus and Sport add two purpose presets (eight style tiles, four columns on desktop). Focus starts at 76 BPM with a connected piano motif, restrained strings/electric piano/harp and quiet pad/vocal textures. A light quarter-note kick, offbeat shaker and sparse bass provide a stable pulse. Random Play keeps the lead grid and pulse intact, leaves the melody present during mix/section changes, and gently targets 68–84 BPM; drawing and manual edits still shape the music. Evolution retains 4–8-bar spacing and 6–8-cycle timbre journeys. Sport starts at 136 BPM with a four-on-the-floor kick, snare, hat, synth bass, pluck and clap; its kick remains a forward rhythmic anchor and random instrument changes preserve percussion/melodic roles. Music-style backgrounds and explicit Random visual selections use appropriate gentle/energetic variants; fixed visual selections remain untouched.

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

Long-form Random Play development now operates above the short evolution cycles.
Every eight bars, a different audible melodic orbit can take the lead, crossfading
its prominence over two bars. With enough melodic voices, one accompaniment takes
a four-bar rest with soft edges; rests dissolve smoothly into a chorus. Another
accompaniment (including bass or sustained voices) can thin its rhythm and answer
with a related one-note motif variation on alternating phrases. All variations are
playback-only; they never replace saved patterns or chorus memories. A 36-bar
register arc rises and falls one shared-chord step every four bars, up to an octave,
rather than applying arbitrary chromatic shifts. Bass, percussion and sustained
harmony retain their register. Drawn tracks bypass these layers for two bars;
disabled, muted and empty tracks stay protected. Normal Play remains a fixed loop.

The global Pitch slider shifts melodic instruments from -12 to +12 semitones.
Percussion is unchanged. The offset applies on top of the generated melody/register
arc, remains under manual control across style changes and Random Play, and is
saved only with storage consent. Legacy settings without the field default to zero.

Strings now have a slower bow onset, softer upper harmonics, restrained delayed
vibrato and a smooth 650 ms release. Neighbouring notes share a bow with a 100 ms
pitch glide rather than reattacking/stacking a full sample on every hit. Bow refreshes
crossfade over 220 ms; long gaps and large pitch jumps start a fresh bow. Continuations
are bounded in time/rate to avoid extending an exhausted buffer. Stop clears active
bow states and fades their sources, so replay starts cleanly. Plucked strings,
percussion and other voices retain their separate articulation.

Wordless vocals now retain at least a 3 kHz filter cutoff so vowel formants are not
lost in warm style filters. Solo voice has a short mouth-opening articulation,
delayed vibrato and a clearer mix; Pop's solo track starts at 45% instead of 25%.
Generated vocal fundamentals are octave-folded into 110–440 Hz before the manual
pitch offset. Every style's Random Play palette now includes compatible vocal
colours (solo, choir or pad), not just the instruments in its starting pattern.
For a deliberate listening comparison, use the Pop starting pattern: track 7 is
Solo Voice. These are wordless synthesized vowels, not realistic recorded singing.

Every style now starts with a compatible wordless vocal on one of its eight tracks,
not just a vocal option in the evolution pool. Existing main instrumental parts
remain in place. Dance/groove styles use shorter, tighter solo phrases; Jazz,
Coffeehouse and Lo-Fi use softer, breathier articulation; Classical uses choir,
Ambient/Focus/Drum & Bass use vocal pads. Vocal buffer cache keys include style so
articulation cannot leak across presets. Saved custom tracks still take precedence;
load/reset a starting pattern to hear its updated vocal arrangement.

Wordless voices and bowed strings now use live sustained oscillator voices rather
than restarting a short audio buffer for every point. Held envelopes bridge nearby
notes, with gentle 100 ms pitch glides and vowel transitions independent of pitch;
a phrase can extend without replaying its onset. Swing-aware gates preserve nearby
long eighths but leave real gaps silent. Choir and Vocal Pad share this articulation.
Random Play gives solo voice two-bar phrases/two-bar breaths (three bars/one in a
chorus), and strings a bow rest once per eight bars; newly drawn tracks bypass these
rests for two bars. Normal Play follows the user's points without automatic phrase
rests. Mute, disable, clear, instrument/style changes and Stop release held sources.

Random Play mixing is now more pronounced: leads (including bowed strings) trade
prominence over four bars; raw melodic accompaniment levels run around 32–44% of
the lead before common level compensation, pads sit further back, and percussion/bass have slower role-appropriate
level variation. A fresh drawing gesture briefly takes priority and ducks competing
parts, then hands the mix back over its last protected bar. Every live voice has
a performance fader ahead of dry and effect sends, updated smoothly by the scheduler,
so even long held vocals/strings change level without retriggering. Visual hit energy
uses the same mix levels. User volume settings are never overwritten. A shared feed-forward mix balance compensates the combined performance/section attenuation, preserving relative fader roles without a Random Play loudness penalty. Normal Play uses the same balancing path (unity for an unmodified mix). Disabled/muted/empty tracks stay protected.

The articulation audit now covers every instrument family explicitly. Saxophone
uses a live reed-like source with broad body resonance, quiet filtered breath,
delayed vibrato, 65 ms legato transitions and automatic breathing space in Random
Play. Organ holds a drawbar-like harmonic mixture without vibrato or audible
portamento; Soft Pad uses slow, detuned sustained layers. These voices share
swing-aware gates, smooth live faders and reliable releases on Stop/mute/clear.
Piano has register-dependent harmonic decay; electric piano keeps a longer soft
body and shorter tine partials; marimba's high modes die quickly for a woodier
strike, while kalimba's tines ring longer. Plucked guitar/bass/harp retain their
separate string models; percussion, bells and electronic plucks retain distinct
transients rather than being made universally legato.

### Meter & groove

Music style includes Style default, Discofox, Waltz and Cha-cha-cha tiles. Style default keeps the selected genre’s pattern, swing and accents. Discofox and Cha-cha-cha use distinct 4/4 rhythm templates; Waltz uses true 3/4 (12 sixteenth steps, one orbit per bar). Drawing, direction, phrase holds, song sections, evolution intervals and animation angles follow the active meter. Changes during playback wait for a bar boundary and rebuild the rhythm. Random evolution protects active rhythmic anchors and keeps foundation tracks aligned; drawing can still toggle anchors. Explicit groove choices survive style changes and are stored with optional local preferences. Track storage retains 16 positions for backward compatibility; inactive positions are hidden in 3/4.

### Slow Waltz style

Slow Waltz defaults to 86 BPM and a native 3/4 meter with Style default selected. Its eight acoustic-leaning tracks combine double bass on beat one, piano/guitar on beats two and three, connected strings, harp and a restrained choir. Major harmonies move every four bars. Random journeys take 6–8 evolution cycles, with small pitch steps and a 78–96 BPM tempo target; evolution happens every 4–8 bars. Explicit dance-groove overrides remain user-controlled. The style, groove and drawings use the existing optional local settings storage.

### Dances

The separate Dances tile contains the five Standard dances, five Latin dances and Discofox. These are synthesized **ballroom interpretations**, not authentic recordings or exhaustive representations of regional traditions. Each dance defines eight instrument parts, characteristic onset patterns, accents, swing, meter and a fixed starting tempo. Quarter-note BPM is used throughout (not bars/minute): Slow Waltz 86, Tango 128 (4/4 notation), Viennese Waltz 180, Slowfox 116, Quickstep 200, Samba 100 (2/4), Cha-cha-cha 124, Rumba 100, Paso Doble 120 (2/4), Jive 168, Discofox 120. The shared tempo slider now reaches 220 BPM; manual changes remain possible.

Selecting a dance applies its whole setup at the next bar and locks the free groove controls while active. Selecting a music style or Free music leaves dance mode. Reset retains the selected dance. Optional settings store the dance without autoplay, including 200 BPM Quickstep. Existing settings remain compatible.

Dance Random Play keeps the user's tempo and the first four foundational tracks stable: no automatic instrument morphs, phase/direction changes, pattern mutation, phrase rests or section fades on those tracks. Melody/accompaniment variations and song structures remain generative, using 4/8/16-bar sections instead of 12-bar sections. Drawing over a foundation track edits a nearby melodic accompaniment instead, preserving the dance pulse. Explicit instrument/point editing, clear, enable, mute and track-volume controls remain available for intentional overrides.

#### Dance sources

- [WDSF Standard, Latin and 10Dance](https://www.worlddancesport.org/Standard-Latin-10Dance) — group membership.
- [WDC Competition Rules, June 2024](https://www.wdcdance.com/wp-content/uploads/2024/06/WDC-Competition-Rules-June-2024-1.pdf), [UConn Ballroom music guide](https://www.uconnballroom.com/members/ballroom-playlists) — tempo references, converted to quarter-note BPM; presets are practice suggestions, not competition certification.
- [STSV Standard dances](https://www.dancesport.ch/en/standardtaenze/), [STSV Latin dances](https://www.dancesport.ch/en/lateintaenze/), [ISTD Modern Ballroom](https://www.istd.org/dance/dance-genres/modern-ballroom/), [Stanford: English ballroom style](https://socialdance.stanford.edu/syllabi/English_ballroom_style.htm) — ballroom context and historical influences. The cultural captions deliberately distinguish ballroom adaptations from their broader roots.

### Articulated waltz pulse

Waltz bass-on-one and sparse piano/guitar/harp accompaniment on beats two and three use an explicit **bass–chord–chord** articulation. The downbeat adds a quiet octave for small-speaker audibility; the two chord strokes use close-position root/third/fifth voicings rather than unrelated lead-motif notes. Short tempo-relative buffers leave genuine gaps between beats, with reduced hall and no echo on these strokes. Strings and melody lines retain their sustained/expressive behavior. The first four slow/Viennese waltz preset tracks now reinforce this pulse; Random Play keeps sparse waltz pulse tracks present instead of morphing, resting or fading them away. Free-mode drawing, manual volumes, mute and transposition remain user-controlled. Saved custom track patterns are not overwritten; Reset loads the revised preset arrangement.

### Tango and Viennese attack clarity

Tango now separates a regular quarter-note marcato bass from a dotted 3–1–2–2 eighth-note chord figure (onsets 0/6/8/12 in four-quarter notation). Bass alternates root/fifth; piano and guitar use short minor-chord strokes with a particularly short pickup. Echo is disabled on these pulse voices, and sustained backing is quieter. This is a ballroom-oriented synthesis choice, not a claim that all tango traditions share one pattern. Background on the habanera/milonga influence: [Library of Congress, Tango](https://blogs.loc.gov/nls-music-notes/2022/09/celebrating-national-hispanic-heritage-month-in-2022-with-tango/).

Viennese Waltz has a separate crisper pulse envelope than Slow Waltz, stronger bass/chord preset levels and quieter sustained backing. Both Tango and Viennese Waltz gently attenuate non-foundation tracks during rhythmic attacks, in normal and random playback, without increasing master volume or overriding manual mute/volume settings. Transpose remains active. Reset or reselect the dance to load its revised onset pattern and instrument levels; saved custom patterns are intentionally preserved.

### Distinct rhythm articulation for the other eight dances

The first four protected tracks carry each dance's signature, with true acoustic triads, tempo-relative note gates, role-specific accents, reduced reverb and no pulse echo. Lead instruments keep their expressive/sustained behavior. Background attenuation briefly makes room for rhythmic attacks without changing user volume settings.

- **Slowfox:** flowing walking bass, soft backbeat and longer guitar chord strokes; moderate swing.
- **Quickstep:** brisk walking bass, short chord strokes and short snare tails; lighter swing than Jive.
- **Ballroom Samba:** duple pulse, short bass pickups on the last sixteenth before each beat, stronger second-beat kick and differentiated shaker accents.
- **Cha-cha-cha:** piano in the foundation makes 4-&-1 explicit across the bar line, with anticipatory bass and dry percussion.
- **International-style Rumba:** guitar chords on 2, 3 and 4; the fourth stroke holds across 1, with quieter percussion instead of a new strong chord on 1.
- **Paso Doble:** firm duple march, alternating root/fifth bass, guitar chords and differentiated snare strokes.
- **Jive:** stronger long/short subdivision, boogie bass contour, syncopated piano and a clear backbeat; harmony uses the major-chord family rather than the free Rock preset's minor family.
- **Discofox:** four-on-the-floor kick, backbeat claps, short offbeat electric-piano chords and an articulated electronic octave bass.

The rhythm renderer applies only in these dance modes, and only to supported instruments on foundation tracks. Free music, Tango and both waltzes retain their existing articulation paths. Rhythm-specific percussion shortening clones recipes rather than modifying shared instrument definitions. Reselect a dance or Reset to load revised track assignments; existing saved custom arrangements are not overwritten.

Context for the ballroom adaptations and distinctions: [WDO education](https://worlddanceorganisation.com/wdo_education), [DTV dance overview](https://www.tanzsport.de/de/service/downloads-und-formulare/presse?cid=44439&file=files%2Ftanzsport%2Fdownloads%2Fpresse%2FDTV-Pressemappe-2023-03-30.pdf). These are synthesized practice-oriented arrangements, not a claim to reproduce complete regional musical traditions or every dance figure's timing.

### Drawing-pad gestures

The existing canvas now handles independent Pointer Events for up to ten concurrent contacts (touch, mouse or pen); no additional pad tiles are needed. A short stationary tap toggles one grid point on release. After 280 ms, holding enables a bounded quarter-note figure from that position: at most four points / one active bar (2, 3 or 4 pulses in the current meter). Movement beyond 8 CSS pixels switches to drawing; each contact has its own last position, throttle and once-per-stroke toggle set. Held notes are not toggled back off when transitioning into drawing. The resulting points use the existing quantized audio scheduler, melody memory and optional persistence; gestures never autoplay or fire unscheduled voices.

Each contact creates a colored radial glow and ring, growing while held and expanding/fading for 1.8 s after release. Light mode uses stronger colors; reduced-motion uses a stationary circle without expansion. Drawing segments connect only points belonging to the same contact. Ring storage is bounded, active updates are coalesced per animation frame, and canceled/lost captures never become taps. Stop, hidden tab, window blur, Clear and style/meter changes cancel active gestures. Long-press context menus are suppressed on the canvas only.

Dance foundation tracks remain protected; touching them routes edits into nearby melodic accompaniment. Existing mute/enable/master controls still govern audibility. Canvas keyboard support: arrows select a position, Space taps/holds, Enter taps, and blur cancels. Guidance and usage instructions are translated into all four languages. Gesture state and visual rings are transient; only normal musical settings/points are optionally saved.


### Independent orbit note grids

Each track has an Automatic / 4 / 8 / 12 / 16 note-grid selector. One revolution always equals one bar of the current meter; the global clock, BPM and song form do not change. Grid changes resample existing onsets and phase, preserve the fixed 16-entry storage format and remap chorus/verse/crossfade memories. Running changes are queued until a bar boundary; Stop also applies a queued choice. New styles reset all tracks to Automatic. Saved version-1 settings without grid fields retain their legacy native-meter interpretation.

The scheduler enumerates actual onset times within each native sixteenth interval rather than rounding triplets to sixteenths. Swing applies to compatible binary subdivisions only; cross-grids remain evenly spaced. Comet positions use the inverse of each grid’s timing, so note flashes and the head remain aligned. Sustained-voice gates use the target grid and actual swung spacing, including reverse playback and phase offsets. Drawing, taps, holds and keyboard editing use the destination track’s resolution. Held quarter-note figures snap to the closest available positions in a cross-grid.

Random Play starts with varied grids on eligible Automatic melodic tracks, choosing underrepresented resolutions independently per track. During playback this initial shuffle waits for the next bar. The Random Pattern button also varies eligible grids. A dedicated bar clock, independent of timbre journeys, changes up to two eligible grids every 1–2 bars in energetic styles or 2–3 bars elsewhere. Calm styles change one every 3–4 bars. Least-recently changed tracks get priority. Diversity is measured among audible melodic tracks rather than fixed drum/bass grids; startup may retain an already underrepresented grid so all four resolutions can coexist. Expanding grids adds up to two style-compatible neighbouring onsets, with a 65% density ceiling, so finer grids are audibly used rather than merely showing more empty dots. Empty/cleared tracks remain silent; chorus memory follows generated changes. Fixed choices, muted/disabled/recently drawn tracks, bass, percussion, native waltz pulse parts and dance foundation tracks are excluded. The first four dance grids are locked to their native meter. Free-mode users may manually select any grid even for drums or bass. Controls, pending/locked feedback and usage notes are translated in all four languages. Grid choices and effective Automatic resolutions are saved only with storage consent; pending changes and visual effects are transient.


### Style-aware instrumental performance

Random Play uses each style's preset palette plus curated complementary colours (for example saxophone in Jazz, Coffeehouse, Pop, Funk and Latin, not the Electronic random palette). Manual instrument selection remains unrestricted. A manually selected saxophone in Electronic is played as short, individually re-attacked notes rather than a continuous jazz line.

`performance.ts` gives saxophone, strings and organ detached articulation in Electronic, House, Sport, Drum & Bass, Funk, Reggae and Hip-Hop. Attack, release and pitch glide are shortened, with a beat-based duration cap and an actual-note-spacing gate. The gate uses the existing native/swung/cross-grid phrase clock, including phase offsets and reverse playback. It bounds the release to leave audible space even with dense grids at high tempo. Detached voices keep their natural short releases rather than being prolonged by the next note. Jazz, Coffeehouse, classical and calm styles retain connected phrasing. Voices, choirs and pads stay phrased; rhythmic styles adjust their attack/glide without reintroducing a fresh syllable on every point.

Dance identity takes priority: Quickstep, Jive, Samba, Cha-Cha, Paso Doble, Discofox and Tango use articulated wind/string/organ parts; Slowfox, Rumba and the waltzes retain more connected accompaniment. Existing dance foundation synthesis is unchanged. Normal Play, Random Play, drawn notes and timbre crossfades all use the same performance policy; it is derived from the active style/dance rather than stored as an extra setting. These are synthesized interpretations, not recordings or claims of authentic instrumental technique.


### Simplified visible controls

The Meter & Groove controls and the complete Dances tile are hidden in every language and in focus view. Music-style selection and style-derived rhythm remain available. The existing rhythm engine, hidden DOM hooks and saved-setting compatibility are retained; this is a UI simplification, not deletion of the underlying dance/groove functionality. Usage notes no longer direct visitors to the hidden sections.


### Tango in the main music-style grid

Tango is now an eighteenth music style, available in all four languages without reopening the hidden dance or groove sections. The visible style and legacy Tango arrangement share one preset (128 quarter-note BPM, straight 4/4). It reuses the tested short marcato renderer: alternating root/fifth double bass at 0/4/8/12, accented piano/guitar chords at 0/6/8/12, a shorter pickup at step 6, and restrained rim accents. Strings and organ use the style-aware articulated performance introduced above; melody yields slightly at rhythmic attacks.

Internally the style activates the existing Tango rhythm protection. Random Play keeps the first four foundation patterns, direction, grid and chosen tempo stable while varying melodic accompaniment and song sections. Drawing over the foundation is routed to accompaniment. Selecting another visible music style exits this protection; live changes wait for a bar boundary. Optional storage restores the selected Tango tile without autoplay and understands legacy Tango dance settings. This is the existing synthesized ballroom-inspired marcato arrangement, not a universal rhythm prescription or an authentic bandoneon recording.


### Equal playback-mode reference level

Both buttons use the same master gain and output compressor. The scheduler now combines automatic mix and section factors before a volume-/note-density-weighted power balance, instead of multiplying an unbalanced section reduction into every note's permanent attack level. Held voices use the same live faders, so toggling evolution does not strand a quiet intro envelope. Relative lead/backing balance, drawing priority and phrase rests remain musical choices. Automatic velocity varies around 1 (0.85–1.15) rather than always attenuating (previously 0.65–1). Optional manually selected random dynamics in normal Play is unchanged.

This is deterministic feed-forward balancing, not audio AGC or LUFS metering; timbre, texture and the number of sounding notes can still change perceived loudness musically. The explicit outro fade and the next intro's recovery remain outside normalization. Silence, muted/disabled/cleared tracks and manual master/track volume are never normalized up as audio noise. Relative faders can exceed unity as compensation; the shared compressor remains downstream, with no mode-specific master boost or saved-setting change.


### Slow Waltz rise-and-fall phrasing

Slow Waltz retains its bass-led 3/4 pulse and exact quarter-note timing. Beat two uses an upward-opened inversion of the same chord (third/fifth/upper root), a slightly brighter excitation and a clearer accent; beat three returns to the lower close-position chord with a warmer tone, softer accent and 16% shorter gate. The bass downbeat is unchanged. A small continuous 0.95–1.05 backing swell rises from late beat one through two/early three and settles late in three. It is applied identically in normal and Random Play, after mix balancing, without changing master volume or the user's settings.

Waltz pulse buffers are cached separately for the actual clock position, including manual reverse playback, so beats two and three cannot accidentally reuse the same buffer. Viennese/crisp waltz and Tango keep their existing voicing and gates. The mapping is a musical interpretation, not a dance-figure instruction: ballroom rise commonly begins late in one and continues into three before lowering at the end of three; timing depends on the figure. Context: [Analysis of Swing Movement in Ballroom Dancing](https://www.mdpi.com/2504-3900/2/6/224).


### Lyrical Slow Waltz balance
The Slow Waltz preset gives melodic piano and connected strings more room, with a small piano pickup and quieter bass/chord accompaniment. A shared style-specific mix keeps the three-beat pulse behind the melodic foreground in both Normal and Random Play. Random section envelopes now also shape the pulse rather than leaving it at full level under a quiet introduction. Automatic melodic fader contrast is softened (explicit rests stay silent); drawing still brings a part forward. The existing shared energy balancer maintains mode-independent overall level, and manual volumes/mutes remain in control. Viennese Waltz and other styles are unchanged. Reselect the style or Reset for the revised preset; saved custom track settings are preserved.


### Nine-orbit matrix and keyboard rhythm input
All styles now provide nine enabled orbits. The first eight assignments are preserved; the ninth is a curated, quiet, sparse supporting voice appropriate to the style. Legacy dance arrangements also gain a supporting ninth part. Drawing remains available alongside a 3×3 rhythm matrix sharing the nine orbits’ instrument names and colours.

Matrix numbers follow a physical numpad: 7/8/9, 4/5/6, 1/2/3. Both numpad codes (including Num Lock off) and top-row digits work with independent simultaneous contacts, no key-repeat retrigger, and proper release/blur cleanup. Brief main-thread stalls skip missed transport ticks rather than stopping playback or replaying a burst of stale notes. Inputs, selectors, dialogs and modifier shortcuts are not intercepted. Canvas arrows select a cell; Space/Enter plays it. Touch supports up to ten contacts. Holds grow luminous rings without generating repeated hits.

Each captured orbit uses its own two-bar overdub lane on the existing tempo/swing clock; untapped orbits keep their original playback and random development. After more than two bars without tapping that lane, the next hit starts a replacement of that lane only. Captured timbres, grids and directions are protected from automatic changes; drawings may still shape melodic motifs. Explicit style changes load a new arrangement and clear custom rhythms. Original orbit patterns are retained when custom rhythms are cleared.

Percussion uses the shared drum recipes with pad-specific kick/hat presence. Melodic pads use the existing harmonic, acoustic and sustained instrument renderers, including legato phrasing. Captured voices and their effect returns bypass the ducked orbit bus; while editing the remaining music runs at gain .1. Finish or returning to Draw smoothly restores orbit gain to unity (.18-second smoothing), without changing master or manual track volumes. Mutes/disabled tracks remain authoritative. Actual custom hits drive orbit glows, and displayed orbit points reflect the current bar of the two-bar loop.

Opt-in settings version 2 stores nine validated tracks and nine rhythm rows; transient input, clock and ducking state are never saved. Version-1 eight-track records gain the style’s enabled ninth support without altering their first eight tracks. Old three-drum rows map to matching orbit instruments, with distinct positional fallbacks if an instrument is absent. No rhythm row is discarded; an unmatched legacy rhythm now plays the assigned orbit instrument. Restoration never starts playback and starts at normal music gain.


The shared kick recipe now has a slightly longer 48 Hz low tail, a stronger 65 Hz body and a short 176→110 Hz triangle layer for audible punch on small speakers. The main peak remains .29, and the total envelope stays below .36 seconds to avoid a boomy sustained bass. Orbit playback and the pad use the same richer base recipe; the pad retains its existing gain offset without duplicating the body partial. Groove timing, master volume and the other drum recipes are unchanged.


### Cancel rhythm recording
Rhythm editing is transactional. Entering Rhythm or tapping again after accepting snapshots the previous pattern; Record again/Clear rhythm checkpoints the current non-empty take before clearing it, including a take never explicitly finished. Repeated resets of an empty draft never overwrite that undo snapshot. The icon-only Cancel action restores all prior rhythm rows and the timing/timbre settings of touched orbits, cancels queued draft voices/visuals, and smoothly restores normal backing volume without stopping the transport. The retained custom orbits remain protected from random timbre/grid changes while a replacement draft is empty.

Finish or returning to Draw accepts the draft, retaining the existing drawing workflow. Until acceptance, consent-based storage writes the previous pattern and prior timing/timbre values for touched tracks; reload therefore cannot replace the last accepted rhythm with an accidental empty take. Stop/restart rebases both clocks and preserves the cancel option; a deliberate style change or global Clear discards the undo snapshot rather than allowing a stale arrangement to be restored. The snapshot is session-only and independent copies prevent overdubs from mutating it. Cancel labels and usage instructions are available in all four languages.


### Local JSON projects and MP4 recordings
The header folder icon opens the localized Files & recording dialog. JSON export uses the same version-2 schema and validator as optional browser storage, independently of storage consent, but explicitly includes any current rhythm draft. Import validates the entire file (max 1 MiB) before stopping playback or changing anything, accepts legacy version-1 projects, restores all nine tracks/motifs/grids/levels/rhythm rows and animation choices, and never autoplays. Invalid files leave both playback and the piece unchanged. It does not import appearance, language, a random seed or the future song evolution.

MP4 recording captures the existing orbit/centre/background canvases in a centred 1280×720 composition at up to 30 fps, plus the final post-compressor Web Audio output (including custom pads and effects). No microphone, screen capture, upload, third-party encoder or server is involved. Native MediaRecorder MP4 support is checked; unsupported browsers show a translated explanation rather than a renamed WebM. Controls and drawing-pad UI are not filmed, but their musical changes are recorded. Starting a recording starts ordinary playback only if stopped; an already-running Random Play continues unchanged.

A floating timer and stop action remain available while playing/drawing/in focus view. Stopping playback or hiding the tab also finalizes the recording. The MP4 downloads automatically, with a retained download link for retry. A new recording or dismissing the result revokes the old URL; capture tracks and the temporary audio connection are released on finish/error. Recording is limited to 10 minutes or 256 MiB to bound memory use; leaving/reloading while recording warns about unsaved work. Keep the page open until recording has finished. This is a live recording, not offline rendering or deterministic playback of a JSON file.


### Local WAV audio recording
The file dialog also offers uncompressed stereo 16-bit PCM/WAVE recording with the browser AudioContext's actual sample rate. The original AudioWorklet processor and RIFF header writer use no new dependency or third-party encoder. Capture branches from the same final post-compressor output as MP4, including effects and live/custom voices, and terminates through a silent monitoring branch so playback is not doubled or altered. PCM is interleaved and quantized to little-endian 16-bit samples on the audio thread, transferred in 4096-frame blocks, and assembled as a WAV Blob in the page.

Stopping flushes the final partial block before download; a bounded fallback preserves received audio if a suspended device cannot acknowledge the flush. Tracks are capped at 10 minutes of audio or 256 MiB of PCM, whichever comes first (48 kHz stereo is about 11.5 MB/minute). Stopping playback, tab hiding and page hiding finalize audio; leaving during recording warns. A retained download link permits retry. Startup cancellation, AudioWorklet load/processor failures and unavailable secure-context/worklet support restore the controls without affecting JSON. WAV does not rely on MediaRecorder/MP4 codec availability.

WAV and MP4 sessions are mutually exclusive, with separate retained download links stacked in a shared floating area. Import is disabled while recording/finalizing; JSON export remains available. Tooltips, statuses, support messages and usage instructions are localized in German, English, Spanish and French. No new package, microphone, screen access, server or upload is involved.


### Selected-pad rhythm editor (current workflow)
Rhythm mode is initially an overview at normal music levels. Pointer or number-key selection does not record a note. The chosen instrument expands to a central 60% pad, with two live companion previews on each of the four sides. Hit-testing, keyboard targeting and animated ring centres use the same geometry. Existing note pulses remain visible on every preview. Multiple touches can strike the selected centre.

Selection begins an undoable transaction and protects the selected timbre/grid from Random Play. The selected part retains its normal user volume; the other eight fade to 40%, including previously captured patterns. Each synthesized voice has a smoothed pre-pan/pre-effect edit fader; captured percussion has per-lane gains. Shared output buses remain at unity to avoid gain-compensation overshoots. Existing reverb tails decay naturally. Master and manual track volume settings do not change.

Finish explicitly accepts and returns to the overview. Cancel restores the pre-selection custom pattern and touched track timing/timbre, and also returns to the overview. Both smoothly restore all levels without stopping playback. Pending recorded hits block switching instruments until accepted/discarded; selection may switch freely before any edit. Record again/Clear affect only the selected row and remain undoable to the last accepted state, even after repeated draft resets. Returning to Draw discards unaccepted changes (supersedes the older automatic acceptance behaviour above). Selecting another style clears transient editing. Saved/imported pieces open without pad selection, ducking or autoplay; opt-in persistence preserves the accepted pattern until Finish. The first number press selects, and subsequent presses of that digit or Space/Enter strike the centre.

### Selected-pad melodic notes
A selected melodic pad now shows eight horizontal note bands: bottom = 1 (low tonic), top = 8 (upper tonic). These are seven diatonic degrees plus the repeated tonic, not eight distinct pitch classes. Touch height and the physical top number row 1–8 play the same degrees. The numpad continues to select/restrike instruments; Space repeats the last chosen degree; Enter accepts the take and Escape discards it without leaving focus view. Without a selection, number keys still select pads. Percussion remains unpitched. Input/dialog guards and independent held-key release remain in place.

The two-bar pattern stores one optional degree per occupied grid step; simultaneous hits on the same step keep the last degree (each track is monophonic). Replays follow the current chord and global transpose while retaining instrument register/articulation. Random Play preserves explicitly entered degrees rather than replacing them with random motifs. Drawing still shapes the generated melodic motifs; explicit recorded notes are edited in the rhythm pad. Visual pulses appear at the recorded height. Finish/Cancel, lane replacement and meter conversion include pitch data.

JSON and opt-in browser storage keep the optional nine-row `pad.notes` field alongside `pad.hits` in version 2. Old files without notes retain their generated melody; legacy three-drum projects still migrate. Validation rejects out-of-range degrees, mismatched rows and notes without hits. Unaccepted drafts follow the existing transactional storage rules.

Generated melodic notes now carry their synthesized, chord-relative pitch into the same audible-onset visual events as recorded taps, including rhythm-only legacy captures. Pad circles and band highlights therefore follow melodies from playback start, without changing audio or recording custom hits. During phrase/timbre crossfades the louder voice determines the displayed band. The eight-band view uses the nearest diatonic degree and clamps out-of-range notes at the octave edges; instrument-specific octave registers and the shared transpose do not change its relative degree display. Percussion remains centred.

### Selected-pad instrument tools
Selecting a rhythm pad reveals two icon-only, localized tooltip buttons: mute/unmute and instrument selection. A native modal dialog groups all 35 instruments into seven keyboard-navigable tabs with named SVG tiles, highlights the current voice, and reopens on its group. Arrow/Home/End navigation, focus trapping/return, backdrop dismissal and Escape work without triggering taps or leaving focus view. Choosing a tile updates the existing track controls immediately without changing the captured rhythm; closing the picker alone changes nothing.

Timbre and mute edits made while a pad is selected are part of its existing Finish/Cancel transaction, including consent-based persistence of only the accepted state. Accepted muted pads remain selectable so they can be unmuted. The shared per-voice edit faders also silence active voices smoothly on mute; captured percussion lanes are cancelled and muted separately. No new sound engine or dependency is introduced.


### Expanded instrumental palette
Ten additional local-synthesis voices bring the library to 35: flute, clarinet, trumpet, French horn, analog lead, acid bass, shimmer pad, cello, vibraphone and congas. All have four-language names and individual SVG tiles in the existing groups. IDs are appended, preserving old projects and the original default assignments.

The four winds have separate harmonic spectra, breath levels, body resonances, envelopes and delayed vibrato. Cello uses a lower register and richer bowed spectrum; analog lead has a swept low-pass and style-dependent articulation; shimmer uses detuned layers with a slow attack/release. Rhythmic styles detach winds, cello and lead while calmer styles bridge phrases. Vibraphone uses decaying modal bars with restrained motor tremolo. Congas combine a falling membrane tone and short hand noise. Acid bass keeps the shared bass harmony/centred mix but adds a resonant downward filter sweep.

Curated Random Play palettes introduce these colours only in suitable styles without replacing the nine starting arrangements. Foundation roles, drawing, transposition, eight-band pad notes, mute/cancel transactions, project validation and audio/video recording use the existing shared paths. No samples, packages or external services are added; these remain synthetic interpretations rather than acoustic recordings.

Tapping the orbit centre (within 80 of the 700 canvas units, safely inside the innermost ring) cycles Ring → Filled ring → Sun → Sine → Bars → Ring. It uses the same selection/persistence path as the tiles, without toggling notes or starting/stopping audio. From Off it starts at Ring; from Random it advances from the currently rendered variant and fixes that selection. The centre remains interactive when orbit rings are hidden or tracks are disabled, including focus view. Secondary mouse buttons do not change it.

Tapping free visual background outside the orbit (beyond radius 320, leaving a safety margin around the outer note ring) cycles Clouds → Aurora → Stars → Waves → Clouds. Blank app space and orbit canvas corners work; drawing, instrument controls, notes, centre taps, dialogs and secondary buttons are excluded. Hidden orbit/background modes do not block the shortcut. From Off it starts with Clouds; from Random it advances from the visible variant to a fixed choice, using the existing tile/persistence path. Audio and focus mode remain unchanged.

Tapping free space inside the orbit area, excluding the central 80-unit target, cycles Comet → Dot → Pulse → Comet. Note editing now uses the actual Euclidean distance to visible note positions across each enabled track's own grid, rather than rounding any angle on a ring into a note. Both active and inactive dots consume the hit; protected dance points remain protected. Hidden or empty orbits can be brought back with the shortcut, and Random advances from its current rendered variant into a fixed choice. Background taps beyond radius 320 and centre taps keep their separate actions.

### One-click recording setup
The file dialog offers three shared localized slide toggles for WAV/MP4: restart music with capture, use Random Play for that restart, and enter fullscreen/focus before capture. They default off, preserving ongoing playback and the existing stopped-playback auto-start when restart is not selected. Random choice is enabled only with restart. Optional version-2 `recording` booleans round-trip in JSON and consent-based browser settings; import/reload never invokes fullscreen or playback.

With restart enabled, the current take is stopped and old voices/effect tails are isolated, while notes, instruments and custom rhythms are retained. Audio is initialized without starting music; capture is created first, then beat zero is scheduled on the Web Audio clock 0.5 seconds later with the selected playback mode. Fullscreen is requested directly within the recording gesture and awaited before framing capture, with focus-view fallback on denial. No microphone/screen permission or new dependency is introduced. Preparation has a visible cancel/stop action; cancellation, hidden tabs and failed encoders cannot subsequently launch delayed music. Options are locked during capture/finalization.

The Files dialog now separates a JSON project card from the recording workflow. Shared toggles are explicitly step 1; step 2 has separate WAV and MP4 format cards (side by side on desktop, stacked on phones). Format badges, concise descriptions and accented icon launch buttons identify each action at a glance. Long format/project explanations remain available in native disclosure panels. The sticky dialog heading keeps Close reachable during scrolling; all labels are localized and existing recording IDs/behaviour are unchanged.

A shared recording-length range selects 1–10 whole minutes (default 10) with a localized live value. The selection is captured at startup, locked during recording and saved in optional `recording.minutes`; old projects retain the ten-minute default. MP4 uses the chosen wall-clock timeout, WAV the exact sample-frame budget. Both automatically finalize/download at the chosen limit; manual early stop and the independent 256 MiB safety ceiling remain available. The half-second restart lead-in is included in the recording duration.

### Landscape and portrait MP4
The MP4 card has localized native-radio tiles for landscape (16:9, 1280×720) and portrait (9:16, 720×1280), with a live resolution readout. Landscape remains the default for legacy projects. Optional validated `recording.videoFormat` is saved alongside the other recording settings; WAV is unaffected. Selection is frozen during recording/preparation.

The actual MediaRecorder source canvas uses the selected dimensions, not a stretched preview. The orbit stays a complete centred 680×680 square in both outputs, and the background covers the frame with its orbit centre aligned. Output remains native MP4 at the same pixel count, frame rate and resource limits; no device rotation or external encoder is required.

### Optional video captions
The MP4 card offers a master video-info switch plus individually selectable custom title (80 characters), style, tempo, song section and tool signature/domain. Defaults preselect title/style/signature, but the master switch is off for backwards-compatible clean exports. Empty titles use the automatic “Random <localized style> Sound Session” name; unavailable normal-Play song sections are omitted. Metadata follows current music while title/selection are snapshotted and locked at recording start. Optional validated `recording.videoInfo` persists in JSON and consent-based storage; loading never starts capture.

Captions are drawn into the capture canvas only, not the live focus view or WAV. Portrait retains the 680-pixel orbit and places text in its unused vertical space; landscape uses a 540-pixel orbit with separate header/footer bands. Long Unicode titles are fitted with an ellipsis using bounded measurement, and outlined/shadowed light text stays readable without opaque boxes. All controls and credits are localized into the four existing languages; the tool credit can be disabled independently.

### Duration-aware video animation changes
Four opt-in switches in the MP4 card randomize centre, orbit, background and visualization during capture. Enabled layers share frequent staggered changes throughout the chosen 1–10 minute length. Normal and Random Play use the same video pacing; music-driven random animation scheduling yields to an enabled video layer. Explicit Off stays Off. Temporary variants do not alter fixed/random/off choices or saved settings, and touched layers restore their selected modes when capture finishes or fails. WAV is unaffected. The validated optional `recording.animations` object persists with project/settings data.

An empty custom video-title field now means automatic naming: `Random <localized music style> Sound Session`. The field displays that default as its placeholder, and the capture follows style changes; any non-empty custom title remains untouched.

Video captions now use a separately selected language (English default, with German, Spanish and French also available), persisted as optional `videoInfo.language`. It controls notices, style/section names, signature and the style portion of the automatic title; custom title text is never translated. Every enabled video-info overlay includes randomness/synthetic-sound provenance (two lines in portrait, a compact combined line in landscape). Title/accent, body/text and secondary/muted colours come from the active tool theme; headline and body fonts follow its typography. Theme-aware outlines preserve contrast in light/dark palettes, and headings shrink modestly before truncation so wider tool fonts still fit normal session titles.

### Orbit note heads and lengths
- Head size reflects performed velocity × track volume; the existing note-glow slider still controls the hit bloom independently.
- Audio voices now return pitch and actual duration metadata alongside scheduling. Sustained instruments report the style-specific gate/hold, acoustic buffers their decay duration, and synthesized drums/plucks the longest scheduled tone/noise envelope (including noise offsets). Pad percussion reports its own, separate recipe duration.
- The first audible hit supplies a quiet rounded duration arc; it remains as a length bed and lights while that note sounds. Arcs follow track direction, are relative to the bar duration, and cap below one revolution for readability. Reverb/delay tails are not additional notes. Grid, project/style and manual-instrument changes discard stale derived lengths; JSON/storage need no new fields.
- Rendering shares the existing orbit canvas, so focus view and MP4 include it automatically; Orbit Off hides it. No timing offsets, new note ties, audio-envelope changes or dependencies are introduced in this first step.

### Expressive timing and actual legato links
- `note-timing.ts` adds bounded, deterministic phrase-level timing (up to 24 ms; smaller at high tempos/dense grids). Jazz/coffeehouse/lo-fi/hip-hop have a looser feel; electronic styles stay tight. Existing swing is retained, not applied twice. The first downbeat, kick/bass, protected dance pulses, non-auto groove presets and recorded pad patterns are not humanized.
- Automatic voices and visual onset events share the exact shifted audio timestamp. Heads/length beds use inverse swung-grid geometry, including phase, reverse and cross grids; faint raster markers remain behind shifted heads. Both the shifted head and its original grid position remain clickable.
- Sustained voices return a link to the previous onset only after `canContinue` actually reuses that voice. Legato metadata is retained, but extra connector strokes are not rendered; note heads and duration/decay arcs remain. Existing style-specific gates, glide and phrase rests remain in control. Drawing changes these phrases through the existing live patterns, and custom pad recordings keep their timing and style articulation.
- Metadata is derived from playback; no extra persistence fields, dependencies, automatic loudness changes or recording-only timing are introduced. Focus view and MP4 share the same orbit rendering.

- Orbit geometry now spans radii 100–316 on the 700 px canvas: 27 px between nine rings (previously 23 px), giving duration arcs and slurs more breathing room. Rendering, hit tolerance and the background-tap boundary share the geometry helpers in `orbit-layout.ts`. Centre hit area and audio remain unchanged.

### Independent note groups and polyphonic chords
- Optional `tracks[].groups` is a 16-slot array of null or `{kind: 'run'|'chord', notes: [{offset, tone, velocity, gate}]}`. Each group contains 2–4 notes. Offsets/gates are fractions of the available window (no later onset beyond the next active point or bar); tones are relative triad steps around the existing melody. Binary subdivisions inherit swing; triplets stay even. Every note has its own velocity and gate. Legacy projects without groups remain single-note projects.
- Presets add only 1–3 group anchors, favoring a chord-capable harmony track and pitched runs. Random development changes one group at a time and preserves foundation/dance pulses, drawn parts and custom pad rhythms. Monophonic instruments and drums never receive pitch chords; chord tones share the current major/minor/jazz harmony. A normalized polyphonic gain avoids simply tripling chord loudness.
- Chords have independent sustained-voice channels and exactly simultaneous timestamps. Runs use separate, detached attacks. Acoustic note-off uses a short fade; drums retain their natural decay. Later run members are queued as cancellable descriptors and synthesized only inside the audio lookahead window, so stop/restart, track changes and edits cannot revive far-future sources.
- Each actual onset drives its own note head, duration bed, pad pitch and pulse. Group heads and overlapping radial chord heads are drawn without extra connecting beams or slurs, keeping the orbit calmer. Clicking a member toggles its parent anchor. Stopped previews never masquerade as audible hits. Focus view, MP4, WAV, JSON and opt-in local settings share the same sound/model; no added packages or network services.
- JSON validation bounds every member, checks instrument compatibility, limits each track to two group anchors and each project to six. Groups are deep-cloned for rhythm-edit cancellation and removed on incompatible instrument/grid changes.

### Musical phrasing in presets and Random Play
- `musicality.ts` supplies shared 8-bar energetic / 16-bar calm arches, close chord inversions, motif responses, complementary end-of-phrase breaths, and instrument-specific ornaments. Standard Play uses these without rewriting patterns; Random Play retains its longer song/development plans and additionally develops the saved groups. There is no master fade or new global loudness switch.
- Canonical chord groups use per-track/timbre/style voicing memory. A bounded inversion/octave search minimizes voice movement and favors common tones. Noncanonical user-defined tone orders are preserved. Pad/shimmer chords and calm string/choir/organ chords can use gates up to 4.1 windows (one bar in native meter); their existing sustained voice channels carry through successive chords without repeated attacks. Other instruments retain the 1.5-window validation limit. Transport/style resets clear voicing history.
- The answer now follows multiple contour points of the current question instead of only changing its final note. Recently drawn motifs take precedence as questions. User-tapped/edited tracks and protected dance foundations are excluded from automatic dialogue; freshly drawn notes retain direct priority.
- Complementary short breaths release a speaking melody but leave the respondent/foundation available. Weak backing attacks can thin near the relaxed end of an arch; strong beats, solo arrangements, bass/kick foundations and manual takes are protected. Register and filter motion provide tension/release with bounded per-note dynamics; no whole-song attenuation is added to video capture.
- Saved optional `groups[].ornament` is validated as `grace` (keyboard/plucked families) or `trill` (flute/clarinet). Grace groups use a quiet upper-neighbour lead-in resolving to a longer chord-tone target; trill tones use adjacent diatonic neighbours rather than stacked chord thirds, and members reuse one sustained voice with fast finger transitions instead of re-tonguing every note. Jazz/coffeehouse/Latin/pop/rock saxophone and trumpet starts can use an initial sub-semitone scoop on selected phrases; electronic styles do not. Phrasing never adds connector strokes to the orbit.
- Tests exercise inversion continuity, actual oscillator pitches at a chord change, pad voice reuse across bars, flute trill reuse, standard/random playback, bounded arches, saved ornament compatibility and manual-input preservation.

### Genre-specific phrasing profiles
- All 18 genres now have explicit profiles for phrase length, filter colour, short breaths, weak-note thinning, group size, chord preference and chord gate. Funk develops in four-bar arches, jazz in eight, classical/coffeehouse/focus in sixteen and ambient in thirty-two; none of these is a master-volume fade.
- Newly generated house/funk/reggae groups favour existing offbeat anchors and compact chord stabs. Tango keeps marcato, rock/hip-hop prefer compact repeated figures, Latin retains short flowing runs, and classical/jazz retain suitable grace notes or wind trills. Soft styles reserve grace notes for higher-energy passages instead of ornamenting every generated run. Atmospheric pad beds remain sustained. Pop/Latin scoops are subtler than jazz scoops.
- Both standard-piece seeding and Random Play use the same profiles; existing saved group definitions and manual pad takes are not retroactively rewritten. Bass/kick and protected dance foundations retain their existing groove. No UI, dependency, connector-line or export-format changes.

### Two-bar note editor (third input mode)
- `note-score.ts` defines optional, validated `tracks[].score`: null/absent uses the generative/tapped track; an array (including an intentional empty array) overrides that lane with a two-bar score. Each note has a fractional start/duration and 1–32 linked `{offset, pitch, velocity}` points; up to 128 notes per lane. Pitches are chromatic semitones relative to C4, before global transpose. Old JSON remains compatible.
- The SVG editor starts with a nine-instrument grid. Selecting a lane opens its current melody (including note groups/tapped pitches) above a miniature grid of the other eight. The accompaniment is gently ducked only while selected. Click/touch adds a note; dragging right sets length, and changing height while continuing right adds connected pitch points. A switch disables temporal snapping. Selecting a point exposes a vertical level slider, with point size/opacity reflecting velocity. Bin/Delete/Backspace removes a point; removing the first point rebases the surviving connection.
- Edits audition live but remain transactional: checkmark/Enter accepts, X/Esc or mode change discards, and unaccepted drafts never replace consent-based local storage. Explicit JSON export includes the current draft. Reload restores accepted scores without starting music or selecting a lane. Recorded pads and drawing can replace their lane; Random Play preserves accepted scores. Style/reset reloads the standard piece.
- Scores use the existing AudioContext, instruments, FX, master compressor and recording output. Sustained/synth voices automate continuous pitch curves without re-attacking every control point; plucked/acoustic instruments articulate the connected points. A separate voice-level gain interpolates point velocities linearly, without touching master volume. The score timeline is absolute two-bar time (swing is not applied twice); custom notes support simultaneous attacks. Each audible control-point onset drives orbit and companion preview pulses; duration beds remain, without extra orbit connector strokes. WAV/MP4 capture the same performance; no new packages or services.
- UI labels/tooltips and usage instructions are supplied in German, English, Spanish and French. Tests cover validation, deletion/rebasing, touch, independent levels, free placement, accept/cancel, storage/JSON, actual audio pitch ramps and acoustic attacks.
- Selecting a score lane now opens a viewport-filling native modal editor. The orbit, transport and input-mode buttons fade away; the grid uses the available height, with companion previews retained below. A short expansion/fade and reverse transition preserve playback, scroll position and the existing focus/fullscreen state. Accept/Cancel return to the original instrument grid and restore keyboard focus. The native modal keeps background controls inert; Escape discards the draft, and reduced-motion preferences disable the large movement. SVG geometry is measured without animation transforms so note hit targets stay accurate.
- The nine-instrument overview no longer shows the selection hint. Miniature note heads now flash from the same audible onset events as the orbit (including grouped/chord notes, taps and saved scores); matching uses loop position and actual pitch, not a separate approximate playback clock. Only the visible overview/companion previews animate while Note mode is active. Drawing/Rhythm mode clears preview highlights and skips the preview animation loop; stopped playback clears the glow. Reduced motion retains a colour cue without expanding the point.

### Alternate visualization: sound landscape
- The localized view picker under Settings → Sound animation switches between Orbit (default) and Sound landscape without changing any track, musical preset, BPM, transport, input mode or audio processing. `visualization?: 'orbit'|'landscape'|'stream'|'constellation'|'flower'` is validated, included in project JSON and opt-in storage, and defaults to Orbit in older projects. Loading never autoplays.
- `landscape.ts` is a rendering-only, bounded nine-lane event history. Actual audible onsets supply pitch, velocity, duration and legato information; editor scores supply their explicit pitch/level curves. Held/synth curves interpolate pitch, acoustic curves articulate it, and velocity interpolation is shared visually. Chord members retain separate drifting heads. Curves are rounded into translucent rivers; pitch changes height and performed level/track volume/master level drive ribbon width and light. Percussion pulses without inventing pitched notes. Numbers match the input pad grid; note-glow strength, themes and reduced motion are respected.
- Only the selected foreground visualization renders. Foreground history is collected only while a non-Orbit view is selected, bounded to 192 events per lane and 30 seconds, and cleared on transport/style/reset changes. No separate random generator or audio clock is introduced. Orbit/centre effects are unavailable in Landscape but retain their settings for returning to Orbit; the selected background remains independent. Landscape canvas taps do not accidentally toggle hidden orbit points or centre effects; all existing input surfaces remain unchanged.
- All foreground views use the existing `#orbit` canvas, so fullscreen/focus sizing, optional captions and native MP4 capture use the selected view automatically. WAV/audio are unchanged. No packages, external assets or services were added.


### Note stream
- A third localized picker choice, `stream`, uses the same canvas, focus/fullscreen behaviour, project/storage setting and native video path. Nine horizontal lanes retain instrument colours and input-pad numbers. A shared vertical strike line separates the fading played history on the left from about one bar of quieter provisional notes on the right. Pitch is vertical within each lane; individual heads, length bands, chord stacks and connected score curves expose timing, duration and dynamics. Acoustic connections step between notes; sustained/synth score curves glide. Only audible onset events trigger impacts, with master level, mutes, note-glow strength, themes and reduced-motion preferences respected.
- `note-stream.ts` contains pure time/pitch geometry and projection/rendering helpers. The bounded foreground history is shared with the landscape but only the chosen view renders. Forecasts clone existing patterns, groups, recorded taps or explicit two-bar scores; they are cached until the bar, tempo or relevant input changes. Recorded pads retain swung timing and non-downbeat loop origins. Forecasts are deliberately provisional and never schedule audio or consume randomness; changes by drawing, input and Random Play can revise them before they sound. Confirmed notes come exclusively from the existing transport events.
- Stream view is read-only; clicking it never toggles hidden orbit points or animation settings. The music, random evolution and all three input modes remain independent of the visualization. Tests cover geometry, exact strike timing, chord/curve projection, view isolation, unchanged music settings, localization/layout, opt-in persistence, focus/reduced motion and native MP4 with audio. No dependency or network-service changes.

### Constellation
- The fourth view, `constellation`, assigns each of the nine input-pad numbers a stable coloured star group. Pitch maps deterministically to a star position, including separate chord heads. Actual audible events drive brightness and hold time; score curves retain acoustic steps or sustained pitch glides and interpolated levels. Short, fading melody links and already-heard curve trails never preview unplayed notes.
- The renderer reuses the bounded foreground history and existing canvas. Only the selected view paints; no audio, scheduling, randomness, dependency or recording pipeline changes. Muted/zero-level lanes retain only faint reference stars. Reduced motion removes trails, halos and flare animation, retaining note-light cues. Themes, master level and note-glow strength apply.
- Four-language labels/instructions, a responsive tile picker, consent-based storage, JSON, fullscreen/focus and MP4 all support the new view. Orbit remains the default for older projects. Canvas gestures remain read-only outside Orbit; input surfaces work independently.


### Sound flower
- The fifth foreground view, `flower`, renders nine stable instrument-coloured petals with matching input-pad numbers. Only audible foreground events unfold the flower: performed pitch locates separate chord beads, level and track/master/glow controls drive brightness and petal width/reach, and held notes remain lit until release. Acoustic score curves step; sustained score curves glide along already-heard trails. No future notes, random values, audio nodes or separate timing source are introduced.
- The same bounded history and existing canvas provide focus/fullscreen and native MP4 support. Only the selected renderer runs. Quiet or muted tracks retain faint reference petals; reduced motion fixes the silhouette and removes trails/halos. Inputs, music generation, audio and recording pipelines remain unchanged.
- Five localized choices wrap responsively, with usage instructions in all four languages. JSON and opt-in local storage include the new view; older projects still default to Orbit. No new assets, dependencies or services.


### Unified inline animation settings
- The fourth icon button beside Draw / Rhythm / Notes replaces the input surface with a square settings area, not a modal or overlay. Every level uses the same three-column, three-row grid as the instrument pads: initially only Sound animation and Background animation are populated. Sound opens five visualization tiles; the Orbit gear opens two branch tiles (trail effects / centre), and the flower gear opens its own centre grid.
- Settings preserve the previous input session. Back / Escape navigate one level up; Escape at the root, X, or toggling Settings returns to the previous input. Choosing Draw/Rhythm/Notes leaves settings normally. Hidden tapping shortcuts and preview animations are suspended; held gestures are released, without accepting/discarding the take or changing audio levels.
- The visualization, transport, other page controls and focus/fullscreen remain usable alongside the grid, including during recordings. Only the two existing animation canvases are captured in MP4, never settings. Selection is live, retains JSON/consent-based persistence, and has four-language labels, visible keyboard focus and reduced-motion support.

### Independent flower centre
- Orbit and Sound flower tiles each have a gear. Opening either settings page activates that visualization; the flower page contains only its centre variants. Back returns to Sound animation. All seven choices (ring, filled, sun, sine, bars, random, off) have four-language labels.
- Existing `center` remains the Orbit choice. Optional validated `flowerCenter` is saved separately in JSON/local preferences and defaults to `ring` for old files, independently of Orbit. Switching views does not copy either setting. The flower keeps its original native heart for Ring, omits it for Off and other variants, and fits the alternate shared centre renderers to its compact centre.
- Random choices develop independently. Optional video centre changes affect only the currently visible Orbit/flower centre, honour that view's Off choice and restore saved choices afterwards; manual changes remain the new saved choice. The canvas-based MP4 path and music are unchanged.


### River delta
- The landscape tile now has a gear in the inline input-area settings grid. It offers Rivers (the existing default) and River delta; optional validated `landscapeVariant: 'rivers'|'delta'` is stored independently of the visualization and music style. Old projects default to Rivers. Labels, accessible descriptions and usage instructions cover all four languages.
- `river-delta.ts` is a pure canvas renderer over the shared bounded audible-event history. Nine numbered coloured sources flow right-to-left, open continuously into filled colour fans with subtle channels and enter a feathered common sea. Pitch contours and performed dynamics shape the channels; separate chord particles and held/editor-curve traces carry only already-heard music. Tracer/ripple work is bounded to the latest 64 events per track.
- Sea envelopes and soft impact blooms arrive after the same tempo-dependent 3–14 second travel window as the rivers. Sustained envelopes broaden the currents; short notes produce expanding filled colour blooms. The delay is visual only: no audio scheduling, instruments, sound sources, random state, external assets or dependencies change. Muted/zero-level tracks have no performed highlights. Reduced motion keeps quiet geometry and level cues but removes moving particles/ripples and phase drift.
- Only the selected foreground renderer runs. The existing canvas automatically supplies focus/fullscreen, both MP4 orientations and caption composition; settings are not captured. Music/input behaviour, themes, master/glow controls, JSON and opt-in storage remain intact.


### Filled delta and mixing sea
- Delta channels now fan out into broad translucent filled surfaces. Their widening overlaps adjacent instrument colours and dissolves into the mouth; internal channels are deliberately faint.
- The sea is a continuous colour field rather than separate wave lines. Its common base colour is an order-independent RGB mixture weighted by arriving performed energy; broad overlapping colour plumes retain the incoming river hues and gently diffuse across the shared surface. Muted/zero-volume tracks do not contribute to the mixture.
- Short arrivals now spread as soft filled colour blooms instead of outlined rings. Existing timing, controls, themes, reduced motion, persistence, audio and video capture are unchanged. Tests cover bounded fan widths, mixed hues/weights, and substantial filled pixel coverage in both themes.

### Dissolving note stream
- The note-stream tile has an inline settings gear with Notes (unchanged default) and Particle clouds, localized in all four languages. Optional validated `streamVariant: 'notes'|'clouds'` round-trips through JSON and opt-in browser storage; legacy sessions keep Notes.
- In cloud mode, actual heard events dissolve at the strike line into deterministic, bounded particles that spread, drift left and fade. Held/gliding notes release particles along their duration and pitch/velocity curve. Forecasts never emit particles, and music/random generation is unchanged.
- Muted/zero-volume tracks and disabled glow emit nothing; reduced motion uses stationary fading points. The same canvas is used in focus mode and MP4 recordings.

### Musical nebula
- The constellation settings gear offers Constellation (existing default) and Nebula in all four languages. Optional validated `constellationVariant: 'stars'|'nebula'` is independent of music and other visualizations, included in JSON and opt-in browser storage, with old sessions defaulting to stars.
- Nebula clouds sample only already-heard notes, retaining chord voices and performed pitch/velocity curves. Sustained notes form soft coloured veils; short notes add brief sparks. Clouds overlap naturally and fade after release, with no extra audio or musical randomness.
- Rendering is bounded to the latest 64 events per track and a 4.2-second cloud lifetime. Mute, volume, master, playback and glow control emissions. Reduced motion retains stationary fading clouds without sparks. Focus mode and MP4 use the same live canvas.

### Video visualization changes and crossfades
- MP4 animation options include an opt-in random visualization switch (all four languages). It shares the staggered video schedule, cycling between the five views and their landscape/stream/constellation variants. Original selections restore after recording; temporary views do not leak into JSON or browser preferences. Old projects without this optional flag remain valid and default to off.
- Foreground and background changes use an eased 1.1-second canvas crossfade. One reusable snapshot per layer blends into the live incoming animation; rapid changes resume from the current blended image. These are real canvas pixels, so MP4 exports contain the same transition, including fading backgrounds off.
- Reduced motion skips crossfades. Audible note history is retained across views and collected in Orbit too, so incoming visualizations can immediately represent already-played music. Audio timing and synthesis are unchanged.

### Independent track rates
- Each instrument has a localized Track speed control: Automatic, ½×, 1× or 2×, also available in the instrument picker. Automatic starts at 1× for standard presets; Random Play favours slower sustained melodies and occasional faster percussion/arpeggios, retaining a steady kick/bass foundation. Explicit choices are never randomized.
- Rational local clocks share the global tempo and swing. Pending changes commit at a shared two-bar boundary, where all three rates align; gradual random development revisits one eligible automatic track every eight bars. User drawings and edited scores are protected from random rate changes.
- Pattern onsets, groups, sustained gates, editor scores, comet positions, note durations and note-stream previews use the local rate. Audible-event visualizations and exports follow the resulting sound, without pitch-shifting instruments.
- Manually tapped loops retain their recorded timing and are excluded from rate changes. Optional validated per-track `rate` and `rateChoice` round-trip through JSON/opt-in storage; old projects default to 1×/Automatic.

### Unified inline settings
- Tempo & sound and Music style now live beside Sound animation and Background animation in the four-tile settings home, not in separate sections below the instrument. The existing controls/IDs and event handlers are reused without duplicate inputs or changes to music/export/storage formats.
- Settings subpages keep the square input surface: sliders fit the panel, styles use a scrollable three-column grid, and Back/Escape restore the settings home. The original input mode is retained when closing. All four languages, themes, focus mode and live MP4 adjustment remain supported.

### Optional pads in MP4
- Video layout offers Visualization only (unchanged default), Tap pad, or Note pad in all four languages. The optional validated `recording.videoPad` field round-trips through JSON and opt-in storage; legacy files default to none. Selection is frozen for a take.
- Pad video renders directly from the same accepted/draft score, actual audible-event history, track colours, mute/volume and local clocks. Tap view mirrors the 3×3/focused-pad layout; notes show score previews or the selected pitch/time grid with eight companions. It remains live while input/settings surfaces are hidden, without DOM screenshots, microphone capture or new dependencies. Editor buttons and settings are not included.
- Portrait places the visual above the pad; landscape places them side by side. With a pad, all enabled captions—including provenance and signature—move into a reserved header above both surfaces. Without a pad, the prior layout is unchanged. Recording continues even when the expanded note editor hides the on-page visual.

### Faster social-video visual development
- Enabled video layers now share a staggered cadence, starting after 1.8–2.4 seconds. With all four options enabled, each layer changes about every 5–6 seconds; with only one enabled it changes every 3–5.5 seconds. Long recordings gain more changes rather than stretching the same few scenes across minutes.
- A 1.25-second minimum between changes lets the existing 1.1-second crossfade finish. Disabled layers receive no scheduled changes; the intro/outro retain a brief hold. Playback/audio, manual choices and post-recording restoration are unchanged.

### Orbit radar
- Orbit settings offer Radar alongside Comet, Dot and Pulse in all four languages. Radar also participates in manual tap cycling, random animation choice and randomized video changes, and round-trips as orbit: radar in JSON/opt-in preferences.
- Only actual sounded notes create phosphor-like points and short directional trails; there are no persistent orbit rings, silent grid points or idle sweep heads. Every echo fades completely within 2.4 seconds. Grouped/chord voices keep their distinct head positions. Centre/background remain independent.
- A bounded per-track audible-event history supports timing, direction and dynamics without new audio or musical randomness. Volume, mute and note-glow strength are respected; reduced motion uses stationary fading points without halos or trails. Only visible radar points participate in note hit testing. Focus and MP4 use the same canvas and crossfades.
