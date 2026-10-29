# Build und Upload-Archive

VS Code → **Ausführen und Debuggen → Build: Alle Seiten** baut alle zehn Projekte
nacheinander über `scripts/build-all.mjs`. Nur nach erfolgreichen Builds erzeugt `scripts/package-dist.py`
für jedes Projekt ein ZIP direkt im jeweiligen `dist/`-Ordner, zum Beispiel
`metronome/dist/metronome-deploy.zip` oder `company/dist/company-deploy.zip`.

Voraussetzungen: Node.js >=24.17.0, installierte Projektabhängigkeiten und Python 3
(`python3`). Keine zusätzlichen Python-Pakete und kein ZIP-Programm nötig.
Einzelne „Build: …“-Einträge bleiben unverändert.

## Auf den Server übertragen

Das passende ZIP hochladen und **im Document Root der Domain/Subdomain entpacken**.
Die Dateien liegen direkt auf Archivebene, ohne Projekt- oder `dist/`-Unterordner.
Nach dem Entpacken kann das ZIP vom Server gelöscht werden.

Enthalten ist der komplette statische Build, einschließlich versteckter Dateien
wie Companys `.htaccess`, Sprachverzeichnissen, Assets, `robots.txt` und
`sitemap.xml`. Dateien außerhalb von `dist/` werden nicht hinzugefügt; symbolische
Links werden abgelehnt. Das Archiv packt sich nicht selbst ein und wird beim
erneuten Verpacken atomar ersetzt. Andere ZIP-Dateien aus dem eigentlichen Build
bleiben als normale Assets enthalten.

DNS, HTTPS, Nginx/Plesk-Einstellungen und das Entfernen alter Serverdateien werden
nicht automatisiert. Companys zusätzliche Nginx-Regeln unter `company/hosting/`
sind Serverkonfiguration, kein Inhalt für den Document Root. Es wird nichts
hochgeladen oder veröffentlicht.

## Vorhandene Builds erneut verpacken

```sh
python3 scripts/package-dist.py             # alle Projekte
python3 scripts/package-dist.py metronome   # nur Metronom
```

Dabei wird nicht neu gebaut. Tests für den Packer:

```sh
python3 -B -m unittest discover -s scripts -p 'test_package_dist.py'
```

## Fortschritt und Abschluss

Der Gesamtbuild läuft in VS Code als eigener Node-Prozess statt als dauerhaft
offene Debug-Terminal-Sitzung. Die Ausgabe bleibt als Protokoll im Terminal stehen;
der Build-Prozess und seine Debug-Sitzung können regulär enden.

- `[1/11] START Build: company` und danach `OK` zeigen den aktuellen Schritt.
- Bei 15 Sekunden ohne Ausgabe erscheint `[AKTIV] … läuft weiterhin …`.
- Erst nach allen Builds und ZIPs erscheint deutlich `[FERTIG]` mit Dauer und Exit-Code 0.
- Fehler führen zu `[FEHLER]`, einem Exit-Code ungleich 0 und sofortigem Abbruch;
  es wird keine Erfolgsmeldung ausgegeben.

Auch direkt im Terminal nutzbar:

```sh
node scripts/build-all.mjs
node --test scripts/build-all.test.mjs
```

## MessageDrop einzeln bauen

**Build: MessageDrop** baut die benachbarte öffentliche Astro-Website unter
`../messagedrop/platform/messagedrop/` und erstellt danach
`../messagedrop/platform/messagedrop/dist/messagedrop-deploy.zip`.
Die Angular-App wird nicht gebaut. Der Gesamtbuild der zehn Jacktools-Seiten
bleibt unverändert. Auch dieser Einzelbuild meldet `[FERTIG]` oder `[FEHLER]`.

```sh
node scripts/build-messagedrop.mjs
python3 scripts/package-dist.py messagedrop  # nur vorhandenen Build verpacken
```
