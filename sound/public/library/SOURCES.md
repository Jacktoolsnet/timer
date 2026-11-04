# Native-meter library productions — 2026-11-03

Twelve developed, deterministic Song Script v3 productions replace the short
motif starters. Actual source voices, chromatic harmony, octaves, pickups and
native meters replace generic major/minor backing. These are synthesized
arrangements, not commercial recordings, studio masters or Urtext performances.

## Sources and exact scope

| Production | Source | Meter | Bars incl. padding | Duration | Scope |
| --- | --- | --- | --- | --- | --- |
| Canon in D · 3 Violinen und Basso · classical | [Mutopia](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2047) | 4/4 | 58 | 4:13 | Complete four-part Canon score: three violins and bass, with original entrances and ending; no invented voices or coda. Synthesized interpretation. |
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
The Classical Canon uses the **complete four-part score for three violins and
bass**, including its original entrances and ending. Only the House Canon uses
the **44-bar single-violin source in a free canonic production**. Ode uses a **complete 16-bar SATB
hymn-theme setting**, not the Ninth Symphony or its finale.

## Production

- Classical: four independently balanced string parts in Mozart; both original
  piano hands in the Turkish Rondo.
- House: bass/continuo, entrance/break/outro filtering and sparse turnarounds.
  Für Elise uses three eighth-note pulses in 3/8, deliberately not hidden 4/4.
  The House Canon has a harmonized eight-chord ground and three delayed voices.
  The Classical Canon uses only the four source voices, with no invented coda.
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
The standalone Morning Light example is unchanged. The first library Canon uses
the complete four-part score; the House Canon remains a separate free production.

## Reproduction and rights

Inputs in scripts/scores/ include original LilyPond headers and source MIDI,
plus three repeat-unfolded performances. Run
python3 scripts/build-song-library.py offline (standard library only).
An optional LilyPond rebuild is described in scripts/scores/README.md.
The production report pins actual performance hashes and note counts.

Source editions except the two Canon editions are designated **Public Domain by their typesetters**.
Original compositions are public domain in Germany, not a worldwide clearance,
platform or Content-ID guarantee. No external recordings or audio samples are
bundled. No separate licence for new project additions or recordings is invented.

**House Canon exception:** based on work by **Jim Paterson (www.mfiles.co.uk)**,
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


**Classical Canon source:** [Mutopia 2047](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2047),
**Michael Fischer v. Mollard**, © 2015, based on IMSLP, under
[CC BY 4.0 International](https://creativecommons.org/licenses/by/4.0/).
All 1,956 notes in the three violin parts and bass are retained, with the actual
score's staggered entrances at quarter positions 8/16/24 and bass from 0.
No invented imitation, harp part, harmonic filler or coda is present.
Rendering changes: synthetic strings/cello, balance, gentle velocity shaping,
97% articulation and final silent padding for the two-bar transport.
The edition's quarter = 55 is retained; it is not claimed to be Pachelbel's
tempo prescription. This is score-based, not a historically authenticated
performance or proof of the composer's exact sound intentions.
The full licence, author, source and change notices remain in mandatory rights.
The House version and all eleven other song files remain unchanged.

### Four-orbit Canon edition (2026-11-04)

`classical-canon.orbit.json` separates the existing full performance into Violin I,
II, III and Basso. It does not introduce a new score source or new notes. The
original single-set JSON remains unchanged. All 1,956 note events, entrances,
rests and the 58-bar transport length are preserved, as are the complete source,
author and licence notices in each embedded part. Per-part gain is doubled to
compensate the four-set mix trim; source balance is retained. Source lane indices
and seeds are kept, and all four parts share one clock at quarter = 55.
Generated offline by `scripts/build-canon-orbits.py`, also called by the regular
library builder. Library `projectPath` loads the full bank; five slots remain free.
