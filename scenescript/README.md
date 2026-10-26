# Jacktools SceneScript

Erste nutzbare Version für **https://scenescript.jacktools.net**. Astro und
TypeScript, vollständig statisch, ohne Benutzerkonto oder Anwendungs-Backend.
**Kein Deployment, keine DNS-/Plesk-Änderungen durchgeführt.**

## Lokal starten

```bash
cd /home/krapfenheld/jacktoolsnet/scenescript
export NVM_DIR="$HOME/.config/nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.17.0
npm ci
npm run dev
```

Öffnen: **http://localhost:4321/de/** (Astro wählt bei belegtem Port einen anderen).
Vier Sprachversionen: `/de/`, `/en/`, `/es/`, `/fr/`. Die neutrale Startseite
bevorzugt mit Speicherzustimmung die gespeicherte Sprache, sonst die
Browsersprache, sonst Englisch. Explizite Sprach-URLs werden nicht umgeleitet.

## Texteffekte

Für Text und Sprechblasen steht im Elementformular „Texteffekte“ bereit:
Glow mit Farbe und Stärke (0–100 px), Textschatten mit Farbe, Unschärfe
(0–100 px), X-/Y-Versatz (−100 bis 100 px) und Deckkraft (0–1).
Zusätzlich gibt es Textkonturen mit Farbe und Breite (0–20 px).
Alle drei Effekte sind kombinierbar und gelten für den gesamten Text, auch bei
formatierten Textabschnitten. Die Pixelwerte beziehen sich auf die logische
Projektauflösung; Vorschau und Export skalieren sie gemeinsam mit dem Text.

Gespeichert wird dies als `elements[].textEffects` mit `glow`, `shadow` und `outline`.
Ältere Projekte ohne diese Eigenschaft bleiben kompatibel; alle Effekte sind
standardmäßig ausgeschaltet. Aufnahmeansicht und Videoexport verwenden
dieselbe Darstellung wie die Vorschau.

## Text-Presets

Unter „Texteffekte“ wenden Neon Pink, Neon Blau, Gold und Comic mit einem Klick
aufeinander abgestimmte Textfarben, Verläufe und Effekte an. Sie ersetzen die
bisherigen Effekte vollständig; Comic aktiviert zusätzlich Fett. Farben in
formatierten Textabschnitten werden auf die Preset-Farbe vereinheitlicht.
Schriftarten, Schriftgrößen, Inhalt, Position und Animation bleiben erhalten.
Alle Werte können anschließend geändert werden. Ein Klick ist ein einzelner
Rückgängig-Schritt. Gespeichert werden die normalen Stilwerte, keine Preset-ID.
„Effekte zurücksetzen“ entfernt Verlauf, Kontur, Glow und Schatten, behält aber
Textfarben und Formatierungen bei; Rückgängig stellt den vorherigen Stil wieder her.
Neon wirkt besonders gut auf dunklem Hintergrund; der Szenenhintergrund wird
nicht automatisch verändert.

## Schrift-Farbverläufe

Text und Sprechblasen haben einen eigenen „Schrift-Farbverlauf“ mit linearen,
radialen und konischen Verläufen, zwei bis 16 Farbstopps, deren Position und
Deckkraft sowie Richtung bzw. Mittelpunkt. Gespeichert wird er als
`elements[].textGradient`; ohne Verlauf ist der Wert `null`.
„Einfarbig“ stellt die bisherigen Textfarben einschließlich formatierter
Textabschnitte wieder her. Verläufe beginnen je formatiertem Abschnitt bzw.
Zeilenfragment neu. Kontur, Glow und Schatten bleiben unabhängig davon aktiv.

## Mindestgröße

Der Editor ist für Tablet und Computer vorgesehen: mindestens **768 CSS-Pixel
Viewport-Breite**. Kleinere Fenster zeigen statt des Editors einen lokalisierten
Hinweis; die KI-Anleitung bleibt zugänglich. Es findet keine Geräteerkennung
per User-Agent statt. Bereits laufende Aufnahmen werden beim Verkleinern nicht
abgebrochen, und Projekte bleiben im Arbeitsspeicher erhalten.
Hochkant-Projekte für Smartphone-Zielgruppen sind weiterhin möglich.

## Erste Version

- Szenen erstellen, duplizieren, umordnen, löschen und Dauer einstellen.
- Text, Bild, Formen und Simulationen (Partikel, Schnee, Blasen); Elemente auswählen, duplizieren, umordnen und löschen.
- Editor für Position, Größe, Farbe, Schrift, Ausrichtung, Deckkraft, Drehung,
  Eckenradius, Bildanpassung und Animationszeitpunkte.
- 1920×1080, 1080×1920 und 1080×1080 als logische Projektauflösung.
- Einblenden, Bewegung von rechts/unten, Zoom, Schreibmaschine, langsamer Zoom.
- Transparente Simulationselemente sowie durchgängige Projektsimulationen mit
  absoluter Zeitsteuerung, Seed, Farbe, Intensität, Geschwindigkeit und Größe.
  Szenenhintergrunddeckkraft macht die Projektsimulation sichtbar, ohne sie beim
  Szenenwechsel neu zu starten. Feuer und Wellen sind noch nicht enthalten.
- Lineare, radiale und konische Verläufe für Szenen und alle Formtypen, mit 2–16
  Farbstopps, Positionen und Transparenz; im Editor und JSON bearbeitbar.
- Szenenhintergründe als Farbe/Bild und optionales Einblenden des Szeneninhalts.
- PNG/JPEG/WebP/SVG-Import: Bilder werden als Base64-Data-URLs zentral im JSON
  gespeichert. Mehrfach verwendete Bilder stehen nur einmal in `assets`.
- JSON-Einfügen mit Validierung, Projektdatei importieren und **Speichern
  unter** als Download einer selbstständigen `.scenescript.json`.
- Wiedergabe, Pause und Zeitleiste; Aufnahmeansicht mit großem Play-Button zum manuellen Start des 3-Sekunden-Countdowns,
  Vorladen der Bilder, Vollbild wenn unterstützt und CSS-Fallback. Leertaste
  pausiert/setzt fort, Escape beendet. Der Mauszeiger ist schon während des
  Countdowns (nicht auf dem Startbildschirm) ausgeblendet und wird beim Verlassen wiederhergestellt. Während
  Wiedergabe/Countdown wird ein Screen Wake Lock angefordert; Pause, Ende und
  Verlassen geben ihn frei. Bei Rückkehr in einen sichtbaren Tab wird er bei
  aktiver Wiedergabe erneut angefordert. Falls nicht verfügbar, weist der Editor
  auf manuelles Abschalten des Bildschirm-Ruhezustands hin. Das Tool zeichnet
  selbst nichts auf.
- Unabhängige App-Darstellung: acht Paletten, Hell/Dunkel, vier Stile und vier
  UI-Schriftgrößen aus den anderen Jacktools-Tools.
- KI-Dokumentation: `/de/ai/` (auch andere Sprachen), `/ai/`, `/ai.txt`,
  `/schema.json`, `/example.scenescript.json`. Vollständig statisch und für
  Agenten ohne Browser-JavaScript lesbar. Kopierbare komplette Anleitung.
- Canonical, hreflang, Sitemap, robots.txt, Favicon; DE/EN-Rechts-/Nutzungstexte.
- Keine externe Schrift, Werbung oder Browser-Analyse, keine Bild-Uploads.

## Speicher und Dateigrenzen

Dauerhafter Browserspeicher ist wie bei den aktuellen anderen Tools optional
und standardmäßig ausgeschaltet. Mit „Einstellungen auf diesem Gerät merken“:

- `jacktools.scenescript.storage-consent.v1`: Speicherentscheidung
- `jacktools.scenescript.appearance.v1`: Sprache und Oberflächendarstellung
- `jacktools.scenescript.project.v1`: aktueller Entwurf einschließlich Bilder

Ein wiederhergestellter Entwurf gilt als ungespeichert, bis er als Datei
exportiert wird. Ausschalten oder „Lokale Einstellungen“ → Löschen entfernt
alle drei Einträge, nicht das derzeit im Arbeitsspeicher bearbeitete Projekt
oder bereits heruntergeladene Dateien. Browserspeicher kann voll/gesperrt sein;
der Editor bleibt nutzbar und weist auf Dateisicherung hin. Wichtige Projekte
immer als Datei speichern. Laufende Wiedergabe wird nicht wiederhergestellt.

Maximal 160 MiB JSON (UTF-8), 8 MiB je Rasterbild / 1 MiB je SVG und 40 Megapixel, 100 Assets,
100 Szenen, 100 Elemente pro Szene. Base64 benötigt etwa 33% zusätzlichen
Speicher. V1 akzeptiert keine externen Bild-URLs, HTML oder beliebigen Code; SVG nur im
unten beschriebenen sicheren Profil.
Bilddateien werden vor Import/Wiedergabe auf Decodierbarkeit geprüft.
Ein KI-Modell benötigt Zugriff auf echte Bildbytes und ein Encoding-Werkzeug,
um korrekte Base64-Bilder zu liefern; sonst separat im Editor importieren.

Das Schema beschreibt die Struktur. Laufzeitprüfung ergänzt einzigartige IDs,
Asset-Verweise, Zeitgrenzen, Dateigröße sowie Browser-Bilddecodierung. Format-
Änderungen müssen Modell, Schema, Anleitung und Tests gemeinsam aktualisieren.

## Tests und Build

```bash
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

Unit-Tests: Normalisierung, Schema-Feldabdeckung, Sicherheitsgrenzen,
Bildverweise, Zeitberechnung und Unicode-Animation.
Browser-Tests auf Desktop/Tablet (768×1024), zusätzlich Smartphone-Hinweis: JSON-Import/-Export und Datei-Roundtrip,
Bilder, Plain-Text-Sicherheit, Sprachseiten, lokale Speicherung/Löschung,
gesperrter Speicher, unabhängige Darstellung und Fokuswiedergabe.
Build landet in `dist/`; `node_modules`, Tests und Quellcode nicht hochladen.

## Hosting wie die anderen Tools

1blu Ubuntu-V-Server / Plesk, statische Dateien. `astro.config.mjs` legt
`https://scenescript.jacktools.net` fest. Eine neue Subdomain muss separat in
DNS/Plesk eingerichtet und mit einem gültigen TLS-Zertifikat versorgt werden.
Die tatsächlichen Servereinstellungen wurden nicht verändert.

- Vollständigen Inhalt von `dist/` in das Document Root der Subdomain kopieren.
- Verzeichnis-Indexdateien ausliefern; `404.html` mit echtem HTTP-404, kein
  SPA-Fallback. HTTPS erzwingen.
- `.xml`: `application/xml`, `.json`: `application/json`, `.txt`: `text/plain`.
- Hosting-/Protokolleinstellungen entsprechend den anderen Tools: tägliche
  Rotation, bis 30 rotierte Dateien je Log zusätzlich zum aktiven Log; keine
  Log-Backups oder E-Mail-Versendung. Für diese neue Subdomain separat prüfen.
- Vor Veröffentlichung Betreiberangaben und angepasste Datenschutz-/Nutzungs-
  texte fachlich prüfen; sie sind mit `noindex` aus der Sitemap ausgeschlossen.
- Nach Upload HTTPS, alle Sprachrouten, JSON-Schema, robots.txt und Sitemap
  prüfen. Neue Sitemap bei Search Console anmelden.

## Noch nicht enthalten

Frei definierte Keyframes, Bildkomprimierung,
Drag-and-drop-Positionierung, Rückgängig/Wiederholen oder weitere Vorlagen.
Systemschriften können zwischen Geräten variieren; die Aufnahmeauflösung hängt
vom Bildschirm und Screenrecorder ab. Sichere Textbereiche sind nur eine
Orientierung, nicht plattformgenau. Reale Safari-/Firefox-/Mobilgeräte und
Barrierefreiheit vor Veröffentlichung zusätzlich prüfen.

## Struktur

- `src/lib/model.ts`: versioniertes Format, Normalisierung, Validierung, Timing
- `public/schema.json`: maschinenlesbares JSON Schema
- `src/lib/guide.ts`: KI-Anleitung und gültiges Beispiel
- `src/lib/editor-i18n.ts`: vier Editor-Sprachen
- `src/scripts/editor.ts`: DOM-Editor, Timeline, Dateien, Bilder, Aufnahmeansicht
- `src/layouts/Layout.astro`, `src/scripts/site.ts`: Jacktools-Shell/Einstellungen
- `src/styles/editor.css`: Studio und Aufnahmeansicht

## Safe SVG assets
The image picker also accepts SVG (max 1 MiB UTF-8 source), embedded as Base64
in the project JSON. The runtime uses a strict XML/element/attribute allowlist;
unsupported SVG is rejected, not inserted as arbitrary HTML. Scripts, event
handlers, external references, embedded HTML/images, filters, masks and CSS
animations are not accepted. Basic geometry, text, local gradients/clips and
numeric-time SMIL `animate` / `animateTransform` are supported. The authoritative
safe profile and an example are in `src/lib/guide.ts` (`/ai.txt`).
Inline stage SVGs have per-instance IDs and their SMIL clocks are explicitly
paused/seeked from scene time (image SVGs relative to element `at`). Asset gallery
thumbnails can animate independently. No network services or hosting changes.

## Simulation testen

`public/simulation-test.scenescript.json` enthält eine wirklich leere Szene mit
großen weißen Blasen und ausgeschaltetem Szenenhintergrund. Über Projekt laden
importieren; in der Aufnahmeansicht Play und den Countdown abwarten.

## Hintergrundmusik
Projekt-Toolbar: Musik-Icon öffnet einen Entwurf mit Übernehmen/Abbrechen und Hörprobe. Generierte Begleitung oder eigene Noten, editierbare synthetische Instrumente (ADSR, Obertöne, Filter, Echo/Hall). JSON und AI-Anleitung dokumentieren alle Parameter. Musik bleibt über Szenenwechsel durchgehend, pausiert und springt mit der Zeitleiste; Countdown bleibt stumm. Beim Screenrecorder Tab-/Systemaudio aktivieren. Keine externen Musikdienste oder Audiodateien erforderlich.

Beispielprojekt: `public/music-demo.scenescript.json` (20 Sekunden generierte Begleitung).

## Videos
Videogalerie unter den Bildern: Import, Vorschau, Umbenennen, Download und Löschen. Videos werden einmal als Base64 im JSON gespeichert (32 MiB pro Video, 30 Videos, 160 MiB JSON). WebM/MP4 und weitere vom Browser dekodierbare Videoformate. Videoelemente und szenenübergreifendes Projektvideo unterstützen Ausschnitte, Wiederholung, Stummschaltung, Lautstärke und Einpassen/Zuschneiden. Start/Ende mit ±Minute/Sekunde/Zehntelsekunde oder direkt aus der Vorschau übernehmen. Große Projekte bitte als Datei speichern statt auf Browser-Speicher zu vertrauen.

Galerie-Dateien lassen sich über das Ersetzen-Icon austauschen. IDs, Namen und alle Verwendungen/Einstellungen bleiben erhalten. Passt ein kürzeres Video nicht zu bestehenden Ausschnitten, wird der Austausch mit Hinweis abgelehnt; die alte Datei bleibt unverändert.


## Lokaler Videoexport

In der Projekt-Toolbar öffnet das Download/Video-Symbol den Exportdialog.
MP4 (H.264/AAC) wird mit den tatsächlichen Browser-Encodern geprüft. Alternativ
steht WebM (VP9/Opus) zur Verfügung. Unterstützt werden 480p, 720p und 1080p
(kurze Seite des Projektformats), 24/30/60 fps sowie optional Hintergrundmusik
und nicht stummgeschalteter Videoton. Ausschnitte, Schleifen und Lautstärke werden
berücksichtigt. Der Export erzeugt Einzelbilder der gesamten Timeline ohne
Countdown, Maus, Auswahlrahmen und Bedienoberfläche; kein Screenrecorder nötig.

Alles bleibt im Browser, ohne Upload oder Änderungen am Hosting. Der Export
kann länger als die Präsentation dauern; Tab offen lassen. Fortschritt und
Abbrechen sind vorhanden. Die Ausgabe wird stückweise in eine Datei geschrieben
(siehe Speicherziele unten), statt das gesamte Video im Arbeitsspeicher zu sammeln. Systemschriften und
Codec-Unterstützung hängen vom Gerät ab; nicht jedes im Browser abspielbare
Video kann dort auch per WebCodecs decodiert werden. Bei fehlender Unterstützung
erscheint eine Fehlermeldung statt einer unvollständigen Exportdatei.
Projekt-JSON, Editor-Auswahl und Timeline bleiben unverändert.

Implementierung: dynamisch geladene `mediabunny`-Encoder/Decoder und
`html-to-image` für einen separaten, unsichtbaren Szenenbaum. Audio wird in
kurzen Blöcken gemischt; synthetische Instrumente verwenden denselben
Offline-Renderer wie die Wiedergabe. Es ist kein zusätzliches JSON-Feld nötig;
die KI-Anleitung beschreibt den Export ebenfalls.


## Veröffentlichungsdaten

Im Projekt sind Titel, Beschreibung (bis 5000 Zeichen) und Hashtags (bis 2000
Zeichen, als kommagetrennte Textliste, z. B. `#Video, #SceneScript`) editierbar.
Jedes Feld hat einen eigenen Kopierbutton mit Erfolgs-Toast; verweigerter
Zwischenablagezugriff markiert den Text zum manuellen Kopieren.
`description` und `hashtags` sind optionale Root-Felder in Format 1.0. Ältere
Projekte erhalten leere Werte. JSON-Dateien und lokale Entwürfe speichern die
Angaben; sie werden nicht in der Präsentation eingeblendet. Die KI-Anleitung
und das Schema enthalten die neuen Felder. Kein automatischer Plattform-Upload.
Die KI-Anleitung lässt zuerst die Zielgruppe bestimmen und fordert darauf
abgestimmte YouTube-Titel, Beschreibung und relevante Hashtags statt interner
Projektbeschreibungen oder Szenenprotokolle. Ein fertiges Video benötigt außerdem
ein echtes Cover in `thumbnail`: vorhandenes passendes Bild wiederverwenden,
ansonsten erzeugen bzw. bei fehlendem Bildwerkzeug vor der finalen Ausgabe mit
dem Nutzer beschaffen. Schema und Import bleiben für ältere Projekte unverändert.

### Bewegungspfade

Unter **Elementeinstellungen → Bewegungspfad** stehen Gerade, kubische
Bézier-Kurve und Kreis/Ellipse zur Verfügung. Start/Dauer, Wiederholung,
Hin-und-zurück, sanfte Beschleunigung und Ausrichtung sind konfigurierbar.
**Pfad in großer Vorschau bearbeiten** zeigt verschiebbare Kontrollpunkte.
Koordinaten sind relative Prozentabstände zur Elementposition. **Kreis einstellen**
berücksichtigt das aktuelle Seitenverhältnis. Vorschau, Aufnahme und Export
verwenden dieselbe zeitbasierte Berechnung; Hilfslinien werden nicht exportiert.
JSON-Feld `motionPath`, Defaults und Grenzen sind in der gemeinsamen KI-Anleitung
und im strukturellen Schema beschrieben. Das Schema kann die zusätzliche
Runtime-Bedingung `motionPath.start <= scene.duration` nicht abbilden.

**Verbundene Pfade:** Der Typ „Mehrere Abschnitte“ kombiniert Geraden und kubische
Kurven. Jeder Abschnitt hat eine eigene Bewegungsdauer, Beschleunigung und Pause
am Zielpunkt. Abschnitte können ergänzt, gelöscht und umsortiert werden; maximal
32 pro Pfad. X/Y eines Punktes stehen zusammen in einem Tile (X links, Y rechts).
Welle, Zickzack, Spirale und Flugbahn liefern editierbare Vorlagen. „Pfad kopieren“
und „Pfad einfügen“ übertragen die komplette Konfiguration unabhängig zwischen
Elementen über einen internen Puffer, ohne die System-Zwischenablage zu verwenden.

### Projekt-Thumbnail

Ein eigenes Thumbnail-Tile im Projekt bietet Plus-Import/Ersetzen, vergrößerte
Vorschau, Originalbild-Download und Löschen mit Bestätigung. PNG, JPEG und WebP
bis 8 MiB werden unabhängig von der Bildergalerie unter `thumbnail: {name, data}`
als Base64-Daten-URL gespeichert. Ohne Thumbnail ist das Feld `null`; ältere
Projekte bleiben kompatibel. Das Cover gehört nicht zur Präsentation oder zum
Videoexport. Eine KI kann dasselbe Feld mit einer tatsächlich erzeugten Bilddatei
befüllen; Schema und gemeinsame KI-Anleitung beschreiben das Format.

### Importierte Sprache / Audiospuren

Audiodateien (MP3/WAV empfohlen, andere browserseitig decodierbare Audioformate)
in Mono/Stereo werden in einer eigenen Galerie als Base64 gespeichert: maximal 30 Dateien,
32 MiB/Datei, 3600 Sekunden und 64 MiB decodierte Samples/Datei. Projekt-Sprecher-Spur
läuft über Szenenwechsel weiter; jede Szene kann zusätzlich einen Clip erhalten.
Startzeit, Dateiausschnitt, Lautstärke, Stumm, Fades und Sprechertext als Notiz sind
editierbar. Dialog: Übernehmen speichert, Abbrechen/Escape verwirft. Galerie:
Anhören, Umbenennen, Speichern, Ersetzen (Referenzen bleiben), Löschen mit Bestätigung.
Optionale Musikabsenkung reduziert synthetische Musik während Sprache auf 30%.
Aufnahme und Offline-WebM/MP4-Export enthalten die zugewiesenen Sprachclips; der
Export-Audioschalter schaltet alle Tonquellen gemeinsam aus. Keine externe TTS-API,
keine Schlüssel, keine Hosting-Änderung. Schema/KI-Anleitung beschreiben `audios`,
`narration`, Szenen-`narration` und `audioDucking`, inklusive Runtime-Grenzen.

### Kopierbare KI-Spezifikation

`src/lib/guide.ts` enthält eine einzige, auch offline per Copy/Paste nutzbare
Anleitung: Einstieg ohne Vorwissen, erklärte Typnotation, Funktionsregeln und
vollständige kompakte JSON-Beispiele (Text, Comic-Kamerafahrt, Kunsteffekte).
`src/lib/guide-fields.ts` erzeugt den Feldkatalog aus `public/schema.json` und den
Laufzeit-Defaults. Vererbte TextRun-Stile und typabhängige Element-Defaults werden
explizit ausgewiesen. Die Notation ist **keine** alternative Import-Syntax.
Alle KI-Seiten, `/ai.txt` und der Kopierbutton verwenden denselben vollständigen
Text; zusätzliche Downloads sind zum Verstehen nicht erforderlich.
Tests prüfen Feldabdeckung, Default-Abgleich, Größenbudget, Beispielimporte und
Clipboard-Fallback. Bei neuen Feldern Schema/Factory und die zugehörige semantische
Erklärung gemeinsam aktualisieren; keine zweite vollständige Referenz pflegen.

### Extern erzeugte Sprache zuordnen

1. Projekt- oder Szenen-Sprecher-Spur öffnen. Sprechtext, Sprechregie und Sprecher
   können schon **ohne Audiodatei** gespeichert werden (`narration.text`,
   `instructions`, `speaker`). Das Tool erzeugt selbst keine Sprache.
2. In der Audiogalerie **Sprechtexte exportieren (ZIP)** wählen. ZIP entpacken:
   eine UTF-8-Textdatei je nichtleerem Sprechertext. Jede Datei nennt den erwarteten
   MP3-Dateinamen. Nur den Sprechtext beim externen Dienst einfügen; Regie und Stimme
   separat umsetzen. Keine Anweisungen oder Dateinamen mitsprechen lassen.
3. MP3s genau so benennen, dann über **Sprachdateien zuordnen** gemeinsam auswählen.
   WAV/OGG/M4A/AAC/FLAC/WebM mit gleichem Basisnamen werden ebenfalls akzeptiert,
   sofern der Browser das Format decodiert. ZIP/TXT hier nicht importieren.

Dateinamen enthalten Zuordnung plus Inhaltsfingerprint. Szenen umbenennen,
verschieben oder ihre Zeiten bearbeiten ist erlaubt. Nach Änderungen an Text,
Regie oder Sprecher neu exportieren. Unbekannte, veraltete oder doppelte Namen
und nicht decodierbare Audios brechen den **gesamten Import ohne Änderung** ab.
Es gibt keine Prüfung des tatsächlich gesprochenen Inhalts anhand des Dateinamens.

Der Import misst die tatsächliche Audiodauer und setzt den neuen Ausschnitt auf
0 bis Dateiende. Zu kurze Szenen wachsen auf Sprachstart + Audiodauer; für die
projektweite Spur wächst bei Bedarf die letzte Szene. Szenen werden nie verkürzt,
Sprache nie beschleunigt. Die 3600-Sekunden-Szenengrenze bleibt bestehen. Explizite
Element-/Gruppenenden und Kamerastationen werden nicht gestreckt; die letzte
Kamerastation hält bis zum neuen Szenenende. Nachfolgende Szenen beginnen später.
Manuelles Kürzen unter zugeordnete Sprache wird verhindert. Erst Audio trimmen,
verschieben oder entfernen. Die bestehenden Audio-/Projektgrößenlimits gelten.
Löschen einer Audiodatei behält die Textvorlage; ein Import ist als Ganzes per
Undo/Redo rückgängig zu machen. Anschließend das SceneScript-Projekt speichern.

### Große Projektdateien

Auch große eingebettete Base64-Medien werden ohne rekursive Regex-Gruppen
geprüft. Editor-Änderungen validieren die Projektobjekte direkt statt das gesamte
JSON inklusive Medien zu serialisieren und erneut zu parsen. Die Größenanzeige
zählt Medien ohne vollständige JSON-Kopie; beim Import werden Medien nacheinander
dekodiert, um Speicherspitzen zu reduzieren. Die bestehenden Größenlimits bleiben
erhalten. Projekte über 4 MiB werden nicht als lokaler Browser-Entwurf gespeichert;
bitte über **Speichern** als Projektdatei sichern. Ein 60-MiB-Projekt wird in den
Browser-Regressionstests auf Desktop und Tablet importiert, bearbeitet und exportiert.

### Einzelbilder und Kontaktbögen für die visuelle KI-Rückmeldung

Unter der Vorschau öffnet **Bilder & Kontaktbogen** den Bildexport. Ein Einzelbild
wird als PNG in Projektauflösung zu einer exakten **Projektzeit** exportiert. Der
Startwert ist die aktuelle Abspielposition; diese bleibt beim Export unverändert.

Für Kontaktbögen lassen sich Szenen auswählen und je Szene 1–12 **lokale Zeitpunkte**
angeben, getrennt durch Semikolon (z. B. `1; 2,5; 4`). Standardmäßig werden drei
über die Szene verteilte Momente vorgeschlagen. Die Zeitpunkte müssen vor dem
Szenenende liegen, damit nicht versehentlich die nächste Szene abgebildet wird.
Bis zu sechs Bilder stehen mit Szenenname, ID und lokalen/globalen Sekunden auf
einer PNG-Seite (480 Pixel Bildbreite pro Ausschnitt). Mehrere Seiten werden als
ein ZIP mit `frames.json` zur eindeutigen Zuordnung geliefert. Maximal 600 Bilder
und 30 MiB PNG-Daten pro Auftrag; bei großen Projekten weniger Szenen auswählen.

Beide Funktionen nutzen `ExportRenderer` und dieselbe Zeitberechnung wie der
Videoexport, warten auf Bilddekodierung und verwendete Schriften und enthalten
keine Auswahlrahmen oder Editorhilfen. Die selbst gehosteten Schriften werden für
Bild- und Videoexport eingebettet und je Renderer zwischengespeichert. Echte
Einblendungen sind enthalten: Bei 0 Sekunden kann ein Bild noch schwarz sein,
auch wenn die pausierte Editorvorschau es bereits zeigt. Bilder sind stumm und
dienen der Sichtprüfung, nicht der Beurteilung von Ton oder Bewegungsfluss.

PNG/Kontaktbogen zusammen mit JSON an die KI zurückgeben: So kann sie tatsächliche
Personenpositionen, Sprechblasenspitzen und Textanordnung gezielt beurteilen. Neue
Schemafelder oder Änderungen bestehender Projektdateien sind dafür nicht nötig.

### Lange Videoexporte: stückweise auf die Festplatte

Der Export verwendet `StreamTarget` mit 1-MiB-Schreibblöcken statt `BufferTarget`.
MP4 schreibt mit `fastStart: false` normale Metadaten am Dateiende, ohne alle
Medienpakete für Fast Start im RAM zu halten. Positionsangaben werden beachtet,
damit nachträgliche Header-Korrekturen gültige MP4-/WebM-Dateien ergeben.
Schreib-Backpressure wird bis zum Encoder durchgereicht.

- **Direkt in Datei:** In unterstützten Browsern wählst du vor dem Rendern eine
  Zieldatei. Für voraussichtlich große Exporte wird dieses Ziel vorausgewählt.
  Erst nach erfolgreichem Abschluss wird die Schreibtransaktion geschlossen.
  Abbruch/Fehler bricht sie ab, statt vorhandene Dateien mit Teilvideos zu
  überschreiben. Eine neu gewählte Datei kann als leerer Platzhalter zurückbleiben.
- **Download über temporäre Datei:** Standardmäßig OPFS im lokalen Browser:
  `scenescript-video-exports`. Das fertige Video wird als dateibasierter Blob
  heruntergeladen; kein abschließendes `arrayBuffer()` und keine vollständige
  RAM-Kopie. Abgebrochene Aufträge werden bereinigt. Fertige temporäre Dateien
  bleiben verfügbar, bis sie ausdrücklich im Exportdialog gelöscht oder bei
  einem späteren Export nach 24 Stunden bereinigt werden. Erst löschen, wenn
  Downloads abgeschlossen sind. Laufende/unfertige Exporte anderer Tabs bleiben
  unangetastet. Die Dateien werden nicht hochgeladen.
- **Fehlender Dateispeicher:** Nur kurze Exporte mit geschätzt höchstens 64 MiB
  dürfen den Blob-Fallback verwenden. Er hat zusätzlich ein tatsächliches
  128-MiB-Limit. Größere Exporte werden vor dem Rendern mit einer verständlichen
  Meldung abgelehnt, statt später einen riesigen ArrayBuffer zu vergrößern.

Die Dateigröße wird aus Laufzeit, Zielbitrate und Reserve geschätzt; variable
Bitraten können davon abweichen. Für OPFS wird die verfügbare Browserquote vor
dem Rendern geprüft, Schreib-/Quota-Fehler werden dennoch weiterhin abgefangen.
Das ist keine Garantie gegen volle Datenträger oder andere Browser-Speicherlimits.
98 % bedeutet Abschluss des Renderns, nicht bereits erfolgreiches Speichern.
100 %/Erfolg wird erst nach erfolgreichem Dateischluss gemeldet. Der Export muss
bei einem Fehler neu gestartet werden; Checkpoints/Wiederaufnahme gibt es nicht.

Tests: Positionskorrekturen, Backpressure, Abbruch ohne Commit, Schreib- und
Commit-Fehler, kleine Fallbacks und ein synthetischer 3-GiB-Schreibpfad ohne
Gesamtpuffer. Browser-Tests prüfen echte MP4-/WebM-Ausgabe, OPFS-Downloads und
native Dateiauswahl mit Mocks; ein Test verbietet `ArrayBuffer.resize` während
eines echten Exports. Das ersetzt keinen vollständigen Langzeittest jedes
22-Minuten-Projekts.

### Exportdauer und Restzeit

Während des Videoexports zeigt der Dialog die vergangene Zeit und eine geschätzte
Restzeit. Direkt rechts neben der Fortschrittsleiste steht zusätzlich der
Prozentwert mit lokalisierter Nachkommastelle (z. B. `42,7 %`). Die Uhr startet nach der Dateiauswahl; die Schätzung basiert erst nach
mindestens fünf Sekunden gemessenen Renderfortschritts auf der jüngsten
Geschwindigkeit (gleitendes Fenster von etwa 45 Sekunden). Aufwendigere Szenen
können die Prognose ändern. Bei zehn Sekunden ohne Fortschritt wird eine alte
Schätzung ausgeblendet und nach Wiederaufnahme neu eingemessen.

Die Restzeit bezieht sich auf das Rendern. Während des abschließenden
Dateischreibens steht ausdrücklich **Abschluss / Speichern …** statt einer
irreführenden Restzeit von null Sekunden. Abbruch und Fehler stoppen die Uhr und
entfernen die überholte Schätzung; ein neuer Versuch beginnt wieder bei null.
Die Anzeige wird höchstens einmal pro Sekunde aktualisiert (Phasenwechsel sofort),
speichert keine Historie über Aufträge hinweg und ergänzt keine JSON-Felder.

Der Exportdialog trennt Einstellungen und laufenden Export: Nach dem Start werden
Optionen, Speicherhinweise, Aufräum- und Startschaltfläche ausgeblendet. Sichtbar
bleiben Vorschau (sobald verfügbar), geschätzte Dateigröße, Fortschritt, Zeiten und
Abbrechen. Bei Fehler oder Abbruch erscheinen die Einstellungen mit ihren
bisherigen Werten wieder; die Fehlermeldung und der erreichte Stand bleiben zur
Orientierung erhalten. Tastaturfokus wechselt zu Abbrechen bzw. zurück zu Start.

### 3D-Prototyp: gemeinsame Charaktere und Bühnen

Unter **Projekt → 3D-Bühnen & Charaktere → Beispieltyp: Bisherige Figuren**
startet per Beispielsymbol ein 13-sekündiges Beispiel mit Mika, Bo und Lina in einer eigenen Bauklotz-Plaza,
anschließend dieselben Figuren auf derselben Bühne mit anderer Kamera. Das ersetzt
nach Rückfrage das Projekt und erzeugt ein echtes PNG-Cover aus dem Renderer.
Keine originalen Roblox-Assets; keine Verbindung zu Roblox oder externen Diensten.

- `characters` und `stages`: projektweite Ressourcenbibliotheken (je max. 30).
  Name, Farben und Figurenhöhe sind über Formulare editierbar. Änderungen wirken
  auf alle Szenenverweise; Import in andere Projekte erzeugt unabhängige Kopien.
- Charakterfeld `style`: `classic` erhält alte Roboter, `robot` ergänzt einen
  sichtbaren Mund, `pixel` ein Pixelmonitor-Gesicht, `brick` eine eigene
  Klemmbaustein-Figur mit Augen, Nase und Mund. Im Ressourcendialog auswählbar,
  einzeln exportierbar und in der Vorschau sichtbar. Mimik wird über die separate
  `expressions`-Spur animiert; lautstärkegesteuerte Mundbewegung wird über `speech` aktiviert.
- `Scene.stage3d`: Bühnenreferenz, 3D-Kamera und max. zwölf Auftritte. Die Auftritte
  werden im Prototyp als JSON editiert; eine Figur lässt sich per Button einsetzen.
  Positionen in Welteinheiten, Y nach oben; `rotation`, Kamerawinkel in Grad,
  `orbit` in Grad/s. `at`/`duration` begrenzen die Aktion auf die Szenendauer.
  `toX`/`toZ` interpolieren linear; davor/danach bleibt die Figur sichtbar am
  Start-/Endpunkt. Aktionen: `idle`, `walk`, `wave`. Kein impliziter Folgezustand.
- Die Bühne liegt als undurchsichtiger Hintergrund unter normalen 2D-Elementen.
  Die vorhandene 2D-Kamera kann zusätzlich das gesamte Bild beschneiden/bewegen.
- Einzelexport als `.scenecharacter.json` / `.scenestage.json`, Import wahlweise
  als Kopie oder explizite Aktualisierung derselben ID. Format und Version werden
  geprüft; Definitionen sind eigenständig und enthalten keine externen Ressourcen.
- Derzeit ein festes, farblich anpassbares Plaza-Modell und parametrische Figuren,
  noch kein freier Welteneditor, GLB-Import, Physik, Rigging oder lautgetreue Lippensynchronisation.
- Three.js wird nur bei 3D-Nutzung nachgeladen (lokal gebündelt, kein CDN).
  WebGL2 ist nötig. Kein stiller leerer Export bei fehlendem/verlorenem Kontext.
  Vorschau und Export nutzen dieselben absoluten Zeitposen; GPU-Kontexte werden
  nicht pro Bild neu erzeugt. Zwei begrenzte Szenengraphen pro Renderer werden
  wiederverwendet und beim Verwerfen/Exportende samt GPU-Ressourcen freigegeben.
  Native Bildauflösung ist auch beim Export die interne 3D-Auflösung.
- Schema, Laufzeitvalidierung und gemeinsame KI-Anleitung dokumentieren dieselbe
  kleine 3D-Sprache. Das Größenbudget der vollständigen Anleitung beträgt nun
  82 kB einschließlich des erweiterten Feldkatalogs.

Importierbares Beispiel: `/examples/block-robots.scenescript.json` (mit Cover).
Einzelressourcen: `/examples/mika.scenecharacter.json`,
`/examples/bo.scenecharacter.json`, `/examples/lina.scenecharacter.json`,
`/examples/plaza.scenestage.json`.
Three.js-Lizenz (MIT): `/licenses/three.txt`.

Tests: `tests/stage3d.test.ts` (Defaults, Grenzen, Referenzen, Ressourcendateien,
Zeitposen) und `tests/stage3d.spec.ts` (Bearbeitung, Undo, Ressourcenimport/-export,
Vorschau-/Exportvergleich, Rückwärtssuche, tatsächlicher MP4-Export und Layout).


### Medienressourcen im eigenen Overlay

Unter dem weiterhin direkt sichtbaren **Thumbnail** stehen zwei große Buttons:
**Ressourcen** öffnet Bilder, Videos und Audiodateien einschließlich Sprechtext-
Export und Sprachdatei-Zuordnung; **3D-Ressourcen** öffnet die Charakter-/Bühnenverwaltung.
Medien können unverändert importiert, angesehen, umbenannt, ersetzt, einzeln
heruntergeladen und gelöscht werden. Änderungen gelten direkt, es gibt keinen
zusätzlichen Übernehmen-Schritt. Importfehler erscheinen auch im Overlay als
markierbarer Text. Vorschau/Wiedergabe pausiert beim Öffnen; Audio-Vorschauen
pausieren beim Schließen. Escape/Schließen bringt den Fokus zum Ressourcenbutton
zurück. Vorhandene Medienvorschauen und Bestätigungsdialoge öffnen sich darüber.
Projektformat, Speicherung, Referenzen und Undo bleiben unverändert.


### Auswahlbezogene 3D-Ressourcenbearbeitung

Im 3D-Dialog stehen Ressourcenart und Ressource links. Rechts werden ausschließlich
Einstellungen der gewählten Figur/Bühne angezeigt, gegliedert in Allgemein und
Aussehen, mit Farbfeldern und Hexwerten. Daneben (auf Tablets darüber innerhalb
der rechten Spalte) erscheint eine isolierte Live-Vorschau. Charaktere stehen in
einer neutralen Studioumgebung, Bühnen werden ohne Szenenfiguren gezeigt. Die
Vorschau funktioniert auch ohne Verwendung der Ressource in einer Szene und ist
unabhängig vom Szenen-JSON. Sie erzeugt keine Auftritte oder Kameraänderungen im
Projekt. Szenenauftritte/Kamera bleiben im separaten aufklappbaren Abschnitt.
Übernehmen bestätigt den Entwurf; Schließen verwirft ihn. Häufige Änderungen werden
pro Browserframe gebündelt; alte Vorschau-Canvas-Puffer werden explizit freigegeben.


### KI-gesteuerte 3D-Aktionsfolgen

Neue Auftritte können `actions` mit bis zu 64 nicht überlappenden Schritten enthalten:
`idle`, `walk`, `wave`, `turn`. `duration` ist erforderlich; ohne `at` beginnt der
Schritt am Ende des vorherigen. Ziele `toX`/`toZ` sind absolute Welteinheiten und
nur bei `walk` erlaubt. Die vorherige Position bleibt für ausgelassene Koordinaten,
Wartezeiten und nach dem letzten Schritt erhalten. Standardmäßig wird Bewegung
mit Smoothstep ein-/ausgebremst; `easing:"linear"` ist optional.

`target` richtet den ganzen Körper auf eine andere **Auftritts-ID derselben Szene**
aus (keine Charakterressourcen-ID); alternativ absolute `rotation` oder bei Gehen
`faceMovement:true`. Die kürzeste Drehung wird verwendet. Gegenseitiges Anschauen
ist möglich, weil Zielpositionen ohne rekursive Orientierungsberechnung abgetastet
werden. `turn` dreht über die gesamte Schrittdauer, andere Aktionen blenden die
Ausrichtung über `blend` ein. Gesten werden über `blend` weich ein-/ausgeblendet
(Standard 0,3 s, intern auf halbe Schrittdauer begrenzt); nach Ende sind Arme/Beine
wieder in Ruhe. Blickverfolgung endet mit dem Schritt. Noch keine Kopf-only-Ausrichtung,
lautgetreue Lippensynchronisation oder überlappende Gehen-und-Winken-Aktionen.

Alte Projekte ohne Aktionsfolge bleiben unverändert abspielbar. Bei nichtleerem
`actions` ersetzt die Folge die alten Einzelaktions-/Bewegungsfelder; alle
vorhandenen Werte werden weiterhin validiert. Vorschau, Sprünge, Kontaktbögen und
Export verwenden dieselbe reine absolute Zeitberechnung. JSON-Schema, KI-Anleitung
und das Roboterbeispiel unter `/examples/block-robots.scenescript.json` zeigen die
neue Syntax. Das Beispiel demonstriert Annähern, Warten, gegenseitiges Drehen und
Winken sowie eine zweite Aufnahme mit anschließender Bewegung.


### Zeitgesteuerte 3D-Mimik

Im Charakterformular wählt **Grundausdruck** den dauerhaft sichtbaren Gesichtsausdruck
(auch in der Einzelvorschau und in exportierten Charakterressourcen).
Eine Szene kann ihn pro Auftritt über `expressions` vorübergehend ändern:

```json
"expressions": [
  {"expression":"happy","at":0,"duration":2,"intensity":0.8},
  {"expression":"blink","at":2,"duration":0.24,"blend":0.12},
  {"expression":"surprised","at":3,"duration":1.5}
]
```

- `neutral`, `happy`, `sad`, `angry`, `surprised`, `blink`.
- Eigene Spur parallel zu `actions`: Gehen und Mimik können gleichzeitig laufen.
- Max. 64 chronologisch sortierte, nicht überlappende Einträge pro Auftritt,
  vollständig innerhalb der Szene; `duration` ist Pflicht, `at` wird sonst verkettet.
- `intensity`: 0–1, Standard 1. `blend`: Ein-/Ausblendzeit 0–2 s, Standard .2 s,
  intern maximal die halbe Eintragsdauer. 0 schaltet direkt.
- Nach jedem Eintrag/in Pausen gilt wieder der Grundausdruck. Ein `neutral`-Eintrag
  neutralisiert ihn vorübergehend. `blink` schließt die Augen; kurze Einträge
  von .15–.3 s ergeben ein Blinzeln. Kein zufälliges automatisches Blinzeln.
- Die KI-Anleitung und das Drei-Figuren-Beispiel zeigen die neue Spur.
  Absolute Zeitabtastung sorgt für identische Mimik beim Zurückspulen sowie
  in Vorschau, PNG und Video. Keine neuen Geometrien/Materialien pro Frame.
- Der klassische Roboter hat nur einen sehr kleinen Mund; für deutliche Mimik
  `robot`, `pixel` oder `brick` wählen. Sprachgesteuerte Mundöffnung siehe unten.


### Lautstärkegesteuerte 3D-Mundbewegung

1. Sprachdatei wie bisher als **Szenensprache** oder **Projektsprache** zuweisen
   (auch über TTS-Textexport und dateinamenbasierten MP3-Import).
2. Unter **3D-Ressourcen → Szenenauftritte & Kamera → Sprachgesteuerter Mund**
   den Figurenauftritt und die vorhandene Sprachquelle auswählen.
3. Empfindlichkeit nach Bedarf anpassen (0–3, Standard 1); Vorschauzeit wählen
   oder das Projekt mit Ton abspielen.

KI-Syntax am Auftritt: `"speech":{"source":"scene","strength":1}`.
`source:"project"` verwendet die Projektsprachspur; `speech:null` schaltet aus.
Die Bindung erzeugt **keinen zusätzlichen Ton**. Text ohne importierte Audiodatei
bewegt den Mund noch nicht. Das Drei-Figuren-Beispiel enthält vorbereitete
Sprechtexte und Bindungen (Mika in Szene 1, Bo in Szene 2).

Der Mund folgt der analysierten Lautstärke, mit Rauschschwelle und geglätteten
Übergängen. Stereo wird nach Energie ausgewertet, ohne gegenphasige Kanäle
wegzumischen. Kleine 50-Hz-Hüllkurven werden zwischengespeichert; keine
Audioanalyse/Geometrieerzeugung pro Frame. Analyse erfolgt nur für tatsächlich
zugeordnete Sprachdateien, nacheinander und unter den vorhandenen Audio-Limits.

Start, Zuschnitt, Lautstärke, Stummschaltung und Ein-/Ausblendungen der
Sprachspur gelten auch für den Mund. Projektsprachspuren laufen szenenübergreifend
auf der Projektzeit; Szenenspuren lokal. Außerhalb der Sprachspur/in Pausen ist
keine Sprechöffnung aktiv. Mimik bleibt erhalten; ein überraschter Gesichtsausdruck
kann unabhängig von Sprache einen offenen Mund haben. Musik und Videoton werden
nicht analysiert. Es ist keine Laut-/Phonem-Erkennung.

Vorschau, Zurückspulen, PNG und Video nutzen dieselbe deterministische Abtastung,
auch bei Videoexport ohne Ton. Analyse-/Codecfehler werden gemeldet statt still
eine falsche Animation zu exportieren. Ein laufender Analysevorgang liefert nach
Schließen der Vorschau keine verspäteten Canvas-Inhalte mehr.


### Allgemeiner 3D-Baukasten (Objekte, Figuren und Bühnen)

`characters` verwaltet nun auch frei definierte Fahrzeuge, Requisiten usw.;
der JSON-Name bleibt aus Kompatibilitätsgründen erhalten. Die bisherigen Figuren
und Bühnen werden bei fehlendem/`null`-Modell in editierbare Bauteile umgewandelt.
Gespeicherte Projekte und Einzelexporte enthalten die vollständigen Modelle.

- `Character3D.model` und `Stage3D.model`: eigene `parts` und benannte `animations`.
  Ein Modell definiert die Geometrie; auch bisherige Vorlagen nutzen diesen Renderer.
  Himmel/Boden bleiben. `palette` bindet Teilfarben an Ressourcenfelder.
- Grundformen: unsichtbare Gruppe, Quader, Kugel, Zylinder, Kegel, Fläche, extrudierte Profilfläche.
  Material: Farbe, Rauheit, Metallanteil, Deckkraft, optisches Finish und Bildtexturen.
  Keine externen Modelle oder ausführbaren Skripte.
- Teile referenzieren ihren Elternteil per ID. Position/Drehpunkt sind lokal,
  Drehungen in Grad, Größen in Welteinheiten. Kinder erben die Transformation,
  nicht die Geometriegröße. Drehpunktkette:
  `T(position) · T(pivot) · R_XYZ(rotation + Gelenke) · T(-pivot)`.
- Freiheitsgrade über `joints`: Rotation oder Verschiebung, Achse X/Y/Z,
  Grenzen `min/max`, Ruhewert `value`. Keine Physiksimulation.
- Benannte Animationen enthalten Gelenk-Keyframes; `motions` am Auftritt
  bzw. `stageMotions` an der Szene starten sie, optional wiederholend.
  `joints` / `stageJoints` setzen individuelle Ruheposen.
- Mimik/Sprechen bleiben über Gelenk-`control` nutzbar: Mundöffnung, Blinzeln,
  happy/sad/angry/surprised bewegen frei definierte Gesichtsteile Richtung `target`.
- Auftritte unterstützen zusätzlich `y`, `pitch`, `roll`. Gehen-/Winken-Bewegungen
  können über explizite Gelenk-Treiber an beliebige eigene Figuren gebunden werden.
  Root-Bewegung bleibt verfügbar.
- Ressourcen sind einzeln importier-/exportierbar: bis 32 MiB inklusive Texturbildern,
  maximal 512 KiB reine Geometrie/Animationsdaten.
  Im Ressourcendialog: **Bauteile, Gelenke & Animationen (JSON)**, Animation wählen,
  Zeitregler bewegen. Fehler sind kopierbar und verhindern stilles Übernehmen
  einer älteren gültigen Modellfassung.
- Budgets: 512 Teile/Modell, Tiefe 32, 256 Gelenke, 16 Clips, 4096 Keyframes gesamt;
  64 Bewegungsereignisse/Spur. Szene: max. 12 Auftritte, 2048 geschätzte aktive Teile.
  Grenzen und Verweise werden vor dem Rendern validiert.

Unter **Beispieltyp → Freier Baukasten: Truck & Roboter** lädt das Beispiel
einen aus Teilen gebauten Monstertruck (Räder, Lenkung, Federung), einen jubelnden
Roboter mit ansteuerbarem Mund/Augenlidern sowie eine eigene Bühne mit Schwenktor.
Download: `/examples/construction.scenescript.json`; unabhängige Ressourcen:
`/examples/truck.scenecharacter.json`, `/examples/workshop-robot.scenecharacter.json`,
`/examples/workshop.scenestage.json`. Vorschau, PNG und Video verwenden dieselbe
absolute Zeitberechnung. Keine Geometrieerzeugung pro Frame.

Dies ist die Grundlage für die gewünschte Rennwelt, noch nicht die komplette
Rennsimulation: Fahrpfade und Fahrzeugkameras sind im nächsten Abschnitt beschrieben;
wiederholte Ressourcen sind im Abschnitt zu Ressourcengruppen beschrieben. Die vollständige
Copy/Paste-KI-Anleitung enthält die neue Grammatik plus ein kompaktes Beispiel;
das Größenbudget wächst für dieses zusätzliche Modul auf 82 kB.


### Bestehende Figuren und Plaza als freie Ressourcen

Mika, Bo, Lina und die Bauklotz-Plaza sind jetzt vollständige `model`-Ressourcen,
auch in den herunterladbaren Beispielen und den einzelnen Ressourcendateien.
Keine zweite fest verdrahtete Figuren-/Bühnen-Renderstrecke mehr.

- Alte Projekte/Ressourcen mit fehlendem oder `null`-Modell werden beim Laden
  automatisch in Bauteile umgewandelt. Szene, Kamera und Zeitabläufe bleiben bestehen.
- Die Figuren enthalten Gelenke für Gehen/Winken, Mimik und Sprechen sowie benannte
  `walk`-/`wave`-Animationen. Die bisherigen Aktionen funktionieren über Treiber
  `leftArm/rightArm/leftLeg/rightLeg/wave/bob`.
- `motion:"scale"` skaliert nur die Geometrie des Teils, nicht seine Kinder;
  Skala 0 blendet die Geometrie aus. So bleiben Bo als echtes Pixelgesicht und
  die veränderbaren Augen/Münder vollständig durch Daten beschrieben.
- `responses` mischt mehrere Signalziele, bevor der primäre `control`-Treiber
  angewandt wird; Blinzeln kann z. B. den emotionalen Augenausdruck übersteuern.
  `speech` ist reine Audioöffnung, `mouth` kombiniert Sprache und Überraschung.
- `palette` liest eine passende Hex-Farbe aus dem Ressourcenfeld (sonst `color`).
  Deshalb bleiben die bisherigen Farbformulare bei den umgestellten Vorlagen wirksam.
- `instances` wiederholt einfache Geometrie effizient, etwa die 224 Bodennoppen
  der Plaza. Keine Gruppen-/Skalierungs-Gelenke bei Instanzen, max. 256 Kopien je Teil.
  Das Szenenbudget zählt jede Kopie.
- Ein Typwechsel im Formular erzeugt nur bei einer noch unveränderten Vorlage
  eine andere Vorlage. Eigene Bauteiländerungen werden dabei nicht überschrieben.
- Die Einzelvorschau rahmt die tatsächlichen Modellabmessungen ein; Größe und
  Renderressourcen werden nicht für jedes Animationsbild neu aufgebaut.


### Allgemeine 3D-Fahrpfade und Kameras

Unter **3D-Ressourcen → Beispieltyp → Fahrpfade: Looping & Kameras** gibt es
zwei Monstertrucks auf einer kleinen Testbahn: vier Runden mit Folgekamera,
Zuschauerschwenk, freiem Kameraflug und Fahrerkamera. Die Demo bekommt beim Laden
ein echtes, aus der Szene gerendertes Cover. Die Demo enthält außerdem eine Tribüne, 48 Zuschauer aus vier Vorlagen
mit zeitversetztem Jubel sowie drei Fantasie-Werbetafeln.

- Bühnen speichern `paths` mit bis zu 16 wiederverwendbaren Wegen. 2–128 Punkte,
  `closed` (mind. drei Punkte, ersten Punkt nicht wiederholen), `interpolation`
  `smooth` (Catmull-Rom) oder `linear`. Im Ressourcendialog als eigener JSON-Bereich
  editierbar, einschließlich Fehleranzeige. Bühne einzeln exportieren nimmt die Wege mit.
- Auftritte verwenden z. B. `path:{path:"circuit",duration:12,laps:4,offset:1}`.
  `at` ist Szenenzeit, `start` eine normierte Wegposition. `offset` verschiebt
  seitlich in Welt-Einheiten; zwei Autos teilen sich so einen Weg mit zwei Spuren.
  Offene Wege erfordern `start+laps<=1`; geschlossene erlauben wiederholte Runden.
- Die Bewegung verwendet näherungsweise konstante Bogenlängengeschwindigkeit und
  mitgeführte Koordinatenachsen für Loopings ohne erzwungenes Aufrichten. Vor und
  nach dem Zeitintervall hält die Pose. `orient:false` deaktiviert die Ausrichtung.
  Auftritts-x/y/z werden als Weltversatz addiert, pitch/rotation/roll als lokale
  Modellkorrektur angewandt. Keine Physiksimulation, Kollisionen oder automatisch
  erzeugte Fahrbahn. Sprünge sind ebenfalls vorgegebene dreidimensionale Wege.
- Nicht mit `actions` kombinieren; Gelenkclips, Mimik und Sprache bleiben parallel
  verfügbar. Eine Radrotation muss im Modell als Animation definiert werden.
- `camera.follow:{actor:"red",mode:"chase"}` folgt einem Auftritt. `onboard`
  verwendet Fahrerpositionen als Standard; beide nutzen `offset`/`target` in lokalen
  Fahrzeugachsen, unskalierten Welt-Einheiten. `track` steht mit `offset` an einem
  festen Weltpunkt und schwenkt zum bewegten Ziel. Looping-Roll wird bei montierten
  Kameras übernommen, bei Zuschauerkameras nicht.
- `camera.fov` legt den vertikalen Bildwinkel fest (20–110°, Standard 38°);
  die Fahrerkamera der Demo nutzt einen größeren Blickwinkel. Die Kameras haben
  keine automatische Hinderniserkennung; passende Abstände müssen vorgegeben werden.
- Alternativ `camera.keys:[{at:0,position:{...},target:{...},roll:0},...]` für freie
  Kameraflüge. Bis 64 Keys, erster bei 0, strikt aufsteigend innerhalb der Szene;
  linear interpoliert, letzter hält. Nicht gleichzeitig mit `follow` verwenden.
- Szenenwechsel sind Kameraschnitte, keine versteckte Zustandsspeicherung. Für
  Fortsetzungen dieselbe Bühne und passende `start`-Anteile und `laps`-Werte angeben.
  Vorschau, Timeline, Standbild und Video nutzen dieselbe absolute Zeitauswertung.
- Die vollständige Offline-KI-Anleitung samt Schema-Katalog ist aktualisiert;
  das Größenbudget beträgt jetzt 82.000 UTF-8-Bytes.

Importierbare Demo mit Cover: `/examples/path-camera.scenescript.json`.
Einzelressourcen: `/examples/path-track.scenestage.json`,
`/examples/path-red.scenecharacter.json`, `/examples/path-blue.scenecharacter.json`.


### Wiederverwendbare 3D-Ressourcengruppen

Unter **3D-Ressourcen → Ressourcenart → Gruppen** lassen sich Anordnungen aus
vorhandenen Objekten/Figuren erstellen, bearbeiten, animiert vorab ansehen,
einsetzen und einzeln als `.scenegroup.json` exportieren/importieren.
Die Beispielstrecke nutzt `audience` mit 48 Sitzplätzen und vier eigenen Figuren.
Die Objekte sind normale frei definierte Modelle, keine fest eingebauten Zuschauer.

- `Project.groups3d`: bis zu 30 Definitionen. `characters` verweist auf 1–16
  verschiedene Objektvorlagen im Projekt. Keine Verschachtelung von Gruppen.
- `layout:grid`: `count`, `columns`, `spacing`. X zentriert, Y/Z wachsen pro Reihe.
  `layout:scatter`: Verteilung in einem zentrierten `size`-Quader.
  `layout:points`: genaue lokale `points`; `count` entspricht der Punktanzahl.
- `seed` erzeugt eine stabile Auswahl und Variation. `jitter` variiert Positionen,
  `rotationVariation` den Winkel, `scaleVariation` die Größe. Ohne Variation werden
  exakte Sitzpositionen oder andere Anordnungen verwendet. Kein automatisches
  Platzieren auf Sitzflächen, keine Kollisionsvermeidung oder Physik.
- `animation` nennt einen Clip, der in jeder Vorlage existieren muss. `phase`
  verteilt dessen Anfangszeit in Sekunden, `speedVariation` variiert das Tempo.
  Dadurch jubeln nicht alle gleichzeitig. Leere Animation zeigt die Ruhepose.
- `Shot.groups` platziert Definitionen mit eigener ID, x/y/z, rotation und scale.
  Der Maßstab der Platzierung skaliert Anordnung **und** Modelle. `timeOffset`
  erlaubt durchlaufende Animation über Kameraschnitte (Demo: 0, 12, 24, 36 s).
  Vorschau, Zurückspringen und Export sampeln ausschließlich absolute Zeit.
- Gruppenmitglieder belegen keine der zwölf regulären Hauptdarsteller-Plätze.
  Maximal 16 Platzierungen und 256 Kopien pro Szene; **alle** Teile jeder Kopie
  zählen zum bestehenden Budget von 2048 aktiven 3D-Teilen. Hohe Dichten werden
  vor dem GPU-Aufbau als Fehler gemeldet, nicht still reduziert.
- Die Instanzen teilen Geometrien und Materialien innerhalb eines Szenengraphen.
  Es entsteht keine neue Geometrie pro Bild; die bestehenden zwei Cacheplätze
  und das vollständige Freigeben beim Schließen/Exportende bleiben erhalten.
- Gruppenexport enthält die tatsächlich benötigten Objektdefinitionen. Import in
  ein leeres Projekt funktioniert ohne vorherigen Einzelimport der Figuren.
  Identische Abhängigkeiten werden wiederverwendet. Abweichende vorhandene IDs
  bekommen neue IDs; Gruppenverweise werden umgeschrieben. „Aktualisieren“ betrifft
  die Gruppen-ID, überschreibt aber **keine fremden Figuren**. Bei Fehlern bleibt
  das Projekt unverändert; Abhängigkeits-/Größenlimits gelten auch für den Import.
- KI-Anleitung und Schema beschreiben alle Felder; das bisherige kompakte
  82-kB-Budget der Offline-Anleitung wird weiterhin eingehalten.

Die aktualisierte Datei `/examples/path-camera.scenescript.json` enthält das komplette
Gruppenbeispiel samt echtem Cover. `/examples/path-audience.scenegroup.json` ist die
separat importierbare Publikumsgruppe mit ihren vier Figuren.


### Fertiger Monstertruck-Film (weiteres Beispiel)

Das bisherige Startprojekt bleibt separat importierbar:
`/examples/monstertruck-race.scenescript.json`: **61,5 Sekunden**, 13 Einstellungen,
Countdown, vier zusammenhängende Runden je Fahrzeug, Führungswechsel, Zielfoto,
Rot mit 48,0 s / Blau mit 48,5 s und ein Schlussbild. Die Kamera wechselt zwischen
Verfolgung, Zuschauerschwenk, Fahrersicht und Übersicht. Die Flagge bewegt sich am
Ziel; die Tribüne schaut zum Looping. Vier Zuschauervorlagen, Werbung und Bäume
sind enthalten. Ein Start-Ziel-Turm mit Treppe, verglaster Rennleitung und
Balkon steht neben der Strecke. Eine eigenständig exportierbare Rennleitungsfigur
schwenkt dort die karierte Flagge während des Zieleinlaufs; ihre Arm- und
Flaggenbewegung bleibt über Kameraschnitte hinweg synchron.

Die Produktionsbahn hat eine rund 235 Welteinheiten lange, kurvenreiche Route.
Der Spiral-Looping versetzt Ein- und Ausfahrt seitlich um 6,4 Einheiten bei
4,8 Einheiten Fahrbahnbreite. Die Hochkurven sind bis ca. 28° überhöht;
Rampe, Flugbahn und Landung bleiben oberirdisch. Fein unterteilte Fahrbahnabschnitte
und zusätzliche Stützen bilden die Strecke. Größere Radien und weiter auseinander
liegende Kurven nutzen eine größere Arena. Boden und Nebelreichweite passen sich
an die Pfadausdehnung an; die kleinen bestehenden Bühnen bleiben unverändert.
Die Trucks besitzen Profilblöcke,
Felgenspeichen, Radmuttern, Federbeine, Achsen, Spiegel, Kühlergrill,
Zusatzscheinwerfer, Überrollbügel und Ersatzrad als normale exportierbare Bauteile.

`Path3D.ups` erlaubt optional einen Aufwärtsvektor je Kontrollpunkt: So werden
Überhöhungen und die Orientierung im Spiral-Looping explizit beschrieben und
von Straße, Fahrzeugen und Kameras gemeinsam genutzt. Ohne diese Vektoren bleibt
der bisherige Paralleltransport unverändert. Für feinere Konstruktionen gilt
nun ein Limit von 512 Teilen pro Modell; das Gesamtbudget von 2048 aktiven Teilen
pro Szene bleibt bestehen.

- Originale synthetische Motoren-, Startsignal- und Publikumseffekte als eingebettete
  PCM-WAV-Datei sowie eine eigene Musik-Partitur. Kein Audio-Download oder externer
  Dienst nötig; kein automatisches Abspielen beim Öffnen. Die Effekte nutzen die
  vorhandene Projekt-Audiospur, nicht Sprachsteuerung der Figuren.
- Eigenes KI-generiertes englisches Cover, YouTube-Titel/-Beschreibung, Hashtags
  und erster Kommentar auf Englisch. Zielgruppenannahme und Cover-Prompt stehen in
  `public/examples/monstertruck-race-publication.en.md`.
- Die Gesamtdatei bleibt unter dem bestehenden 4-MiB-Budget für lokale Entwürfe.
- Vorhandene Entwürfe haben Vorrang; sie werden vor dem Laden des Startprojekts
  geprüft. Der Startprojekt-Download entfällt dann vollständig.
- Über das **Flaggensymbol in der Projekt-Werkzeugleiste** lässt sich das jeweils
  aktuelle Startprojekt gezielt laden. Bei ungespeicherter Arbeit wird nachgefragt; Änderungen
  während eines laufenden Downloads werden nicht nachträglich überschrieben.
- **Neues Projekt** bleibt ein leeres Projekt. Die technische Pfad-Demo unter
  „3D-Ressourcen → Fahrpfade: Looping & Kameras“ bleibt unabhängig davon erhalten.
- Netzwerk-/Dateifehler beim Start zeigen einen Hinweis und öffnen das kleine
  2D-Beispiel als bearbeitbaren Ersatz. Gespeicherte Daten werden dabei nicht
  überschrieben. Bis zum Abschluss der Initialisierung ist der Editor gesperrt,
  damit keine frühen Klicks verloren gehen oder später ersetzt werden.
- Ältere UI-Regressionstests wählen ihr kleines 2D-Startprojekt jetzt ausdrücklich
  über die gemeinsame Test-Fixture; `race3d.spec.ts` wählt den Rennfilm ausdrücklich und prüft
  Wiederherstellung, Fehlerfälle, asynchrone Änderungen sowie Rendering/Audioexport.

Reproduzierbare Offline-Neuerzeugung der mitgelieferten Datei: `npm run example:race`.
Der Generator erstellt die Effekte aus `race3d-audio.ts` und bettet das dauerhaft
abgelegte `monstertruck-race-cover-en.jpg` ein; ein Dev-Server ist nicht nötig.
Das Cover wird bei einer Neuerzeugung nicht durch einen Filmframe ersetzt.


### Aktuelles Startprojekt: Inflation Explained with Chocolate (2D + 3D)

`/examples/inflation-explained.scenescript.json` ist das neue Standardprojekt für
frische Sitzungen. Bestehende lokale Entwürfe haben weiterhin Vorrang. Der
Beispiel-/Startprojekt-Button lädt es ausdrücklich; der Rennfilm bleibt erhalten.

- **4,3 Sekunden, Hochformat 9:16**: eine Sekunde Titelbild „Inflation Explained with Chocolate“,
  0,3 Sekunden Überblendung und **genau drei Sekunden** Simulation.
- Zwei echte 3D-Flächen mit ungleichmäßigem Kurvenverlauf: die schokoladenartige
  Fläche schrumpft, die goldene Geldfläche mit Prägungen wächst.
- Perspektivisches Diagramm auf einem echten Glassockel mit graviertem Raster,
  Lichtkanten, Studioreflexionen und bewegtem Glanzlicht.
- „INFLATION EXPLAINED WITH CHOCOLATE“ bleibt als extrudierte 3D-Schrift über dem Diagramm.
  Keine weiteren Texte oder Zahlen; die Entwicklung ist rein illustrativ.
- Originaler, deterministisch synthetisierter WAV-Whoosh statt Musik oder Sprache;
  in der Projektdatei eingebettet. Kontinuierliche absolute Zeitinterpolation.
- Eigenes KI-Cover im Hochformat; Zielgruppenannahme und Bildprompt in
  `public/examples/inflation-publication.en.md`.
- `Stage.transparentBackground:true` ermöglicht die echte Kombination eines
  2D-Hintergrundbildes mit freigestellten 3D-Objekten und darüberliegenden
  2D-Elementen. Automatischer Himmel/Boden/Nebel entfallen nur bei dieser Option.
  Die Checkbox ist im 3D-Ressourcendialog verfügbar; ältere Bühnen bleiben opak.
- Vorschau, Standbild und Video teilen die gleiche absolute Animationszeit;
  Vorwärts-/Rückwärtssprünge, Transparenz, Material-Caches und MP4 mit Whoosh werden getestet.

Offline neu erzeugen: `npm run example:inflation`. Das native Projekt wird atomar
ersetzt, damit ein gleichzeitig laufender Download keine halbe JSON-Datei liest.

Optische Materialien (frei definierte 3D-Teile): optionales `finish` mit `standard`
(bisheriges Aussehen, Standard), `polished` (Klarlack/Glanz) oder `glass`
(Transmission/Brechung, üblicherweise `opacity:1`). Glänzende/gläserne Boxen
haben abgerundete Kanten. Eine kleine prozedurale Studio-Umgebung liefert
Reflexionen ohne HDR-Download; sie wird pro Renderer einmal erstellt und wieder
freigegeben. Alte Standardmaterialien behalten ihre bisherige Beleuchtung.

### Bilder als 3D-Texturen

Im 3D-Ressourcendialog unter **Bildtexturen** ein geometrisches Teil und ein Bild
aus den Projektressourcen wählen. PNG/JPEG/WebP werden unterstützt; SVG bleibt
für 2D verfügbar. Wiederholung, Versatz und Drehung sind einstellbar. Bei Boxen
kann jede Seite ein eigenes Bild haben; „Allgemeines Bild verwenden“ erbt die
Standardtextur, „Kein Bild“ entfernt sie nur auf dieser Seite. Weiß erhält die
Bildfarben, andere Teilfarben tönen die Textur. PNG-Ausschnitte nutzen Alpha-Test.

```json
{"id":"poster","shape":"box","color":"#ffffff","texture":{"asset":"paper",
 "repeat":{"x":2,"y":1},"offset":{"x":0,"y":0},"rotation":0,
 "faces":{"front":"posterImage","back":""}}}
```

Seiten: right/left/top/bottom/front/back = +X/−X/+Y/−Y/+Z/−Z. Alle Verweise
sind Bild-IDs aus `Project.assets`, keine Dateipfade oder URLs. Bilder werden
vor dem ersten Vorschau-/Exportbild decodiert; fehlende/defekte Bilder scheitern
sichtbar. UVs folgen der Geometrieverformung (bei Skalierung dehnt sich das Bild).

Charakter-, Bühnen- und Gruppenexporte enthalten nur die benötigten Bilder.
Importe verwenden identische Bilder wieder; bei ID-Kollisionen werden Bilder
umbenannt und alle Verweise angepasst, ohne fremde Ressourcen zu überschreiben.
Das Löschen eines Bildes entfernt auch seine 3D-Zuweisungen, nicht die Geometrie.

GPU-Grenzen pro Szene: 32 Bild-IDs, 4096 Pixel je Kante, 16 Megapixel insgesamt
(ein identisches Bild nur einmal gezählt), 128 UV-Varianten. Varianten teilen
sich GPU-Bilddaten; pro Renderer bleiben höchstens zwei Welten im Cache, deren
Texturen beim Verdrängen/Schließen freigegeben werden. Texturen funktionieren
auch mit Instanzen und behalten bei Standardmaterialien das bisherige Aussehen.

Das aktuelle Inflationsbeispiel verwendet eigene KI-Schokoladen-/Geldtexturen,
die als Projektbilder sichtbar und im nativen Script eingebettet sind. Das Cover
bleibt unverändert. Bilder und finale Prompts: `public/examples/inflation-texture-prompts.en.md`.
`npm run example:inflation` aktualisiert auch das eingebettete Textur-Quellpaket
aus den beiden JPEGs (nur bei Änderungen, damit unnötige HMR-Neuladungen entfallen).

### Weiche 3D-Profilflächen

`shape:"profile"` ist ein geschlossenes, extrudiertes Flächenstück mit einer
zusammenhängenden, weich geschwungenen Oberkante – kein Stapel von Quadern.
`profile.heights` enthält 2–32 Werte von 0 bis 1 an gleichmäßigen X-Positionen.
`target` ist optional (Standard: dieselben Höhen), muss aber gleich lang sein.
Eine formerhaltende kubische Interpolation verhindert Überschwingen unter die
Grundlinie. `size` skaliert Breite/Höhe/Tiefe; die Unterkante liegt lokal bei y=0,
X/Z reichen vor Skalierung von −0,5 bis +0,5.

Ein Gelenk mit `motion:"morph",axis:"y",min:0,max:1` interpoliert zwischen den
beiden Höhenprofilen und lässt sich über die vorhandenen benannten Clips und
Joint-Overrides animieren. Morph-Gelenke funktionieren nur auf Profilteilen;
Profile erlauben keine `instances`, aber normale Gruppen-/Ressourcenplatzierung.

```json
{"id":"area","shape":"profile","size":{"x":10,"y":8,"z":1},
 "profile":{"heights":[0.9,0.8,0.9,0.5,0.2],"target":[0.2,0.4,0.3,0.7,0.9]},
 "joints":[{"id":"flow","motion":"morph","axis":"y","min":0,"max":1}]}
```

Der Renderer verwendet feste Geometrie-/UV-Puffer mit 96 Segmenten und glatten
Oberkantennormalen. Es entstehen beim Animieren keine neuen Geometrien oder
Texturen; Rückwärtssprünge bleiben deterministisch. Texturen bleiben über die
ganze Fläche zusammenhängend. Das Inflationsbeispiel nutzt je Material ein
Profil statt der bisherigen Balken. Die Schrift besitzt nun dunkle, tiefe
Extrusionskörper und helle Fronten auf einer leicht gedrehten 3D-Schriftebene.
Cover, Audio und Dauer bleiben unverändert.

### Landmark-guided scene morph

Set the incoming scene's `transition` to `"morph"`. Optional
`morph: {points: [{from: {x: 25, y: 50}, to: {x: 30, y: 45}}]}` maps
matching visible features in screen percentages (0–100), up to 32 distinct source
landmarks. Frame edges remain pinned; extreme maps are attenuated to prevent folds.
Without settings a gentle default warp is used; `points: []` is a dissolve.

The previous scene's final frame and incoming scene at
`min(transitionDuration, duration)` are frozen, smoothly mesh-warped and blended.
Hold incoming animations/camera until the transition finishes to avoid a jump.
The transition occupies the start of the incoming scene, never adds timeline time
and does not stretch audio. A first-scene morph fades over black. This is
controlled screen-space image deformation, not generative intermediate images
or semantic optical flow. Preview and export share the compositor; at most two
endpoint pairs are cached per renderer and released on disposal.

The inflation default now aligns its left-hand camera, larger title with the cover.
Two equal-height, fixed-width bars stand side by side: textured chocolate shrinks
to half the starting height, a solid gold ingot grows to 1.25 times it. Both
bottoms stay fixed; no horizontal flow or percentage labels. Its raised white diagram grid sits on a subtly glossy black
backboard above the tiled floor. The separated bars are opaque; the plinth remains glass. The three-second simulation follows the
0.3-second cover-to-chart morph; explicitly reload the default to replace a draft.

### Solid contour extrusions and cover-style 3D lettering

`shape: "extrusion"` with `extrusion: {contour: [{x,y}, ...], holes: [[{x,y}, ...]],
bevel: 0.012, sideColor: "#895315"}` creates a centered solid mesh with real holes
and separate cap/edge colors. Coordinates are normalized XY 0–1; `size` sets
width/height/depth. Rings: 3–128 points, at most four holes and 192 total points
per part, 16000 per model. Rings must be simple, holes strictly inside and
disjoint; do not repeat the first point. Bevel range 0–0.03 (0 for thin features).
Bevels extend the contour bounds slightly; previews include a conservative margin.
The inflation title uses original heavy block-letter outlines rather than
overlapping bars: sans-serif stems, open counters, warm metallic caps, dark
extruded sides and bright beveled edges. No image sprites, remote font or runtime
font dependency. The generated cover has no recoverable exact font; this is an
independent geometric approximation of its proportions and material palette.

## Lokaler API-Schlüsseltresor (erste Ausbaustufe)

Der Schlüssel-Button in der Projekt-Toolbar öffnet einen separaten Tresor für
**eigene** OpenAI-/ElevenLabs-API-Keys. Der KI-Workflow verwendet die Schlüssel für ausdrücklich gestartete Aufträge;
Lese-Tests bleiben separat verfügbar.

- Explizites Einrichten mit Speicherbestätigung; unabhängig von Projekt-Autosave.
- Web Crypto: PBKDF2-HMAC-SHA-256 (600.000 Iterationen, 16-Byte-Zufallssalt),
  AES-256-GCM (frische 12-Byte-IV je Schreibvorgang, 128-Bit-Tag, feste Versions-AAD).
- Nur ein begrenztes, versioniertes verschlüsseltes Envelope liegt unter
  `jacktools.scenescript.api-vault.v1` in Local Storage. Es gibt keine Vault-Exporte.
- Passwort: 12–256 Zeichen, Groß-/Kleinbuchstaben, Zahl und Sonderzeichen;
  empfohlen sind einzigartige, längere Passwörter aus einem Passwortmanager.
- Entsperrt bleibt nur der nicht exportierbare CryptoKey im tablokalen Arbeitsspeicher;
  Provider-Keys werden bei Bedarf kurz entschlüsselt. Keine Speicherung im Projekt,
  Undo-Verlauf oder Session Storage. Klartextfelder werden nach Verarbeitung,
  Schließen und Sperren geleert. Tabwechsel allein behalten die Eingaben.
- Sperre nach zehn Minuten Inaktivität und bei `pagehide`;
  automatische Sperrprüfung auch bei Rückkehr in den Tab und beim Schlüsselzugriff. Andere Tabs invalidieren
  bestehende Sitzungen bei Änderungen. Web Locks serialisieren Schreibzugriffe,
  zusätzlich schützen Snapshot-/Operationsprüfungen vor veralteten Ergebnissen.
- Reset benötigt kein Passwort, löscht nur den lokalen Tresor, nicht Projekte und
  **widerruft keine Schlüssel beim Anbieter**. Vergessene Passwörter sind nicht
  wiederherstellbar. Browserdatenlöschung entfernt ebenfalls den Tresor.
- Speicherung ist herkunftsgebunden: localhost, andere Ports, Domains, Browser und
  Geräte teilen den Tresor nicht. HTTPS oder vertrauenswürdiges localhost nötig.

**Sicherheitsgrenze:** Schutz ruhender Daten, kein Schutz vor XSS, kompromittiertem
Frontend, Browser-Erweiterungen, Passwortabgriff oder einem kompromittierten Gerät.
JS-Strings und Browser-/Prozessspeicher lassen sich nicht zuverlässig sicher löschen;
Puffer werden bestmöglich geleert und Referenzen verworfen. Nie zentrale Betreiberkeys
in diesem Tresor verteilen. Die Integration verwendet feste Provider-Zieladressen,
keine Schlüssel in Logs/URLs/Prompts, eingeschränkte Rechte und Verbrauchslimits.

Grundlagen: [Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey),
[AES-GCM-IVs](https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams),
[PBKDF2-Härtung](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).


### API-Key testen

Pro Anbieter gibt es einen Icon-Button mit Tooltip. Er testet entweder den gerade
eingegebenen (noch nicht gespeicherten) Key oder den Key aus dem entsperrten Tresor.
Testen speichert nichts. Nur der jeweilige Key wird im Authentifizierungsheader
an einen fest vorgegebenen HTTPS-Endpunkt geschickt: OpenAI `GET /v1/models`,
ElevenLabs `GET /v1/user`. Keine Projektinhalte, kein Passwort, keine Erzeugung.
Cookies, Referrer und Caching sind deaktiviert; Weiterleitungen werden abgelehnt.
Antwortinhalte werden weder angezeigt noch dauerhaft gespeichert. Für 401 werden
begrenzt Fehlerkennungen ausgewertet, um fehlende Rechte von Authentifizierungs-
problemen zu unterscheiden. 403 (auch IP-/Regionsbeschränkungen), 429, Netzwerk-
und Timeoutfehler sind kein pauschaler Beweis für einen ungültigen Key.
Ein erfolgreicher Lesetest bestätigt **nicht** Erzeugungsrechte oder Guthaben.
Nach Eingabeänderungen, Sperren, Schließen oder Reset werden laufende Tests
abgebrochen und alte Ergebnisse verworfen. Timeout: 15 Sekunden, keine Wiederholungen.

Grundlagen: [OpenAI-Modellliste](https://developers.openai.com/api/reference/resources/models/methods/list),
[ElevenLabs-Benutzerabfrage](https://elevenlabs.io/docs/api-reference/user/get).


### Direkter KI-Workflow

Der Zauberstab in der Projekt-Toolbar öffnet den API-Workflow. Im Storyboard gibt
es denselben Einstieg für den **noch ungespeicherten Entwurf**. Der JSON-Austausch
bleibt als manuelle Alternative bestehen.

- **Storyboard**: aktuelle Felder, Kommentare und Antworten gehen zusammen mit der
  aktuellen Anleitung an OpenAI Responses. IDs/Revision und Nutzerkommentare werden
  beim lokalen Import geschützt; die KI kann keine Freigaben erteilen.
- **SceneScript**: setzt ein gespeichertes, vollständig freigegebenes Storyboard
  voraus. Aktuelle SceneScript-Anleitung und Projekt-Medienmanifeste werden gesendet.
  Lokale Mediendaten werden anhand bekannter IDs wiederhergestellt; das freigegebene
  Storyboard bleibt unverändert erhalten. Neue Medien müssen valide eingebettet sein.
- **Bilder**: ein Cover oder eine einzelne Storyboard-Skizze pro Aufruf über die
  Images API. Textbasierte Generierung; bestehende Bildpixel werden hierfür nicht
  übertragen. Neue Skizzen invalidieren betroffene Freigaben. Textaufträge können
  auf Wunsch Raster-Skizzen mitsenden (bis 8 Bilder / 6 MiB Base64).
- **Sprache**: ElevenLabs-Stimmen-ID eingeben oder die ersten 100 Stimmen laden;
  einzelne Aufnahme oder alle fehlenden Aufnahmen mit dieser Stimme erzeugen.
  Nur `narration.text` wird gesprochen, Regieanweisungen werden nicht automatisch
  umgesetzt. Tatsächlich dekodierte Audiodauer verlängert Szenen bei Bedarf.
  Nach einem Teilfehler können fertige Aufnahmen separat übernommen werden.
- Modell-IDs sind editierbar (Startwerte `gpt-5-mini`, `gpt-image-2`,
  `eleven_multilingual_v2`); Verfügbarkeit hängt vom eigenen Anbieterkonto ab.
  Text-JSON-Modus ersetzt **keine** Schema-Garantie: Antworten werden lokal strikt
  validiert; unvollständige, abgelehnte oder fehlerhafte Ergebnisse nicht übernommen.
- Vor jedem Generieren: ausdrückliche Daten-/Kostenbestätigung; gesperrter Tresor
  wird bei Bedarf geöffnet. Kein Passwort in API-Aufrufen, keine Credentials in
  Projekt/History/Export/URLs/Prompts, keine Cookies/Referrer/Weiterleitungen/Retry.
  Responses setzen `store:false`; dies ersetzt keine Anbieter-Aufbewahrungsrichtlinie.
- Storyboard-Ergebnisse und -Skizzen öffnen sich nach erfolgreicher Prüfung direkt
  zur Prüfung im Storyboard und werden automatisch im aktuellen Projekt gespeichert.
  Ausführbare SceneScripts, Cover und Sprachaufnahmen bleiben zunächst Vorschauen
  und benötigen **Übernehmen**.
  Projektübernahmen sind mit Undo rückgängig zu machen. Zwischenzeitliche Änderungen
  machen Ergebnisse ungültig. Keine automatische Szenen-/Videoerzeugung nach Freigabe.
- Abbrechen und ein Timeout nach 10 Minuten beenden das lokale Warten, garantieren
  aber keine Stornierung oder Kostenfreiheit beim Anbieter. Kein automatischer Retry.
- Textinput maximal 2 MiB ohne Medien; API-Responses sind begrenzt. Große bestehende
  Projekte werden nicht mit sämtlichen Base64-Ressourcen hochgeladen. Manuelle
  Import-/Exportwege bleiben verfügbar.

API-Grundlagen: [OpenAI Responses](https://developers.openai.com/api/reference/resources/responses/methods/create),
[Images](https://developers.openai.com/api/reference/resources/images/methods/generate),
[ElevenLabs TTS](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).
Tests verwenden ausschließlich Fake-Keys und simulierte Anbieterantworten.


#### Antwortsprache der KI

Die App-Sprache (`html.lang`, nicht Browser-Sprache oder Sprache des Prompts)
wird für jeden OpenAI-Text- und Bildauftrag als feste Sprachvorgabe mitgegeben.
Das gilt auch für `comment.reply` und neu verfasste Planungsbeschreibungen.
Eine ausdrücklich gewählte Videosprache bleibt davon unabhängig: z. B. deutsche
Planung/Antworten für ein englisches Video. Bestehende Nutzertexte, freigegebene
Inhalte, JSON-Schlüssel und IDs werden nicht automatisch übersetzt. ElevenLabs
spricht weiterhin den gewählten Originaltext, ohne stillschweigende Übersetzung.
Kopierte Storyboard-Anleitungen, lokalisierte KI-Anleitungsseiten und deren
`/{lang}/ai.txt`-Downloads enthalten dieselbe Sprachvorgabe. Das neutrale `/ai.txt`
bleibt die sprachunabhängige Formatspezifikation. Die Vorgabe steuert das Modell;
eine automatische Spracherkennung oder Übersetzung seiner Antwort findet nicht statt.


### Projekt-Dateiendungen

Neue Downloads verwenden `<Titel>.scenescript` für ausführbare Projekte und
`<Storyboard-Titel>.storyboard` für Storyboards. Der Inhalt bleibt unverändert JSON;
es ist keine Konvertierung nötig. Die Dateiauswahl akzeptiert weiterhin bestehende
`.json`-Dateien (einschließlich `.scenescript.json` und `.storyboard.json`).
Bestehende Beispiel-URLs bleiben kompatibel und werden nicht umbenannt.

### ElevenLabs-Stimmen im Storyboard

Charaktere, Objekte und Kulissen haben eine optionale Stimmen-Kachel. Der Bleistift
öffnet die gemeinsame Stimmenauswahl (auch über den Sprachbereich im KI-Workflow).
Erst „Stimmen laden“ kontaktiert ElevenLabs mit dem entsperrten eigenen Schlüssel;
dabei werden keine Projektinhalte oder Sprechtexte übertragen und keine Audios erzeugt.
Pro ausdrücklich angeforderter Seite werden bis zu 100 Stimmen geladen, maximal
1000 pro Dialog. „Weitere laden“ berücksichtigt die Pagination; es gibt keinen
stillen Abbruch nach den ersten 100 Stimmen.

- Sprachfilter anhand `labels.language` und `verified_languages`, voreingestellt
  auf die Videosprache; alternativ alle Stimmen bzw. ohne Sprachangabe anzeigen.
  Dies ist keine vollständige Kompatibilitätsprüfung: mehrsprachige Modelle können
  Stimmen in anderen Sprachen verwenden, gegebenenfalls mit anderem Akzent.
- Gruppen männlich, weiblich, neutral/androgyn und ohne Geschlechtsangabe nach
  Anbieterlabel; Namen/Beschreibungen werden nicht zur Geschlechtsbestimmung benutzt.
  „Neutral“ garantiert keinen Wechsel zwischen männlicher und weiblicher Stimme.
- Die Zuordnung `{voice:{provider:"elevenlabs",id,name}}` ist optional und wird
  mit Storyboard und Projekt gespeichert/exportiert. Sie enthält **keinen API-Key**.
  Bestehende Zuordnungen bleiben beim KI-Feedback erhalten. Ändern/Entfernen verlangt
  eine erneute Freigabe des Elements und seiner abhängigen Szenen.
- Die KI kann `narration.speaker` auf die stabile Storyboard-Element-ID setzen
  (bei Mehrdeutigkeit `characters:ID` oder `settings:ID`).
  Eindeutige Namen werden ebenfalls erkannt; unbekannte Sprecher verwenden die
  im Sprachdialog gewählte Ersatzstimme. Fehlende/mehrdeutige Zuordnungen werden
  vor dem kostenpflichtigen Sammellauf geprüft. Eine Aufnahme hat genau eine Stimme;
  Dialoge mit mehreren Sprechern in separate Szenen aufteilen.
- Fertige Aufnahmen werden bei Stimmenänderungen nicht still neu berechnet;
  bei Bedarf einen einzelnen Sprachauftrag ausdrücklich neu erzeugen.

Grundlagen: [ElevenLabs-Stimmenliste](https://elevenlabs.io/docs/api-reference/voices/search),
[Stimmen und Sprachen](https://elevenlabs.io/docs/product-guides/playground/text-to-speech).
Alle Entwicklungstests verwenden Fake-Keys und simulierte Antworten.


### Modellauswahl und Reasoning

Der KI-Workflow bietet eine aufgabenspezifische Modell-Dropdownbox. Das Lade-Icon
liest nach ausdrücklichem Klick die Modellliste des gewählten Anbieters über
`GET /v1/models` mit dem eigenen Schlüssel. Dabei werden keine Projektinhalte
übertragen und keine Inhalte erzeugt. OpenAI-IDs werden für Text bzw. Bilder
gefiltert; ElevenLabs-Modelle benötigen `can_do_text_to_speech:true`.

Vor dem Laden sind dokumentierte Vorschläge sichtbar, ausdrücklich ohne bestätigten
Kontozugriff. Die gelesene Liste bestätigt weder Erzeugungsrechte noch Guthaben;
OpenAI liefert darin keine vollständigen Fähigkeits- oder Reasoning-Metadaten.
Unbekannte, mutmaßliche Text-/Bildmodelle sind als ungeprüft gekennzeichnet.
Eigene IDs bleiben als Alternative bei eingeschränkten Leserechten möglich.
Listen und Einstellungen bleiben nur im aktuellen Dialog, nicht in Local Storage,
Projekt, Undo oder Export. Die bisherige Vorgabe `gpt-5-mini` bleibt erhalten.

Dokumentierte Reasoning-Profile (Stand 26.10.2026) steuern die zulässigen Optionen:
GPT-6.1 Sol und GPT-6 Astra `low,medium,high,xhigh,max`, GPT-6 Luna zusätzlich
`none`, GPT-5.4 `none,low,medium,high,xhigh`, ursprüngliches GPT-5/Mini
`minimal,low,medium,high`. Datierten Snapshots derselben bekannten Modell-ID wird
das Familienprofil zugeordnet; unbekannte IDs verwenden ausschließlich Anbieterstandard.
Anbieterstandard lässt `reasoning` im Request weg. Ausdrückliche Einstellungen
werden über `reasoning:{effort:...}` übergeben und lokal auf Zulässigkeit geprüft.
Bilder und ElevenLabs erhalten keine Reasoning-Parameter. Reasoning-Tokens teilen
sich das Ausgabelimit mit der JSON-Antwort; höhere Stufen können Kosten/Latenz
steigern und bei unzureichendem Limit zu unvollständigen Antworten führen.

Die explizit übernehmbare App-Empfehlung ist GPT-6.1 Sol / Mittel für Storyboards
und Sol / Hoch für komplexe SceneScripts. Das ist eine aus den Modellrollen
abgeleitete Startempfehlung, kein projektbezogener Benchmark oder Erfolgsgarantie.
Luna ist eine sparsame Option für einfache Änderungen; Astra für anspruchsvollste
Aufgaben bei höherem Budget. Empfehlungen wechseln das Modell erst nach einem
bewussten Klick; es gibt weder automatische kostenpflichtige Tests noch Retries.

Quellen: [OpenAI-Modellliste](https://developers.openai.com/api/reference/resources/models/methods/list),
[GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol),
[GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra),
[GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna),
[GPT-5.4](https://developers.openai.com/api/docs/models/gpt-5.4),
[GPT-5-Reasoning](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_new_params_and_tools),
[ElevenLabs-Modelle](https://elevenlabs.io/docs/api-reference/models/list).
Tests verwenden ausschließlich simulierte Antworten und Fake-Keys.

#### Tresor vor dem KI-Workflow entsperren

Beim Öffnen des KI-Workflows wird zuerst der lokale Tresorstatus geprüft. Ist er
bereits entsperrt, öffnet sich der Workflow direkt. Andernfalls erscheint bei
eingerichtetem Tresor ein kleines passwortbasiertes Entsperr-Overlay, noch ohne
KI-Workflow im Hintergrund. Falsche Passwörter bleiben dort korrigierbar; Abbruch
öffnet keinen Workflow und verwirft auch eine noch laufende Entschlüsselung.
Fehlt ein Tresor oder ist er beschädigt, wird zunächst die bestehende Einrichtung
bzw. Wiederherstellung angeboten. Erst nach erfolgreichem Einrichten/Entsperren
öffnet sich der Workflow. Dies gilt auch für Storyboard-Entwürfe und den Spracheinstieg.
Das Entsperren erfolgt ausschließlich lokal, sendet weder Passwort noch Schlüssel
an Anbieter und startet keine Erzeugung. Zwischenzeitlich veränderte Projekte oder
Storyboard-Entwürfe werden nicht als veralteter KI-Kontext geöffnet.


#### Bearbeitungsansicht und Fehler

Nach Play zeigt der KI-Workflow während der Erzeugung Spinner, verstrichene Zeit,
Matrix-Hintergrund und einen Icon-Button zum Abbrechen. Einstellungen und Zwischenresultate bleiben ausgeblendet.
Erfolgreiche Storyboard-Überarbeitungen und Storyboard-Skizzen kehren automatisch
in den Storyboard-Editor zurück und werden im aktuellen Projekt gespeichert.
Es werden keine Freigaben automatisch erteilt und keine exportierten Projektdateien
oder ausführbaren Szenen still überschrieben. Ergebnisse können weiter geprüft,
bearbeitet oder per Undo zurückgenommen werden. Skript-, Cover- und Sprach-
ergebnisse behalten die explizite Übernahme; teilfertige Sprachaufträge bleiben
bei Fehlern manuell übernehmbar.

Fehler werden im Workflow sichtbar und kopierbar angezeigt. Der Clipboard-Icon-
Button kopiert ausschließlich den sichtbaren, bereinigten Fehlertext; bei fehlenden
Clipboard-Rechten wird der Text für Strg+C / Cmd+C markiert. Keine automatischen
Wiederholungen oder neuen Kosten. Abbruch kann Kosten beim Anbieter nicht rückgängig
machen. Veraltete bzw. ungültige Ergebnisse werden weiterhin nicht übernommen.


#### Kein manuelles Ausgabetoken-Limit

Das Zahlenfeld für maximale Ausgabetokens entfällt. Textanfragen senden keinen
zusätzlichen `max_output_tokens`-Parameter mehr; die Anwendung verwendet dafür die
Anbietervorgaben statt eines selbst gesetzten Limits von 32.768 Tokens. Auch bei
unbekannten Modell-IDs wird keine Grenze geraten. Das bedeutet **nicht unbegrenzt**:
Anbieter-, Modell- und Kontextgrenzen, lokale Antwortgrößen und Timeouts bleiben
bestehen. Reasoning verbraucht weiterhin Generierungstokens; größere Antworten
können höhere Kosten verursachen. Unvollständige/ungültige Antworten werden nicht
übernommen, aber auch nicht automatisch kostenpflichtig wiederholt oder fortgesetzt.

#### Storyboard-Vorschaubilder und Cover
Die Bildgröße folgt automatisch dem Storyboard-Format; Cover folgen dem ausführbaren Projektformat.
Skizzen starten mit Qualität `low`: GPT Image 2 nutzt 1280×720 (16:9), 720×1280 (9:16) oder 816×816.
Cover starten mit `high` und 1536×864, 864×1536 oder 1024×1024. Die Qualität bleibt manuell änderbar.
Für GPT Image 1.5 und unbekannte Modelle werden konservativ die festen Standardgrößen angefragt;
danach wird lokal mittig auf das Zielformat zugeschnitten. Dabei können Randdetails verloren gehen.
Das Verkleinern oder Zuschneiden nach der Erzeugung spart keine API-Kosten. Kosten hängen von Modell,
Qualität und Abrechnung des Anbieters ab; kleinere Auflösung allein ist keine Preisgarantie.
Bereits vorhandene Bilder bleiben unverändert. Keine automatischen kostenpflichtigen Bildaufrufe.

#### Storyboard speichern und KI-Ergebnisse
„Änderungen speichern“ übernimmt das Storyboard ins aktuelle Projekt und lässt das Overlay offen.
Erfolgreiche, validierte Storyboard- und Skizzen-Antworten aus dem API-Workflow werden automatisch
im aktuellen Projekt gespeichert. Das gilt auch für den KI-Button direkt am Bildfeld.
Freigaben bleiben explizit; fehlerhafte, abgebrochene oder veraltete Antworten werden nicht übernommen.
Projektänderungen lassen sich rückgängig machen. Eine exportierte Datei auf der Festplatte wird dabei
nicht automatisch überschrieben; dafür das SceneScript weiterhin explizit herunterladen.

#### Fehlerdetails aus den Anbieterantworten
Das kopierbare Fehlerfeld zeigt die Originalmeldung des Anbieters zuerst, ergänzt durch HTTP-Status,
Fehlertyp, Code, Parameter und Request-ID, soweit vorhanden. Darunter bleibt die allgemeine lokalisierte
Einordnung als Hilfestellung. Die Originalmeldung wird nicht automatisch übersetzt.
Ausgewertet werden nur bekannte Diagnosefelder; keine vollständigen Antwort-/Header-Dumps.
Fehlerantworten sind auf 16 KiB begrenzt, einzelne Meldungen werden gekürzt und API-Schlüssel maskiert.
HTML-Fehlerseiten werden nicht als Diagnose angezeigt. Ohne verwertbare Details bleibt die allgemeine
Meldung erhalten. Auch fehlgeschlagene und unvollständige Responses liefern vorhandene Diagnosegründe.
Es entstehen keine zusätzlichen API-Aufrufe oder automatischen Wiederholungen.

Fehler erscheinen als kompaktes Overlay ohne die normalen Workflow-Einstellungen.
Die untere Toolbar enthält links Kopieren und rechts Schließen (Icons mit Tooltips).
Bei teilfertigen Sprachaufträgen führt das Schließen der Fehlermeldung zurück zur Vorschau
der bereits erzeugten Dateien, damit diese weiterhin ausdrücklich übernommen werden können.

#### Feste Ausstattung und Bildreferenzen im Storyboard
Kulissen haben optional `objects:[objectId]`: feste Ausstattung aus `board.characters` mit
`kind:"object"`. Im Kulissen-Tab öffnet der Bleistift bei „Feste Ausstattung“ eine Mehrfachauswahl.
Charaktere gehören nicht zur Ausstattung; sie werden wie bisher direkt in Szenen zugeordnet.
Kulissenbilder zeigen eine leere Umgebung mit der definierten Ausstattung, Szenenbilder einen
einzelnen Moment mit den zugeordneten Figuren, Objekten und Kulissen.
Alte Storyboards ohne `objects` bleiben gültig; es gibt keine automatische Zuordnung anhand von Namen.
Änderungen an Ausstattungsobjekten setzen auch die Freigaben abhängiger Kulissen und Szenen zurück.

Die Bilderzeugung sendet standardmäßig passende vorhandene Bildreferenzen:
- Charakter/Objekt: das eigene vorhandene Referenzbild, sofern vorhanden.
- Kulisse: die Bilder ihrer festen Ausstattung, nicht ihr bisheriges Kulissenbild oder fremde Figuren.
- Szene: zugeordnete Figuren/Objekte, Kulissen und deren feste Ausstattung; nicht frühere Szenenbilder.
- Cover: weiterhin textbasiert, kein automatischer Upload der gesamten Bildbibliothek.
„Passende Referenzbilder mitsenden“ kann im normalen KI-Dialog ausgeschaltet werden.
Anzahl und Namen werden vor der Anfrage angezeigt; der direkte KI-Button nutzt diese Standardwerte.
Maximal acht eindeutige Referenzbilder / 6 MiB Upload. Die Quellen dürfen zusammen größer sein:
Referenzen werden lokal proportional auf höchstens 1024 Pixel Kantenlänge verkleinert und bei Bedarf
als WebP komprimiert bzw. weiter verkleinert, bis alle gemeinsam ins Budget passen. Sichere SVGs
werden gerastert; Transparenz und Seitenverhältnis bleiben erhalten, Originalbilder unverändert.
Bei mehr als acht Referenzen gibt es eine klare Fehlermeldung vor dem API-Aufruf, kein stilles Weglassen.
Mit Referenzen wird `POST /v1/images/edits` mit JSON-`images:[{image_url:embeddedDataURL}]` verwendet;
ohne Referenzen weiterhin `/v1/images/generations`. Kein Upload über Files API, keine externen URLs,
keine automatischen Wiederholungen oder kostenpflichtigen Fallback-Aufrufe.
Bildreferenzen verursachen zusätzliche Eingabekosten und garantieren keine vollständig identischen Figuren.
API-Format: [offizielle OpenAI-Dokumentation](https://developers.openai.com/api/reference/resources/images/methods/edit).

#### SceneScript direkt aus dem Storyboard starten
Die Storyboard-Toolbar enthält einen eigenen Icon-Button „SceneScript aus freigegebenem Storyboard
erstellen“. Er ist nur aktiv, wenn alle Charaktere, Objekte, Kulissen und Szenen sowie das gesamte
Storyboard freigegeben und alle Kommentare erledigt sind. Der Button speichert den aktuellen
freigegebenen Plan ins Projekt und startet nach einer kurzen Daten-/Kostenbestätigung direkt
mit dem empfohlenen Modell und Denkaufwand (aktuell GPT-6.1 Sol / high). Der Einstellungsdialog
entfällt; der allgemeine KI-Einstieg bleibt für abweichende Modell-/Denkaufwand-Einstellungen erhalten.
Auch im allgemeinen KI-Einstieg aus einem vollständig freigegebenen Storyboard ist diese Aufgabe
jetzt wählbar. Vor der kostenpflichtigen Anfrage gilt weiterhin die Daten-/Kostenbestätigung.
Das ausführbare Ergebnis wird zunächst validiert und als Vorschau angeboten, nicht automatisch
als Storyboard-Antwort übernommen. Erst „Übernehmen“ ersetzt das aktuelle Projekt/Video, erhält
das freigegebene Storyboard, schließt beide Dialoge und erlaubt Undo. Abbruch oder Schließen der
Vorschau lässt das bestehende Video unverändert.

#### Storyboard-Bilder als ausführbare Ressourcen übernehmen
Beim API-Ergebnisimport dürfen `assets`-Manifeste mit einer vorhandenen Storyboard-Bild-ID
auf deren eingebettete Bilddaten zurückgreifen. Nur ausdrücklich deklarierte Bilder werden
übernommen; unbekannte IDs bleiben Fehler. Bestehende Projekt-Bildressourcen haben bei
ID-Kollisionen Vorrang. Audio und Video können keine Storyboard-Bildmanifeste übernehmen.
Das freigegebene Storyboard bleibt unverändert erhalten.
Existiert noch kein Cover, kann ein Thumbnail-Manifest mit dem exakten, eindeutigen Namen
eines vorhandenen Rasterbilds wiederhergestellt werden. Unbekannte oder mehrdeutige Namen
werden abgelehnt; ein bestehendes Cover hat Vorrang. Standalone-Exporte enthalten weiterhin
echte Bilddaten. Dafür sind keine weiteren KI-Aufrufe erforderlich.
