# JackTools Sound — Song Script v1 / AI authoring guide

Give this document to an AI together with a musical description. Ask it to return
ONLY valid JSON, without Markdown fences or commentary. No external service or API
is required by JackTools. The importer interprets data, never executes code.

## Prompt template

Create an ORIGINAL instrumental composition for JackTools Sound using the format
below. Use musical motifs, harmonic development, contrasting scenes and deliberate
instrument levels. Return only JSON. Do not claim to transcribe or reproduce an
existing recording. My brief: [genre, atmosphere, approximate length, instrumentation].

## Root object (all these fields are required)

- `format`: exactly `"jacktools-song"`
- `version`: exactly `1`
- `title`: nonempty string, max 80 characters
- `bpm`: number 40–220 (quarter-note beats per minute)
- `style`: one of electronic, house, pop, rock, classical, jazz, coffeehouse, hiphop, lofi, funk, reggae, drumandbass, latin, ambient, focus, sport. This sets the synthesis character, not a generated melody.
- `loop`: boolean. true repeats the whole song; false stops after the final scene.
- `seed`: integer 0–2147483647, for repeatable velocity variations
- `tracks`: 1–9 track definitions, in orbit/pad order (7,8,9,4,5,6,1,2,3).
  Each has exactly `id` (unique lowercase identifier, starting with a letter,
  then letters/digits/_/-, max 32 chars), `instrument`, and `volume` (0–1).
- `scenes`: 1–64 scene definitions, at most 512 bars in total.

Instrument IDs: kick, snare, hat, bass, marimba, clap, tom, rim, shaker, bells, kalimba, pluck, synthbass, piano, strings, guitar, organ, pad, saxophone, harp, doublebass, epiano, voice, choir, vocalpad, flute, clarinet, trumpet, horn, analoglead, acidbass, shimmer, cello, vibraphone, conga.
Choose low track volumes for pads, strings and secondary instruments. All sounds
are synthetic. No samples, URLs, plugins, JavaScript, expressions or arbitrary
synth parameters can be supplied. Unknown properties are rejected rather than ignored.

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

V1 uses straight 4/4 and TWO-BAR note patterns. A scene repeats its pattern for
its `bars` duration. To compose longer phrases rather than loops, concatenate
multiple 2-bar scenes with different notes. No tempo changes or instrument changes
inside a scene in v1. Different instruments require different tracks.
Scene changes happen on shared bar boundaries; every scene starts on a two-bar boundary.

## Notes (in quarter-note BEATS, not seconds or normalized fractions)

A part has at most 128 notes AFTER expanding chords. Song maximum: 8192 expanded notes.
Each note has:
- `at`: number 0–7.984 inside its two-bar pattern
- `duration`: number 0.016–8; `at + duration` must not exceed 8
- `pitch`: integer -24–60, or an array of 1–8 distinct integers for simultaneous notes
- `velocity`: number 0–1
- optional `toPitch`: integer -24–60, single-pitch notes only
- optional `toVelocity`: number 0–1

Pitch uses semitone offsets from C4: C4=0, D4=2, E4=4, F4=5, G4=7,
A4=9, B4=11, C5=12, C3=-12. Some instruments retain their native register.
Percussion uses pitch 0. `duration`: quarter=1, eighth=.5, sixteenth=.25.
`toPitch`/`toVelocity` create a linked point at 95% of the duration. Sustained
instruments can glide; plucked/acoustic instruments keep their characteristic
articulation. Drum duration does not stretch the synthesized drum sample.
Avoid excessive polyphony and dense continuous chords on long sustained voices.
A chord is simultaneous notes, not a note-by-note run. For runs, use separate onsets.

## Minimal valid example

```json
{
  "format": "jacktools-song",
  "version": 1,
  "title": "First Light",
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
