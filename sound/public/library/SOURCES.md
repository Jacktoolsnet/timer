# Native-meter library productions — 2026-11-03

Twelve developed, deterministic Song Script v3 productions replace the short
motif starters. Actual source voices, chromatic harmony, octaves, pickups and
native meters replace generic major/minor backing. These are synthesized
arrangements, not commercial recordings, studio masters or Urtext performances.

## Sources and exact scope

| Production | Source | Meter | Bars incl. padding | Duration | Scope |
| --- | --- | --- | --- | --- | --- |
| Canon in D · Canonic Lights · classical | [Mutopia](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1700) | 4/4 | 60 | 3:09 | Full 44-bar violin source; free three-voice canon, ground and coda. Not the complete original score. |
| Eine kleine Nachtmusik · I · classical | [Mutopia](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=900) | 4/4 | 192 | 5:49 | Complete first-movement score MIDI, including its encoded repeats; string ensemble. |
| Rondo alla turca · classical | [Mutopia](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=108) | 2/4 | 218 | 4:02 | Complete score-event sequence and all source voices; repeats as encoded in the vendored performance. |
| Canon in D · Canonic Lights · house | [Mutopia](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1700) | 4/4 | 60 | 1:58 | Full 44-bar violin source; free three-voice canon, ground and coda. Not the complete original score. |
| Ode an die Freude · Hymnenthema · house | [Mutopia](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=528) | 4/4 | 56 | 1:48 | Complete 16-bar SATB hymn setting, twice, with original intro/break/outro. Not the complete symphony. |
| Für Elise · house | [Mutopia](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=931) | 3/8 | 126 | 2:38 | Complete score-event sequence and all source voices; repeats as encoded in the vendored performance. |
| The Entertainer · jazz | [Mutopia](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=263) | 2/4 | 152 | 3:27 | Complete score-event sequence and all source voices; repeats as encoded in the vendored performance. |
| Maple Leaf Rag · jazz | [Mutopia](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=23) | 2/4 | 146 | 3:03 | Complete score-event sequence and all source voices; repeats as encoded in the vendored performance. |
| The Easy Winners · jazz | [Mutopia](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=352) | 2/4 | 152 | 3:23 | Complete score-event sequence and all source voices; repeats as encoded in the vendored performance. |
| Gymnopédie No. 1 · lofi | [Mutopia](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=37) | 3/4 | 78 | 3:54 | Complete score-event sequence and all source voices; repeats as encoded in the vendored performance. |
| Träumerei · lofi | [Mutopia](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=504) | 4/4 | 26 | 1:51 | Complete score-event sequence and all source voices; repeats as encoded in the vendored performance. |
| Prélude e-Moll · op. 28/4 · lofi | [Mutopia](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=468) | 2/2 | 26 | 1:51 | Complete score-event sequence and all source voices; repeats as encoded in the vendored performance. |

Transport bar counts include initial rests to align pickups and final padding
for two-bar patterns; these are not necessarily printed bar counts.

Gymnopédie uses the 31-bar body + first 8-bar ending, then the body + second
ending: 78 bars. Für Elise and Rondo alla turca also use newly unfolded repeats.
Nachtmusik is the complete **first movement**, not the whole serenade.
Canon uses the full **44-bar single-violin source in a free canonic production**,
not the complete original multi-part score. Ode uses a **complete 16-bar SATB
hymn-theme setting**, not the Ninth Symphony or its finale.

## Production

- Classical: four independently balanced string parts in Mozart; both original
  piano hands in the Turkish Rondo.
- House: bass/continuo, entrance/break/outro filtering and sparse turnarounds.
  Für Elise uses three eighth-note pulses in 3/8, deliberately not hidden 4/4.
  Canon has a harmonized eight-chord ground and three delayed voices.
- Jazz: original ragtime syncopation, bass movement and inversions. Piano,
  low notes reassigned to restrained double bass, quiet percussion.
  Straight ragtime, **not forced swing**.
- Lo-Fi: softer electric piano, quiet cello bass and sparse percussion;
  source inner voices and chromatic progressions remain intact.
- Source velocities, chord balance, conservative gains, gentle phrase envelopes
  and final decays are deterministic. No random note substitution or invented
  reharmonization, and no copied theme/reprise filler in the full-score pieces.

## Engine limitations

Long source notes crossing two-bar boundaries are split and softly rearticulated;
counts are in [production-report.json](./production-report.json).
Pedal/controller data, printed expressive text and changing rubato/ritardando
tempo maps are not reproduced. Each production uses one explicit tempo with
note-based dynamics. These are fuller arrangements, not a human performance.
The standalone Morning Light example is unchanged; library Canon entries now use
the separately documented canonic production.

## Reproduction and rights

Inputs in scripts/scores/ include original LilyPond headers and source MIDI,
plus three repeat-unfolded performances. Run
python3 scripts/build-song-library.py offline (standard library only).
An optional LilyPond rebuild is described in scripts/scores/README.md.
The production report pins actual performance hashes and note counts.

Source editions except Canon are designated **Public Domain by their typesetters**.
Original compositions are public domain in Germany, not a worldwide clearance,
platform or Content-ID guarantee. No external recordings or audio samples are
bundled. No separate licence for new project additions or recordings is invented.

**Canon exception:** based on work by **Jim Paterson (www.mfiles.co.uk)**,
engraving **Anonymous**, © 2009, **Mutopia 1700**, under
[Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/).
Changes: added imitative voices, bass ground, continuo, coda, instrumentation and
production. Attribution and licence are retained in mandatory song rights,
displayed before loading and included in video exports.
Do not label this edition Public Domain or remove these notices.

Other source maintainers: Mozart 900 Anonymous, 108 Rune Zedeler / Chris Sawer;
Beethoven 931 Stelios Samelis (Breitkopf & Härtel 1888), 528 Peter Chubb;
Joplin 263 Chris Sawer / Simon Albrecht (1902), 23 Chris Sawer (1899),
352 Tom Harke (1901); Satie 37 Evin Robertson (Dover, modern translations
excluded); Schumann 504 Ying-Chun Liu (Leichte Stücke 1900);
Chopin 468 Magnus Lewis-Smith (Peters 1879).
