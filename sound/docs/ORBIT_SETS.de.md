# Orbit-Sets — Grundlage

Stand: 2026-11-04

## Bedienung

- Der Raster-Button vor „Zeichnen“ zeigt neun Set-Plätze direkt in der Hauptansicht, wie Zeichnen und Tap-Pads.
  Es öffnet sich kein Overlay; Haupt-Orbit und Transport bleiben zugänglich.
- Anordnung wie beim Zahlenblock: oben 7–8–9, mittig 4–5–6, unten 1–2–3.
  Die internen Set-IDs bleiben unverändert; vorhandenes Set 1 liegt jetzt unten links.
  Einfaches Antippen (auch der Ziffer) oder Ziffern-/Numblocktasten wählen das Set.
  Haken und Akzentrahmen markieren die Auswahl.
- Jeder Platz enthält bis zu neun Instrumentenspuren, nicht nur ein Instrument.
- Ein Set wird bearbeitet; alle belegten, nicht stummgeschalteten Sets spielen
  parallel. Auswählen ist kein Solo-Schalter und startet die Wiedergabe nicht neu.
- Leere Plätze beginnen ohne automatisch erzeugte Begleitung. Über Musikrichtung,
  Instrumente, Zeichnen, Klopfen oder Noten lassen sie sich aufbauen.
- Doppelklick/Doppeltipp auf eine Kachel öffnet das kleine Namens-Overlay;
  alternativ F2 bei fokussierter Kachel. Enter bzw. der Haken übernimmt,
  Escape oder Abbrechen verwirft den Entwurf. Leere Eingabe stellt den automatischen Namen wieder her.
- Direkt in jeder Kachel liegen Duplizieren (links), Set-Mute (Mitte) und
  Leeren (rechts), jeweils mit Icon und Tooltip. Sie wirken auf diese Kachel,
  ohne das Bearbeitungs-Set zu wechseln. Entfernen gibt den Platz vollständig frei. Die leere Kachel zeigt ein Plus
  zum Hinzufügen eines frischen Orbits. Beim Entfernen des aktiven Orbits wird ein
  anderes vorhandenes Set ausgewählt; ohne verbleibende Sets stoppt die Wiedergabe.
  Auch ein vollständig leeres Projekt bleibt speicher- und wiederherstellbar.
- Namen, Duplizieren, Set-Mute und Leeren sind in der Set-Ansicht verfügbar. Auswählen lässt das Raster geöffnet;
  die übrigen Ansichtsbuttons wechseln zu Zeichnen, Tap-Pads, Noten oder Einstellungen. Leeren und
  „Neues Projekt“ verlangen eine Bestätigung; Letzteres verwirft die gesamte Bank.
- Tempo, Takt einschließlich Tempoeinheit und Start/Stopp sind gemeinsam. Beim
  ersten zusätzlichen Set wird die bisherige Taktart als Projekt-Takt übernommen.
  Weitere Song-Skripte müssen dieselbe notierte Taktart besitzen. Ihr Notenmaterial
  läuft dann im gemeinsamen Projekttempo; ein Import verstellt dieses nicht.
- Instrumente, Noten, Zeichnungen, Klopfmuster, Musikrichtung, Transposition und
  Visualisierung gehören zum ausgewählten Set. Zufalls-Play entwickelt das aktive
  Set; Hintergrund-Sets werden aus ihren gespeicherten Noten/Pattern-Einstellungen
  abgespielt. Sie erhalten keine zusätzliche unabhängige Zufalls-Play-Steuerung.
- Notenraster und ausgewählte Tap-Fläche halten den bearbeiteten Zweitakt-Abschnitt.
  Bei Tap beginnt das Halten mit der Instrumentauswahl, nicht mit der Übersicht.
  Fertig, Abbrechen oder Verlassen des Tap-Modus lösen die Schleife; beim Spielen
  geht es an der nächsten Zweitaktgrenze mit dem folgenden Quellabschnitt weiter.
  Ohne laufende Wiedergabe startet die Auswahl keinen Ton. Andere Sets
  laufen weiter. Die bisherigen Regeln für vorübergehende Song-Skript-Änderungen
  bleiben bestehen; der Quell-Song wird nicht automatisch neu arrangiert.

## Klang und Laufzeit

Ein AudioContext, ein Master und eine gemeinsame Viertel-/Takt-Uhr. Für zusätzliche
Sets wird derselbe Instrumenten-Renderer verwendet (akustische Synthese, gehaltene
Stimmen, Tonhöhenkurven und Instrument-Rezepte), nicht ein Audio-Preview oder eine
fremde Aufnahme. Zusätzliche Sets haben getrennte Effektbusse und Voice-Register.
Orbit, Klangblume, Notenstrom und Klanglandschaft zeigen das bearbeitete Set.
**Sternenhimmel und Nebelwolken zeigen bei mehreren belegten Sets alle Stimmen
zusammen**, mit allen neun Orbitringen jedes belegten Sets als stabilen
Sternengruppen (Kanon: 36 Gruppen, maximal 81). Unbespielte, deaktivierte und
lautlose Ringe bleiben als dezente Sternbilder sichtbar, ohne Notenimpulse.
Auch mit nur einem belegten Set werden alle neun Ringe dargestellt. Die
Raster-Vorschauen zeigen weiterhin die Instrumentenringe des jeweiligen Sets.

Die Summenlautstärke wird nach Anzahl klanglich belegter, nicht stummgeschalteter
Sets abgesenkt; der vorhandene Ausgangskompressor bleibt aktiv. Die Hintergrund-
Polyphonie ist zusätzlich auf 96 gleichzeitig laufende Stimmen begrenzt. Extrem
notenreiche Überlagerungen können deshalb Hintergrund-Anschläge auslassen. Neun
Sets mit je neun gleichzeitig angeschlagenen Instrumenten sind automatisiert getestet.

Endliche Song-Skripte verfolgen ihre eigenen Szenen. Ein kürzeres Set beendet nicht
vorzeitig die längeren anderen Sets. Sind sämtliche musikalisch belegten Sets
endliche Skripte, endet die Wiedergabe nach dem letzten. Generator-/Loop-Sets laufen
weiter. Stopp und Seitenwechsel stoppen alle Sets.

Aufnahmen verwenden den gemeinsamen Audioausgang. Die Bildgestaltung und die
bestehende Song-Abspann-/Ganzsong-Funktion sind weiterhin auf das aktive Set
bezogen. Für eigens veröffentlichte Mehr-Werk-Produktionen müssen die Angaben für
alle verwendeten Quellen berücksichtigt werden; projektweiter Mehr-Werk-Abspann
und eine eigene Mehr-Set-Arrangement-Timeline sind noch separate Ausbauschritte.

## Dateien und Kompatibilität

Alte Einstellungsdateien und einzelne Song-Skripte bleiben unverändert importierbar.
Ein altes Projekt belegt nur Set 1. Ein einzelnes unverändertes Set wird weiterhin
im bisherigen Einstellungsformat exportiert.

Mehr-Set-Projekte verwenden `format: "jacktools-orbit-project"`, `version: 1`,
`active` (0–8), gemeinsames `bpm`, `volume`, `clock` sowie genau neun `sets`.
Jeder Eintrag enthält `name` (max. 80 Zeichen), `muted`, `settings` (vollständige
v2-Einstellungen oder null; bei ganz leerem Projekt auch für den aktiven Platz) und `barOffset` (beim Export 0). Ein enthaltenes
`settings.songScript` bleibt ein vollständiger, unveränderter Song-Script-Quelltext.
`clock` enthält `meter`, `tempoUnit`, `quarters`, `steps`, `swing`; `quarters` und
`steps` sind strikt aus dem Takt abzuleiten. Verschachtelte Projekte sind ungültig.
Maximalgröße des Imports: 12 MiB; einzelne Song-Skripte behalten ihre bisherigen
1-MiB-/Noten-Grenzen. Ungültige Projekte werden vollständig abgewiesen.

Browser-Speicherung bleibt optional und zustimmungspflichtig. Alle Sets und die
Bearbeitungsauswahl werden gespeichert, niemals ein automatischer Wiedergabestart
oder verworfene Notenentwürfe. Das Laden einer alten Einstellungsdatei ersetzt die
Bank; ein einzelnes Song-Skript wird dagegen in das aktuell ausgewählte Set geladen.

## Erste Bibliotheksproduktion: Canon in D

Der klassische Kanon lädt über `catalog.json → projectPath` die vollständige Bank
`library/classical-canon.orbit.json`: Violine I, II, III und Basso in vier getrennt
bearbeitbaren Orbits, fünf freie Plätze. Eine Bibliotheksauswahl ersetzt
das gesamte Werk einschließlich seiner Bank, auch beim Wechsel zu einem Einzelset-
Lied oder zu „Zufall“. So bleiben keine Stimmen des vorherigen Werks übrig und
unterschiedliche Taktarten blockieren den Wechsel nicht. Einzelne Song-Skripte
über den JSON-Import werden weiterhin in das ausgewählte Set geladen.
Gesamtlautstärke und Aufnahmeoptionen des Hörers bleiben beim Bibliotheksaufruf erhalten.

Die vorhandene vollständige 58-Takt-Fassung (55 Viertel/Minute) ist die einzige
Notenquelle. Alle 1.956 Noten, Pausen, versetzten Einsätze (Viertel 8/16/24),
Dynamikwerte, Artikulation, Szenengrenzen und Quellenangaben bleiben erhalten.
Keine zusätzlichen Stimmen, Doublings oder Coda. Die vorhandenen synthetischen
Streicher und das Cello genügen dieser vierstimmigen Besetzung; kein neues
Instrument oder fremdes Audiomaterial wurde hinzugefügt.

Die vier Skripte behalten die ursprünglichen Spurindizes und Seeds; fremde Parts
werden entfernt und ihre Spurlautstärken auf null gesetzt. Das erhält die
stimmbezogene Dynamik und Stereoanordnung auch beim Setwechsel. Jede einzige
klingende Stimme erhält den doppelten Spurpegel als Ausgleich des gemeinsamen
`1/sqrt(4)`-Mix-Trims. So wird die bisherige Grundbalance nicht versehentlich halbiert.
Separate Raumbusse und individuelle Mutes ermöglichen nun das gezielte Anhören
und Bearbeiten der Stimmen. Set-Mutes verwenden weiterhin die allgemeine automatische
Summenpegelanpassung; Solo ist daher nicht pegelidentisch zur Vollbesetzung.

Reproduzierbar: `python3 sound/scripts/build-canon-orbits.py` oder im regulären
Bibliotheks-Build. Die ursprüngliche `.song.json` bleibt als kompatible Einzelset-
und Notenreferenz unverändert. Jede Teilfassung trägt vollständigen Werktitel,
Quellen- und Rechteangaben sowie dieselbe Gesamtdauer; damit gelten Ganzsong-
Video und Pflichtabspann auch nach Wechsel zu einer anderen Stimme.

## Weitere Bibliotheksproduktionen

14 der 15 auswählbaren Einträge laden jetzt Mehr-Set-Banken; zwölf davon wurden
nach den beiden Kanonfassungen umgestellt. Die vorhandenen Noten, Pausen,
Wiederholungen, Szenengrenzen, Taktarten und Tempoeinheiten bleiben erhalten.

| Werk / Musikrichtung | Aufteilung |
| --- | --- |
| Eine kleine Nachtmusik | 5 Sets: Violine I, Violine II, Bratsche, Cello, gestrichener Kontrabass |
| Ode an die Freude · House | 4 Sets: Thema, Harmonie/Atmosphäre, Bass, Drums |
| Für Elise · House | 4 Sets: Melodie, Klavierbegleitung, Bass, Drums; weiterhin 3/8 |
| The Entertainer, Maple Leaf Rag, The Easy Winners · Jazz | jeweils 3 Sets: Klavier mit beiden Händen, Kontrabass, dezenter Rhythmus |
| Gymnopédie, Träumerei, Prélude · Lo-Fi | jeweils 3 Sets: E-Piano mit beiden Händen, Cello, Beat |
| Chopin, Schumann, Brahms · Coffeehouse | jeweils 3 Sets: Klavier, warme Innenstimmen, Kontrabass |

Das Rondo alla Turca bleibt bewusst ein zusammenhängendes Soloklavier. Mehr
Instrumente wären hier keine Annäherung an die Originalbesetzung. Die
Coffeehouse-Einträge behalten ihren bisherigen Vorschau-Status und Umfang.
Stilbearbeitungen bleiben Stilbearbeitungen, keine behaupteten Originalbesetzungen.

Für die Nachtmusik gibt es drei neue synthetische Instrumente: `violin`, `viola`
und `bowedbass`, mit eigenen Obertonspektren, Ansprache, Vibrato und Körperfiltern.
Violine und Bratsche verwenden die notierte Tonhöhe; `bowedbass` klingt zwei
Oktaven unter dem kodierten Pitch, eine Oktave unter dem vorhandenen Cello.
Die lokale Partitur `scripts/scores/nacht-eine-kleine-nachtmusik-mvt1.ly` bezeichnet
das Basssystem ausdrücklich als „Cello & Double Bass“. Diese gemeinsame Stimme
wird deshalb zusätzlich auf gestrichenem Kontrabass in der tieferen Oktave
realisiert; es wird keine neue Melodie oder Akkordbegleitung erfunden. Die neue
Besetzung ist im Bearbeitungshinweis der Bank dokumentiert. Der Kontrabass ist
gegenüber dem Cello zurückgenommen. Die zwei bisherigen Kanon-Klangfarben bleiben
unverändert.

Jede Quellspur gehört genau einem Set; nur die dokumentierte Nachtmusik-
Bassverdopplung ergänzt Notenereignisse. Pegel werden mit `sqrt(Set-Anzahl)` gegen
den gemeinsamen Mix-Trim ausgeglichen. Alle Teilskripte tragen Titel, vollständige
Quellen-/Rechteangaben und dieselbe Gesamtdauer. Die ursprünglichen `.song.json`
bleiben unverändert als Einzelset- und Notenreferenz erhalten.

Alle Banken reproduzierbar erzeugen:
`python3 sound/scripts/build-library-orbits.py`.
`build-song-library.py` und `build-coffeehouse-preview.py` erzeugen beim regulären
Build die jeweils zugehörigen Banken mit. `build-canon-orbits.py` bleibt als
Kompatibilitätsaufruf für genau die zwei Kanon-Banken erhalten. Bibliothekseinträge
verknüpfen die Bank über `projectPath`; `path` bleibt die Einzelset-Referenz.
Bereits geladene Fassungen werden nicht heimlich ersetzt: das Werk erneut in der
Bibliothek auswählen, um seine Mehr-Set-Produktion zu laden.

## Gemeinsamer Sternenhimmel

Der Kanon öffnet jetzt in allen vier Sets mit Sternenhimmel und ausgeschalteter
separater Hintergrundanimation. Ein sanfter Nachthimmel, feste verschieden helle
Hintergrundsterne und die farbigen, notengesteuerten Gruppen bilden ein gemeinsames
Bild. Die Sternengruppen sind in der gemeinsamen Ansicht annähernd doppelt so
groß wie in der ersten Mehr-Set-Fassung (1,05 statt 0,55 des Einzelset-Radius).
Sie dürfen sich bewusst überschneiden; die stabilen Mittelpunkte bleiben erhalten.
Die Basssterne beginnen allein; die Violinen treten entsprechend der Partitur
hinzu. Keine zusätzliche oder erfundene Musik. Die Einstellungen bleiben individuell
änderbar; auch Nebelwolken können die gemeinsame Notenhistorie darstellen.

Die zusätzliche Historie ist rein visuell und an die tatsächliche Audiozeit gebunden:
Hintergrund-Sets melden nur erfolgreich geplante Audio-Stimmen; zukünftige Noten
leuchten nicht vor ihrem Anschlag. Das ausgewählte Set speist seine vorhandenen
Audio-Ereignisse ein. Stummgeschaltete Sets sind abgedunkelt, haben keine aktiven
Lichter und verlieren ihre alte Notenhistorie; beim Wiedereinschalten leuchten nur
neue Anschläge. Setwechsel ändern weder Sternpositionen noch die Identität der
anderen Stimmen. Stopp leert die Historie. Keine zusätzlichen Audio-Nodes,
Zufallszahlen des Musikgenerators oder Speicherung visueller Notenverläufe.

Begrenzt auf 81 Spuren mit je höchstens 192 Ereignissen und 30 Sekunden Historie.
Die geteilte Ansicht begrenzt gleichzeitig gezeichnete Noten-Halos und Nebelwolken,
statt bei neun vollen Sets unbeschränkt viele Verläufe zu malen. Reduced Motion
unterdrückt bewegte Spuren, Strahlen und Noten-Halos; statische Tonpunkte bleiben.
Helle und dunkle Darstellung, Fokusansicht und MP4 verwenden denselben Canvas.

## House-Kanon · Canonic Lights

Auch die zweite Kanonfassung lädt nun über `projectPath` eine vollständige Bank:
`library/house-canon.orbit.json`, fünf belegte Sets und vier freie Plätze.

1. Kanon I · Pluck (`voice1`)
2. Kanon II · E-Piano (`voice2`)
3. Kanon III · Streicher (`voice3`)
4. Bass & Klavier (`ground`, `continuo`)
5. Drums · Kick, Clap & Hi-Hat (`kick`, `rim`, `hat`)

Die vollständige vorhandene House-Bearbeitung bleibt unverändert: 60 Takte,
122 Viertel/Minute, 4/4, 1.792 Notenereignisse mit denselben Einsätzen, Kurven,
Dynamikwerten, Breaks und Schluss. Es ist weiterhin die benannte freie Bearbeitung,
nicht Pachelbels vollständige Originalpartitur. Die Einzelset-Quelldatei sowie ihre
Quellen- und Lizenzangaben bleiben unverändert; jede Teilfassung trägt die vollen
Angaben. Kein zusätzliches Instrument und keine neue Audiodatei wurden eingeführt.

Die unabhängigen Gruppen behalten die ursprünglichen Spurindizes und Seeds.
Jede Spur ist genau einem Set zugeordnet. Ihre Pegel werden mit `sqrt(5)` als
Gegenstück zur allgemeinen Projekt-Mix-Absenkung multipliziert, sodass die bisherige
Grundbalance bei voller Besetzung erhalten bleibt. Mutes wirken gruppenweise;
beispielsweise lässt sich das Schlagzeug isoliert ausschalten.
Der Standard-Sternenhimmel zeigt alle 45 Ringe. Die Notenlichtimpulse folgen nur
den tatsächlich klingenden Spuren. Beide Kanon-Banken werden reproduzierbar von
`build-canon-orbits.py` und im regulären Bibliotheks-Build erzeugt.
