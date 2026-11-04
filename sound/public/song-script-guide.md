# JackTools Sound — Song Script v3 / AI authoring guide

Reviewed against the current importer and playback clock: **2026-11-04**.

Give this document to an AI together with a musical description. Ask it to return
ONLY valid JSON, without Markdown fences or commentary. No external service or API
is required by JackTools. The importer interprets data, never executes code.

## Prompt template

Create an ORIGINAL instrumental composition for JackTools Sound using the format
below. Use musical motifs, harmonic development, contrasting scenes and deliberate
instrument levels. Return only JSON. Do not claim to transcribe or reproduce an
existing recording. Include the REQUIRED rights object: distinguish the original
composition, this arrangement, and the synthesized recording; provide licensing
conditions and provenance. Never invent permission, a license, an author or a
source. Keep research checklists and review statuses in separate working notes,
not in customer-facing rights fields. Use factual provenance; do not turn an
unresolved source into a claim of clearance. Choose documented material instead.
For your own project example with no granted usage licence, say "No separate
usage license granted" rather than inventing permission. Preserve applicable
third-party attribution and licence terms. Public-domain composition does not imply a
public-domain arrangement or recording. My brief: [genre, atmosphere, approximate length, instrumentation].

## Root object (all these fields are required)

- `format`: exactly `"jacktools-song"`
- `version`: exactly `3`
- `title`: nonempty string, max 80 characters
- `rights`: REQUIRED object with exactly five nonempty plain-text strings:
  - `composition`: work title/composer and the original composition's rights status,
    including jurisdiction when claiming public-domain status.
  - `arrangement`: arranger/AI assistance and rights/provenance of this adaptation.
  - `recording`: how this recording is produced and whether third-party audio is used.
  - `license`: actual usage terms for the arrangement/recording; if none have
    been granted for your own example, state that without inventing a licence.
    Do not infer a license from "free arrangement", free download or AI generation.
  - `source`: verifiable source/provenance, or explicitly state no source is documented.
  Each field is at most 160 characters; all five joined with newline separators
  must fit within 550 characters. URLs are inert source text, not loaded resources.
  These declarations are supplied information, NOT legal verification by the app.
- `bpm`: number 40–220, measured in the explicitly chosen `tempoUnit`.
- `meter`: REQUIRED object with exactly `numerator` (integer 1–12),
  `denominator` (2, 4, 8 or 16), and `groups` (1–12 positive integers whose sum
  equals the numerator). Examples: 3/4 = `{ "numerator": 3, "denominator": 4, "groups": [1,1,1] }`;
  6/8 = `{ "numerator": 6, "denominator": 8, "groups": [3,3] }`;
  7/8 = `{ "numerator": 7, "denominator": 8, "groups": [2,2,3] }`.
- `tempoUnit`: REQUIRED object with exactly `denominator` (2, 4, 8 or 16)
  and `dotted` (boolean). Quarter = `{ "denominator": 4, "dotted": false }`;
  dotted quarter = `{ "denominator": 4, "dotted": true }`.
  Choose a musically appropriate unit, do not silently treat all BPM as quarters.
  Recommended: 2/2 half; 2/4, 3/4, 4/4, 5/4 quarter;
  3/8 and 7/8 eighth; 6/8, 9/8, 12/8 dotted quarter.
  The meter and tempo unit apply to the WHOLE song in v3.
- `style`: one of electronic, house, pop, rock, classical, jazz, coffeehouse, hiphop, lofi, funk, reggae, drumandbass, latin, ambient, focus, sport. This sets the synthesis character, not a generated melody.
  `slowwaltz` and `tango` exist as generator presets but are currently REJECTED
  as Song Script style IDs. To author a waltz now, use e.g. `classical` or
  `coffeehouse` with explicit 3/4 meter; the style name does not set the meter.
- `loop`: boolean. true repeats the whole song; false stops after the final scene.
- `seed`: integer 0–2147483647, for repeatable velocity variations
- `tracks`: 1–9 track definitions, in orbit/pad order (7,8,9,4,5,6,1,2,3).
  Each has exactly `id` (unique lowercase identifier, starting with a letter,
  then letters/digits/_/-, max 32 chars), `instrument`, and `volume` (0–1).
- `scenes`: 1–256 scene definitions in v3 (v1/v2: 1–64), at most 512 bars in total.

Instrument IDs: kick, snare, hat, bass, marimba, clap, tom, rim, shaker, bells, kalimba, pluck, synthbass, piano, strings, guitar, organ, pad, saxophone, harp, doublebass, epiano, voice, choir, vocalpad, flute, clarinet, trumpet, horn, analoglead, acidbass, shimmer, cello, vibraphone, conga.
Choose low track volumes for pads, strings and secondary instruments. All sounds
are synthetic. Musical data cannot request samples, URLs, plugins, JavaScript,
expressions or arbitrary synth parameters. URLs are allowed ONLY as inert text
in rights declarations; they are never fetched. Unknown properties are rejected rather than ignored.

## Scenes and parts

Each scene has:
- `name`: nonempty string, max 80 chars
- `bars`: even integer 2–64
- `parts`: 0–9 objects with `track` (an existing track id), `notes`, and optionally
  `volume` (0–1, multiplied by the track volume). A track can occur only once per scene.
  An omitted track or empty notes array means SILENCE, not generated accompaniment.
- optional `variation`: number 0–0.15. Seeded relative velocity variation, applied
  on scene entry. It never changes pitch, timing or source data. Default 0.
- optional `visualization`: `orbit`, `landscape`, `stream`, `constellation` or `flower`.
  Accepted as a legacy hint only; it does NOT switch the visualization. Omit it in
  new scripts. The user chooses the visualization independently. Automatic video
  changes run only during recording when explicitly enabled in the video settings.

All versions use TWO-BAR note patterns. V3 supports native meters, including
2/2, 2/4, 3/4, 4/4, 5/4, 3/8, 6/8, 7/8, 9/8 and 12/8, without converting them
to 4/4. Other combinations within the bounded numerator/denominator are supported.
V1/v2 remain straight 4/4 with quarter-note BPM and unchanged playback/velocities.
Do not put v3 fields into v1/v2 files. New AI output MUST use v3 with rights.

A scene repeats its two-bar pattern for its even `bars` duration. To compose
longer phrases, concatenate 2-bar scenes. No meter or tempo changes inside a song
in v3; no swing field yet. Different instruments require different tracks.
Scene changes happen on shared bar boundaries, always at a two-bar boundary.

### Meter quick reference

These are suggested musical groupings/pulses, not a whitelist. In the table,
`tempo denominator` and `dotted` are the two `tempoUnit` fields. The two-bar
window counts DENOMINATOR notes, independently of the tempo unit.

| Meter | groups | tempo denominator | dotted | two-bar window |
| --- | --- | --- | --- | --- |
| 2/2 | [1,1] | 2 | false | 4 |
| 2/4 | [1,1] | 4 | false | 4 |
| 3/4 | [1,1,1] | 4 | false | 6 |
| 4/4 | [1,1,1,1] | 4 | false | 8 |
| 5/4 | [3,2] | 4 | false | 10 |
| 3/8 | [1,1,1] | 8 | false | 6 |
| 5/8 | [2,3] | 8 | false | 10 |
| 6/8 | [3,3] | 4 | true | 12 |
| 7/8 | [2,2,3] | 8 | false | 14 |
| 9/8 | [3,3,3] | 4 | true | 18 |
| 12/8 | [3,3,3,3] | 4 | true | 24 |
| 3/2 | [1,1,1] | 2 | false | 6 |
| 6/4 | [3,3] | 2 | true | 12 |
| 7/4 | [2,2,3] | 4 | false | 14 |
| 9/16 | [3,3,3] | 8 | true | 18 |

### Pickups, tuplets and complete forms

- Positions are local to EACH two-bar scene, not absolute song positions.
  Bar two starts at `at = meter.numerator`, not always `at = 4`.
- A pickup has no dedicated field. Precede it with silent denominator units:
  in 3/4 a one-quarter pickup starts at `at: 2`, the first full bar at `at: 3`.
  The silent time still counts toward scene length and exported duration.
- Dotted notes and tuplets use numeric durations/onsets. In 3/4 a dotted quarter
  is 1.5 units; three eighth-note triplets in one quarter use onsets 0,
  0.333333 and 0.666667, with durations slightly below 0.333333 if desired.
  Do NOT write `1/3` as a JSON value or add a `tuplet` property.
- A note may span the internal bar line but cannot exceed the two-bar window.
  There is no cross-scene tie field: a new scene note retriggers the sound.
  Avoid splitting an important sustain across scenes where possible; otherwise
  document the rearticulation instead of claiming a continuous tie.
- There are no repeat signs or alternative-ending fields. Write every played
  section in order. `bars: 8` repeats the SAME two-bar pattern four times;
  it does not create eight bars of developed melody. Use separate 2-bar scenes
  for a changing eight-bar phrase, and explicitly arrange AABB/volta endings.
- An odd final bar needs a silent transport bar to fit the even scene length.
  Do not insert an invented theme repetition merely to satisfy a length target.
- Meter, grouping, tempo unit and BPM are song-wide. No tempo automation,
  meter changes, rubato/fermata controls, pedal field or swing field is accepted.

## Notes (in DENOMINATOR-NOTE units, not seconds or normalized fractions)

In v3, one unit is the meter's denominator note: a quarter in 3/4, an eighth in
6/8. A two-bar pattern has `window = 2 * meter.numerator` units. Thus a 3/4
pattern is 6 units, a 6/8 pattern is 12 units. This is independent of the BPM unit.
A note at `at: 3` in 6/8 starts on the second dotted-quarter pulse of bar one;
`at: 6` starts bar two. A dotted quarter lasts 3 units, an eighth 1 unit.
In 3/4, a quarter lasts 1, an eighth .5; in 2/2, a half lasts 1, a quarter .5.

Groups provide a gentle dynamic hierarchy: bar start ×1, later group starts
×.94, other whole denominator units ×.88, subdivisions ×.84, before clamping.
Author explicit velocities for phrasing; the app does not invent accompaniment.
Group values are accent lengths, not extra time and not changes of tempo.

Bar duration = `numerator * 4 / denominator * 60 / (bpm * tempoUnitQuarters)`.
`tempoUnitQuarters = 4 / tempoUnit.denominator * (dotted ? 1.5 : 1)`.
At BPM 60, 3/4 with quarter pulse lasts 3 seconds/bar; 6/8 with dotted-quarter
pulse lasts 2 seconds/bar. At the same quarter BPM, 6/8 lasts 3 seconds/bar.

A part has at most 128 notes AFTER expanding chords. Song maximum: 8192 expanded notes.
Each note has:
- `at`: number 0 through `window - minDuration` inside its two-bar pattern
- `duration`: number `minDuration` through `window`; `at + duration` must not exceed `window`.
  V3 `minDuration = max(.016, window * .002)`; v1/v2 retain .016–8 with window 8.
- `pitch`: integer -24–60, or an array of 1–8 distinct integers for simultaneous notes
- `velocity`: number 0–1
- optional `toPitch`: integer -24–60, single-pitch notes only
- optional `toVelocity`: number 0–1

Pitch uses semitone offsets from C4: C4=0, D4=2, E4=4, F4=5, G4=7,
A4=9, B4=11, C5=12, C3=-12. These are reference pitches, NOT a promise that
every synthetic instrument sounds in the same register. In particular:

| Instrument | Sounding register relative to reference | Encode sounding C4 as |
| --- | --- | --- |
| piano, epiano, strings, harp | unchanged | 0 |
| bass, doublebass | two octaves lower | 24 |
| guitar, organ, cello, horn | one octave lower | 12 |

For those instruments, `encoded pitch = desired MIDI note - 60 + register
compensation` (0, 24 or 12 from this table). For example, sounding C3 on
doublebass needs `pitch: 12`, not `pitch: -12`. Never change the melody/key to
compensate for an instrument register accidentally. Other synthetic/vocal voices
have their own spectra/registers; use piano as the pitch reference when checking.
Percussion uses pitch 0. `duration` uses the denominator-note units described above (v1/v2 always quarters).
`toPitch`/`toVelocity` create a linked point at 95% of the duration. Sustained
instruments can glide; plucked/acoustic instruments keep their characteristic
articulation. Drum duration does not stretch the synthesized percussion sound.
Avoid excessive polyphony and dense continuous chords on long sustained voices.
A chord is simultaneous notes, not a note-by-note run. For runs, use separate onsets.

## Minimal valid example

```json
{
  "format": "jacktools-song",
  "version": 3,
  "meter": {"numerator": 4, "denominator": 4, "groups": [1, 1, 1, 1]},
  "tempoUnit": {"denominator": 4, "dotted": false},
  "title": "First Light",
  "rights": {
    "composition": "First Light — AI-assisted original instrumental example.",
    "arrangement": "AI-assisted arrangement for jacktools Sound; no external arrangement documented.",
    "recording": "Created with jacktools Sound and synthetic instruments; no external audio recording.",
    "license": "Project composition and recording: no separate usage license granted.",
    "source": "Newly authored example JSON; no external musical source documented."
  },
  "bpm": 120,
  "style": "house",
  "loop": true,
  "seed": 42,
  "tracks": [
    {"id": "beat", "instrument": "kick", "volume": 0.6},
    {"id": "keys", "instrument": "piano", "volume": 0.35}
  ],
  "scenes": [
    {
      "name": "Intro",
      "bars": 4,
      "parts": [
        {"track": "keys", "notes": [
          {"at": 0, "duration": 3.5, "pitch": [0, 4, 7], "velocity": 0.6},
          {"at": 4, "duration": 3.5, "pitch": [-3, 0, 4], "velocity": 0.6}
        ]}
      ]
    },
    {
      "name": "Main",
      "bars": 8,
      "variation": 0.04,
      "parts": [
        {"track": "beat", "notes": [
          {"at": 0, "duration": 0.2, "pitch": 0, "velocity": 0.9},
          {"at": 1, "duration": 0.2, "pitch": 0, "velocity": 0.8},
          {"at": 2, "duration": 0.2, "pitch": 0, "velocity": 0.8},
          {"at": 3, "duration": 0.2, "pitch": 0, "velocity": 0.8},
          {"at": 4, "duration": 0.2, "pitch": 0, "velocity": 0.9},
          {"at": 5, "duration": 0.2, "pitch": 0, "velocity": 0.8},
          {"at": 6, "duration": 0.2, "pitch": 0, "velocity": 0.8},
          {"at": 7, "duration": 0.2, "pitch": 0, "velocity": 0.8}
        ]},
        {"track": "keys", "notes": [
          {"at": 0, "duration": 1.5, "pitch": 0, "velocity": 0.7},
          {"at": 2, "duration": 1.5, "pitch": 4, "velocity": 0.65},
          {"at": 4, "duration": 1.5, "pitch": 7, "velocity": 0.75},
          {"at": 6, "duration": 1.5, "pitch": 4, "velocity": 0.6}
        ]}
      ]
    }
  ]
}
```

## Complete native 6/8 example

At 60 dotted quarters/minute, each bar lasts 2 seconds and this two-bar scene
lasts 4 seconds. The melody uses all twelve eighth-note positions; the four
lower notes mark the two compound pulses per bar. This is not twelve quarters.

```json
{
  "format": "jacktools-song",
  "version": 3,
  "title": "Two gentle pulses",
  "rights": {
    "composition": "Two gentle pulses — AI-assisted original example.",
    "arrangement": "Original 6/8 demonstration for jacktools Sound.",
    "recording": "Created with jacktools Sound and synthetic instruments; no external audio recording.",
    "license": "Project composition and recording: no separate usage license granted.",
    "source": "Project-authored example; no external musical source."
  },
  "meter": {"numerator": 6, "denominator": 8, "groups": [3, 3]},
  "tempoUnit": {"denominator": 4, "dotted": true},
  "bpm": 60,
  "style": "coffeehouse",
  "loop": false,
  "seed": 42,
  "tracks": [
    {"id": "melody", "instrument": "piano", "volume": 0.38},
    {"id": "support", "instrument": "epiano", "volume": 0.2}
  ],
  "scenes": [{
    "name": "Two compound bars",
    "bars": 2,
    "parts": [
      {"track": "melody", "notes": [
        {"at": 0, "duration": 0.9, "pitch": 0, "velocity": 0.7},
        {"at": 1, "duration": 0.9, "pitch": 4, "velocity": 0.6},
        {"at": 2, "duration": 0.9, "pitch": 7, "velocity": 0.6},
        {"at": 3, "duration": 0.9, "pitch": 12, "velocity": 0.68},
        {"at": 4, "duration": 0.9, "pitch": 7, "velocity": 0.6},
        {"at": 5, "duration": 0.9, "pitch": 4, "velocity": 0.6},
        {"at": 6, "duration": 0.9, "pitch": 5, "velocity": 0.7},
        {"at": 7, "duration": 0.9, "pitch": 9, "velocity": 0.6},
        {"at": 8, "duration": 0.9, "pitch": 12, "velocity": 0.6},
        {"at": 9, "duration": 0.9, "pitch": 9, "velocity": 0.68},
        {"at": 10, "duration": 0.9, "pitch": 5, "velocity": 0.6},
        {"at": 11, "duration": 0.9, "pitch": 0, "velocity": 0.55}
      ]},
      {"track": "support", "notes": [
        {"at": 0, "duration": 2.8, "pitch": -12, "velocity": 0.55},
        {"at": 3, "duration": 2.8, "pitch": -5, "velocity": 0.5},
        {"at": 6, "duration": 2.8, "pitch": -7, "velocity": 0.55},
        {"at": 9, "duration": 2.8, "pitch": -12, "velocity": 0.48}
      ]}
    ]
  }]
}
```

## Use in the tool

Open Files & Recording → Song Script. Paste the JSON and load it, or use file upload.
The checkmark applies valid pasted JSON, closes the dialog and starts playback at scene 1. Invalid JSON keeps the dialog open and does not interrupt the current song. File and example imports never start audio automatically; close the dialog and press normal Play.
Stop/Play normally restarts the script; while the expanded note editor is open,
Play auditions the held visible section instead and preserves the draft. The built-in example is Sunlit Session: an
original 125 BPM, nine-track house sketch, 72 bars (about 2:18), with six scenes.
It is not a transcription of Movin' To The Sun or another existing recording.

Draw, tap and use the note editor to temporarily change the current scene; the
next scene entry restores the scripted notes. While the expanded note grid is
open, its visible two-bar section loops without advancing scenes or ending the
song. Instrument switching stays inside the same section. Accept or cancel closes
the editor; playback then continues with the next source pair at a two-bar
boundary, without skipping sections because of elapsed editing time. Opening the
editor while stopped does not start audio. Generated arrangements are held too,
and any previously active Random Play resumes after leaving the section loop.
The editor also provides a mute/unmute-all-others button and individual companion
orbit mute buttons. The selected instrument always bypasses these audition mutes,
including its original track mute/disabled flag (master and track volume still
apply). Switching instruments keeps the audition mix; closing the editor restores
the saved mix. Audition mutes are never exported or persisted.
Only the edited lane is accepted; frozen companion previews are not saved as new
scores. This audition loop itself is temporary, not a new JSON repeat property.
Script download preserves the source
composition, not these temporary edits. Normal settings JSON includes the song
script too. Optional browser persistence stores it only with the existing consent.
Leaving script mode keeps the current patterns. Random Play clears scripted scores
and resumes generation; choosing a music style or clearing notes also leaves the mode.
WAV/MP4 capture uses the same engine. Optional video captions use the script title, scene names and a composed-song notice rather than claiming random melodies. Custom video titles still take priority. For a finite song (`loop:false`), recording
ends when playback stops; use `loop:true` for uninterrupted recordings of arbitrary length.
Do not select Random Play for the recording if you want the composed script.

Limits: UTF-8 JSON file at most 1 MiB; no arbitrary executable data. Song Script
is a versioned first implementation, not MIDI/MusicXML import or full DAW automation.

## Whole-song video and credits
In Files & Recording → MP4, choose **Whole song** to restart the loaded script and
record one complete pass, including for looped songs, plus 2 seconds of decay.
The fixed recording duration is ignored for this video mode. Recording Random
Play is disabled for loaded scripts; visual animation changes remain optional.
You can append a separate **3-second Music & rights** card with editable plain
text. Enter verified composition/arrangement/recording information yourself;
the app does not infer a license or public-domain status from the title.
Song rights metadata is always appended to a video, regardless of the optional
credits checkbox, even after a manual recording stop. Optional credits text is
additional and cannot replace the mandatory song metadata. The metadata remains
in the source JSON and project export; video preferences remain in settings.

## Legacy compatibility
Version 1 scripts remain importable for existing projects. If rights are present,
they must satisfy the same validation. Without rights, EVERY song video receives
an explicit "Rights information missing; no license or public-domain status
confirmed" card. New AI output MUST use version 3 with all five rights fields, meter and tempoUnit.
Do not use version 1 as a workaround to omit rights information.

## Migration and verification

Never “repair” a melody by squeezing its original rhythm into 4/4. Re-author its
notes in the original meter, with appropriate accompaniment. Merely changing
`version` and adding `meter` to a previously adapted study does not restore it.
A v2 4/4 file can be migrated unchanged to v3 with meter 4/4, groups [1,1,1,1]
and undotted-quarter tempo, but v3 introduces the documented gentle meter accents.
V1/v2 source files remain valid and are never rewritten automatically.

The native-meter demo is `/examples/meter-study-6-8.song.json`.
The current library productions and Coffeehouse renditions use v3 with their
native meters. The standalone Sunlit Session and Morning Light examples remain
legacy v2; importing them does not automatically change their meter or notation.
Whole-song MP4 capture is limited to approximately 51 minutes; longer takes are
rejected rather than silently exporting a truncated song without rights.

## Orbit sets / multi-set projects

The grid button before Draw manages up to **nine complete sets of nine tracks**
as an inline main view, like the tap pads, not a modal overlay. Selecting a set
keeps this grid visible; the main orbit and playback controls remain usable.
Double-click/double-tap a tile, or press F2 on its focused button, to rename it
in a small overlay. Enter/the checkmark saves; Escape/cancel discards the draft.
The selected set is the editing target, not the only audible set. All unmuted sets
share Start/Stop, BPM, meter and tempo unit. Style, instruments, notes and transpose
are per set. Selecting another set does not restart the transport. Blank slots
start silent. Existing library songs load unchanged into the selected set; an old
settings file replaces the bank with one set. Different notated meters cannot be
combined in one project; use New project rather than relabelling the source meter.
The first additional set fixes the existing meter as the common project clock.
Subsequent song imports follow that common tempo instead of changing every set.

**A `jacktools-song` still has at most nine tracks.** Do not put 81 tracks or new
`orbits` keys into it. For now, author each complete song/set separately and load
it into its chosen slot. The app's settings/project JSON export preserves the bank.
The separate Song Script download still exports only the selected source song.

Multi-set exports use `format: "jacktools-orbit-project"`, `version: 1`:
- `active`: integer 0–8; `bpm`: 40–220; master `volume`: 0–0.7.
- `clock`: `{meter, tempoUnit, quarters, steps, swing}`. Meter and tempo unit use
  the definitions above; `quarters = numerator * 4 / denominator`,
  `steps = quarters * 4`; swing is 0–0.6.
- `sets`: exactly nine `{name, muted, settings, barOffset}` objects. Names are
  max. 80 characters. An unused slot has `settings: null`; the active slot must
  contain complete v2 settings, not a bare song script, unless all nine slots are
  empty. Removing an orbit sets its settings to null; the central + recreates it. Settings can contain the
  unchanged source `songScript`. `barOffset` is 0 in exported restartable projects.

Use an exported project as the settings template; do not invent settings fields
or recursively nest project files. Project import is atomic and limited to 12 MiB;
each source song retains its original bounds. Consent-based storage restores all
sets and the selection, but never starts playback. The preview-only note-editor
mute mix and unaccepted note drafts are not committed by background set playback.
Random Play develops the selected set; other sets play their saved scores/patterns.
An active note-editor loop holds that set's section; the other sets keep running.

The current recording image and song-specific credits/whole-song option still
refer to the selected set, while the audio output contains the full mix. Multi-work
publication needs attribution for all source works; a dedicated project-wide
credits/arrangement timeline is a separate extension. Background polyphony is
bounded at 96 voices to protect the browser; avoid stacking excessive chords.
