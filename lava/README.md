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
Neun Farbwelten inklusive Regenbogen, Metallen und Ölschimmer mit bleibender Farbmischung bei Kontakt,, Tempo, Helligkeit, Start/Pause und optionales Vollbild.
Keine Audiodateien, Bibliotheken für Rendering, externen Schriften oder Tracker.
Kein automatischer Animationsstart; reduzierte Bewegung wird respektiert,
in ausgeblendeten Tabs pausiert die Berechnung. Ohne WebGL statische Ersatzansicht.
Allgemeines Design/Sprache nur nach expliziter Zustimmung lokal speichern;
Farbwelt, Tempo und Helligkeit werden mit derselben Zustimmung gespeichert. Kein Wake Lock.
Die Simulation ist eine stilisierte Animation, keine thermodynamische Simulation.

Die Einordnung als Relax-Tool ist auf der Seite vorhanden; die öffentliche
Company-Toolliste wurde nicht geändert, da die neue Subdomain noch nicht live ist.

Trägerflüssigkeit: Klar, Blau, Violett, Bernstein oder Türkis. Zähigkeit beeinflusst
Bewegungstempo, Dehnung und Formwechsel unabhängig vom Geschwindigkeitsregler.
Beide Werte werden nur mit Speicherzustimmung gesichert. Stilisierte Physik.

Vorlagen: Klassisch, Goldrausch, Tiefsee, Ölfilm und Regenbogentraum setzen
Farbwelt, Trägerflüssigkeit, Zähigkeit, Tempo und Helligkeit gemeinsam.
Einzeländerungen zeigen „Benutzerdefiniert“. Wiedergabe bleibt unverändert;
mit Speicherzustimmung werden die Werte gesichert und die Vorlage beim Laden erkannt.

Berührungsaktion und endlose Verwandlung sind standardmäßig an und einzeln
abschaltbar. Ziehen mit Maus oder Finger versetzt nahe Blasen sanft; nach dem
Loslassen kehren sie allmählich zurück. Nur während laufender Animation,
nicht auf Bedienelementen. Bei abgeschalteter Interaktion bleibt normales
Touch-Scrollen möglich. Endlose Verwandlung entwickelt Formen und Nuancen
langsam weiter. Beide Schalter werden mit Speicherzustimmung gesichert;
Presets ändern diese Schalter nicht. Kein Autostart, auch bei Reduced Motion.

Optionale, lokal synthetisierte Blasentöne beim Verbinden und Trennen; standardmäßig
an, aber erst nach Benutzerstart hörbar. Pause und Hintergrund schalten Ton aus.
Der Sound-Schalter bleibt nur mit Speicherzustimmung gespeichert.

Lavabläschen-Spur: standardmäßig an, einzeln abschaltbar. Beim Ziehen während
laufender Berührungsaktion bleiben kleine Blasen in passenden Farben zurück,
die nach wenigen Sekunden verschwinden. Maximal 64 Partikel; bei Pause eingefroren.
Der Schalter wird nur mit Speicherzustimmung gesichert, die Spur selbst nicht.

„Bläschen ablösen“ ergänzt die Fingerspur unabhängig: Wird direkt eine große
Blase getroffen und gezogen, entstehen kleine Partikel an deren nachlaufendem
Rand. Der Elternkontakt wird beim Antippen bestimmt und beim Loslassen gelöst.
Die Option ist standardmäßig an und wird mit Speicherzustimmung gemerkt.
Fingerspur und Ablösen sind separat schaltbar; beide benötigen aktive Berührung.
