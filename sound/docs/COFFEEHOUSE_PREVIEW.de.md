# Erste abspielbare Coffeehouse-Vorschau

> Aktualisierung der Quellenanzeige: Öffentliche Rechtefelder wurden vereinheitlicht;
> Angaben zur Bytegleichheit früherer Arbeitsstände beziehen sich seitdem auf
> die Musikdaten ohne Rechtefelder. Siehe [Anzeige und Audit](SONG_PROVENANCE_DISPLAY.de.md).

**Chopin: Prélude A-Dur, op.28 Nr.7 – vollständig, 45 Sekunden einschließlich Transportausklang.**

[Song-JSON](../public/examples/coffeehouse-chopin-prelude-a.preview.song.json)

Direkt anhören: **Musik → Coffeehouse → Ordnersymbol → Prélude A-Dur**.
Im Overlay ist die Fassung ausdrücklich als **Hörvorschau** gekennzeichnet.
Ein manueller Import ist nicht mehr nötig; alternativ bleibt der Weg über
**Dateien → Song-Script → Datei auswählen** verfügbar. Bei laufender App ist sie auch unter
`/examples/coffeehouse-chopin-prelude-a.preview.song.json` abrufbar.

## Produktion

- Originales 3/4-Metrum, Viertelauftakt und alle 16 vollständigen Takte.
- 72 Viertel pro Minute; zwei stille Zählzeiten vor dem Auftakt, der Schluss
  einschließlich notierter Pause, **keine künstliche Themenwiederholung**.
  Wegen des Zwei-Takt-Szenenrasters folgt zusätzlich ein stiller 3/4-Transporttakt;
  das ist keine zusätzliche Komposition und wird nicht als Originaltakt gezählt.
- Akustisches Klavier für die rechte Hand, warmes E-Piano für die innere
  Begleitung und zurückhaltender Kontrabass für die tiefen Basstöne.
- Alle 168 Ereignisse der angegebenen digitalen Hilfsausgabe übernommen.
  Zwei lange, über Szenengrenzen gehaltene Noten müssen enginebedingt erneut
  angeschlagen werden: 170 ausgegebene Ereignisse, nicht zwei erfundene Noten.
- Kein Drumloop, keine fremde Einspielung, keine Samples.

## Transparente Quellenabgrenzung

Die historische Erstausgabenbasis bleibt [IMSLP 85374](https://imslp.org/wiki/Special:ReverseLookup/85374).
Für diese Vorschau wurde zusätzlich die ausdrücklich **Public Domain**
bereitgestellte [Mutopia-Notation 470](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=470)
von **Magnus Lewis-Smith**, nach Edition Peters, verwendet. Die unveränderten
LilyPond-Dateien und deren Lizenzheader liegen in `scripts/scores/chopin-a-edition/`.
Es handelt sich also **nicht um eine behauptete unabhängige Neutranskription
ausschließlich aus dem alten Scan**. Die zusätzliche Hilfe und ihr Download-Hash
sind in `scripts/scores/chopin-a.source.json` benannt. Kein heruntergeladenes MIDI
und keine aufgezeichnete Darbietung wurden verwendet; das symbolische MIDI wurde
lokal aus den lesbaren Notationsdateien gebaut.

Taktart, Auftakt, Form, Basswechsel und Schluss wurden mit der historischen Seite
verglichen. Ein vollständiger Einzelnoten-Abgleich beider Ausgaben, einschließlich
Bindungen, Vorschlag und Stimmverteilung, steht noch aus. Peters-Zusätze werden
nicht stillschweigend als Erstausgabenmerkmale ausgegeben. Pedalzeichen und freies
Rubato der Notation werden von dieser Ereignisumsetzung nicht nachgebildet.

**Status: Hörvorschau, kein freigegebener Bibliothekseintrag.** Regionale
Schlussprüfung, vollständiger historischer Notenabgleich und echte Hörabnahme
bleiben offen. Technische Signaltests sind kein menschliches Qualitätsurteil.
Die zwölf bisherigen Bibliotheksproduktionen und deren Katalog bleiben unverändert.
Die Vorschau wird getrennt in `public/library/preview-catalog.json` geführt und
für die Auswahl mit dem Bestandskatalog zusammengeführt; Auswahl bedeutet hier
ausdrücklich keine abgeschlossene Abnahme.

## Reproduzierbarkeit

```sh
# Normale Neuerzeugung, offline, nur Python-Standardbibliothek:
python3 sound/scripts/build-coffeehouse-preview.py

# Optional: symbolisches MIDI aus den Notationsdateien neu bauen (LilyPond 2.24):
python3 sound/scripts/rebuild-coffeehouse-score.py
```

Die Produktionszahlen und der MIDI-Hash stehen in `coffeehouse-preview-report.json`.
Die separate Vorschau-Erzeugung schreibt weder Katalog noch vorhandene Songs um.
Die vollständigen [Schumann- und Brahms-Fassungen](COFFEEHOUSE_PRODUCTIONS.de.md)
sind inzwischen ebenfalls im Coffeehouse-Overlay abspielbar. Die historische
Detailabnahme ist weiterhin von der direkten Hörbarkeit getrennt.

## Technischer Prüfstand – 03.11.2026

- Astro-Check und Produktionsbuild: keine Fehler oder Warnungen.
- 14 Vorschautests auf Desktop/Mobil erfolgreich: Format, 168 Quellereignisse,
  Tonhöhen/Register, Auftakt, Schluss, Szenenbindungen und Reproduzierbarkeit.
- Echte WAV-Messungen für Anfang, dichteste Stelle und Schluss: Signal vorhanden,
  Spitzen unter 0,98, keine geclippten Samples.
- Vollständige WAV-Wiedergabe auf beiden Geräteprofilen bis zum natürlichen
  Ende getestet, außerdem unveränderter JSON-Export nach dem Import.
- Vorhandene zwölf Produktionen separat bytegleich neu erzeugt und verglichen;
  die 18 bisherigen Bibliotheks-UI-Tests ebenfalls erfolgreich.
- Sechs Offline-Belegtests erfolgreich. Eine menschliche Hörabnahme wurde
  ausdrücklich **nicht** durchgeführt oder durch diese Tests ersetzt.

### Overlay-Integration

Coffeehouse besitzt jetzt einen eigenen Ordner. Vorschaukennzeichnung und
Quellenumfang sind in allen vier Sprachen sichtbar; die Rechteanzeige verwendet
die tatsächliche Song-Datei statt pauschal die Canon-Beispielrechte.
Produktionsbuild und 26 Desktop-/Mobil-Overlaytests erfolgreich, einschließlich
direktem Start, unveränderten Songdaten, Fokus-Rückgabe, Quellenanzeige und Zufallsmodus.
