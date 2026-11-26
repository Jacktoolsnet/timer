# JackTools Backend

Eigenständige Express-5-/TypeScript-API für Company und Tools. Keine Verbindung zu
MessageDrop, dessen Adminbackend oder Datenbank. Zieladresse: `https://backend.jacktools.net`.
Browserbasierte TV-Kopplung ist als erster Stand implementiert. Zertifikatsüberwachung ist noch geplant.

## Voraussetzungen und erster Start

Node.js **24.17.0 oder neuer** und PostgreSQL. Die lokalen Entwicklungsbefehle
können eine eigene **Docker-PostgreSQL 17** starten. Für den Produktivbetrieb ist
Docker nicht nötig; alternativ kann eine bereits eingerichtete Datenbank verwendet
werden. Redis wird nicht benötigt.

### Lokale Entwicklung mit eigener Datenbank

```bash
cd backend
npm ci
cp .env.example .env   # nur wenn .env noch nicht existiert!
# Eigene Passwörter und zufälliges SESSION_SECRET in .env eintragen.
npm run dev:local
```

`dev:local` startet die lokale Docker-Datenbank, wartet auf Bereitschaft, führt die
Migrationen aus und startet dann das Backend mit Watch-Modus. Die Datenbank läuft
nur auf **127.0.0.1:55433** und erhält ein eigenes Volume
`jacktools-backend-local_jacktools_pg`. Sie teilt keine Daten mit NullTopic,
MessageDrop oder einem PostgreSQL-Dienst auf dem Systemport 5432.

Die vom Backend verwendeten Datenbanknamen, Benutzer und Passwörter werden aus
`.env` gelesen (inklusive der bekannten `ADMIN_*`-/`DB_*`-Vorrangregeln). In den
**lokalen Kindprozessen** werden nur Zielhost und Port auf diese Docker-Instanz
umgestellt, eine konfigurierte URL entfernt und Datenbank-TLS für die lokale
Verbindung ausgeschaltet. Die `.env` selbst bleibt unverändert. `NODE_ENV=production`
und konfigurierte Remote-Datenbanken werden von den lokalen Befehlen abgelehnt.
Einen anderen lokalen Port kannst du über `LOCAL_DB_PORT` einstellen.

Einzeln:

```bash
npm run db:start          # Docker-DB starten und auf Bereitschaft warten
npm run migrate:local     # nur die lokale Docker-DB migrieren
npm run db:status
npm run db:logs
npm run db:stop           # stoppen, Daten bleiben erhalten
```

Beim Stoppen des Backend-Watchprozesses bleibt die Datenbank verfügbar. Die Daten
bleiben auch nach einem Containerneustart im Volume. Ein automatisches Löschen oder
Zurücksetzen des Volumes gibt es nicht.

**Wichtig für eine bereits kopierte `.env` mit Port 5432:** `npm run migrate` nutzt
weiterhin genau diese konfigurierte Adresse. Verwende für die neue lokale Datenbank
`npm run migrate:local` bzw. `npm run dev:local`. Falls du bewusst auch die normalen
Befehle lokal verwenden möchtest, setze selbst `ADMIN_DB_HOST=127.0.0.1` und
`ADMIN_DB_PORT=55433` und entferne gegebenenfalls vorrangige Datenbank-URLs.

**Passwortänderungen nach der Erstinitialisierung:** PostgreSQL übernimmt
`POSTGRES_USER`, `POSTGRES_PASSWORD` und `POSTGRES_DB` nur beim Anlegen eines neuen
Volumes. Eine spätere `.env`-Änderung ändert den vorhandenen Datenbankbenutzer nicht.
Bei `28P01` deshalb Ziel und bestehende Zugangsdaten prüfen, nicht das Volume löschen.
Gegebenenfalls das Passwort bewusst in PostgreSQL ändern und die Konfiguration
angleichen. Root-Passwort und Datenbankpasswort sind getrennte Zugangsdaten.

### Bereits vorhandene oder produktive Datenbank

Die gewünschte Datenbank und den Benutzer zuerst auf dem PostgreSQL-Server anlegen,
Berechtigungen vergeben und deren Werte in der Backend-Umgebung setzen. Erst dann:

```bash
npm run migrate
npm run dev  # produktiv nach Build: npm start
```

Migrationen legen Tabellen an, aber **keinen PostgreSQL-Server und keinen
PostgreSQL-Benutzer**. Fehler enthalten jetzt sichere Hinweise wie `28P01`
(Anmeldung fehlgeschlagen), `3D000` (Datenbank fehlt) oder `ECONNREFUSED`
(Server nicht erreichbar), ohne Passwörter oder Verbindungs-URLs auszugeben.

Ein zufälliges Sessiongeheimnis lässt sich mit
`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
erzeugen. Keine Beispielwerte produktiv verwenden.

Der Start legt den Root aus `ROOT_USERNAME`, `ROOT_PASSWORD` und optional
`ROOT_EMAIL` an, falls es noch keinen gibt. Passwörter werden mit gesalzenem scrypt
gehasht. Kein öffentliches Registrierungsformular. Bei einem Neustart wird der
bestehende Root **nicht überschrieben**. Eine Änderung des Root-Passworts in `.env`
allein setzt daher kein bestehendes Datenbankpasswort zurück.

Ein bewusster Wiederherstellungsbefehl verwendet die aktuellen ENV-Zugangsdaten
und widerruft alle Root-Sitzungen:

```bash
npm run root:reset -- --confirm
# Für die lokale Docker-Datenbank, unabhängig vom .env-Zielport:
npm run root:reset:local -- --confirm
```

Die `.env` wird unabhängig vom Aufrufverzeichnis relativ zum Backend geladen.
Bereits vom Server gesetzte Umgebungsvariablen haben Vorrang vor der Datei.
`.env` und Buildausgaben sind nicht versioniert; echte Passwörter gehören auch
nicht in VS-Code-Launch-Konfigurationen.

## Datenbankvariablen wie im MessageDrop Adminbackend

Gleiches **Namens- und Vorrangschema**, aber vollständig eigene Werte:

| Vorrang | Allgemeiner Fallback | Standard im JackTools Backend |
| --- | --- | --- |
| `ADMIN_DATABASE_URL` | `DATABASE_URL` | nicht gesetzt |
| `ADMIN_DB_HOST` | `DB_HOST` | `localhost` |
| `ADMIN_DB_PORT` | `DB_PORT` | `5432` |
| `ADMIN_DB_NAME` | `DB_NAME` | `jacktools` |
| `ADMIN_DB_USER` | `DB_USER` | `jacktools` |
| `ADMIN_DB_PASSWORD` | `DB_PASSWORD` | nicht gesetzt |
| `ADMIN_DB_SSL` | `DB_SSL` | aus; `true` aktiviert TLS |
| `ADMIN_DB_POOL_MAX` | `DB_POOL_MAX` | `10` |
| `ADMIN_DB_MAX_PENDING_REQUESTS` | `DB_MAX_PENDING_REQUESTS` | `1000` |
| `ADMIN_DB_OVERLOAD_RETRY_AFTER_SECONDS` | `DB_OVERLOAD_RETRY_AFTER_SECONDS` | `2` |

Eine gesetzte URL hat Vorrang vor Host, Port, Datenbankname, Benutzer und Passwort.
SSL-, Pool- und Überlastvariablen gelten auch bei URL-Konfiguration.

**Bewusster Sicherheitsunterschied zur Vorlage:** TLS-Zertifikate werden bei
`ADMIN_DB_SSL=true`/`DB_SSL=true` überprüft; kein `rejectUnauthorized:false`.
Eine eigene CA kann über die Node-Variable `NODE_EXTRA_CA_CERTS` bereitgestellt
werden. SSL nicht zusätzlich über URL-Queryparameter konfigurieren.

Die Poolwarteschlange ist begrenzt; Überlast führt zu HTTP 503 mit `Retry-After`.
Es wird direkt PostgreSQL verwendet, kein kopierter SQLite-Kompatibilitätsadapter.

## Company Administration

Die Oberfläche ist Teil der bestehenden statischen Company-Seite:

- `/de/admin/`, `/en/admin/`, `/es/admin/`, `/fr/admin/`, kurzer Einstieg `/admin/`.
- In der Company-Fußzeile über **Admin** erreichbar.
- Root kann Admins anlegen, sperren, wieder aktivieren und temporäre Passwörter setzen.
- Neue/zurückgesetzte Admins müssen ihr Passwort zuerst ändern.
- Admins verwalten danach ihr eigenes Profil und Passwort; keine Benutzerverwaltung.
- Root kann durch die Benutzerverwaltung weder gesperrt noch herabgestuft werden.
- Seiten sind `noindex` und stehen nicht in der Sitemap. Das Backend erzwingt die Rechte.

Lokal die Company auf `http://localhost:4321` oder `http://127.0.0.1:4321` öffnen,
Backend auf `http://127.0.0.1:4340`. Im Entwicklungsmodus verwendet der Browser
relative `/api/v1`-Adressen. Der Astro-Entwicklungsserver leitet sie an das Backend
weiter. So gehören die HttpOnly-Sitzungscookies stets zur aufgerufenen Company-Adresse,
auch wenn die Company über `localhost` und die API intern über `127.0.0.1` läuft.
Origin- und CSRF-Prüfungen bleiben aktiv. Nach Änderungen an `astro.config.mjs`
den Company-Entwicklungsserver bei Bedarf neu starten.

```bash
cd company
PUBLIC_BACKEND_URL=http://127.0.0.1:4340 npm run dev -- --port 4321
```

`PUBLIC_BACKEND_URL` legt lokal das Ziel des Entwicklungs-Proxys fest; die API-Adresse
wird im Entwicklungsbrowser nicht direkt aufgerufen. Im Produktionsbuild wird der
Wert als öffentliche API-Adresse eingebaut, ohne Entwicklungsproxy. Standard:
`https://backend.jacktools.net`. `ROOT_*`, DB-Daten und `SESSION_SECRET` niemals als
`PUBLIC_*` setzen oder in Company-Dateien hinterlegen.

## VS Code Start und Build

`.vscode/launch.json` enthält:

- **Start: JackTools Backend lokal komplett (DB + Migrationen + Server)** – lokale DB, Migrationen und Watch-Modus.
- **Database: JackTools lokal starten/stoppen/Status/Logs** – separate Datenbanksteuerung.
- **Setup: JackTools lokale Datenbank migrieren** – explizit die lokale Instanz.
- **Start: JackTools Backend** – Watch-Modus mit der unveränderten Datenbankadresse aus `.env`.
- **Start: Company (JackTools Admin)** – Company auf Port 4321 mit lokaler API-Adresse.
- **Start: JackTools Backend + Company Admin** – startet beide Konfigurationen gemeinsam.
- **Build: JackTools Backend**, **Check: JackTools Backend**, **Test: JackTools Backend**.
- **Setup: JackTools Backend Abhängigkeiten**, **Setup: JackTools Backend Migrationen**.
- **Recovery: JackTools Root zurücksetzen (Sessions widerrufen)** – ausdrücklich destruktiv.
- **Test: JackTools Backend mit isolierter PostgreSQL** – braucht lokale PG-Werkzeuge.

Der gemeinsame Start setzt eine ausgefüllte lokale `.env` und Docker voraus; er
verwendet den lokalen Komplettstart und führt damit ausdrücklich lokale Migrationen
aus. Der normale Backendstart ohne „lokal komplett“ verwendet hingegen die
konfigurierte Datenbank und führt keine Schemaänderungen aus. Die Launch-Einträge verwenden
Node 24.17.0 über `npm exec`, entsprechend dem vorhandenen Muster im Repository.
Der Backendbuild ist nicht Teil von „Build: Alle Seiten“ und wird nicht als statische
Website verpackt.

## Tests

```bash
npm run check
npm test
npm run test:local
```

`test:local` startet eine **wegwerfbare PostgreSQL-Instanz** in einem temporären
Verzeichnis, führt Integrationstests aus und entfernt sie wieder. Es werden keine
bestehenden Datenbanken angesprochen. Voraussetzung: `initdb`, `pg_ctl` und `createdb`
(z. B. unter `/usr/lib/postgresql/15/bin`); anderer Pfad über `PG_BIN`. Nicht als root ausführen.

Alternativ `TEST_DATABASE_URL` auf eine **leere, eigene `_test`-Datenbank** setzen und
`npm run test:integration` ausführen. Dieser Test verweigert bestehende JackTools-Tabellen;
angelegte Testtabellen werden nicht automatisch gelöscht.
Company-Browsertests: `cd company && npx playwright test tests/admin.spec.ts tests/admin-proxy.spec.ts`.
Der Proxytest prüft echte Browsercookies und Neuladen für `localhost` und `127.0.0.1`
mit einem isolierten Test-HTTP-Backend, ohne Betreiberzugangsdaten.

## API und Sicherheit

- `GET /health/live`, `GET /health/ready`.
- `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`.
- `PATCH /api/v1/auth/profile`, `PUT /api/v1/auth/password`.
- Nur Root: `GET/POST /api/v1/admin/users`, `PATCH/DELETE /api/v1/admin/users/:id`,
  `POST /api/v1/admin/users/:id/password`.
- Schreibzugriffe benötigen einen erlaubten `Origin`, JSON und nach Anmeldung
  zusätzlich `X-CSRF-Token`. Die Sessionantwort enthält den CSRF-Token, nicht den Cookieinhalt.
- Zufällige, opake Sessiontokens im hostgebundenen HttpOnly-Cookie; Datenbank speichert
  nur einen HMAC. Produktiv Cookie `__Host-jt_admin` mit Secure und SameSite=Lax.
- Cookies mit `credentials: include`; keine Tokens oder Passwörter im Local Storage.
- `ADMIN_ALLOWED_ORIGINS` ist eine exakte, kommaseparierte Liste, ohne Sternchen und
  ohne abschließenden Slash. Nur Company-Adressen, keine pauschale Freigabe aller Tools.
- Kontolöschung ist nur für Root und nur für Nicht-Root-Konten möglich. Sitzungen
  werden kaskadierend gelöscht; Auditereignisse bleiben ohne Verweis auf das
  entfernte Zielkonto erhalten. Keine Migration für diese Funktion erforderlich.
- Getrennte Inaktivitäts- und absolute Sessiongrenze; Passwortänderung, Reset und
  Sperrung widerrufen Sessions. Logout verwirft die konkrete Session.
- Login-/Passwortversuche werden pro Benutzer/IP über PostgreSQL begrenzt, nicht
  nur im RAM eines einzelnen Prozesses. Loginfehler verraten keine Kontenexistenz.
- Auditereignisse ohne Passwörter, Tokens oder Requestbodies. Sitzungs-/Limitbereinigung
  jede Minute; Auditaufbewahrung derzeit 90 Tage. Benutzerdaten werden nicht automatisch
  gelöscht, sondern im ersten Schritt nur aktiviert/gesperrt.

## Produktionsdeployment

1. Eigene PostgreSQL-Datenbank und eigenen Benutzer anlegen. Für Migrationen sind
   Schemaänderungsrechte nötig; Laufzeitrechte nach Möglichkeit separat begrenzen.
2. `npm ci`, `npm run check`, `npm run build`; Backenddateien einschließlich
   `package.json`, Lockdatei, `dist/` **und `migrations/`** bereitstellen.
   Auf dem Server Laufzeitabhängigkeiten mit `npm ci --omit=dev` installieren.
3. Erforderliche ENV konfigurieren: insbesondere `NODE_ENV=production`, `PORT`,
   `PUBLIC_BASE_URL=https://backend.jacktools.net`, eigene DB-Werte, Root und Sessionsecret,
   `ADMIN_ALLOWED_ORIGINS=https://jacktools.net` (gegebenenfalls zusätzlich die www-Origin).
4. Migrationen vor dem Start ausführen. Ohne Dev-Abhängigkeiten:
   `node dist/cli.js migrate`. Das SQL-Verzeichnis muss neben `dist/` vorhanden sein.
5. Node-Einstieg `dist/server.js`; alternativ `npm start`. Serverport über HTTPS-Reverse-Proxy
   veröffentlichen. `TRUST_PROXY` passend zur tatsächlichen Proxykette setzen, nicht blind aktivieren.
6. Company bauen und separat statisch deployen. Funktionierende Anmeldung und Cookies
   auf den echten HTTPS-Domains prüfen. Browser sieht keine Datenbank-Zugangsdaten.
7. Datenbankbackup und Restore testen; Sessionsecretrotation macht Sessions ungültig.
   API und Migrationen gemeinsam versionieren, kein automatisches Zurückrollen von Datenverlust.

### Konkrete Domainkonfiguration

Produktionswerte (zusätzlich zu den eigenen DB-, Root- und Sessionsecret-Werten):

```dotenv
NODE_ENV=production
PUBLIC_BASE_URL=https://backend.jacktools.net
ADMIN_ALLOWED_ORIGINS=https://jacktools.net
# Nur bei genau einem vorgeschalteten, vertrauenswürdigen Reverse-Proxy:
# TRUST_PROXY=1
```

Company beim **Build** mit `PUBLIC_BACKEND_URL=https://backend.jacktools.net`
konfigurieren (entspricht dem Produktionsstandard). Keine lokalen ENV-Dateien
mit API-Overrides auf den Produktionsbuild übertragen. Der lokale Vite-Proxy
ist keine Voraussetzung für das statische Produktionsdeployment.

Beide Domains müssen über HTTPS erreichbar sein. Sie sind unterschiedliche
Origins, aber dieselbe Site: `SameSite=Lax` bleibt deshalb verwendbar;
`SameSite=None` oder ein domainweit geteiltes Cookie sind nicht nötig.
Der `__Host-`-Cookie bleibt ausschließlich an `backend.jacktools.net` gebunden.
Die Company sendet Requests mit `credentials: include`; das Backend erlaubt
nur die exakte Company-Origin und prüft bei authentifizierten Änderungen zusätzlich
CSRF-Tokens. Andere Tool-Subdomains erhalten keine pauschale Freigabe.

Nach Deployment im Browser prüfen: Anmeldung, Neuladen mit bestehender Sitzung,
Logout und anschließend verweigerter Zugriff. Cookie muss `Secure`, `HttpOnly`,
`SameSite=Lax`, `Path=/` und **kein** `Domain`-Attribut haben. Reverse-Proxy darf
`Origin`, `Set-Cookie` und CORS-Header nicht entfernen und API-Antworten nicht cachen.
Die lokalen Integrationstests prüfen Produktionskonfiguration, Origin-Abweisung,
Cookieattribute und CSRF, ersetzen aber keinen Browser-Smoke-Test über echtes HTTPS.

Dies ist ein erster Verwaltungsstand, keine abgeschlossene Betriebshärtung. Vor
öffentlicher Nutzung Datenschutz-/Cookieinformationen, Mail-/Recovery-Prozess und
gegebenenfalls Mehrfaktoranmeldung für Root prüfen. Es wurde nichts deployed.

## Browserbasierte TV-Anbindung der Uhr

Erster TV-Stand implementiert, ohne Cast SDK und ohne Admin-Konto. Die Company-
Administration und TV-Capabilities sind vollständig getrennt. Kein Videostream:
Die TV-Uhr rendert selbst, die API überträgt Darstellungseinstellungen und eine grobe
Gerätebezeichnung (z. B. „Chrome · Android“, kein Hostname oder vollständiger User-Agent).
Vor der Freigabe zeigt der Empfänger diese Bezeichnung und eine echte, isolierte
Uhrvorschau. Die Bezeichnung ist nur ein Hinweis, kein verifizierter Gerätename.
Die Vorschau erstellt keine Verbindung und fordert weder Standort noch Wake-Lock an.
Beim Bestätigen fordert der Empfänger direkt im Benutzerereignis Vollbild an.
Browser ohne Fullscreen-Unterstützung oder mit Sperre bleiben in der bildfüllenden
Fokusansicht. Der symbolische Button „Stream beenden“ verschwindet nach fünf Sekunden Inaktivität.
Fernbedienungstasten, Maus und Touch blenden sie wieder ein; die erste Taste nach
dem Ausblenden weckt nur die Bedienung (kein versehentliches Beenden).
Pfeiltasten fokussieren „Stream beenden“; Enter aktiviert. Beim Beenden wird
Vollbild verlassen und ein neuer QR-Code zum Koppeln angezeigt.

### Lokal testen

1. `npm run migrate:local` anwenden und Backend starten, z. B. `npm run dev:local`.
2. Clock separat auf Port 4322 starten: `cd ../clock && npm run dev -- --port 4322`.
3. Empfänger in einem Fenster: `http://127.0.0.1:4322/de/stream/`.
4. Sender im zweiten Fenster: `http://127.0.0.1:4322/de/`. Einstellungen wählen,
   „Uhr streamen“, Code vollständig eingeben; die Kopplung startet automatisch
   und das Overlay schließt bei Erfolg. Am Empfänger bestätigen.
5. Darstellung ändern, Sendertab schließen, Netzwerkunterbrechung ausprobieren.
   Der Empfänger muss mit der letzten Konfiguration weiterlaufen.

Clock verwendet lokal einen eigenen Same-Origin-Proxy. Seiten funktionieren mit
und ohne abschließenden Slash (`trailingSlash: ignore`). Für andere lokale Ports
`TV_ALLOWED_ORIGINS` exakt ergänzen. `ADMIN_ALLOWED_ORIGINS` bleibt unverändert.
`localhost`/`127.0.0.1` sind auf einem echten Handy/Stick **nicht** der Entwickler-PC;
für geräteübergreifende Tests Deployment oder korrekt konfigurierte LAN-Adressen
verwenden (Hostfreigabe und exakte Origin). Die QR-URL nutzt die aufgerufene Origin.

### Produktion

Zusätzlich zur bestehenden Produktionskonfiguration:

```dotenv
TV_ENABLED=true
TV_ALLOWED_ORIGINS=https://clock.jacktools.net
TV_STATE_SECRET=<eigener kryptografisch zufälliger Schlüssel mit mindestens 32 Zeichen>
```

`TV_STATE_SECRET` muss von `SESSION_SECRET` verschieden sein. Lokal wird ohne
expliziten Schlüssel ein separater Entwicklungsschlüssel abgeleitet; produktiv
ist diese Vereinfachung nicht erlaubt. TV ist in Produktion standardmäßig **aus**.
Migration `002_tv.sql` vor dem Serverstart ausführen und Clock neu bauen/deployen.
Kein Vite-Proxy im Produktionshosting nötig. HTTPS auf beiden Domains, keine
Caches für API-Antworten; Reverse-Proxy muss `Authorization` und `Origin` erhalten.
TV darf ausschließlich seine eigene Origin verwenden, nicht automatisch Company
oder andere Tool-Subdomains. Admin-Cookies werden bei TV-Anfragen nicht gesendet.

### Ablauf und Sicherheitsgrenzen

- `POST /api/v1/tv/receivers`: Empfänger erzeugt achtstelligen Code plus QR-Geheimnis.
  Code/QR gelten zehn Minuten und sind atomar nur einmal einlösbar.
- `POST /api/v1/tv/claim`: Sender schlägt Snapshot vor. Noch keine Steuerberechtigung.
- `GET /api/v1/tv/:id/receiver|sender`: rollengetrennter Zustand über Bearer-Capability.
- `POST .../approve`: nur der Empfänger darf bestätigen. Ablehnen nutzt `.../stop`.
- `PUT .../settings`: nur bestätigter Sender, mit erwarteter Revision. Veraltete
  Schreibzugriffe werden mit 409 abgewiesen. `POST .../ack` bestätigt die Anwendung.
- `POST .../detach`: Sender widerruft seine Steuerung; eine laufende Anzeige bleibt.
  Ein noch unbestätigter Vorschlag wird dabei vollständig verworfen.
- `POST .../stop`: nur Empfänger, löscht Sitzung und Snapshot. Oberfläche erzeugt
  danach einen neuen Kopplungscode für die nächste Verbindung.
- Steuerverbindung maximal 24 Stunden; Ablauf wird bei **jedem** Zugriff geprüft.
  Danach läuft eine bereits initialisierte Anzeige lokal weiter. Browserneustart
  bzw. Neuladen erfordert erneutes Koppeln; derzeit kein dauerhaftes Gerätespeichern.
- Capabilities mit 256 Bit Zufall, rollen- und sitzungsgebunden, nur HMACs in der DB.
  Keine Secrets in Querystrings, Logs, Local Storage oder Session Storage.
  QR-Geheimnis im Fragment auf einer werbefreien `/{lang}/pair/`-Seite; vor dem
  bewussten Senden wird es bereits aus der Adresszeile entfernt. Diese neue Seite
  übernimmt nicht heimlich ungespeicherte Einstellungen eines anderen Tabs.
- Nur erlaubte Darstellungsfelder und eigene Hintergrundkennungen; keine beliebigen
  URLs, HTML, CSS oder Alarmdaten. Optionale Koordinaten sind strikt numerisch,
  geografisch begrenzt und auf drei Nachkommastellen gerundet. Lokale Zeitzone wird konkret aufgelöst.
  Snapshot AES-256-GCM-verschlüsselt in PostgreSQL, nur jeweils letzter Stand.
- Persistente Ratenlimits pro IP, getrennt für Erstellen, Einlösen, Lesen und Ändern,
  zusätzlich Gesamtlimit; Polling mit Backoff. Abgelaufene Daten werden beim
  Anlegen und jede Minute entfernt. Keine öffentliche Geräteliste.
- Standortübertragung ist optional: zuerst am Sender den Standort aktivieren und
  zusätzlich im Stream-Dialog „Standort mitsenden“ einschalten (standardmäßig aus,
  nicht dauerhaft gespeichert). Dann rechnen Sonnenuhr und Jahressimulation auf
  dem Empfänger sowie in der Vorschau mit den gerundeten Senderkoordinaten. Der
  Empfänger fragt keine eigene Geolocation an. Wecker/Audio bleiben ausgeschlossen.
- Ausschalten der Weitergabe bzw. Entzug des Senderstandorts entfernt Koordinaten
  aus dem nächsten Snapshot und nach der Synchronisierung aus der Empfängeranzeige.
  Ohne Verbindung bleibt die letzte Anzeige einschließlich Standort weiter aktiv.
  Die Sitzung speichert nur den letzten verschlüsselten Snapshot (maximal 24h);
  „Stream beenden“ am Empfänger löscht ihn, Sender-Trennen lässt ihn weiterlaufen.
  Frontend und Backend gemeinsam aktualisieren; keine neue Migration erforderlich.
- Vollbild und Screen Wake Lock sind Best-Effort; Stickbrowser und Betriebssystem
  können Schlafmodus oder App-Beendigung erzwingen. Das muss am Zielgerät getestet werden.

Bei Rotation des TV-Schlüssels bestehende TV-Sitzungen bewusst beenden/löschen;
mit dem alten Schlüssel gespeicherte Snapshots sind danach nicht mehr lesbar.

Regressionen: `npm test`, `npm run test:local`. Vollständiger Browserablauf mit
echtem Express, isolierter Astro-Instanz und wegwerfbarer PostgreSQL-Datenbank:
`TV_BROWSER_TESTS=1 npm run test:local` (benötigt installierte Clock-Abhängigkeiten
und Playwright Chromium). Keine produktiven Zugangsdaten oder Tabellen werden benutzt.
