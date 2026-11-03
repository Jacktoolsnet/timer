# Coffeehouse – drei vollständige Fassungen im Overlay

> Aktualisierung der Quellenanzeige: Öffentliche Rechtefelder wurden vereinheitlicht;
> Angaben zur Bytegleichheit früherer Arbeitsstände beziehen sich seitdem auf
> die Musikdaten ohne Rechtefelder. Siehe [Anzeige und Audit](SONG_PROVENANCE_DISPLAY.de.md).

Direkt abspielen: **Musik → Coffeehouse → Ordnersymbol**.

| Stück | Takt / Tempo | Vollständige gespielte Form | Dauer |
| --- | --- | --- | --- |
| Chopin: Prélude A-Dur, op.28/7 | 3/4, Viertel = 72 | 16 Takte + Auftakt, dokumentierter Transportausklang | 0:45 |
| Schumann: Von fremden Ländern und Menschen, op.15/1 | 2/4, Viertel = 72 | 22 geschriebene Takte; A und B jeweils zweimal, insgesamt 44 | 1:13 |
| Brahms: Walzer As-Dur, op.39/15 | 3/4, Viertel = 104 | 44 gespielte Takte, inklusive Eröffnungswiederholung und Triolen-Coda | 1:16 |

Chopins Song-JSON wurde **bytegleich beibehalten**. Die beiden neuen Fassungen
folgen derselben Klangästhetik: akustisches Klavier, warmes E-Piano und leiser
Kontrabass. Keine Drumloops, keine fremden Aufnahmen, keine erfundenen
Themenwiederholungen oder Ersatzakkorde.

Bei Schumann bleiben die vier Notenstimmen getrennt nachvollziehbar: Melodie,
Triolenbegleitung, Bass und zusätzliche gehaltene Gegenstimme. Die Melodie liegt
auf dem Klavier, die Triolen/Gegenstimme auf dem E-Piano und die vollständige
Bassstimme auf dem Kontrabass, jeweils im korrekten klingenden Register.
Beide historischen Wiederholungszeichen werden ausgeführt, nicht nur die erste
Seite als kurze Motivschleife gespielt. Acht-Takt-Phrasierung und ein leiser
auslaufender Schluss formen die Dynamik.

Bei Brahms treten die oberen Melodietöne aus den Akkorden hervor; die unteren
Akkordtöne bleiben hörbar, aber zurückgenommen. Die originale harmonische
Entwicklung und die durchlaufenden Triolen der Schlussvariation bleiben erhalten.

## Notenquellen und Grenzen der Umsetzung

Die alten IMSLP-Scans liegen weiterhin mit Titel-/Notenseiten und Prüfsummen im
[historischen Quellenpaket](sources/coffeehouse/README.de.md). Wie bei Chopin
wurden zusätzlich ausdrücklich gemeinfreie digitale Notationshilfen verwendet:

- Schumann: [Mutopia 354](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=354),
  **Ying-Chun Liu**, nach „Leichte Stucke, 1900“. Die Hilfsdatei enthält einen
  Durchlauf von 8 + 14 Takten. Für die Aufführung werden alle vier Stimmen als
  **AABB** zusammengesetzt, entsprechend den Wiederholungszeichen des alten Scans.
- Brahms: [Mutopia 794](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=794),
  **Brian D. Rude**, nach **R. Joseffy**. Die Hilfsdatei enthält bereits 44
  gespielte Takte. Ihre ausgeschriebenen rhythmischen/ornamentalen Lesarten
  bleiben als solche benannt und werden nicht als identisch mit jedem Detail
  der Erstausgabe ausgegeben.

Unveränderte Originaldateien, für LilyPond 2.24 konvertierte Aufführungsdateien
und lokale `.source.json`-Belege liegen in `scripts/scores/`. Es wurden keine
externen MIDI-Performances heruntergeladen. Das symbolische MIDI entsteht lokal
aus der lesbaren Notation; Schumanns Wiederholungsform wird anschließend
deterministisch aus sämtlichen Stimmen zusammengesetzt.

Übernommen werden **480 Schumann- und 720 Brahms-Quellereignisse**, ohne stille
Notenlöschung. Über Szenengrenzen gehaltene Noten werden enginebedingt erneut
angeschlagen und im Produktionsbericht zusätzlich gezählt. Die Artikulation
ist leicht verkürzt; Pedal, freies Rubato, Fermaten und Ritardandi werden nicht
als ausdrucksgetreue Klavieraufführung modelliert. Die gewählten konstanten Tempi
sind Entscheidungen dieser Coffeehouse-Interpretation, keine Behauptung einer
vollständig nachgebildeten historischen Aufführungspraxis.

**Alle drei sind im Overlay zugänglich.** Die bisherige Kennzeichnung als
Hörvorschau bleibt erhalten, solange der historische Einzelnotenabgleich offen
ist. Das betrifft die editorische Abnahme, nicht eine Kürzung der Stücke.
Für Chopin liegt positive Nutzerrückmeldung vor; eine menschliche Hörabnahme
der beiden neuen Fassungen wird nicht durch technische Messungen ersetzt.
Keine Änderung der bisherigen Rechtehinweise oder neu erfundene Ausgabelizenz.

## Offline neu erzeugen

```sh
# Alle drei JSONs, Overlay-Vorschaukatalog und Produktionsberichte:
python3 sound/scripts/build-coffeehouse-preview.py

# Optional: symbolische Eingaben mit LilyPond 2.24 neu bauen:
python3 sound/scripts/rebuild-coffeehouse-score.py
```

Der Bericht `coffeehouse-productions-report.json` enthält Quellenhashes,
übernommene Notenzahlen, Szenen-Neuanschläge, Takte und Laufzeiten. Der
Bestandskatalog mit den bisherigen zwölf Songs wird nicht überschrieben.

## Technische Abnahme – 03.11.2026

- Produktionsbuild: keine Fehler oder Warnungen.
- 26 Bibliotheks-/Overlaytests auf Desktop und Mobil erfolgreich, in allen vier
  Sprachen; alle 15 auswählbaren Songs starten mit ihren jeweiligen Rechteangaben.
- 24 Zusatztests auf Desktop/Mobil erfolgreich: vollständiger Notentransfer,
  Register, Takte, Schumanns komplette Wiederholungsform und reproduzierbare Dateien.
  Ein beim ersten Testlauf gefundener Berichtszustandsfehler wurde behoben und
  die beiden betroffenen Regenerationstests erfolgreich erneut ausgeführt.
- Je Stück Anfang, dichteste Stelle und Schluss als echte WAVs gemessen:
  Signal vorhanden, Spitzen unter 0,98, keine geclippten Samples.
- Beide Stücke auf beiden Geräteprofilen in voller Länge bis zum natürlichen
  Ende als WAV exportiert; JSON-Rückexport unverändert.
- Chopins Format, Quellereignisse und Reproduzierbarkeit nochmals in sechs
  Desktop-/Mobiltests geprüft; Song-Datei weiterhin bytegleich.
- Sechs Offline-Belegtests erfolgreich. Keine behauptete menschliche Hörabnahme.
