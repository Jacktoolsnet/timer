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

## Mindestgröße

Der Editor ist für Tablet und Computer vorgesehen: mindestens **768 CSS-Pixel
Viewport-Breite**. Kleinere Fenster zeigen statt des Editors einen lokalisierten
Hinweis; die KI-Anleitung bleibt zugänglich. Es findet keine Geräteerkennung
per User-Agent statt. Bereits laufende Aufnahmen werden beim Verkleinern nicht
abgebrochen, und Projekte bleiben im Arbeitsspeicher erhalten.
Hochkant-Projekte für Smartphone-Zielgruppen sind weiterhin möglich.

## Erste Version

- Szenen erstellen, duplizieren, umordnen, löschen und Dauer einstellen.
- Text, Bild und Rechteck; Elemente auswählen, duplizieren, umordnen und löschen.
- Editor für Position, Größe, Farbe, Schrift, Ausrichtung, Deckkraft, Drehung,
  Eckenradius, Bildanpassung und Animationszeitpunkte.
- 1920×1080, 1080×1920 und 1080×1080 als logische Projektauflösung.
- Einblenden, Bewegung von rechts/unten, Zoom, Schreibmaschine, langsamer Zoom.
- Szenenhintergründe als Farbe/Bild und optionales Einblenden des Szeneninhalts.
- PNG/JPEG/WebP-Import: Bilder werden als Base64-Data-URLs zentral im JSON
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

Maximal 30 MiB JSON (UTF-8), 8 MiB je Bild und 40 Megapixel, 100 Assets,
100 Szenen, 100 Elemente pro Szene. Base64 benötigt etwa 33% zusätzlichen
Speicher. V1 akzeptiert keine externen Bild-URLs, SVG, HTML oder beliebigen Code.
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

Direkter Videoexport, Audio, frei definierte Keyframes, Bildkomprimierung,
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
