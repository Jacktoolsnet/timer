# JackTools Backend

Eigenständige Express-5-/TypeScript-API für Company und Tools. Keine Verbindung zu
MessageDrop, dessen Adminbackend oder Datenbank. Zieladresse: `https://backend.jacktools.net`.
TV-Kopplung und Zertifikatsüberwachung sind noch nicht implementiert.

## Voraussetzungen und erster Start

Node.js **24.17.0 oder neuer** und eine eigene PostgreSQL-Datenbank (getestet mit
PostgreSQL 15). Docker und Redis sind nicht nötig.

```bash
cd backend
npm ci
cp .env.example .env
# .env mit EIGENEN Datenbankdaten, Root-Passwort und zufälligem SESSION_SECRET ausfüllen.
npm run migrate
npm run dev
```

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

Lokal Company auf `http://127.0.0.1:4321` öffnen, Backend auf
`http://127.0.0.1:4340`. Nicht wahllos `localhost` und `127.0.0.1` mischen: Für Cookies
müssen beide Frontend-/Backendadressen derselben Site angehören.

```bash
cd company
PUBLIC_BACKEND_URL=http://127.0.0.1:4340 npm run dev -- --port 4321
```

`PUBLIC_BACKEND_URL` ist die **einzige öffentliche Backendkonfiguration** der
Company-Seite und wird beim Build eingebaut. Standard im Produktionsbuild:
`https://backend.jacktools.net`. `ROOT_*`, DB-Daten und `SESSION_SECRET` niemals als
`PUBLIC_*` setzen oder in Company-Dateien hinterlegen.

## VS Code Start und Build

`.vscode/launch.json` enthält:

- **Start: JackTools Backend** – Entwicklung mit Watch-Modus.
- **Start: Company (JackTools Admin)** – Company auf Port 4321 mit lokaler API-Adresse.
- **Start: JackTools Backend + Company Admin** – startet beide Konfigurationen gemeinsam.
- **Build: JackTools Backend**, **Check: JackTools Backend**, **Test: JackTools Backend**.
- **Setup: JackTools Backend Abhängigkeiten**, **Setup: JackTools Backend Migrationen**.
- **Recovery: JackTools Root zurücksetzen (Sessions widerrufen)** – ausdrücklich destruktiv.
- **Test: JackTools Backend mit isolierter PostgreSQL** – braucht lokale PG-Werkzeuge.

Der gemeinsame Start setzt eine ausgefüllte `.env` und vorherige Migrationen voraus.
Startbefehle führen keine stillen Schemaänderungen aus. Die Launch-Einträge verwenden
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
Company-Browsertests: `cd company && npx playwright test tests/admin.spec.ts`.

## API und Sicherheit

- `GET /health/live`, `GET /health/ready`.
- `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`.
- `PATCH /api/v1/auth/profile`, `PUT /api/v1/auth/password`.
- Nur Root: `GET/POST /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id`,
  `POST /api/v1/admin/users/:id/password`.
- Schreibzugriffe benötigen einen erlaubten `Origin`, JSON und nach Anmeldung
  zusätzlich `X-CSRF-Token`. Die Sessionantwort enthält den CSRF-Token, nicht den Cookieinhalt.
- Zufällige, opake Sessiontokens im hostgebundenen HttpOnly-Cookie; Datenbank speichert
  nur einen HMAC. Produktiv Cookie `__Host-jt_admin` mit Secure und SameSite=Lax.
- Cookies mit `credentials: include`; keine Tokens oder Passwörter im Local Storage.
- `ADMIN_ALLOWED_ORIGINS` ist eine exakte, kommaseparierte Liste, ohne Sternchen und
  ohne abschließenden Slash. Nur Company-Adressen, keine pauschale Freigabe aller Tools.
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

Dies ist ein erster Verwaltungsstand, keine abgeschlossene Betriebshärtung. Vor
öffentlicher Nutzung Datenschutz-/Cookieinformationen, Mail-/Recovery-Prozess und
gegebenenfalls Mehrfaktoranmeldung für Root prüfen. Es wurde nichts deployed.
