# Jacktools Company – erster Homepage-Entwurf

Eigenständige statische Astro-/TypeScript-Seite, mit der Technik, CSS-Designbasis
und dem Einstellungsmenü des Timer-Projekts. Keine Angular-Anwendung.

## Lokal starten

Node.js >= 24.17.0 (siehe `.nvmrc`), danach:

```sh
cd company
npm ci
npm run dev
```

`npm run build` prüft TypeScript/Astro und erzeugt `dist/`.
`npm run preview` zeigt den Build lokal. `npm run test:e2e` prüft Desktop und Mobil
(nach einmaligem `npx playwright install chromium`).

## Inhalt und Design

- Deutschsprachige Startseite mit Timer, MessageDrop und einem Platzhalter für weitere Tools.
- Acht Farben, vier Stile, Hell/Dunkel und Schriftgröße 100–130 %.
- Standard: Grün, Technisch und Auto (Systemdarstellung); gespeicherte Benutzereinstellungen haben Vorrang.
- Stilisierte SVG-Karte mit Designfarben und drei Original-Markern aus dem MessageDrop-Frontend (`public/markers/`).
- Originales Jacktools-Icon von jacktools.net lokal als PNG eingebunden (Header und Favicon).
- Speicherung nur nach aktiver Auswahl; eigene `jacktools.company.*`-Schlüssel.
- Keine externen Fonts, eingebetteten Drittanbieterinhalte oder Analytics.
- Native Links, Radio-Buttons, Tastaturbedienung und Sprunglink zum Inhalt.
- Impressum, Datenschutz, Nutzungshinweise und eigene 404-Seite.
- Die Timer-/Kartenansichten sind bewusst statische Illustrationen.

## Vor Veröffentlichung

Dies ist ein Entwurf, keine rechtliche Freigabe. Betreiberinformationen und
Hostingannahmen stammen aus dem Timer-Projekt und müssen für die Homepage
bestätigt werden. Insbesondere Logs und Löschfristen, Hosting-/E-Mail-Verträge,
Empfänger/Drittlandverarbeitung, Datenflüsse bei Buy Me a Coffee sowie eine
etwaige Wirtschafts-Identifikationsnummer prüfen. Rechtstexte abschließend prüfen.
Lokale, nicht veröffentlichbare Timer-Prüfnotizen wurden nicht kopiert.

`public/robots.txt` erlaubt auf ausdrücklichen Wunsch öffentliche Indexierung
und verweist auf `/sitemap.xml`. Die Sitemap enthält nur die kanonische Startseite;
Rechtstexte und die 404-Seite bleiben `noindex`. Entwurfshinweise nach Abschluss
der Prüfung entfernen. Diese lokale Änderung wurde nicht veröffentlicht.

Als Ausgangspunkte wurden https://jacktools.net und https://app.messagedrop.de
sowie das lokale Timer-Projekt verwendet. Projekttexte sind keine Aussage über
die rechtliche Vollständigkeit der bisherigen Website.

## Kurzadressen und Weiterleitungen

`https://jacktools.net/clock` und `/clock/` leiten auf
`https://clock.jacktools.net/` weiter. Entsprechend existieren Kurzadressen für
`timer`, `stopwatch`, `breathe`, `relax`, `calculator`, `lava` und `scenescript`.
Zusätzlich: `pomodoro`, `interval`, `intervall`, `training` und `messagedrop`.
Die einzigen Zieladressen stehen in `src/lib/tool-redirects.ts`.
Noch nicht veröffentlichte Tools sind über ihre vorbereiteten Kurzadressen erst
nutzbar, wenn die jeweilige Subdomain veröffentlicht wurde. Die Homepage muss
sie deshalb nicht schon als verfügbare Angebote verlinken.

Der Build erzeugt:

- Statische Weiterleitungsseiten (`dist/clock/index.html` usw.) als Fallback für
  alle statischen Hosts: Meta-Refresh, sichtbarer Ziellink, noindex und Canonical
  auf die Subdomain. Mit JavaScript werden Queryparameter und Fragment erhalten.
- `dist/.htaccess`: echte **HTTP-301-Weiterleitungen** für Apache mit mod_rewrite,
  mit und ohne abschließenden Slash. Queryparameter bleiben dabei erhalten.
- `hosting/tool-redirects.nginx.conf`: entsprechende Regeln für einen nginx-Host.

**Deployment:** Auch die versteckte Datei `.htaccess` berücksichtigen. Gibt es
auf dem Server bereits eine `.htaccess`, die erzeugten Regeln mit den bestehenden
Regeln zusammenführen, statt die vorhandene Konfiguration blind zu ersetzen.
Bei nginx die Snippet-Regeln im passenden `server`-Block einbinden; eine
`.htaccess` wird von nginx nicht ausgewertet. Hostingänderungen sind nicht Teil
des lokalen Builds. Ohne Serverregeln erfolgt die Weiterleitung durch die
statische HTML-Seite; diese liefert selbst keinen HTTP-301-Status.

Die Hauptseite verlinkt weiterhin die echten Subdomains; Kurzadressen kommen
nicht in die Sitemap. Nach dem Upload z. B. mit
`curl -I https://jacktools.net/clock` prüfen: bei aktiven Serverregeln werden
`301` und `Location: https://clock.jacktools.net/` erwartet.

## Languages

The homepages `/de/`, `/en/`, `/es/` and `/fr/` share a single component and complete
build-time translations (`company-copy.json`). Header/footer and privacy/settings
controls use `company-ui.ts`. German source text is the editorial base.

Opening `/` selects the primary browser language (regional variants included),
with English for unsupported languages. Direct localized links are never
redirected. The root renders English HTML as a no-JavaScript fallback.
Language tiles live in Settings; switching preserves the current section and,
when storage is enabled, appearance. Language-specific tool links, canonical URLs,
reciprocal hreflang and the sitemap are generated with the selected language.

Company legal documents remain the existing German originals. Other languages
label those links `(DE)` rather than pretending that translations exist. Language
tiles on a legal page lead to the chosen localized homepage.

## Metronom-Integration

Das Metronom hat eine eigene Kachel (`#online-metronom`), einen Eintrag in den Sprunglinks und im `ItemList`-Schema sowie eine achte Variante der zufälligen Spotlight-Auswahl. Kachel und Spotlight verwenden dieselbe statische Orbit-Vorschau; es werden keine Metronom-Skripte geladen und keine Töne abgespielt. Texte und Ziel-URLs sind für DE/EN/ES/FR lokalisiert. `/metronome` ist als fester Tool-Kurzlink vorbereitet, inklusive generierter Hosting-Regeln.

Company- und Metronom-Build gemeinsam veröffentlichen, damit die neuen Links ein erreichbares Ziel haben. Es wurde nichts deployed. Für einen isolierten Testserver kann `COMPANY_TEST_PORT=4349 CI=1 npm run test:e2e` verwendet werden.
