# jacktools.net Clock

Static Astro clock, no backend. Analog, digital and combined views, four languages,
IANA time zones, theme/style/font settings, optional local persistence, fullscreen
and Screen Wake Lock. Time is taken from the device, not an external time server.

```bash
export NVM_DIR="$HOME/.config/nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.17.0
npm ci
npm run dev -- --port 4322
```

Open http://localhost:4322. Build with `npm run build`; deploy only contents of dist/
to clock.jacktools.net. Use HTTPS for Wake Lock. Keep the test deployment password
protected until clock-specific hosting/privacy details are complete.

Clock settings include twelve local SVG backgrounds for normal and focus view; remembering
the selected motif follows the existing storage consent. Run background picker
regression tests with `npm run test:e2e` (requires Playwright Chromium installed).

The additional "Year simulation" background is a local, dynamic SVG landscape.
It follows the selected time zone and a north/south hemisphere setting, with
blended seasonal colors, foliage, snow, flowers, stars and moving sun/moon.
Without location, daily phases use fixed local times: morning 05–08, day 08–17, evening 17–20,
otherwise night. The illustrative sun is above the horizon 06–18; these are not
astronomical rise/set times or a calculated moon phase. The optional location switch explicitly requests a single browser position (HTTPS).
Coordinates and location mode are memory-only, never persisted, and cleared on
switch-off, background change, preference clearing or reload. SunCalc v2 is
bundled locally to calculate apparent sun/moon positions in degrees; no remote
lookup is made. Clock display keeps the selected zone. Location mode derives
hemisphere from latitude and uses solar altitude for twilight, including polar
day/night. The fixed crescent is decorative, not a moon-phase calculation.
Reduced-motion mode holds celestial positions steady within each hour.

The one-shot browser alarm uses the selected IANA time zone, Web Audio tones,
optional Vibration API, a three-second test and five-minute elapsed-time snooze.
It requires an open page and must not be relied upon for critical wakeups.
Audio/vibration stop after two minutes; triggers over five minutes late are
reported as missed. DST gaps are skipped and folds use the next future instant.
Five locally synthesised tones are selectable and testable. Only time, tone, volume and vibration preference persist with storage consent under
`jacktools.clock.alarm.v1`; activation/due times/snooze are memory-only.

## Clock type and additional readout

The appearance selector contains six types: analog, orbit, sundial, binary, digital
and flip. Analog, binary, orbit and sundial expose a contextual additional-time
selector (off / digital / flip), remembered independently for each type when
storage consent is enabled. Digital and flip hide these controls. Rendering and
saved `view` values retain the legacy combined variants for compatibility;
`createViewControls` maps them to the compact UI, including older saved settings.

## TV-Browser (erster Stand)

`/stream/` (Englisch) bzw. `/{lang}/stream/` zeigt den Empfänger mit QR-/Zahlencode.
Im Header neben der Fokusansicht öffnet „Uhr streamen“ den Senderdialog. Am TV muss
bestätigt werden. Der Bestätigen-Button erhält automatisch Fokus. Alle vier
Pfeiltasten wechseln zwischen Bestätigen und Ablehnen; Tab/Shift+Tab folgen der
natürlichen Button-Reihenfolge, Enter/Leertaste aktivieren den gewählten Button.
Die rein visuelle Vorschau ist inert; auch nach verzögertem Laden bleibt die
gewählte Aktion fokussiert. Bei ignoriertem Fokus wird nach dem Layout und mit
kurzen Verzögerungen erneut versucht; die gewählte Aktion bleibt dabei erhalten.
Fernbedienungs-OK (Select/Accept/OK) und Enter ohne DOM-Fokus aktivieren die
gewählte Aktion explizit, nicht automatisch. Auch „Try again“ erhält bei Ladefehlern oder abgelaufener Kopplung automatisch
Fokus, einschließlich wiederholt fehlgeschlagener Versuche. Es gibt keine automatische Bestätigung.
Die echte Uhrdarstellung wird wiederverwendet, kein separater
Animationsnachbau. Weitere Änderungen werden übertragen; ohne Handy läuft die
TV-Uhr selbständig mit der letzten Konfiguration weiter.

Lokal Clock auf Port 4322 plus Backend auf 4340 starten. Die benötigten Tabellen werden beim Backendstart automatisch über die
Migrationen angelegt.
Für andere Ports `TV_ALLOWED_ORIGINS` am Backend anpassen. Browser-API-Anfragen
laufen lokal über den Same-Origin-Vite-Proxy. Produktion nutzt direkt HTTPS auf
`backend.jacktools.net`; `PUBLIC_BACKEND_URL` ist ein öffentlicher Buildwert,
keine Servergeheimnisse in diese Variable eintragen. Der Produktionsbuild lehnt
HTTP-API-Adressen ab. Lokale Overrides gehören
in `.env.development.local`, nicht in die Produktionsbuild-Umgebung.

Standort nur nach zusätzlicher Freigabe; keine Wecker, kein Audio und keine persönliche Alarmkonfiguration im Snapshot.
QR-Links öffnen eine werbefreie, nicht indexierbare `/{lang}/pair/`-Seite und
benötigen bewusstes Senden; Einstellungen dieses neuen Tabs vorher prüfen.
Kopplungsdaten bleiben nur im Arbeitsspeicher. Neuladen erfordert erneute Kopplung.
„Stream beenden“ am Sender oder Empfänger widerruft die Verbindung und öffnet die Kopplung am Empfänger neu. Bei einem bloßen Verbindungsverlust läuft die Uhr dagegen weiter. Fullscreen und
Wachhalten sind abhängig vom Stickbrowser und müssen am echten Gerät getestet werden.
Details, Produktions-ENV und Sicherheit: `../backend/README.md`, Abschnitt TV.

Nach Eingabe aller acht Ziffern oder Erkennung im eingebauten Scanner wird die
Kopplung automatisch angefragt. Bei Erfolg bleibt das Overlay geöffnet und zeigt statt der Codeeingabe den Regler „Bildgröße“ (60–100 %). Uhr und Kalender werden live um die Mitte skaliert; der Hintergrund bleibt bildschirmfüllend. Auch die Stopptaste rückt vom Rand weg. Schließen und erneutes Öffnen unterbrechen die Verbindung nicht. Der Wert wird nur mit aktivierter Einstellungsspeicherung am Sender gemerkt; Kopplungsdaten und Koordinaten werden weiterhin nicht gespeichert. Fehler bleiben sichtbar. Der Empfänger muss die Verbindung weiterhin bestätigen. „QR-Code scannen“ öffnet optional eine lokale Kameravorschau:
Kamerafreigabe nur beim Antippen, keine Audioanforderung, kein Bild-Upload und
keine Aufzeichnung. QR-Erkennung über das lokal gebündelte `jsqr`, ohne externen
Scandienst. Kamera stoppt bei Erkennung, Schließen, Escape, Seitenwechsel und
Hintergrundwechsel. Erkannt werden ausschließlich die eigenen Pairing-URLs der
aktuellen Origin; fremde QR-Links werden nicht geöffnet. Nur beim Öffnen eines QR-Links in einem neuen Tab bleibt bewusstes
„Stream starten“ nötig, damit dessen Einstellungen vorher geprüft werden können. HTTPS (oder localhost) und eine Kamera sind
Voraussetzung; die manuelle Codeeingabe bleibt als Alternative verfügbar.

Für Bildgröße und senderseitiges Beenden zuerst das aktualisierte Backend, dann Clock deployen (keine neue Datenbankmigration nötig). Alte Snapshots ohne Bildgröße verwenden 100 %.
