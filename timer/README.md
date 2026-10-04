# Jacktools Timer

Erste lokale Version für **https://timer.jacktools.net**. Astro + TypeScript,
vollständig statisch, kein eigenes Backend. Kein Deployment wurde durchgeführt.

## Lokal starten

Node **24.17.0** ist in dieser Umgebung über nvm installiert:

```bash
cd /home/krapfenheld/jacktoolsnet/timer
export NVM_DIR="$HOME/.config/nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.17.0
npm install
npm run dev
```

Öffnen: **http://localhost:4321/de/timer/**

- Pomodoro: http://localhost:4321/de/pomodoro/
- Englisch / Fallback: http://localhost:4321/en/timer/
- Spanisch: http://localhost:4321/es/timer/
- Französisch: http://localhost:4321/fr/timer/

Stoppen: **Strg+C**. Wenn Port 4321 belegt ist, zeigt Astro einen anderen Port an.
Mit `npm run dev -- --host 0.0.0.0` ist ein Test im lokalen Netzwerk möglich.
Diesen Entwicklungsserver nicht öffentlich ins Internet stellen.

## Build und Vorschau

Nach dem Laden von nvm und der Node-Version:

```bash
npm run build
npm run preview
```

Der Build landet in `dist/`. Das sind statische Dateien; kein Node-Server im
Produktivbetrieb erforderlich. Für reproduzierbare Installationen `npm ci`
anstelle von `npm install` verwenden.

## Enthalten

- Countdown mit Stunden/Minuten/Sekunden, Schnellwahl, Start/Pause/Reset, Signalton.
- Pomodoro mit einstellbaren Fokus-/Pausenzeiten und Rundenanzahl.
- Neue Pomodoro-Phasen beginnen bewusst manuell. „Nächste Phase“ überspringt
  die aktuelle Phase und wartet ebenfalls auf Start.
- Warmes responsives Design, optionaler Dark Mode, Fokusansicht (Escape beendet).
- Acht Farbschemata: Terrakotta, Blau, Grün, warmes Orange, warmes Rot,
  Violett, Türkis und Rosé.
  Gemeinsames Einstellungen-Menü (Zahnrad) im Header, mit sofortiger Vorschau
  ohne Timer-Neustart. Jedes Schema hat passende helle und dunkle Farben.
- Vier vollständig vorgerenderte Sprachversionen. Englisch ist die
  Wörterbuch-Fallbacksprache. Die Startseite `/` leitet anhand der bevorzugten
  unterstützten Browsersprache auf die passende Timer-Seite weiter (z. B.
  `de-DE` → `/de/timer/`). Ohne passende Sprache wird Englisch verwendet.
  Explizite Sprach-URLs und die manuelle Auswahl werden nicht überschrieben.
  Ohne JavaScript bleibt die englische Startseite sichtbar.
- Canonical, hreflang einschließlich x-default, sprachspezifische Metadaten,
  Open Graph, Sitemap, robots.txt, Favicon.
- DE/EN-Rechtstextentwürfe, ausdrücklich nicht veröffentlichungsfertig.
- Datenschutz-/Speicherdialog. **Keine echte Werbe-CMP** und kein
  irreführendes Cookie-Banner für die derzeit werbefreie Version.
- Keine Analysewerkzeuge, Werbeskripte oder externen Fonts.

## Einstellungen und Grenzen

Gültige Timerzeiten, Rundenzahl und Signalton werden bei Änderungen automatisch
unter `jacktools.timer.settings.v1` gespeichert, ohne Speicherschalter.
Zeitänderungen gelten für den laufenden Timer erst nach „Einstellungen übernehmen“;
der Signalton wird sofort geändert. Ungültige Eingaben überschreiben keine
gespeicherten Werte. Einstellungen werden bei erneutem Aufruf wiederhergestellt.

Sprache und Design werden unabhängig unter `jacktools.timer.appearance.v1`
gespeichert. „Datenschutz & Speicher“ → „Gespeicherte Einstellungen löschen“
entfernt beide Einträge. Bei gesperrtem Speicher funktioniert der Timer weiter,
kann aber die Änderungen nicht dauerhaft speichern.

- Übernehmen oder eine Schnellwahl setzt den aktuellen Timer zurück.
- Ein laufender Timer wird beim Neuladen oder Seitenwechsel nicht fortgesetzt.
- Der Timer verwendet einen absoluten Endzeitpunkt gegen Intervall-Drift.
- Hintergrund-Tabs können Töne verzögern. Geschlossene Browser und schlafende
  Geräte können nicht zuverlässig alarmieren; kein sicherheitskritischer Timer.
- Uhrzeitänderungen des Systems können den Countdown beeinflussen.
- Ton nutzt die Web Audio API und benötigt eine Benutzerinteraktion.

## Tests

```bash
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Die Browser-Tests decken Desktop und Mobilansicht ab, Timer-Steuerung,
Pomodoro-Übergänge, Theme und Speicherung, gesperrten/defekten Speicher,
Sprachseiten, SEO-Tags und den Datenschutzdialog. Screenshots liegen nach den
Tests in `test-results/` (nicht versioniert).

## Vor dem öffentlichen Start

1. Übernommene Betreiberangaben bestätigen und Rechtstexte fachlich prüfen lassen:
   `src/components/LegalPage.astro`. Hosting, tatsächliche Verarbeitung,
   Rechtsgrundlagen, Speicherfristen und Kontaktangaben ergänzen.
   Bis dahin sind die Rechtsseiten mit `noindex` versehen und nicht in der Sitemap.
2. Hosting auswählen, HTTPS und DNS für `timer.jacktools.net` einrichten.
   `dist/` ausliefern, Verzeichnis-Indexdateien bedienen und
   `404.html` als echte 404-Seite konfigurieren (kein SPA-Fallback).
   Staging passwortschützen oder auf Hosting-Ebene noindex setzen.
3. Falls die Domain geändert wird: `site` in `astro.config.mjs` anpassen.
4. Reale Geräte / Safari / Firefox testen und Barrierefreiheit prüfen.
5. Sitemap bei Search Console einreichen und von jacktools.net verlinken.

## Werbung: absichtlich noch deaktiviert

Der Werbeplatz ist ein reiner Platzhalter in `src/components/TimerPage.astro`.
Es gibt noch **keine aktive AdSense-Integration**, keine Publisher-ID und keine
Consent-Freigabe. Der Platz kann bis zur Aktivierung entfernt werden.

Vor Einbindung:
- AdSense-Konto/Site-Freigabe und echte Publisher-/Slot-IDs besorgen.
- Geeignete Google-zertifizierte CMP mit unterstütztem TCF integrieren.
- Ablehnen/Ändern/Widerrufen einschließlich neu geladener Seiten prüfen.
- Werbeskripte erst nach der entsprechenden Einwilligung laden.
- Rechtstexte aktualisieren, Layout-Verschiebungen vermeiden.
- ads.txt gemäß AdSense-Vorgaben auf der relevanten Domain konfigurieren;
  Subdomain-Konfiguration mit jacktools.net abstimmen.

Google-Anforderungen:
https://support.google.com/adsense/answer/13554116?hl=de

## Struktur

- `src/lib/engine.ts`: testbare Timer-Logik und Validierung
- `src/lib/i18n.ts`: Übersetzungen mit englischem Fallback
- `src/components/TimerPage.astro`: statische Timer-Oberfläche
- `src/scripts/timer.ts`: Browser-Steuerung
- `src/scripts/site.ts`: Theme, Sprache, Speicher-Dialog
- `src/styles/global.css`: gemeinsame Design-Tokens und Responsive-Regeln
- `src/pages/[lang]/`: sprachspezifische statische Routen

## Quelle der Betreiberangaben

Die DE/EN-Impressumsentwürfe übernehmen Betreiber, Anschrift, Kontakt,
Geschäftsführer, Registerdaten, USt-ID, Inhaltsverantwortlichen und
Streitbeilegungserklärung aus dem lokalen MessageDrop-Impressum
(`frontend/src/assets/legal/legal-notice-de.txt`, Stand 1. Mai 2026).
Referenz: https://messagedrop.de/de/rechtliches/?doc=impressum&docLang=de
Die Live-Seite konnte bei der Übernahme nicht über das Webwerkzeug abgerufen
werden; Aktualität der Angaben ist daher vor Veröffentlichung zu bestätigen.
Die juristische Firmenbezeichnung bleibt auch auf Englisch unverändert.
Der MessageDrop-spezifische DSA-Kontaktstellenabschnitt wurde nicht ungeprüft
übernommen. Anwendbare Pflichtangaben für den Timer rechtlich prüfen lassen.

## Design und automatische Wiederherstellung

Im Einstellungen-Menü stehen acht deutlich gesättigtere Paletten und die Stile
**Warm**, **Minimal**, **Technisch** und **Soft** (vier Symbol-Buttons mit Tooltips) zur Auswahl. Stil, Farbe und Hell/Dunkel
sind unabhängig kombinierbar. Sprache und Design werden bei Änderungen
automatisch in `jacktools.timer.appearance.v1` gespeichert.
Die Startseite `/` bevorzugt eine gespeicherte Sprache vor der Browsersprache;
explizite Sprach-URLs bleiben unverändert. Auch Timerzeiten und Signalton werden automatisch gespeichert. Der Datenschutzdialog löscht beide Schlüssel.
Bestehende gespeicherte Designwerte werden als Fallback weiterhin gelesen.

Unter „Stil“ gibt es vier Schriftgrößen (100/110/120/130 %), die sofort wirken
und im Appearance-Speicher wiederhergestellt werden. Große Timerziffern werden
bei Platzmangel begrenzt, damit sie im Kreis bleiben.

Das Zahnrad bündelt Sprache, Hell/Dunkel, Farben, Stil und Schriftgröße.
Auf kleinen Bildschirmen öffnet sich ein breites, scrollbareres Panel.
Escape, Schließen oder Klick außerhalb schließen das Menü.
