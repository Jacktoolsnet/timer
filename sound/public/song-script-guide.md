# JackTools Sound — Song Script v3 / AI authoring guide

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
source. If rights are unknown, say "Unverified; no usage permission confirmed"
explicitly in the affected fields. Public-domain composition does not imply a
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
  - `license`: actual usage terms for the arrangement/recording, or explicitly unverified.
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
- `loop`: boolean. true repeats the whole song; false stops after the final scene.
- `seed`: integer 0–2147483647, for repeatable velocity variations
- `tracks`: 1–9 track definitions, in orbit/pad order (7,8,9,4,5,6,1,2,3).
  Each has exactly `id` (unique lowercase identifier, starting with a letter,
  then letters/digits/_/-, max 32 chars), `instrument`, and `volume` (0–1).
- `scenes`: 1–64 scene definitions, at most 512 bars in total.

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
A4=9, B4=11, C5=12, C3=-12. Some instruments retain their native register.
Percussion uses pitch 0. `duration` uses the denominator-note units described above (v1/v2 always quarters).
`toPitch`/`toVelocity` create a linked point at 95% of the duration. Sustained
instruments can glide; plucked/acoustic instruments keep their characteristic
articulation. Drum duration does not stretch the synthesized drum sample.
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
    "composition": "First Light — AI-assisted instrumental example; rights unverified.",
    "arrangement": "AI-assisted arrangement for jacktools Sound; no external arrangement documented.",
    "recording": "Synthesized with jacktools Sound; no third-party recording supplied.",
    "license": "Unverified; no usage permission or public-domain status confirmed.",
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

## Use in the tool

Open Files & Recording → Song Script. Paste the JSON and load it, or use file upload.
The checkmark applies valid pasted JSON, closes the dialog and starts playback at scene 1. Invalid JSON keeps the dialog open and does not interrupt the current song. File and example imports never start audio automatically; close the dialog and press normal Play.
Stop/Play always restarts the script. The built-in example is Sunlit Session: an
original 125 BPM, nine-track house sketch, 72 bars (about 2:18), with six scenes.
It is not a transcription of Movin' To The Sun or another existing recording.

Draw, tap and use the note editor to temporarily change the current scene; the
next scene entry restores the scripted notes. Script download preserves the source
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
The current curated studies deliberately remain v2 until musically revised.
Whole-song MP4 capture is limited to approximately 51 minutes; longer takes are
rejected rather than silently exporting a truncated song without rights.
