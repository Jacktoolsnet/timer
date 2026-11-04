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
Die Hauptansicht zeigt nur das bearbeitete Set; die Raster-Vorschauen zeigen seine
neun Instrumentenringe, keine vollständige Mehr-Set-Szenenanimation.

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

Weitere Bibliothekslieder sind noch nicht auf Mehr-Set-Produktion umgestellt.
Mehr Spuren allein sind kein Qualitätsmerkmal; zuerst Original und sinnvolle
Stimmenaufteilung vergleichen.
