# JackTools Backend

Eigenständige Express-5-/TypeScript-API für Company und Tools. Keine Verbindung zu
MessageDrop, dessen Adminbackend oder Datenbank. Zieladresse: `https://backend.jacktools.net`.
Browserbasierte Kopplung der Uhr und Zertifikatsüberwachung sind implementiert.

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

`dev:local` startet die lokale Docker-Datenbank, wartet auf Bereitschaft und startet das Backend mit Watch-Modus.
Das Backend installiert beim Start automatisch ausstehende Migrationen. Die Datenbank läuft
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
Befehle lokal verwenden möchtest, setze selbst `DB_HOST=127.0.0.1` und
`DB_PORT=55433` und entferne gegebenenfalls vorrangige Datenbank-URLs.

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
npm run dev  # produktiv nach Build: npm start; Datenbankaufbau erfolgt automatisch
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

## Datenbankvariablen

Die unabhängige JackTools-Datenbank verwendet ausschließlich **DB_*** und
**DATABASE_URL**. Frühere ADMIN_DB_*- und ADMIN_DATABASE_URL-Variablen müssen
beim Hoster umbenannt werden; gesetzte alte Variablen führen zu einem verständlichen
Konfigurationsfehler statt einer unbemerkten Verbindung zur falschen Datenbank.

| Variable | Standard im JackTools Backend |
| --- | --- |
| DATABASE_URL | nicht gesetzt |
| DB_HOST | localhost |
| DB_PORT | 5432 |
| DB_NAME | jacktools |
| DB_USER | jacktools |
| DB_PASSWORD | nicht gesetzt |
| DB_SSL | aus; true aktiviert TLS |
| DB_POOL_MAX | 10 |
| DB_MAX_PENDING_REQUESTS | 1000 |
| DB_OVERLOAD_RETRY_AFTER_SECONDS | 2 |

Eine gesetzte URL hat Vorrang vor Host, Port, Datenbankname, Benutzer und Passwort.
SSL-, Pool- und Überlastvariablen gelten auch bei URL-Konfiguration.

**Bewusster Sicherheitsunterschied zur Vorlage:** TLS-Zertifikate werden bei
`DB_SSL=true` überprüft; kein `rejectUnauthorized:false`.
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
- **Build & ZIP: JackTools Backend** – prüft, baut frisch und erstellt backend/releases/jacktools-backend.zip.
- **Build: JackTools Backend**, **Check: JackTools Backend**, **Test: JackTools Backend**.
- **Setup: JackTools Backend Abhängigkeiten**, **Setup: JackTools Backend Migrationen**.
- **Recovery: JackTools Root zurücksetzen (Sessions widerrufen)** – ausdrücklich destruktiv.
- **Test: JackTools Backend mit isolierter PostgreSQL** – braucht lokale PG-Werkzeuge.

Der gemeinsame Start setzt eine ausgefüllte lokale `.env` und Docker voraus; er
verwendet den lokalen Komplettstart und führt damit ausdrücklich lokale Migrationen
aus. Der normale Backendstart ohne „lokal komplett“ verwendet hingegen die
konfigurierte Datenbank und installiert dort ebenfalls automatisch ausstehende Migrationen. Die Launch-Einträge verwenden
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

## Öffentliche Statusseite

Die Backend-Startseite / zeigt eine kleine englische Statusübersicht im
JackTools-Stil, mit automatischem Hell-/Dunkelmodus und Aktualisierung alle
15 Sekunden. Sie prüft die Datenbank über SELECT 1 und zeigt ausschließlich:

- Server is running
- Database connection established bzw. Database temporarily unavailable

Bei erreichbarer Datenbank antwortet sie mit HTTP 200, bei Datenbankfehlern mit
HTTP 503. Keine Zugangsdaten, internen Hosts, Datenbanknamen oder rohen
Fehlerdetails werden öffentlich angezeigt. Die Seite verwendet kein JavaScript,
keine externen Ressourcen und keine Cookies; Antworten werden nicht gecacht
und sind für Suchmaschinen ausgeschlossen.

Die maschinenlesbaren Endpunkte /health/live und /health/ready bleiben unverändert.
Kann die Anwendung überhaupt nicht starten (etwa wegen einer fehlerhaften
Erstinstallation), kann sie auch keine Statusseite ausliefern: Dann zeigt Plesk
seine Fehlerseite. Den Entwicklungs-/Debugmodus deshalb produktiv deaktivieren.
Detaillierte Zertifikats- und Maildiagnosen bleiben im geschützten Adminbereich.

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
   Schemaänderungsrechte für den App-Benutzer nötig, da der Datenbankaufbau beim Start erfolgt.
2. `npm ci`, `npm run check`, `npm run build`; Backenddateien einschließlich
   `package.json`, Lockdatei, `dist/` **und `migrations/`** bereitstellen.
   Auf dem Server Laufzeitabhängigkeiten mit `npm ci --omit=dev` installieren.
3. Erforderliche ENV konfigurieren: insbesondere `NODE_ENV=production`, `PORT`,
   `PUBLIC_BASE_URL=https://backend.jacktools.net`, eigene DB-Werte, Root und Sessionsecret,
   `ADMIN_ALLOWED_ORIGINS=https://jacktools.net` (gegebenenfalls zusätzlich die www-Origin).
4. Das SQL-Verzeichnis migrations/ muss neben dist/ vorhanden sein.
   Beim Start werden ausstehende Migrationen automatisch installiert; kein CLI-Schritt nötig.
5. Node-Einstieg `server.cjs`; alternativ `npm start`. Serverport über HTTPS-Reverse-Proxy
   veröffentlichen. `TRUST_PROXY` passend zur tatsächlichen Proxykette setzen, nicht blind aktivieren.
6. Company bauen und separat statisch deployen. Funktionierende Anmeldung und Cookies
   auf den echten HTTPS-Domains prüfen. Browser sieht keine Datenbank-Zugangsdaten.
7. Datenbankbackup und Restore testen; Sessionsecretrotation macht Sessions ungültig.
   API und Migrationen gemeinsam versionieren, kein automatisches Zurückrollen von Datenverlust.

### Automatischer Datenbankaufbau beim Start

Jeder Backendstart wendet vor HTTP-Listener, Root-Bootstrap und Hintergrundjobs
alle noch nicht installierten SQL-Migrationen in migrations/ an. Tabellen, Indizes
und spätere Schemaerweiterungen entstehen damit ohne separaten CLI-Schritt.
Bereits angewendete Migrationen werden anhand von Name und Prüfsumme übersprungen;
bestehende Daten und Root-Zugangsdaten werden beim Neustart nicht zurückgesetzt.

Die Migrationen laufen in einer Transaktion und verwenden eine PostgreSQL-
Advisory-Sperre gegen gleichzeitige Schemaänderungen durch mehrere App-Starts.
Bei einem Fehler wird zurückgerollt und der Backendstart abgebrochen.
Bereits installierte SQL-Dateien nicht nachträglich ändern; für Änderungen eine
neue Migration hinzufügen. Vor produktiven Updates die Datenbank sichern.

Der PostgreSQL-Server, die Datenbank und der Benutzer müssen vorher existieren.
Der konfigurierte DB-Benutzer benötigt Tabellen-/Indexerstellungs- und
Schemaänderungsrechte. Das manuelle Kommando npm run migrate bleibt optional
für Wartung und Diagnose verfügbar.

### Upload-Paket per VS Code oder Terminal

In „Ausführen und Debuggen“ den Eintrag **Build & ZIP: JackTools Backend** wählen.
Alternativ im Ordner backend:

~~~bash
npm run deploy:zip
~~~

Das Paket liegt danach unter **backend/releases/jacktools-backend.zip**.
Ein vorhandenes Paket wird erst nach erfolgreichem Build und Verpacken ersetzt.
Der Vorgang prüft die Typen, bereinigt die Buildausgaben (public bleibt erhalten),
baut neu und verpackt ausschließlich
dist/, public/, migrations/, server.cjs, package.json, package-lock.json, README.md,
die **Vorlage** .env.example und eine kurze DEPLOY.txt.
Keine echte .env, keine node_modules, Datenbankdaten oder Logs werden eingepackt.
Die ZIP-Erstellung verwendet nur Node.js-Bordmittel; kein ZIP-Programm nötig.
Es werden keine Migrationen ausgeführt und keine Server gestartet.

Auf dem Server in das nicht öffentlich statisch ausgelieferte Node-App-Verzeichnis
entpacken. Die Dateien liegen direkt im Archiv, ohne zusätzlichen backend/-Ordner.
Dann mit den beim Hoster hinterlegten Produktionsvariablen:

~~~bash
npm ci --omit=dev
npm start
~~~

Bei einem Hoster mit eigener Prozessverwaltung stattdessen **server.cjs**
als Startdatei einstellen und die App über das Panel neu starten. Der Datenbankaufbau erfolgt automatisch.
Die lokale .env nicht hochladen und .env.example nicht unverändert produktiv verwenden.
Vor Updates die Datenbank sichern. releases/ ist von Git ausgeschlossen.

### Plesk/Passenger und ES-Module

Als Startdatei server.cjs im Application Root verwenden, nicht direkt dist/server.js.
Passenger lädt den Einstieg per require(). Da die eigentliche ES-Modul-Anwendung
beim Start asynchron die Datenbank initialisiert, wird sie über einen dynamischen
import() aus dem CommonJS-Starter geladen. Das vermeidet ERR_REQUIRE_ASYNC_MODULE.
npm start verwendet ebenfalls diesen Einstiegspunkt.

Öffentliche Debugseiten in Produktion deaktivieren: Passenger-Diagnosen können
Umgebungsvariablen und damit Zugangsdaten offenlegen. Nach einer solchen Offenlegung
Datenbank-/Root-/SMTP-Passwörter sowie Session- und Streaming-Schlüssel erneuern;
weitere vom Hoster verwaltete Schlüssel durch den Hoster prüfen lassen.
Schlüsselrotation beendet bestehende Sitzungen bzw. Streaming-Verbindungen.

### Plesk: Application Root und Document Root

Das ZIP in den Ordner /backend.jacktools.net entpacken, sodass dort package.json,
package-lock.json, migrations/ und dist/ nebeneinander liegen.

- **Application Root:** /backend.jacktools.net (Ordner mit package.json, nicht dist/)
- **Document Root:** /backend.jacktools.net/public
- **Application Startup File:** server.cjs
- **Application Mode:** production

public/ wird auch als leerer Ordner ins ZIP aufgenommen. Bereits vorhandene
Dateien dort bleiben beim lokalen Packaging-Build erhalten und werden mit verpackt.
Nur ausdrücklich öffentliche Dateien hineinlegen, niemals .env, Schlüssel oder
Datenbankkopien. Versteckte Dateien und typische Schlüssel-/Dump-/Logdateien werden
vom Packager abgewiesen. Dateien in dist/ sind ansonsten Buildausgaben und werden
beim Packaging neu erzeugt. Öffentliche Dateien in public/ können dagegen regulär
versioniert werden. Die leere Ordnerstruktur wird durch .gitkeep gesichert;
diese Platzhalterdatei wird nicht ins ZIP aufgenommen.

Die Abhängigkeiten über Plesk im Application Root installieren, dann App neu starten.
Bei „Idle“ startet Plesk den Prozess laut Dashboard erst bei der nächsten Anfrage.
Für verlässliche zeitgesteuerte Zertifikatschecks muss die App dauerhaft laufen
oder der dokumentierte externe Cronjob des Hosters verwendet werden.

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

1. Backend starten, z. B. `npm run dev:local`; Tabellen werden beim Start automatisch angelegt.
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
Migration `002_tv.sql` wird beim Backendstart automatisch angewendet. Clock neu bauen/deployen.
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

## Zertifikatsüberwachung

Eigenständige JackTools-Implementierung der Funktion aus dem MessageDrop-Adminbackend:
keine Verbindung zu dessen Datenbank, Nutzern, SMTP-Zugang oder API. Domains werden
per TLS-Handshake mit SNI geprüft: Gültigkeitsbeginn/-ende, Resttage,
Vertrauenskette und Hostname. Auch abgelaufene/selbstsignierte Zertifikate werden
ausgelesen, aber **nicht** als vertrauenswürdig eingestuft.

### Einrichtung

1. npm ci, npm run build und Backend neu starten. Die additive Migration
   003_certificates.sql wird automatisch angewendet. Lokal: npm run dev:local.
2. Company neu bauen und deployen. Im Admin-Dashboard erscheint die Kachel
   **Zertifikatsprüfung**, erreichbar unter /{de,en,es,fr}/admin/certificates/.
3. In der Backend-Umgebung aktivieren und eigene Domains ergänzen:

       CERT_MONITOR_ENABLED=true
       CERT_MONITOR_SCHEDULER_ENABLED=true
       CERT_MONITOR_CRON=40 0 * * *
       CERT_MONITOR_TIMEZONE=Europe/Berlin
       CERT_MONITOR_WARNING_DAYS=30
       CERT_MONITOR_CRITICAL_DAYS=14
       CERT_MONITOR_DOMAINS=Company|jacktools.net;Backend|backend.jacktools.net;Clock|clock.jacktools.net
       CERT_MONITOR_DOMAINS_TOOLS=Metronom|metronome.jacktools.net

   Domainnamen an die tatsächlich betriebenen URLs anpassen. Automatisch kommen
   HTTPS-Origins aus PUBLIC_BASE_URL, ADMIN_ALLOWED_ORIGINS und TV_ALLOWED_ORIGINS
   hinzu. CERT_MONITOR_DOMAINS, beliebige nummerierte/benannte
   CERT_MONITOR_DOMAINS_*-Listen sowie optional CERT_MONITOR_DOMAINS_FILE werden
   zusammengeführt und nach Host/Port dedupliziert. Format: Name|domain.tld,
   Name=https://domain.tld oder domain.tld[:port]. Dateiliste maximal 64 KiB,
   insgesamt maximal 50 Ziele. Ungültige Eingaben verhindern den Start.
   Die Domains werden in dieser ersten Version wie bei MessageDrop **über die
   Umgebung**, nicht über frei eingebbare Admin-URLs, verwaltet.
   Änderungen benötigen einen Backend-Neustart.

4. Postfach support@jacktools.net beim Mailanbieter anlegen. Dessen echte
   SMTP-Daten in der Umgebung hinterlegen:

       MAIL_SERVER_SMTP=<SMTP-Server des Anbieters>
       MAIL_PORT_SMTP=465
       MAIL_SECURE=true
       MAIL_USER=support@jacktools.net
       MAIL_PASSWORD=<Passwort des Postfachs>
       MAIL_FROM=support@jacktools.net
       CERT_MONITOR_NOTIFY_EMAIL=<Empfänger der Warnungen>

   Absender und Warnungsempfänger sind getrennt. Ohne CERT_MONITOR_NOTIFY_EMAIL
   wird ROOT_EMAIL verwendet; ohne Empfänger oder SMTP-Zugang läuft die Prüfung,
   **aber es werden keine Warnungen versendet**. Keine Zugangsdaten im Frontend
   oder im Repository hinterlegen. MAIL_FROM/MAIL_ADDRESS sind einfache
   E-Mail-Adressen ohne Anzeigenamen. Port 465 nutzt direkt TLS; für Port 587
   MAIL_SECURE=false setzen – STARTTLS ist dennoch zwingend, inklusive gültiger
   Serverzertifikate. Zugangsdaten werden nie an das Frontend zurückgegeben.
   SPF/DKIM und möglichst DMARC beim Mailanbieter für jacktools.net einrichten;
   bei der Testmail auch den Spamordner prüfen.

5. Als Root im Company-Admin **Testmail senden** (Briefsymbol) auslösen.
   Das testet den tatsächlichen SMTP-Versand an den konfigurierten Empfänger.
   **Jetzt prüfen** startet einen Hintergrundlauf; die Oberfläche zeigt den
   Fortschritt und aktualisiert die Ergebnisse. Ein Klick auf einen Eintrag
   öffnet die Zertifikatsdetails im Overlay.

### Ablauf und Benachrichtigungen

- Standardmäßig täglich **00:40 Uhr Europe/Berlin**, zusätzlich einmal beim
  Backend-Start (CERT_MONITOR_CHECK_ON_START=false unterdrückt den Startlauf).
  Die zeitgesteuerte Prüfung läuft im Node-Prozess. Dafür muss dieser dauerhaft
  laufen; während ausgeschaltetem Backend gibt es keine Prüfung.
- Warnung bei höchstens 30, kritisch bei höchstens 14 Resttagen; die Grenzen sind
  konfigurierbar. Abgelaufene Zertifikate, TLS-/DNS-/Verbindungsfehler werden
  gesondert ausgewiesen. Dies ist keine vollständige TLS-/Cipher-/OCSP-Analyse.
- Eine zusammengefasste E-Mail bei erstmaliger Auffälligkeit, Statuswechsel und
  Rückkehr zu „gültig“ (CERT_MONITOR_NOTIFY_RECOVERY=false unterdrückt Entwarnungen).
  Unveränderte Zustände erzeugen keine täglichen Wiederholungen.
- Der zuletzt erfolgreich gemeldete Zustand wird separat in PostgreSQL gehalten:
  schlägt SMTP fehl, wird beim nächsten Prüflauf erneut versucht. Versandfehler
  sind in „Prüfung & Versand“ sichtbar. SMTP-Zustellung und DB-Bestätigung können
  nicht atomar erfolgen: bei einem Absturz nach Versand ist eine doppelte
  Benachrichtigung möglich.
- Eine atomare PostgreSQL-Lease sperrt parallele Prüfungen auch über mehrere
  Node-Prozesse und CLI-Aufrufe hinweg. Maximal vier Ziele gleichzeitig,
  vollständiges DNS-/TLS-Timeout pro Ziel (Standard acht Sekunden).
  Die Lease läuft nach einem harten Prozessabbruch nach 15 Minuten aus.
  Manuelle Checks und Testmails: jeweils maximal ein Start pro Minute.
- Keine frei wählbaren Scan-Ziele per API. Private, Loopback-, Link-Local-,
  Metadaten- und andere nichtöffentliche DNS-Adressen werden blockiert, auch bei
  gemischten DNS-Antworten. Die geprüfte IP wird vor dem TLS-Aufbau festgelegt,
  damit DNS-Rebinding keine interne Verbindung erlaubt. Keine HTTP-Weiterleitungen.
- Admin und Root dürfen Übersicht/Details lesen und Prüfungen starten.
  Konten mit temporärem Passwort müssen dieses zuerst ändern. SMTP-Testmails
  sind Root vorbehalten. Mutationen erfordern Sitzung, exakte erlaubte
  Company-Origin und CSRF-Token; Aktionen werden auditiert.
- Gespeichert werden das jeweils letzte Ergebnis je Domain, der zuletzt
  gemeldete Zustand und Lauf-/Versandmetadaten. Entfernte Ziele werden beim
  nächsten erfolgreichen Lauf bereinigt. Kein Bezug zu Clock-/Stream-Daten.

### Alternativ: externer Cronjob

Falls der Hoster einen Server-Cronjob verwenden soll:
CERT_MONITOR_SCHEDULER_ENABLED=false setzen (Überwachung selbst bleibt aktiv).
Den gleichen Umgebungszugang wie für das Backend sicher bereitstellen; viele
Hoster vererben die Web-Prozess-Umgebung **nicht** an Cronjobs. Die CLI lädt
alternativ backend/.env am festen Projektpfad. Diese Datei nicht öffentlich
ausliefern und nur für den ausführenden Benutzer lesbar halten.

    # Entwicklung, im backend-Ordner:
    npm run certificates:check
    # Produktion, nach dem Build:
    npm run certificates:check:production

Beispiel mit absoluten Pfaden für die Crontab:

    40 0 * * * cd /ABSOLUTER/PFAD/backend && /ABSOLUTER/PFAD/node dist/cli.js certificates:check >> /ABSOLUTER/PFAD/certificates.log 2>&1

Die Zeitzone des externen Cronjobs wird vom Hoster festgelegt, nicht von der
Node-Cron-Einstellung. Node >=24.17.0 verwenden. Beide Scheduler nicht parallel
betreiben; die DB-Sperre verhindert Überschneidungen, ersetzt aber keinen
eindeutigen Betriebszeitplan.

Tests: npm test enthält lokale TLS-/DNS-/SSRF-/Template-Regressionen;
npm run test:local prüft Berechtigungen, CSRF, Mehrprozess-Sperre, Zustandswechsel,
SMTP-Fehlerwiederholung und Entwarnung gegen eine wegwerfbare PostgreSQL-Datenbank.
Die Tests senden **keine echten E-Mails**. SMTP-Daten und realer Empfang können erst
nach Anlegen/Konfigurieren des eigenen Postfachs geprüft werden.
