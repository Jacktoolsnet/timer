# Referenzbilder – Der kleine Lichtsammler

Zehn Referenzbilder aus den tatsächlichen 2D-Vektorressourcen des Demoprojekts,
keine externen oder KI-generierten Motive. Alle Bilder sind 960 × 540 Pixel (WebP).

- **Figuren:** `collector.webp`, `butterfly.webp` (drei Farbvarianten)
- **Objekte:** `spark.webp`, `flower.webp` (drei Farbvarianten)
- **Kulissen ohne Darsteller:** `forest.webp`, `night-garden.webp`
- **Storyboard-Abschnitte:** `arrival.webp` (2,3 s), `discovery.webp` (5,25 s),
  `catch.webp` (12,5 s), `transformation.webp` (21 s)

Die Referenzen sind zusätzlich als Data-URLs in
`src/lib/light-collector-references.json` und im exportierbaren Startprojekt
`public/examples/light-collector.scenescript.json` eingebettet. Sie bleiben damit
auch beim Speichern, Herunterladen und erneuten Importieren des Projekts erhalten.
Die Referenzbilder ersetzen keine animierten Ressourcen und geben nichts automatisch frei.

## Erneut erzeugen

Mit Node.js 24 und laufendem SceneScript-Entwicklungsserver im Verzeichnis `scenescript`:

```sh
npm run example:light-collector:references -- --url http://127.0.0.1:4321
```

Das Skript nutzt den bestehenden Pixi- und Export-Renderer über Playwright,
aktualisiert diese WebP-Dateien und die eingebetteten Daten und paketiert das
Demoprojekt anschließend neu. Keine API-Schlüssel oder kostenpflichtigen Aufrufe.
