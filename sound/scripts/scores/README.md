# Offline score inputs — retrieved 2026-11-03

Symbolic score events, **not audio recordings or commercial MIDI performances**.
Original .ly files retain edition, maintainer and licence headers. Each
.source.json records the exact Mutopia landing page and original MIDI URL.

Public Domain according to source headers: Mozart KV525/I (900), KV331/III (108);
Beethoven WoO59 (931); Joplin Entertainer (263), Maple Leaf (23), Easy Winners
(352); Satie Gymnopédie 1 (37); Schumann Träumerei (504); Chopin op.28/4 (468);
Beethoven / Peter Chubb SATB hymn setting (528).

**House exception: canon.*, Mutopia 1700.** Based on work by Jim Paterson,
www.mfiles.co.uk; engraving by Anonymous, © 2009.
[Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/).
The entire 44-bar single-violin edition is used in a new canonic arrangement,
with added delayed voices, ground, continuo, coda and instrumentation.
**Not a complete original multi-part score.** Keep attribution and licence link
in redistributed material and mandatory song/video rights. Do not call this
edition Public Domain.

Original .mid files are the downloaded previews. elise.performance.mid,
gymno.performance.mid and turca.performance.mid were rebuilt with LilyPond 2.24.1,
inserting the unfoldRepeats command at the score expression so repeated sections
and alternative endings play in order. Other previews already encode the
intended played form; Träumerei's source explicitly uses a single pass.

Optional rebuilding with LilyPond installed:
python3 scripts/rebuild-score-performances.py

Normal offline generation (Python standard library only):
python3 scripts/build-song-library.py

Output production-report.json pins input SHA-256 hashes, note counts, scope and
boundary rearticulations. Downloaded sources are never executed in the app;
only validated v3 JSON is served as music. Standalone Morning Light is unchanged.


## Classical Canon: complete four-part source (Mutopia 2047)

canon-original.mid is the unmodified full-score member
canon_per_3_violini_e_basso.mid of the source MIDI ZIP.
canon-original.source.json records both archive URLs and the member name.
The complete original LilyPond files are preserved in canon-original-edition/.

Edition: **Michael Fischer v. Mollard**, © 2015, Mutopia-2015/09/02-2047,
IMSLP source, **Creative Commons Attribution 4.0 International**:
https://creativecommons.org/licenses/by/4.0/
https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2047

All 1,956 notes in all four source parts are retained: Violin I, II, III, bass.
The violin entrances at quarter positions 8, 16 and 24 and the bass from position
0 come directly from the score; no invented delayed copies, arpeggios, extra
voices or coda are added. MIDI uses quarter = 55, an edition choice, not a claim
of Pachelbel's prescribed tempo. Original sounding registers are retained despite
the engine's transposing cello patch. The source's final bar is padded for the
engine's two-bar transport, not filled with new notes.

Changes: synthetic strings/cello rendering, balance, gentle velocity shaping and
97% note articulation. Source pitches, note onsets and voice allocation are
unchanged. The score has zero notes crossing two-bar boundaries. This is an
original-score-based synthetic interpretation, **not historically authenticated
sound or proof of the composer's exact intentions**. Retain author, source,
licence and change notices in mandatory song/video rights.
