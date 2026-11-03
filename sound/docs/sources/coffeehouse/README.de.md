# Coffeehouse – gesicherte historische Notenquellen

Stand: 03.11.2026. **Quellenarbeit begonnen; noch keine freigegebenen Bibliothekssongs.
Chopin liegt inzwischen als [abspielbare Vorschau](../../COFFEEHOUSE_PREVIEW.de.md) vor.**

Die PDFs enthalten jeweils die tatsächlich betrachtete Titelseite und die
Notenseite des ausgewählten Stücks. Seitenzahlen im Manifest sind **physische
PDF-Seiten, ab 1**, nicht bloß gedruckte Seitenzahlen. Die Originaldateien wurden
heruntergeladen und mit SHA-256 erfasst; die kleinen Belegauszüge haben eigene
Hashes. Es wurden keine fremden MIDI-Dateien oder Aufnahmen übernommen. Für die spätere
Chopin-Vorschau wurde zusätzlich eine benannte PD-Notationshilfe verwendet; siehe
Vorschaudokumentation. Das ursprüngliche Quellenpaket selbst enthält nur Scans.

| Geplantes Stück | IMSLP-Datei | Original-PDF-Seiten im Beleg | Musikalischer Umfang |
| --- | --- | --- | --- |
| Schumann, op.15/1 | [03060](https://imslp.org/wiki/Special:ReverseLookup/03060) | 1, 2 | Nr.1 vollständig auf gedruckter Seite 3, 2/4 |
| Chopin, op.28/7 | [85374](https://imslp.org/wiki/Special:ReverseLookup/85374) | 1, 10 | Nur die oberen zwei Systeme bis „Fine“, 3/4; Nr.8 darunter gehört **nicht** dazu |
| Brahms, op.39/15 | [138189](https://imslp.org/wiki/Special:ReverseLookup/138189) | 1, 16 | Komponisten-Solofassung in As-Dur, 3/4, Platte 524; nicht die leichte Fassung, Platte 525 |

## Befunde, nicht nur Katalogetiketten

- **Schumann:** Verlag und Platte 6016 stimmen mit den IMSLP-Metadaten überein.
  Dort als spätere Auflage der Erstausgabe von 1839 eingeordnet.
- **Chopin:** Verlag Breitkopf & Härtel und Platte 6088 auf dem Scan bestätigt.
  Die französische Titelseite ist kein Hinweis auf eine andere Bearbeitung.
- **Brahms:** IMSLP nennt die Erstausgabe von 1866. Die Titelseite des konkreten
  Exemplars enthält jedoch Markpreise; deshalb **nicht behaupten, dieses
  Exemplar sei nachweislich 1866 gedruckt worden**. Die Plattennummer der Noten
  und die Komponisten-Solofassung sind bestätigt. Das genaue Auflagendatum bleibt
  offen; keine moderne Bearbeitung daraus ableiten oder ungeprüft übernehmen.

## Regionale Arbeitsgrundlage

Die Originalkomponisten starben 1856, 1849 bzw. 1897. Die normalen Schutzfristen
sind lange abgelaufen. Das ist die Grundlage der Auswahl, keine Behauptung einer
neuen Lizenz an den historischen Originalnoten:

- Deutschland: [§64 UrhG](https://www.gesetze-im-internet.de/urhg/__64.html),
  Lebenszeit plus 70 Jahre.
- EU: [Richtlinie 2006/116/EG, Art.1 und 10](https://eur-lex.europa.eu/eli/dir/2006/116/oj/eng),
  normale Frist und Übergangsregeln. Ein vollständiger länderweiser Sonderfristen-
  Abgleich wird hier **nicht** als erledigt ausgegeben.
- USA: [Copyright Office, Circular 15A](https://www.copyright.gov/circs/circ15a.pdf),
  historische Veröffentlichungsfristen. Die Ausgabenbasis stammt aus dem
  19. Jahrhundert; Originalnoten und spätere Zusätze getrennt beurteilen.
- Kanada: [CIPO, A guide to copyright](https://ised-isde.canada.ca/site/canadian-intellectual-property-office/en/guide-copyright),
  die Verlängerung 2022 ließ bereits gemeinfreie Werke gemeinfrei.

Das Manifest dokumentiert Beobachtungen und Dateien, **keine anwaltliche
Rechtefreigabe und keine Freigabe unserer künftigen Bearbeitungen/Aufnahmen**.
Die Regionalprüfung in der Gesamtplanung bleibt daher offen. Die gesicherten
Scans sind Arbeitsbelege im Repository, keine App-Downloads oder Klangdateien.

## Nächster Produktionsschritt

1. Stimmen getrennt aus den historischen Noten erfassen, mit Taktprüfungen,
   Auftakten, Vorzeichen, Bindungen und vollständiger Wiederholungsform.
2. Ereignisse gegen die konkrete Notenseite prüfen; keine generischen Akkorde
   an die Stelle chromatischer Originalharmonik setzen.
3. Coffeehouse-Mix gestalten: deutliche Melodie, warme Begleitung, zurückhaltender
   Bass; kein zwangsläufiger Drumloop und keine künstliche Verlängerung kurzer Stücke.
4. Erst nach musikalischer Prüfung, Import-/Exporttests und Hörabnahme in den
   öffentlichen Katalog aufnehmen. Pegeltests allein ersetzen keine Hörabnahme.

Offline-Belegprüfung ohne Downloads oder PDF-Zusatzprogramme:

```sh
python3 sound/scripts/check-score-evidence.py
```

Die Hashprüfung bestätigt Dateiintegrität und Zuordnung, **nicht** die
Richtigkeit noch nicht erfasster Noten oder den Rechtsstatus.
