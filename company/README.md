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
Empfänger/Drittlandverarbeitung, Datenflüsse bei Google AdSense sowie eine
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

## AdSense-Werbeplatz

Die lokalisierten Startseiten enthalten zwischen Spotlight und Toolübersicht
genau einen responsiven AdSense-Slot (Client ca-pub-5182500947872057,
Slot 4560273012). Der gelieferte Code heißt „Horizontal JackTools.Net“ und
verwendet Format auto; es ist kein festes vertikales Hochformat.
Impressum, Datenschutz und Weiterleitungsseiten enthalten diesen Slot nicht.
Die Beschriftung „Werbung“ ist lokalisiert; Mindesthöhe reduziert Layoutsprünge.
Adblocker oder fehlendes Inventar können den Werbeplatz leer lassen.

**Vor Veröffentlichung:** Im AdSense-Konto unter „Datenschutz und Mitteilungen“
die passende Google-zertifizierte CMP/Einwilligungsnachricht für jacktools.net
einrichten und veröffentlichen, inklusive Möglichkeit zur erneuten Auswahl.
Die vorhandene Option zum Merken der Darstellung ist KEINE Werbeeinwilligung.
Die Einbindung des AdSense-Skripts allein richtet keine CMP ein.
Einwilligung, Ablehnung und Widerruf auf der veröffentlichten Domain prüfen;
Datenschutzerklärung mit tatsächlichen Konto-/Partner-Einstellungen abgleichen.
Diese Änderungen sind keine rechtliche Freigabe.
Siehe https://support.google.com/adsense/answer/13554116?hl=de
und https://support.google.com/adsense/answer/1348695?hl=de.

Automatisierte Tests müssen Google-Anfragen abfangen; keine echten Anzeigen
anklicken oder durch wiederholte Testaufrufe künstliche Impressionen erzeugen.

## Style background animations

The Company layout uses the same four local canvas scenes as NullTopic:
rising particles (warm), horizontal strokes (minimal), falling glyphs
(technical), and soft moving colour gradients (soft). The renderer and lifecycle
controller are copied into Company; it does not import or change NullTopic.

The Settings switch is page-local and does not write browser storage.
Reduced motion and forced colours disable the decoration; hidden tabs suspend
rendering. Buffers are capped at approximately 2.2 million pixels and animation
at 24 fps. Resources are cleaned up on pagehide and restored after BFCache
navigation. Canvas remains behind content, ignores pointer events and is
excluded from accessibility trees and printing. No remote assets or tracking.

## Timer-Detailseite

Die deutsche Anleitung liegt unter `/de/tools/timer/` und ist auf der deutschen
Startseite in der Timer-Karte verlinkt. Sie erklärt Countdown, Pomodoro und
Intervalltimer mit Beispielen, lokalen Einstellungen und Browser-Grenzen.
Die bestehenden Kurzadressen (insbesondere `/timer/`) bleiben Weiterleitungen.
Die Anleitung besitzt einen eigenen Canonical und Sitemap-Eintrag; solange keine
Übersetzungen existieren, werden keine hreflang-Verweise auf fremde Inhalte gesetzt.

Gezielter Browser-Test: `npx playwright test tests/timer-guide.spec.ts`.

Die Timer-Anleitung nutzt eigene PNG-Screenshots unter `public/images/timer/`,
aufgenommen am 23.11.2026 aus dem lokalen Timer-Projekt (deutsch, helle Darstellung,
Viewport 1280 × 1000, jeweils die `.timer-card` vor dem Start). Keine externen
Bilder oder echten Anzeigen wurden dafür geladen. Bei Bedienungsänderungen die
Screenshots aktualisieren. Die Bilder werden verzögert geladen, lassen sich in
Originalgröße öffnen und bleiben in der Druckansicht ausgeblendet.

## Weitere deutsche Tool-Anleitungen

Für alle sieben weiteren Tools der öffentlichen Startseite gibt es deutsche
Detailseiten unter `/de/tools/{clock,stopwatch,calculator,breathe,relax,metronome,messagedrop}/`.
Die Startseite verlinkt sie als sekundäre Buttons; bestehende Kurzadressen bleiben
unverändert Weiterleitungen zu den Anwendungen. Übersetzungen sind noch nicht
angelegt, daher keine fremdsprachigen Links oder hreflang-Verweise auf diese Texte.
Lava und SceneScript sind weiterhin nicht Teil der öffentlichen Toolliste.

- Redaktionelle Inhalte: `src/lib/tool-guides.json`
- Metadaten/Bilder: `src/lib/tool-guides.ts`
- Gemeinsame Darstellung: `src/components/ToolGuidePage.astro`
- Galerie und Druck-FAQ-Verhalten: `src/components/GuideGallery.astro`
- Prüfungen: `npx playwright test tests/tool-guides.spec.ts`

Inhalte wurden anhand der lokalen Tool-Komponenten, Engines und READMEs erstellt.
MessageDrop wurde mit der deutschen Hilfe im lokalen Nachbarprojekt abgeglichen;
seine Backend-/Benutzerfunktionen werden nicht als rein lokales Browser-Tool dargestellt.
Die PNGs unter `public/images/guides/` wurden am 23.11.2026 aus den lokalen Tools
aufgenommen (deutsch, hell, 1280 CSS-Pixel Viewport, ohne echte Werbeanfragen).
Der Taschenrechner zeigt fiktive Werte 100, +20 %, −20 % als Beispiel.
MessageDrop nutzt stattdessen ein eigenes ausdrücklich schematisches SVG ohne echte
Karten-/Nutzerdaten. Bilder werden verzögert geladen, in der Galerie vergrößert und
beim Drucken ausgeblendet. FAQs werden für den Browser-Druck geöffnet und danach
in ihren vorherigen Zustand zurückversetzt. Werbeeinheiten werden nur bei
AdSense-Status `filled` sichtbar. Keine Veröffentlichung durch den Build.

### SEO der deutschen Anleitungen

Alle acht Detailseiten (einschließlich Timer) besitzen individuelle Titel und
Beschreibungen, feste selbstreferenzierende Canonicals mit abschließendem Slash,
Open-Graph-/Twitter-Metadaten sowie ein `WebPage`-/`Article`-JSON-LD aus sichtbaren
Inhalten. Keine erfundenen Bewertungen, Veröffentlichungsdaten oder FAQ-Rich-Result-
Versprechen. Ohne veröffentlichte Übersetzungen werden weiterhin keine
hreflang-Alternativen angegeben. Die Anleitungen sind untereinander und von der
Startseite aus mit normalen HTML-Links erreichbar und in der Sitemap enthalten.

Die bereits vorhandenen Tool-Social-PNGs werden lokal unter `public/social/`
mitgeliefert. MessageDrop verwendet weiterhin das allgemeine Company-Vorschaubild.
`SocialMeta` unterstützt hierfür optional `imageProject`, ohne den Namen der
veröffentlichenden Website zu ändern. Der Standard anderer Projekte bleibt gleich.

Prüfungen: `npm run build`, `python3 ../scripts/check-seo.py company` und
`npx playwright test tests/guide-seo.spec.ts`. Der Sitemap-Checker berücksichtigt
jetzt die zwölf Company-URLs (vier Startseiten plus acht deutsche Anleitungen).
Nach tatsächlicher Veröffentlichung müssen Erreichbarkeit, Weiterleitungen und
Indexierung auf dem Live-Host separat geprüft und die Sitemap in Search Console
eingereicht werden. Lokale Prüfungen sind keine Ranking- oder AdSense-Zusage.
