# PixiJS-Machbarkeitsprüfung für SceneScript

Stand: 30.10.2026. **Empfehlung: PixiJS als primären 2D-Renderer weiterverfolgen,
aber SVG-Adapter und asynchrone Textvorbereitung explizit einplanen.**
Keine Umstellung der Anwendung und keine Änderung ihrer Abhängigkeiten.
Dieses Experiment hat eigene, festgelegte Abhängigkeiten.

## Wiederholen

Mit Node 24.17.0 (wie im Hauptprojekt):

```sh
cd scenescript/experiments/pixi-feasibility
npm ci
npx playwright install chromium # nur falls noch nicht vorhanden
npm run check
```

Der Test startet und beendet einen eigenen lokalen HTTP-Server. Ergebnisse:
`results.json`, `result.png` (generiert, nicht versioniert). Assertions prüfen
sichtbaren Text, wiederholbare Frames, Encoding, SVG-Adapter und beide
Three.js-Integrationswege. Die erwartete native SVG-Inkompatibilität wird
bewusst erfasst, nicht als unerwarteter Testfehler behandelt.

## Durchführung und Ergebnisse

Ausgeführt mit PixiJS 8.22.0, Three.js 0.186.1, Playwright 1.63.0,
Headless Chromium 153, WebGL mit zugelassenem SwiftShader-Software-Fallback.
Keine Hardware-Performance-Messung. Der Screenshot wurde zusätzlich visuell geprüft.

| Prüfung | Beobachtung | Bewertung |
| --- | --- | --- |
| Text / Sprechblase | Gerundete Blase mit Spitze, nativer Text mit linearem Verlauf, Kontur und Schatten; HTMLText mit Fett, Kursiv, Unter-/Durchstreichen sichtbar | Grundfunktionen möglich, keine vollständige Text-Feature-Parität nachgewiesen |
| Zeitpunkt / Scrubbing | Zeiten 0.75 → 0.1 → 0.75 liefern identische Pixel-Hashes beim wiederholten Zeitpunkt und unterschiedliche beim anderen Zeitpunkt | Eigene absolute Timeline kann Renderer steuern, kein autonomer Ticker nötig |
| Frame-Ausgabe / Encoding | Pixi-Canvas in Canvas2D kopiert; drei Frames über WebCodecs VP8 mit Zeitstempeln 0/33333/66667 µs kodiert | Direkter Frame-Pfad möglich; noch kein kompletter SceneScript-MP4/WebM-Export mit Audio/Muxing |
| SVG direkt als Graphics | SVG-Text wird als unsupported gemeldet; SMIL `animate` mit `fill="freeze"` löst `Unable to convert color freeze` aus | Nicht als direkten Ersatz für die vorhandene SVG-Unterstützung verwenden |
| SVG-Adapter | Browser-SMIL auf 0 → 0.5 → 0 gesetzt, animierten cx-Wert übernommen, Animation entfernt, SVG als Bild/Textur gezeichnet; Hashes wiederholbar und zeitabhängig | Prinzip des vorhandenen `seekSvg`/`freezeSvg` wiederverwendbar; Test deckt nur einfache cx-Animation ab |
| Three.js als Canvas-Textur | Grün → Blau nach `texture.source.update()`, Pixelwerte exakt geprüft | Anschluss an bestehenden separaten Stage3DRenderer grundsätzlich möglich, zusätzliche Uploadkosten |
| Gemeinsamer WebGL-Kontext | Three-Hintergrund plus Pixi-Overlay, beide Pixelproben korrekt | Alternative mit geteiltem Kontext und State-Reset möglich; erfordert Umbau des Stage3DRenderer |

## Bezug zur vorhandenen Architektur

- `src/scripts/rich-text.ts`: Text-Runs und Effekte basieren auf Browser-CSS.
  HTMLText kann komplexe Typografie abbilden, rasterisiert aber selbst über
  SVG/foreignObject und arbeitet asynchron. Pixi beseitigt diesen Mechanismus
  also nicht automatisch. Vor einem Export braucht es explizite Readiness und
  Caching (im Experiment nur begrenzte Render-/Wartezyklen, kein produktiver Loader).
- `src/scripts/svg-image.ts`: SVG wird bereits im Browser angehalten und auf
  absolute Zeit gesetzt. `src/scripts/export-renderer.ts` friert vor dem Export
  animierte Werte ein. Das ist eine Grundlage für den nötigen SVG-Texturadapter.
  Dessen Kosten pro Frame müssen gemessen werden.
- `src/lib/groups.ts` / `src/lib/model.ts`: Zeitbezogene Zustandsberechnung kann
  unabhängig vom Renderer bleiben; der Test nutzt eine einfache eigene Zeitfunktion,
  noch keine integrierte SceneScript-Timeline.
- `src/scripts/export-renderer.ts`: Derzeit separater DOM-Szenenbaum,
  `html-to-image` → SVG → Image → Canvas. Ein Pixi-Renderer könnte den gesamten
  DOM-Snapshot der Szene ersetzen, aber nicht zwingend das Rasterisieren einzelner
  HTML-/SVG-Ressourcen.
- `src/scripts/video-export.ts`: Übergibt bereits Canvas-Frames an Mediabunny.
  Audio, Codecs und Muxing bleiben zuständig; hier wurde nur der vorgelagerte
  Pixi-Canvas/WebCodecs-Grundpfad geprüft.
- `src/scripts/stage3d.ts`: Three.js besitzt seinen eigenen WebGLRenderer und
  unterstützt absolute Renderzeit. Canvas-Textur ist die kleinere Integrationsänderung;
  geteilter Kontext verlangt u. a. gemeinsame Kontextverwaltung und Stencil-Konfiguration.

## Grenzen / nächste Abnahme

Kein Vergleich von FPS, Exportdauer oder Speicherverbrauch; keine vollständige
Migration, Langzeitexporte, realen Projektdateien, Safari/Firefox, WebGPU oder
Mobilgeräte getestet. Noch offen sind insbesondere konische Textverläufe,
Schriftwechsel/Zeilenumbruch-Parität, Texteffekte in allen Kombinationen,
zeitabhängiger Rich Text, vollständige SVG-Animationen/Clipping und alle
bestehenden Szeneneffekte. Die erfolgreiche Grundprüfung ist daher eine
Architekturfreigabe für einen vertikalen Prototyp, keine Freigabe zur Veröffentlichung.

Nächster sinnvoller Schritt: echte SceneScript-Szene mit Text, SVG und 3D durch
dieselbe Pixi-Zeichenlogik in Vorschau und vollständigen Export bringen; danach
auf Zielgeräten und mit einer objekt-/effektreichen Szene messen.

## Primärquellen

- https://pixijs.com/8.x/guides/components/scene-objects/text/html
- https://pixijs.com/8.x/guides/third-party/mixing-three-and-pixi
- PixiJS-Quellcode/Dokumentation über Context7 (`/pixijs/pixijs`), zusätzlich lokale
  Implementierung der tatsächlich installierten Version.

## Gestalterische Animationsdemo: „Der kleine Lichtsammler“

Die eigenständige, stumme 16-Sekunden-Studie zeigt konkret die Möglichkeiten,
nicht die Geschwindigkeit des Renderers. Keine Bild-/Schriftdownloads, kein Backend,
keine generierten Rasterbilder: Figur und Umgebung bestehen aus Pixi-Vektorformen
und lokal gerendertem Text. Kein Plugin oder Skelettanimationspaket erforderlich.

```sh
cd scenescript/experiments/pixi-feasibility
npm ci # falls die Experiment-Abhängigkeiten noch fehlen
npm run demo
# http://127.0.0.1:4438
npm run test:demo
```

- **0–4 s:** Gangzyklus mit separaten Hüft-/Kniegelenken, gegenläufigen Armen,
  Körperspiel und Kamerafahrt mit Parallaxenebenen.
- **4–7 s:** Blick zum Licht, Kopfneigung, Blinzeln, Winkbewegung über Schulter
  und Ellenbogen, federnd eingeblendetes Fragezeichen.
- **7–11 s:** Vorbereitung durch Einfedern, Sprungbogen, Squash/Stretch,
  Funke trifft die transformierte Hand, Partikelstoß und gedämpftes Nachschwingen
  bei der Landung. Antenne und Vegetation haben sekundäre Bewegung.
- **11–16 s:** Animierte kreisförmige Stencil-Maske öffnet den Nachtgarten;
  Glühwürmchen und ein eingeblendeter Schlussgedanke runden die Szene ab.

Bedienung: Play/Pause, Neustart, frei verschiebbare Zeitleiste, Kapitelwahl,
Tempo, Loop und PNG des aktuellen Frames. Bei `prefers-reduced-motion` startet
die Demo pausiert. Auf schmalen Displays bleiben die wesentlichen Bedienelemente
sichtbar; Tempo/Loop werden dort ausgeblendet.

`demo-check.mjs` prüft in Chromium: wiederholbare Bild-Hashes nach Vor-/Rückwärtssprüngen,
Pose/Antizipation/Sprung, Kontakt von Hand und Funke, Irisfortschritt, Play/Pause,
Scrubber, Kapitelwahl, PNG-Download, Ende ohne Loop, Reduced Motion und Layout
bei 390 px Breite. Screenshots und JSON werden nach `demo-results/` geschrieben.
Schlüsselbilder sowie Desktop-/Mobilansicht wurden visuell geprüft.

### Was die Demo belegt – und was nicht

Die sichtbare Qualität entsteht vor allem durch bewusste Choreografie, Posen,
Easing, Nachschwingen und Komposition. Pixi stellt den Szenengraphen, die
Vektorzeichnung, Gelenktransformationen und die Maskierung bereit. Die Demo
belegt diese Kombination, ist aber **noch kein importierbares SceneScript-Projekt**:
Figuren-Rig, Bewegungsabläufe und Kurven sind zunächst handgeschriebener JavaScript-Code.
Ebenso fehlen hier Ton und vollständiger Videoexport. Damit diese Ausdrucksmittel
im Editor nutzbar werden, müssen sie anschließend in Projektmodell, Timeline
und Bedienoberfläche überführt werden. Shader und Mesh-Verformungen werden in
dieser Studie nicht demonstriert.
