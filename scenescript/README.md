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

Maximal 30 MiB JSON (UTF-8), 8 MiB je Rasterbild / 1 MiB je SVG und 40 Megapixel, 100 Assets,
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
Abbrechen sind vorhanden. Geschätzte Dateien über 512 MiB werden vorab abgelehnt,
da die fertige Datei im Arbeitsspeicher gesammelt wird. Systemschriften und
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
