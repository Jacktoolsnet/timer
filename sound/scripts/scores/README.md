# Offline score inputs — retrieved 2026-11-03

## Additional Coffeehouse preview input (not in the library catalog)

`chopin-a-edition/` preserves Magnus Lewis-Smith's unmodified Public Domain
Mutopia 470 notation (Edition Peters), including its attribution/license header.
`chopin-a.mid` is locally score-compiled symbolic data, not a downloaded MIDI
performance. Rebuild optionally with `python3 scripts/rebuild-coffeehouse-score.py`
and LilyPond 2.24; the preview itself only needs Python to regenerate.
`chopin-a.source.json` records the helper archive, its hash, and the separate
historical IMSLP 85374 evidence. Do not call this an independent transcription
solely from that scan or an approved first-edition reproduction: full historical
reconciliation and listening acceptance remain pending. See
`docs/COFFEEHOUSE_PREVIEW.de.md` for the exact production scope and limitations.

## Additional Schumann and Brahms Coffeehouse inputs

`schumann-foreign-edition/original.ly`: Ying-Chun Liu, Mutopia 354, Public Domain,
source "Leichte Stucke, 1900". `performance.ly` is syntax-converted for LilyPond
2.24, with the four musical voices isolated into separate MIDI staves and
engraving-only staff changes removed. `schumann-foreign.mid` is the complete
22-bar single pass (240 events). `coffeehouse-score-form.py` assembles BOTH
historical repeat signs into AABB: `schumann-foreign.performance.mid`, 44 bars,
480 events. No notes cross the section cuts. No original source file is replaced.

`brahms-waltz-edition/original.ly`: Brian D. Rude, Mutopia 794, Public Domain,
source "Ed. R. Joseffy". `performance.ly` is syntax-converted for LilyPond 2.24.
`brahms-waltz.mid` contains the helper's full 44-bar played form, 720 events,
including the written-out opening repeat and triplet coda. Editorial ornament
and rhythmic readings are not claimed as exact first-edition readings.

Both `.source.json` files pin the original notation download and its SHA-256,
historical evidence reference and remaining comparison limits. Rebuild with
`python3 scripts/rebuild-coffeehouse-score.py`; no remote MIDI or recordings.
See `docs/COFFEEHOUSE_PRODUCTIONS.de.md` for production scope and limitations.

## Existing library inputs

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
