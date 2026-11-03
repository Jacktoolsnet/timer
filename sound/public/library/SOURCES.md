# Song library — first release (2026-11-03)

Four styles, three works each. These are **our own simplified, AI-assisted motif studies**,
not complete editions, authentic performances or imported recordings. The longer
Pachelbel “Morning Light” example is reused unchanged. The other eleven studies
have a theme, a slightly louder reprise and a coda (18 bars, straight 4/4).
House has a four-on-the-floor backing, Jazz a simplified ragtime backing, Lo-Fi
soft electric piano and sparse percussion. “Random” is the existing music generator,
not a random choice of a library work.

## Sources and scope

The melodic reductions were entered from the opening themes of the following
scores; ornamentation, lower voices, repeats, pickups and harmony are simplified
or changed. No source recording, MIDI file, modern commercial arrangement or
external audio sample is bundled. Sources are provenance links, never executable
input. The generator is `scripts/build-song-library.py` (Python standard library).

| Work | Composer | Reference edition / typesetter | Original → app |
| --- | --- | --- | --- |
| Canon in D | Johann Pachelbel (1653–1706) | [Work reference, original scores section](https://imslp.org/wiki/Canon_and_Gigue_in_D_major_(Pachelbel,_Johann)); existing project Morning Light arrangement; House uses a reduced opening theme, not the entire canon | 4/4 → 4/4 |
| Eine kleine Nachtmusik, I | W. A. Mozart (1756–1791) | [Mutopia 900](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=900), anonymous typesetter, 2007, source IMSLP, header Public Domain | 4/4 → 4/4 |
| Rondo alla turca | W. A. Mozart | [Mutopia 108](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=108), Rune Zedeler / Chris Sawer, 2015, source IMSLP, Public Domain | 2/4 → 4/4, rhythmic adaptation |
| Ode an die Freude, instrumental theme | L. van Beethoven (1770–1827) | [Symphony 9, original scores](https://imslp.org/wiki/Symphony_No.9,_Op.125_(Beethoven,_Ludwig_van)); familiar instrumental theme reduced, transposed to C; no lyrics or modern arrangement | 4/4 → 4/4 |
| Für Elise | L. van Beethoven | [Mutopia 931](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=931), Stelios Samelis, Breitkopf & Härtel 1888, Public Domain | 3/8 → 4/4, freely regrouped motif |
| The Entertainer | Scott Joplin (1868–1917) | [Mutopia 263](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=263), Chris Sawer / Simon Albrecht, reproduction of 1902 edition, Public Domain | 2/4 → 4/4, stretched rhythm, single melody line |
| Maple Leaf Rag | Scott Joplin | [Mutopia 23](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=23), Chris Sawer, reproduction of 1899 edition, Public Domain | 2/4 → 4/4, stretched rhythm, single melody line |
| The Easy Winners | Scott Joplin | [Mutopia 352](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=352), Tom Harke, reproduction of 1901 edition, Public Domain | 2/4 → 4/4, stretched rhythm, single melody line |
| Gymnopédie No. 1 | Erik Satie (1866–1925) | [Mutopia 37](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=37), original score reproduced in Dover; modern English translations excluded by source; Public Domain | 3/4 → 4/4, extra sustained beat; melody transposed |
| Träumerei, op. 15 no. 7 | Robert Schumann (1810–1856) | [Mutopia 504](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=504), Ying-Chun Liu, Leichte Stücke 1900, Public Domain; source header date “18th C.” is erroneous and not reused | 4/4 → 4/4, pickup omitted |
| Prélude e minor, op. 28 no. 4 | Frédéric Chopin (1810–1849) | [Mutopia 468](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=468), Magnus Lewis-Smith, Peters 1879, Public Domain | 2/2 → 4/4, quarter-note subdivision, pickup omitted |

The Mutopia LilyPond headers and opening notes were inspected in the
[Mutopia source repository](https://github.com/MutopiaProject/MutopiaProject/tree/master/ftp).
The source's public-domain designation is recorded, not extended to unrelated
arrangements or recordings on the same sites.

## Rights, not a blanket clearance

Original compositions are public domain in Germany on the basis of the composers'
death dates and [§ 64 UrhG](https://www.gesetze-im-internet.de/urhg/__64.html)
with [§ 69 UrhG](https://www.gesetze-im-internet.de/urhg/__69.html).
This does not assert universal public-domain status or that any modern edition,
arrangement or recording is cleared. No automatic worldwide or platform/Content-ID
guarantee is made. No separate usage licence for these project arrangements or
recordings has been granted by the project owner here; the v2 rights explicitly
say so. Decide on a project-wide output licence separately, rather than inventing
one from the age of the original melody.

Every bundled song is v2 and carries composition, arrangement, recording, licence
and source declarations. Existing mandatory video credits consume these without
special casing. The dialog links the source and explains these limitations before
selection; the full declarations are also available in Files after loading.

Other time signatures and longer, more faithful editions are a separate future
schema/engine discussion. This release does not change the Song Script format.
