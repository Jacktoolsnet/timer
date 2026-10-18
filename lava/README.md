# Jacktools Lava
Stille Lavalampe / Relax-Tool. Eigenständige statische Astro-Anwendung für
https://lava.jacktools.net – gleiche Hosting-Struktur wie Breathe und Relax.

## Lokal starten
Node >=24.17.0, npm >=9.6.5:
```sh
npm ci
npm run dev
```
Deutsch: http://127.0.0.1:4321/de/ (Port ggf. siehe Terminal).

## Prüfen und bauen
```sh
npm run build
npm test
npm run test:e2e
```
Bei Bedarf vor den Browsertests: `npx playwright install chromium`.
Der Build erstellt DE/EN/ES/FR, bilinguale Rechts-/Nutzungshinweise,
robots.txt und die mehrsprachige Sitemap.

## Hosting
Den vollständigen Inhalt von dist/ ins Document-Root der Subdomain
lava.jacktools.net hochladen (bestehendes 1blu Ubuntu/Plesk-Setup).
Subdomain und HTTPS-Zertifikat in Plesk einrichten. Kein Node-Server nötig.
Keine Hostingänderung und kein Deployment wurden vorgenommen.
Wenn eine andere Domain gewünscht ist, zuerst astro.config.mjs anpassen.

## Version 1
WebGL-Metaballs mit organischen Übergängen, Glasreflexen und Metallgehäuse.
Fünf Farbwelten inklusive Regenbogen mit bleibender Farbmischung bei Kontakt,, Tempo, Helligkeit, Start/Pause und optionales Vollbild.
Keine Audiodateien, Bibliotheken für Rendering, externen Schriften oder Tracker.
Kein automatischer Animationsstart; reduzierte Bewegung wird respektiert,
in ausgeblendeten Tabs pausiert die Berechnung. Ohne WebGL statische Ersatzansicht.
Allgemeines Design/Sprache nur nach expliziter Zustimmung lokal speichern;
Farbwelt, Tempo und Helligkeit werden mit derselben Zustimmung gespeichert. Kein Wake Lock.
Die Simulation ist eine stilisierte Animation, keine thermodynamische Simulation.

Die Einordnung als Relax-Tool ist auf der Seite vorhanden; die öffentliche
Company-Toolliste wurde nicht geändert, da die neue Subdomain noch nicht live ist.
