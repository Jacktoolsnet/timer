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
- Standard: Grün und Technisch; gespeicherte Benutzereinstellungen haben Vorrang.
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

`public/robots.txt` sperrt derzeit das Crawling für den Entwurf. Dies ist keine
Zugangssperre. Vor dem Livegang bewusst auf öffentliche Indexierung umstellen,
Entwurfshinweise nach Abschluss der Prüfung entfernen und gegebenenfalls eine
Sitemap ergänzen. Das Projekt wurde nicht veröffentlicht.

Als Ausgangspunkte wurden https://jacktools.net und https://app.messagedrop.de
sowie das lokale Timer-Projekt verwendet. Projekttexte sind keine Aussage über
die rechtliche Vollständigkeit der bisherigen Website.
