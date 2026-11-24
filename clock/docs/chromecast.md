# Chromecast-Prototyp testen

Die Uhr wird **nicht gespiegelt**: Der Chromecast lädt `/cast/` als eigene
Web-Receiver-App und rendert die vorhandenen Uhrkomponenten mit eigener Gerätezeit.
Das Handy übermittelt nur Einstellungen. Ohne weitere Verbindung läuft die zuletzt
empfangene Konfiguration weiter; Standortänderungen vom Handy kommen dann nicht mehr an.

## Einmalige Einrichtung

1. In der [Google Cast SDK Developer Console](https://cast.google.com/publish/)
   anmelden. Google verlangt für neue Entwicklerkonten gegebenenfalls eine
   Registrierungsgebühr; die aktuellen Bedingungen in der Console prüfen.
2. Eine **Custom Web Receiver**-Anwendung anlegen (nicht Default/Styled Media Receiver).
   Receiver-URL: **`https://clock.jacktools.net/cast/`**.
   Das Gerät muss diese HTTPS-Adresse erreichen können. `localhost` auf dem Handy
   oder Entwicklungsrechner ist vom Chromecast aus nicht erreichbar.
3. Für den unveröffentlichten Test den Chromecast als Testgerät mit seiner
   Seriennummer registrieren. Warten, bis er zum Test freigegeben ist; bei Bedarf
   neu starten. Details je nach Gerät in Googles Registrierungsanleitung beachten.
4. Die achtstellige Application ID notieren. Keine Zugangsdaten oder Google-Passwörter
   im Repository hinterlegen. Die App-ID selbst ist kein Geheimnis.
5. Diesen Code zunächst auf dem gewünschten Testhost bereitstellen. Beim regulären
   Deployment nur die gebauten Dateien aus `clock/dist/` hochladen.
   Optional die ID beim Build setzen:

   ```bash
   cd clock
   PUBLIC_CAST_APP_ID=DEINE_ID npm run build
   ```

   Ohne gesetzte ID lässt sie sich im Cast-Dialog für die aktuelle Seite eingeben.
   Die ID wird von der Uhr nicht gespeichert. Der Prototyp wird nicht automatisch
   bei Google registriert oder veröffentlicht.

## Testablauf

1. Handy und Chromecast zunächst ins gleiche WLAN bringen.
2. In **Chrome auf Android oder Desktop** die bereitgestellte Uhr über HTTPS öffnen.
   Der Web Sender wird **nicht in Chrome auf iOS** unterstützt; iPhone-Browser
   gehören nicht zum unterstützten Testpfad. Dafür wäre ein separater iOS-Sender nötig.
3. Uhrtyp, Zusatzanzeige, Hintergrund, Farbschema und Zeitzone einstellen.
4. Oben **Auf TV anzeigen** öffnen. Erst jetzt wird das Google Cast Sender SDK geladen.
5. App-ID eintragen, **Verbinden**, das registrierte Gerät wählen. Die Meldung
   „Einstellungen auf dem TV übernommen“ bestätigt die Antwort der Receiver-App.
6. Änderungen an Uhr, Hintergrund, Transparenz, Palette, Schriftgröße und Design
   werden bei bestehender Verbindung automatisch übertragen.
7. Für Sonnenuhr oder standortabhängigen Himmel am Handy den Standort einschalten
   **und zusätzlich im Cast-Dialog** die Standortübertragung erlauben.
   Ohne die zweite Freigabe wird `location: null` gesendet. Die Receiver-App fordert
   keine eigene Geolocation an. Widerruf bei bestehender Verbindung entfernt die
   Koordinaten beim nächsten Update auch auf dem TV.
8. **Nur Handy trennen** verwenden oder das Handy wirklich ausschalten.
   Nach mindestens 10–30 Minuten prüfen, ob Uhr, Sekunden und Datum weiterlaufen.
   Nicht „Uhr auf TV beenden“ wählen: Diese Aktion beendet absichtlich die Receiver-App.
9. Erneut **Verbinden** wählen, um die Uhr wieder zu steuern. Es werden dabei die
   aktuell am Handy eingestellten Werte neu übertragen, nicht vom TV zurückgelesen.
10. Zum Schluss **Uhr auf TV beenden** oder die Cast-Funktion des Geräts nutzen.

## Grenzen / Sicherheit / Datenschutz

- Experimentell: Es gibt bisher **keinen Test an echter Cast-Hardware**. Die
  Browserprüfungen verwenden nachgebildete SDK-Grenzen, keine Cast-Geräteemulation.
- `disableIdleTimeout: true` ist für diese **Nicht-Medien-App** gesetzt. Es wird kein
  stummes Video abgespielt und kein künstlicher Medienstatus vorgetäuscht. Ein leeres,
  verborgenes Videoelement erfüllt lediglich die CAF-Anforderung an das DOM.
  Stromsparregeln, TV-Abschaltung, andere Cast-Sitzungen oder Gerätefehler können
  die Anzeige trotzdem beenden. Dauerbetrieb ist nicht garantiert.
- Alle Uhrtypen verwenden dieselbe Darstellung wie die App. Die Receiver-Oberfläche
  startet auf Englisch; Uhrzeit und Kalender werden mit der übertragenen Sprache
  formatiert. Einige feste Beschriftungen (z. B. Sonnenuhr-Hinweise) bleiben in
  diesem ersten Prototyp Englisch.
- „Lokale Zeitzone“ wird am Handy in eine konkrete IANA-Zeitzone aufgelöst. Die Uhr
  läuft mit der **Gerätezeit des Chromecast**, nicht mit einem laufenden Zeitstream
  vom Handy oder einem externen Zeitserver.
- Wecker, Audio, Browserberechtigungen, Speicherungseinstellungen und Wake Lock
  werden nicht übertragen. Der Receiver speichert empfangene Daten nicht im Local
  Storage. Er lädt keine Anzeigen.
- Anzeigeeinstellungen und separat freigegebene Koordinaten gehen über Google Cast
  an das ausgewählte Gerät. Koordinaten stehen weder in der Receiver-URL noch in
  eigenen Serveranfragen. Nach Trennung bleiben bereits übertragene Koordinaten im
  Arbeitsspeicher des Receivers, bis dessen Ansicht geschlossen wird.
- Das Laden des Google SDK und der Receiver-Webseite erzeugt normale Verbindungen
  zu Google bzw. zum Webhost. Vor einem öffentlichen Rollout Datenschutztexte und
  Cast-Veröffentlichungsanforderungen nochmals prüfen.
- Lange statische Anzeigen können bei manchen Displays Einbrenneffekte verursachen.

## Entwicklung / automatisierte Prüfungen

```bash
cd clock
npx playwright test tests/cast.spec.ts --workers=2
npm run build
```

`src/lib/cast-state.ts` definiert den versionierten Nachrichtenvertrag und validiert
alle empfangenen Werte. Er akzeptiert ausschließlich bekannte Uhr-Einstellungen,
Palette/Design/Theme-Werte, gültige Zeitzonen und gültige Koordinaten. Keine fremden
URLs, HTML-Inhalte, CSS-Werte oder beliebigen Local-Storage-Schlüssel werden übernommen.
Der Kanal lautet `urn:x-cast:net.jacktools.clock`. Der Empfänger bestätigt angewandte
Nachrichten mit `applied` bzw. weist ungültige Daten mit `rejected` zurück.

### Offizielle Referenzen

- [Registrierung von Anwendung und Testgerät](https://developers.google.com/cast/docs/registration)
- [Web-Sender-Einrichtung und Browsergrenzen](https://developers.google.com/cast/docs/web_sender)
- [Sender-Integration](https://developers.google.com/cast/docs/web_sender/integrate)
- [Receiver-Optionen, insbesondere disableIdleTimeout für Nicht-Medien-Apps](https://developers.google.com/cast/docs/reference/web_receiver/cast.framework.CastReceiverOptions)
