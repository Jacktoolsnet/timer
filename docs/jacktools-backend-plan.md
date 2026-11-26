# Umsetzungsplan für das eigenständige JackTools Backend

Stand: 26. November 2026. Status: Planung, noch kein implementierter Backenddienst.

## Ziel und Abgrenzung

Ein gemeinsames, modular erweiterbares Backend für die Company-Seite und die
JackTools-Werkzeuge unter `https://backend.jacktools.net`. Erste Anwendungen sind
eine kleine Administration auf der Company-Seite und die browserbasierte
TV-Kopplung der Uhr. Später folgt eine eigene Zertifikatsüberwachung.

**Das Backend ist vollständig unabhängig von MessageDrop und dessen Adminbackend.**
Es bekommt eigene Benutzer, Sessions, Datenbank, Konfiguration, Migrationen und
Deployment. Keine gemeinsamen Konten, Zugangsdaten, Datenbanktabellen, Dienste,
API-Aufrufe oder Laufzeitabhängigkeiten. Die bestehende MessageDrop-Zertifikatsprüfung
ist ausschließlich eine Funktionsvorlage. An MessageDrop wird nichts geändert.

### Anforderungen

- Node.js als Serverlaufzeit; PostgreSQL steht zur Verfügung und wird als
  dauerhafter Speicher verwendet. Kein verpflichtendes Redis, Docker oder weiterer Dienst.
- Root-Benutzername und initiales Passwort werden ausschließlich über serverseitige
  Umgebungsvariablen vorgegeben. Keine öffentlich offene Root-Registrierung.
- Eine kleine Adminoberfläche in der Company-Seite: Root-Anmeldung, eigenes Profil,
  Adminbenutzer anlegen, sperren und Zugang zurücksetzen.
- TV-Browser öffnen eine kurze Uhr-Adresse. QR-Code oder kurzer Code koppeln das
  Handy bzw. den Desktop mit genau dieser TV-Ansicht. Einstellungen werden übertragen;
  die Uhr läuft danach ohne eingeschaltetes Handy weiter.
- Standortübertragung ist optional und separat freizugeben; Wecker und deren Audio
  werden im ersten TV-Schritt nicht übertragen.
- Später eine eigene Zertifikatsprüfung mit Übersicht, Warnungen und Benachrichtigungen.
- Chromecast-spezifischen Prototyp aus der Uhr entfernen; keine Google Cast SDKs,
  App-ID-Konfiguration oder `/cast/`-Receiver mehr.

## Ausgangslage im Repository

- `company/` und `clock/` sind eigenständige statische Astro-/TypeScript-Projekte.
  Sie können statisch bleiben; nur der neue Backenddienst muss Node.js ausführen.
- Bestehende Builds und Uploadarchive der statischen Seiten bleiben getrennt.
- Eine neue Struktur `backend/` wird vorgeschlagen, nicht eine Erweiterung des
  MessageDrop-Projekts. Gemeinsame Nachrichtenverträge können unter
  `shared/contracts/` liegen, dürfen aber keine Servergeheimnisse importieren.
- Die derzeitigen Uhransichten, Zusatzanzeigen, Hintergründe, Sprach- und
  Darstellungseinstellungen bleiben beim Entfernen von Cast unverändert.

## Vorgeschlagene Architektur

| Teil | Aufgabe |
| --- | --- |
| `backend.jacktools.net/api/v1/` | Versionierte API über HTTPS |
| Neues `backend/` | Node.js, TypeScript, Express 5, PostgreSQL über `pg` |
| `company/` unter `/{sprache}/admin/` | Statische Adminoberfläche mit API-Zugriff, keine Secrets im Browser |
| `clock.jacktools.net/tv` | Vollbildfähige Receiver-Seite im installierten TV-Browser |
| Uhr auf Handy oder Desktop | Bestehende Einstellungen auswählen und TV koppeln |

Das Backend wird als modularer Monolith aufgebaut: ein kleiner Dienst mit getrennten
Modulen für `auth`, `users`, `tv`, `audit` und später `certificates`. Kein allgemeines
Benutzerkonto für normale Tool-Nutzer im ersten Schritt. Eine TV-Kopplung benötigt
keinen Adminlogin. Tool-Ausfälle dürfen die normale lokale Uhr nicht beeinträchtigen.

### Kommunikation und Hosting

Für den ersten TV-Schritt genügen HTTPS-Anfragen und adaptives Polling. Übertragen
werden Einstellungsänderungen, **keine einzelnen Sekunden und kein Bildschirmvideo**.
So sind weder WebSockets noch spezielle Proxy-Upgrades Voraussetzung. Bei Bedarf
kann später ein zusätzlicher Echtzeittransport ergänzt werden.

Das Backend nutzt den vom Host vorgegebenen Port hinter einem HTTPS-Reverse-Proxy.
Vertrauenswürdige Proxy-Hops werden gezielt konfiguriert, nicht pauschal freigegeben.
Gesundheitsprüfung, Readiness mit Datenbankprüfung, strukturierte Logs und ein
geordneter Shutdown gehören zum Grundgerüst. Hintergrundaufgaben müssen auch bei
mehreren Node-Prozessen durch PostgreSQL-Locks vor Doppelverarbeitung geschützt sein.

## Root und Administration

### Ersteinrichtung

1. Datenbank und serverseitige Umgebungsvariablen einrichten.
2. Schema-Migrationen mit einem expliziten Deploymentbefehl ausführen.
3. Beim ersten Start den Root aus `ROOT_USERNAME` und `ROOT_PASSWORD` erzeugen,
   falls noch keiner existiert. Ein eindeutiger Schlüssel und eine Transaktion
   verhindern doppelte Roots bei gleichzeitigen Starts.
4. Nur einen sicheren Passwort-Hash mit individuellem Salt speichern; Vorschlag:
   Node.js `crypto.scrypt` mit angemessenem, getesteten Ressourcenbudget.
5. In der Company-Administration als Root anmelden und Profil vervollständigen.
6. Root legt einen Admin mit temporärem Passwort an; dieser muss es bei der ersten
   Anmeldung ändern. Ein Maildienst ist dafür anfangs nicht erforderlich.

Damit ist „mich als Root anlegen“ eine geschützte Ersteinrichtung aus der
Serverkonfiguration, **kein frei zugängliches Registrierungsformular**.

Der Bootstrap ist idempotent: Ein Neustart überschreibt keine bestehenden
Passwörter, Rollen oder Profildaten. Für eine bewusste Root-Wiederherstellung gibt
es einen expliziten CLI-Befehl, der die ENV-Werte verwendet und bestehende Sessions
widerruft. Das bloße Ändern der ENV setzt ein bestehendes Passwort nicht heimlich zurück.

### Rollen und Oberfläche

- **Root:** Adminbenutzer verwalten, Zugänge zurücksetzen, Systemkonfiguration und
  später Überwachungsziele verwalten. Root lässt sich nicht versehentlich durch
  einen normalen Admin entfernen oder herabstufen.
- **Admin:** zunächst eigene Profildaten und Passwort verwalten; später ausdrücklich
  freigegebene Betriebsfunktionen wie Zertifikatsstatus und manuelle Prüfung.
- Rollenprüfung erfolgt immer im Backend, nicht nur durch ausgeblendete Buttons.
- Oberfläche im vorhandenen Company-Design, responsiv und in den vier vorhandenen
  Sprachen; Adminseiten erhalten `noindex` und erscheinen nicht in der Sitemap.
  Dies ersetzt keine Zugriffskontrolle.
- Auditprotokoll für Benutzerverwaltung, Loginereignisse und privilegierte Aktionen;
  keine Passwörter, Tokens oder Standortdaten in Audit- oder Requestlogs.

### Sessions und Schutz

Serverseitige, widerrufbare Sessions in PostgreSQL. Im Browser nur eine zufällige
Sessionkennung als `HttpOnly`- und `Secure`-Cookie mit passender SameSite-Regel,
vorzugsweise hostgebunden an die Backenddomain. Keine Admin-Tokens im Local Storage.
Sessionwechsel nach Anmeldung; Sperren oder Passwortreset widerrufen die betreffenden
Sessions. Inaktivitäts- und absolute Laufzeitgrenzen werden konfigurierbar.

Company-Frontend und Backend sind verschiedene Origins. API-Aufrufe erfolgen mit
gezielt erlaubten Origins und Credentials; kein `Access-Control-Allow-Origin: *`
bei Auth-Endpunkten. Schreibzugriffe werden zusätzlich durch CSRF-Token und
Originprüfung geschützt. Login-Ratenbegrenzung, generische Fehlermeldungen,
Payloadgrenzen und serverseitige Validierung gehören zum ersten Release.
Tool-Kopplungsendpunkte nutzen eigene Capability-Tokens und keine Admin-Cookies.

## TV Kopplung der Uhr

### Bedienablauf

1. Am TV einmal `clock.jacktools.net/tv` im installierten Browser öffnen.
2. Die Seite zeigt QR-Code und kurzen, zeitlich begrenzten Kopplungscode.
3. Am Handy oder Desktop in der Uhr „TV verbinden“ öffnen und den Code eingeben.
   Alternativ den QR-Code mit dem Handy scannen.
4. Die aktuelle Darstellung wird zur Vorschau angezeigt. Auch nicht dauerhaft
   gespeicherte Einstellungen müssen bewusst übernommen werden können; ein neuer
   QR-Tab darf sie nicht stillschweigend durch Standardwerte ersetzen.
5. Eine kurze Bestätigung am TV gibt die vorgeschlagene Verbindung frei.
6. Uhrtyp, Zusatzanzeige, Ziffernblatt, Zahlen, Farben, Stil, Schriftgröße,
   Zeitzone, Sekundenverhalten, Datum, Hintergrund und Transparenz übertragen.
7. Bei bestehender Kopplung werden weitere Einstellungsänderungen synchronisiert.
8. Das Handy kann getrennt oder ausgeschaltet werden. Die TV-Uhr rendert mit der
   eigenen Gerätezeit und der zuletzt empfangenen Konfiguration weiter.
9. „Verbindung trennen“ und „TV-Anzeige beenden“ sind unterschiedliche Aktionen.

Die Uhr berechnet die Zeit selbst; Backend und Handy liefern keine laufenden
Zeitsignale. „Lokale Zeitzone“ wird am Sender in eine konkrete IANA-Zeitzone
aufgelöst. Netzwerkverlust stoppt eine bereits initialisierte TV-Uhr nicht.
Nach einem kompletten Browserneustart kann ohne gesondert aktiviertes Speichern
eine erneute Kopplung erforderlich sein.

### Protokoll und Sicherheitsgrenzen

- Sender und Empfänger bekommen unterschiedliche, kryptografisch zufällige Tokens.
  Jeder Zugriff ist an genau eine TV-Sitzung, Toolkennung und Richtung gebunden.
- Kurzer Code nur zur einmaligen Kopplung, nicht als dauerhaftes Zugriffstoken.
  Vorschlag: acht Ziffern und zehn Minuten Gültigkeit, mit strikten Versuchslimits,
  Begrenzung aktiver Anfragen und atomarem Einlösen. QR-Token haben hohe Entropie.
- QR-Geheimnisse im URL-Fragment, keine Passwörter oder Koordinaten in URLs.
  Eine Kopplung erfordert die ausdrückliche Bestätigung, nicht schon einen GET-Aufruf.
- Tokens im Speicher des Browsers; Backend speichert nur prüfbare Hashes.
  Keine öffentlichen Listen aktiver TV-Geräte. Antworten mit Secrets sind nicht cachebar.
- Versionsnummern und monotone Revisionen verhindern das Überschreiben neuerer
  Einstellungen durch verspätete Requests. Der Empfänger bestätigt angewandte Revisionen.
- Einstellungen werden pro Tool durch ein festes Schema validiert. Keine beliebigen
  URLs, HTML-/CSS-Inhalte, Skripte oder generischen Fernsteuerbefehle.
- Ablauf und Widerruf werden bei jedem Zugriff geprüft, nicht erst beim Aufräumjob.
  Polling verwendet Backoff; Rate Limits gelten pro Prozessverbund, nicht nur lokal.
- Aktive Steuerverbindung zunächst maximal 24 Stunden; danach neu koppeln.
  Die bereits laufende Anzeige benötigt die abgelaufene Verbindung nicht.

### Datenschutz und Grenzen

Standort standardmäßig nicht übertragen. Für Sonnenuhr oder echten Himmel ist
eine zusätzliche Freigabe notwendig. Anders als bei der rein lokalen Uhr laufen
diese Koordinaten dann über unser Backend; das muss im Dialog und den
Datenschutzhinweisen klar erkennbar sein.

Nur den letzten nötigen Zustands-Snapshot speichern, keine Standort-Historie.
Sensible Snapshotdaten sollen mit einem separaten serverseitigen Schlüssel
verschlüsselt werden. Sitzungen und Payloads werden nach Beenden oder Ablauf
gelöscht; ein regelmäßiger Job bereinigt die Datenbank. Backup-Aufbewahrung und
Schlüsselverwaltung müssen dazu passen: logisches Löschen entfernt Daten nicht
sofort aus älteren Backups. Anwendungslogs enthalten keine Payloads, Codes oder Tokens.

„Handy getrennt“ kann zuvor übertragene Koordinaten auf einem offline laufenden TV
nicht nachträglich entfernen. Ein Widerruf funktioniert bei bestehender Verbindung;
ansonsten muss die TV-Ansicht beendet werden. Datenschutztexte erst mit dem
tatsächlich implementierten TV-Datenfluss anpassen, nicht vorab lokale Aussagen ändern.

Das funktioniert nur auf Geräten mit geeignetem Browser. TV-Schlafmodus,
Bildschirmschoner, Vollbildfähigkeit und lange Laufzeiten werden auf echter Hardware
getestet. Klassische Chromecasts ohne frei nutzbaren Browser bleiben außerhalb
dieses Ansatzes. Kein Versprechen einer universellen Unterstützung aller Sticks.

## Geplante Daten und API Module

| Tabellenbereich | Inhalt |
| --- | --- |
| `users` | Identität, Rolle, Passwort-Hash, Status, Pflicht zum Passwortwechsel |
| `admin_sessions` | Session-Hash, Benutzer, Ablauf, Widerruf |
| `audit_events` | Begrenzte, redigierte Sicherheits- und Verwaltungsereignisse |
| `tv_sessions` | Tool, Status, Hashes der Capability-Tokens, Revision, Ablauf |
| `tv_pairings` | Kurzlebiger Code-/Token-Hash, Versuche und Bestätigung |
| `tv_snapshots` | Letzte validierte Konfiguration, optional verschlüsselte sensible Daten |
| später `certificate_targets`, `certificate_checks`, `notification_state` | Eigene Überwachungsziele, Ergebnisse und Meldungszustand |

API-Gruppen: `/api/v1/auth/*`, `/api/v1/admin/users/*`, `/api/v1/tv/*`, später
`/api/v1/admin/certificates/*`. Konkrete Endpunkte und JSON-Schemas vor den jeweiligen
Modulimplementierungen festlegen. Parametrisierte SQL-Abfragen, versionierte
Migrationen und PostgreSQL-Integrationstests sind verbindlich.

## Umgebungsvariablen

Vorgeschlagene Namen, endgültige Form im ersten Backend-Schritt festlegen:

| Variable | Zweck |
| --- | --- |
| `NODE_ENV`, `PORT`, `PUBLIC_BASE_URL` | Betriebsart, Hostport, `https://backend.jacktools.net` |
| `DATABASE_URL` | Ausschließlich eigene JackTools-Datenbank |
| `ROOT_USERNAME`, `ROOT_PASSWORD`, optional `ROOT_EMAIL` | Initialer Root und explizite Wiederherstellung |
| `SESSION_SECRET` | Eigenes, zufälliges Sessiongeheimnis |
| `STATE_ENCRYPTION_KEY` | Eigener Schlüssel für sensible TV-Snapshots |
| `ADMIN_ALLOWED_ORIGINS`, `TOOL_ALLOWED_ORIGINS` | Getrennte, exakte Origin-Listen |
| `TRUST_PROXY` | Tatsächlich vertrauenswürdige Proxykette |
| `PAIRING_TTL_SECONDS`, `TV_SESSION_TTL_SECONDS` | Ablaufgrenzen |
| später `CERT_MONITOR_*`, `SMTP_*` | Zertifikatsprüfung und optionale Benachrichtigungen |

`.env.example` enthält nur Platzhalter. Echte Secrets werden nicht versioniert,
nicht als `PUBLIC_*` ins Frontend gebaut und nicht vollständig beim Start geloggt.
Produktivkonfiguration ohne erforderliche sichere Werte startet nicht mit Defaults.

## Spätere Zertifikatsüberwachung

Funktionsvorlage, keine Systemanbindung:
`../messagedrop/platform/admin/backend/utils/certificateHealth.js`,
`routes/certificate-health.js`, `db/tableCertificateHealth.js` und die dortige
`certificate-health-card`.

Geplante eigene Funktionen:

- Konfigurierbare Ziele für Company, Backend und Tooldomains.
- TLS-Zertifikat, Gültigkeitszeitraum, Aussteller, verbleibende Tage,
  Vertrauens-/Hostnamenfehler, Verbindungsfehler und letzter Prüfzeitpunkt.
- Status `ok`, `warning`, `critical`, `expired`, `error` mit konfigurierbaren
  Warnschwellen; als Startvorschlag 30 und 14 Tage.
- Regelmäßige und manuelle Prüfung; begrenzte Parallelität und Timeouts.
- Benachrichtigung bei Zustandswechsel, Wiederherstellung und kontrollierten
  Wiederholungen statt gleicher Warnmail bei jeder Prüfung.
- Eigene PostgreSQL-Tabellen und eigene Admin-API; keine Übernahme des vorhandenen
  callbackbasierten Datenbankadapters oder der MessageDrop-Benutzerverwaltung.
- Kein ungeschützter Netzwerkprüf-Endpunkt. Ziele nur aus kontrollierter
  Konfiguration bzw. durch Root; SSRF-Schutz mit Port-/Hostregeln und abgesicherter
  DNS-Auflösung. Private, Loopback-, Link-local- und Metadatenadressen standardmäßig
  ausschließen. DNS-Rebinding berücksichtigen und das tatsächlich verbundene Ziel prüfen.
- Auch ungültige Zertifikate können für eine Diagnose ausgelesen werden; sie dürfen
  dadurch niemals als gültig gelten. Eine etwaige gelockerte TLS-Prüfung bleibt auf
  diesen isolierten Diagnosepfad begrenzt.

## Umsetzung in Etappen

### Etappe 0 Chromecast entfernen

Status: lokal erledigt. Uhr-Build erfolgreich; 58 Regressionstests auf Desktop und
Mobil erfolgreich. Keine Veröffentlichung vorgenommen.

Cast-Button, Dialog, SDK-Lader, Receiverroute, ENV-Hinweise, Tests und Cast-Dokumentation
entfernen. Ausschließlich Cast-bezogene Datenschutz- und Standortänderungen
zurücknehmen; bestehende Uhrfunktionen erhalten. Build und Regressionstests ausführen.
Beim späteren Deployment auch veraltete `/cast/`-Dateien vom Server entfernen.

### Etappe 1 Eigenständiges Backend und Root

Neues Node-/TypeScript-Projekt, Konfiguration, PostgreSQL-Migrationen, Healthchecks,
Root-Bootstrap, Login/Logout, Sessionablauf, Rollenprüfung, Auditbasis und lokale
Testkonfiguration. Eigene Tests für konkurrierenden Bootstrap und Wiederherstellung.

**Abnahme:** Der konfigurierte Root kann sich anmelden; Neustarts verändern den
Zugang nicht; ein anonymer oder gesperrter Benutzer erreicht keine Adminfunktionen.

### Etappe 2 Company Administration

Login, Profil, Benutzerliste und Adminanlage inklusive Sperren und Passwortreset;
CSRF-/CORS-Integration und mehrsprachiges Company-Design. Separates Frontend-API-URL
für Entwicklung und Produktion, ohne private Serverkonfiguration im Browser.

**Abnahme:** Root kann Admin anlegen; Admin muss initiales Passwort ändern, darf
keinen Root erzeugen und keine nicht erlaubten Verwaltungsaktionen ausführen.

### Etappe 3 TV Kopplung als erster Tooldienst

Versionierten Uhrzustand ohne Cast-Bezüge definieren; Kopplungs-API mit TTL und
Capability-Tokens implementieren; TV-Seite, QR-/Code-Eingabe, Bestätigung, Polling und
Übernahme aller aktuellen Uhrvarianten ergänzen. QR-Darstellung lokal erzeugen,
keinen fremden QR-Dienst verwenden. Kein Accountzwang für die Uhr.

**Abnahme:** Einstellungen kommen bestätigt am richtigen Gerät an; Handy aus und
Netzwerkunterbrechung stoppen die Uhr nicht. Falsche/abgelaufene Codes, doppelte Claims,
fehlende Standortfreigabe und veraltete Revisionen sind abgedeckt. Test zuerst mit
zwei getrennten Desktop-Browserprofilen, danach mit Android und realem TV-Browser.

### Etappe 4 Eigene Zertifikatsüberwachung

Prüflogik neu integrieren, eigene Speicherung, Scheduler und Adminübersicht;
Benachrichtigung nach Einrichtung eines Maildiensts. MessageDrop bleibt unverändert.

**Abnahme:** Gültige, bald ablaufende, abgelaufene und nicht vertrauenswürdige
Zertifikate werden korrekt unterschieden; Fehler, Wiederherstellung, Mail-Deduplizierung
und SSRF-Schutz sind getestet.

### Etappe 5 Betrieb und Freigabe

DNS und HTTPS für die Backenddomain; PostgreSQL-Rollen mit geringsten nötigen Rechten;
Start-/Restart-Konfiguration, Migrationen, Backup und Restore, bereinigte Logs,
Ratenbegrenzung über mehrere Prozesse und Rückrollplan testen. Admin und Backend
gemeinsam bereitstellen, nicht mit dem normalen statischen Toolarchiv vermischen.
Vor öffentlicher Freigabe des TV-Modus Löschfristen und Datenschutztexte anpassen.

## Nächster Umsetzungsschritt

Zuerst Etappe 1 und 2 als kleinen, eigenständig testbaren Verwaltungsstand umsetzen.
Danach TV-Kopplung und erst anschließend die Zertifikatsüberwachung. Dieser Plan
implementiert das neue Backend noch nicht und veröffentlicht keine Änderungen.

Technische Referenz zur Sessionabsicherung:
[Express Produktionssicherheit](https://expressjs.com/en/advanced/best-practice-security/)
und [serverseitige Sessions](https://expressjs.com/en/resources/middleware/session/).
