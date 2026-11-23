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
Die Anleitung besitzt eigene Canonicals, Sitemap-Einträge und wechselseitige
hreflang-Verweise für Deutsch, Englisch, Spanisch und Französisch.

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
unverändert Weiterleitungen zu den Anwendungen. Auch Englisch, Spanisch und
Französisch sind unter den entsprechenden Sprachpräfixen verfügbar.
Lava und SceneScript sind weiterhin nicht Teil der öffentlichen Toolliste.

- Redaktionelle Inhalte: `src/lib/tool-guides.json`
- Metadaten/Bilder: `src/lib/tool-guides.ts`
- Gemeinsame Darstellung: `src/components/ToolGuidePage.astro`
- Galerie und Druck-FAQ-Verhalten: `src/components/ToolShowcase.astro`
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
Versprechen. Alle vier Sprachversionen verweisen wechselseitig per hreflang
aufeinander (x-default: Englisch). Die Anleitungen sind untereinander und von der
jeweiligen Startseite aus mit normalen HTML-Links erreichbar und in der Sitemap enthalten.

Die bereits vorhandenen Tool-Social-PNGs werden lokal unter `public/social/`
mitgeliefert. MessageDrop verwendet weiterhin das allgemeine Company-Vorschaubild.
`SocialMeta` unterstützt hierfür optional `imageProject`, ohne den Namen der
veröffentlichenden Website zu ändern. Der Standard anderer Projekte bleibt gleich.

Prüfungen: `npm run build`, `python3 ../scripts/check-seo.py company` und
`npx playwright test tests/guide-seo.spec.ts`. Der Sitemap-Checker berücksichtigt
jetzt die 36 Company-URLs (vier Startseiten plus acht Anleitungen in vier Sprachen).
Nach tatsächlicher Veröffentlichung müssen Erreichbarkeit, Weiterleitungen und
Indexierung auf dem Live-Host separat geprüft und die Sitemap in Search Console
eingereicht werden. Lokale Prüfungen sind keine Ranking- oder AdSense-Zusage.

### Timer-Galerie mit Live-Aufnahmen

Die Timer-Anleitung bündelt ihre Screenshots im `TimerShowcase.astro`: großes Bild,
kleine horizontal scrollbare Vorschaubilder, Vor/Zurück, Pfeiltasten, Touch-Wischen
und das Galerie-Overlay. Kein automatischer Bildwechsel; im Druck ausgeblendet.
Ohne JavaScript öffnen die Bildlinks weiterhin die Originaldateien.

14 Aufnahmen vom 23.11.2026 stammen direkt von `https://timer.jacktools.net`:
Digital, alle acht analogen Designs (Standard, Römisch, Minimalistisch und
Bahnhofsuhr jeweils rund/eckig), kombinierte Ansichten, Pomodoro-Fokus/-Pause,
Intervall-Aktivphase, Fokusansicht mit Hintergrund sowie die digitale Teepause. Alle acht Farbwelten,
helle/dunkle Darstellung und mehrere Oberflächenstile sind vertreten.

Reproduzieren mit `node scripts/capture-timer-gallery.mjs` (Node aus `.nvmrc`).
Das Skript steuert nur die öffentlichen Anzeige-Einstellungen in frischen
Browser-Kontexten, blockiert echte Werbeanfragen und speichert Screenshots lokal.
Es veröffentlicht oder verändert keine Inhalte auf dem Server. Originale und
optimierte WebP-Thumbnails liegen unter `public/images/timer/gallery/`, Bilddaten
und Beschreibungen in `src/lib/timer-gallery.json`. Die früheren drei PNGs bleiben
für bestehende Verweise erhalten, werden aber nicht erneut im Fließtext angezeigt.
Tests: `npx playwright test tests/timer-showcase.spec.ts tests/timer-guide.spec.ts`.


### Einheitliche Galerien aller Tool-Anleitungen

`ToolShowcase.astro` enthält die gemeinsame kompakte Galerie mit Icon-Buttons,
Tooltips und Vorschaubildern. `TimerShowcase.astro` ist nur noch der Timer-Wrapper.
Die seitlichen Buttons sind 5 px nach oben versetzt und dadurch zur Bildfläche der
Thumbnails statt zum zusätzlichen unteren Scroll-Abstand zentriert.

Die sieben weiteren Anleitungen verwenden je vier Bilder aus
`src/lib/tool-galleries.json`. Sechs Tools zeigen echte Aufnahmen ihrer öffentlichen
Online-Versionen in verschiedenen Ansichten/Farben; die Rechenbeispiele sind
fiktiv. MessageDrop zeigt vier ausdrücklich schematische Illustrationen ohne
private Nachrichten oder echte Karten-/Nutzerdaten. Die alten Einzelbilder bleiben
als Dateien erhalten, werden aber nicht zusätzlich in den Text eingebettet.

Reproduktion aus `company/`:
- `node scripts/capture-tool-galleries.mjs`: öffentliche Anwendungen, frische
  Browser-Kontexte, keine echten Werbeanfragen oder Veröffentlichungen.
- `node scripts/create-messagedrop-gallery.mjs`: lokale SVG-Schaubilder und Thumbnails.

Vorhandene MessageDrop-Bilddaten bleiben beim erneuten Screenshot-Lauf erhalten.
Galerien sind im Ausdruck unsichtbar; FAQ-Antworten werden zum Drucken weiterhin
geöffnet und danach wiederhergestellt. Tests: `tests/all-galleries.spec.ts` und
`tests/tool-guides.spec.ts`, zusätzlich die bestehenden Timer-Galerietests.

### Erweiterte Tool-Galerien (acht Bilder)

Alle sieben weiteren Tool-Galerien enthalten jetzt acht Bilder; die Timer-Galerie
bleibt bei vierzehn. Zusätzlich zu den bisherigen Ansichten zeigen die neuen
öffentlichen Live-Aufnahmen unter anderem weitere Uhrendesigns/Zeitzonen,
Stoppuhr-Runden, Rechenbeispiele und deaktivierte Schritte, weitere Atem- und
Klang-Hintergründe sowie Metronom-Tempi, Taktgrößen und Unterteilungen.

MessageDrop ergänzt seine vier ausdrücklich schematischen Illustrationen durch
vier echte öffentliche Einrichtungsansichten. Hierfür wurden weder ein Benutzer
angelegt noch Altersangaben bestätigt, Rechtstexte akzeptiert oder externe Anbieter
freigeschaltet. Es wurden keine privaten Inhalte oder Nachrichten aufgenommen.

Zusatzaufnahmen: `node scripts/capture-more-tool-galleries.mjs`. Optional können
Toolnamen angegeben werden; `--skip-messagedrop` überspringt die Einrichtungsbilder.
Das Skript ersetzt die Zusatzaufnahmen 5–8, erhält die ersten vier Bilder und
speichert optimierte Thumbnails. Beim isolierten Zuschneiden von Tool-Karten wird
der feste Seitenheader für die Aufnahme ausgeblendet, damit er den oberen Kartenrand
nicht überdeckt. Die Basis- und Schaubild-Skripte erhalten vorhandene Zusatzbilder.
Alle Beispielrechnungen und kurzen Messungen sind eigens für die Aufnahmen erzeugt.

### Anleitungen in vier Sprachen

Alle acht Anleitungen stehen unter `/{de,en,es,fr}/tools/{slug}/` zur Verfügung.
Die deutsche Timer-Route verwendet jetzt `TimerGuidePage.astro`; Layout, Galerie,
Druckansicht und Inhalte bleiben damit für alle Sprachen gemeinsam wartbar.
Die weiteren Sprachen erzeugt `[lang]/tools/[guide].astro` statisch.

`src/lib/guide-copy.json` enthält die englischen, spanischen und französischen
Texte mit deutschen Ausgangstexten als Schlüsseln. Bei Änderungen an den
Ausgangstexten müssen alle drei Übersetzungen ergänzt werden. `guideTranslator`
bricht bei fehlenden Einträgen ab, statt gemischte Sprachen zu veröffentlichen.
Struktur, Abschnitts-IDs, Screenshots und ihre URLs werden nicht übersetzt.
Bildtitel, Bildbeschreibungen, Alternativtexte, Dialog-Buttons und Tooltips sind
lokalisiert; ein Hinweis erklärt, dass die Screenshots die deutsche Oberfläche zeigen.

Sprachmenü und wechselseitige hreflang-Verweise führen zur gleichen Anleitung.
Jede Sprachversion hat eigene Titel, Beschreibungen, Canonicals und JSON-LD mit
passendem `inLanguage`. Jede Startseite verlinkt ihre acht lokalen Anleitungen;
die gemeinsame Komponente `RelatedTools.astro` bleibt ebenfalls in dieser Sprache.
Werbung ist weiterhin nur bei gefülltem AdSense-Slot sichtbar. Keine Veröffentlichung
oder erneute AdSense-Einreichung wird durch die lokalen Änderungen ausgelöst.

Zusätzliche Tests: `npx playwright test tests/guide-translations.spec.ts`.
Diese prüfen alle 24 übersetzten Seiten auf Vollständigkeit, Sprachverknüpfungen,
Metadaten, Galerien, Druckansicht und Nutzbarkeit ohne JavaScript.

## Deutscher Blog: erster NullTopic-Artikel

`/de/blog/` listet den ersten Beitrag unter `/de/blog/nulltopic-ki-agenten/`.
Die deutsche Startseite zeigt eine redaktionelle Vorschau; der deutsche Footer
verlinkt die Übersicht. Es gibt noch keine übersetzten Blogseiten und daher
keine hreflang-Alternativen. Die Sprachwahl ist als Wechsel zur Startseite erklärt.

Der Artikel beschreibt die aktive Rolle der Operatoren (Freigaben, Pausieren,
Zugänge widerrufen), nicht eine angebliche Beschränkung aller Menschen auf Mitlesen.
Das Gesprächsbeispiel ist ausdrücklich erfunden; die Grafiken sind Schaubilder.
Es werden keine Nutzerzahlen, Launch-Termine oder Veröffentlichungstermine erfunden.

Eigene, themenfähige SVGs liegen unter `public/images/blog/nulltopic/`.
`NullTopicIllustration.astro` bindet sie inline mit zugänglichen Titeln und
Beschreibungen ein. `BlogPostCard.astro` teilt die Vorschau zwischen Startseite
und Blogübersicht; Metadaten stehen in `src/lib/blog.ts`. Bilder nutzen lokale
CSS-Farbvariablen mit Standalone-Fallbacks, ohne externe Medien oder Bibliotheken.

Die Artikelseite hat ein responsives Inhaltsverzeichnis, eine A4-Druckansicht,
BlogPosting-JSON-LD und einen festen Canonical. Autor/Herausgeber ist Jacktools.net.
Die eine AdSense-Einheit verwendet unverändert die bestehende Filled-only-Logik.
Auf den Leseseiten startet die dekorative Hintergrundanimation für ruhiges Lesen
pausiert (ohne Render-Schleife). In den Einstellungen kann sie für diesen Besuch
wieder eingeschaltet werden. Farbpalette und Typografie folgen weiterhin den Einstellungen.

Die Sitemap umfasst jetzt 38 indexierbare Seiten: vier Startseiten, 32 Anleitungen
und die beiden deutschen Blogseiten. Test: `npx playwright test tests/blog.spec.ts`.
Auch dieser Stand wird durch Build/Tests nicht veröffentlicht und nicht an Medium
übertragen.
