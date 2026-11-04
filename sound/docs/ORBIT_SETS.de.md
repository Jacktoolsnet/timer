# Orbit-Sets — Grundlage

Stand: 2026-11-04

## Bedienung

- Der Raster-Button vor „Zeichnen“ zeigt neun Set-Plätze direkt in der Hauptansicht, wie Zeichnen und Tap-Pads.
  Es öffnet sich kein Overlay; Haupt-Orbit und Transport bleiben zugänglich.
- Jeder Platz enthält bis zu neun Instrumentenspuren, nicht nur ein Instrument.
- Ein Set wird bearbeitet; alle belegten, nicht stummgeschalteten Sets spielen
  parallel. Auswählen ist kein Solo-Schalter und startet die Wiedergabe nicht neu.
- Leere Plätze beginnen ohne automatisch erzeugte Begleitung. Über Musikrichtung,
  Instrumente, Zeichnen, Klopfen oder Noten lassen sie sich aufbauen.
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
- Das Notenraster hält weiterhin den bearbeiteten Zweitakt-Abschnitt. Andere Sets
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
v2-Einstellungen oder null) und `barOffset` (beim Export 0). Ein enthaltenes
`settings.songScript` bleibt ein vollständiger, unveränderter Song-Script-Quelltext.
`clock` enthält `meter`, `tempoUnit`, `quarters`, `steps`, `swing`; `quarters` und
`steps` sind strikt aus dem Takt abzuleiten. Verschachtelte Projekte sind ungültig.
Maximalgröße des Imports: 12 MiB; einzelne Song-Skripte behalten ihre bisherigen
1-MiB-/Noten-Grenzen. Ungültige Projekte werden vollständig abgewiesen.

Browser-Speicherung bleibt optional und zustimmungspflichtig. Alle Sets und die
Bearbeitungsauswahl werden gespeichert, niemals ein automatischer Wiedergabestart
oder verworfene Notenentwürfe. Das Laden einer alten Einstellungsdatei ersetzt die
Bank; ein einzelnes Song-Skript wird dagegen in das aktuell ausgewählte Set geladen.

## Nächster Produktionsschritt

Vorhandene Bibliothekslieder sind noch nicht in neue Mehr-Set-Fassungen umgeschrieben.
Zuerst Original und Stimmenaufteilung vergleichen; dann getrennte Orchestergruppen,
Gegenstimmen und Begleitungen gezielt komponieren. Mehr Spuren allein sind kein
Qualitätsmerkmal und ersetzen keine Prüfung der musikalischen Vorlage.
