# AdSense in den Tools (8. November 2026)

Timer (Countdown/Pomodoro/Intervall), Uhr, Stoppuhr, Breathe, Relax,
Taschenrechner, Lava, Metronom und Sound verwenden den gemeinsamen
`shared/AdBanner.astro`: Publisher `ca-pub-5182500947872057`, Slot `4560273012`.
Das Format `horizontal` ist eine von Google unterstützte Anpassung des
responsiven Slots; auf Mobilgeräten bleibt die Darstellung responsiv.

Der Werbeplatz steht zwischen Toolansicht und Einstellungen, beim Taschenrechner
und Sound unter dem Arbeitsbereich (Einstellungen sind dort Dialoge/Overlays).
Er liegt nicht in Formularen, Dialogen oder den eigentlichen Bedienflächen.
Fokusansicht und Druck blenden den Platz aus. Bereits geladene Google-Skripte
werden dabei nicht entladen und Einwilligungen nicht zurückgesetzt. Keine
zusätzlichen Anzeigenanforderungen beim Wechsel aus dem Fokusmodus.
Rechts-/Nutzungshinweisseiten und Fehlerseiten enthalten keinen Werbeplatz.
SceneScript und NullTopic bleiben unverändert.

`shared/AdvertisingPrivacy.astro` ergänzt die Datenschutzseiten in Deutsch und
Englisch. Anzeigenfreie Versprechen in Dialogen, FAQs und Toolbeschreibungen
wurden entfernt. Die optionalen lokalen Einstellungen sind weiterhin unabhängig
von der Werbeeinwilligung; ihr Löschen ist kein Widerruf gegenüber Google.

## Vor Veröffentlichung prüfen

- Die bereits im AdSense-Konto veröffentlichten EU- und US-Nachrichten müssen
  auch auf den jeweiligen Tool-Subdomains tatsächlich erscheinen. Die lokale
  Codeänderung kann den Kontostatus und die regionale Auslieferung nicht prüfen.
- In der Google-Nachricht die Datenschutzerklärung richtig zuordnen; bei einer
  gemeinsamen Domain-Nachricht ggf. einen zentralen Hinweis auf die einzelnen
  Tool-Datenschutzerklärungen bereitstellen. Tatsächliche Werbepartner und
  Einstellungen mit den Hinweisen abgleichen; keine rechtliche Freigabe.
- Zustimmung, Ablehnung und erneutes Öffnen/Widerruf für die Subdomains testen.
  Lokaler „Einstellungen löschen“-Button ersetzt die Google-Links nicht.
- Auto Ads im Konto prüfen: Für die bewusst platzierten Slots und eine
  werbefreie Fokusansicht automatische zusätzliche/Overlay-Anzeigen deaktivieren.
  Die lokale Fokusregel kontrolliert nur unseren eigenen Werbeplatz.
- Hosting-Header dürfen Google-Nachrichten nicht blockieren (CSP, Referrer-Policy).
- Keine echten Anzeigen bei Entwicklung/Tests anklicken oder künstliche
  Impressionen erzeugen. Die automatisierten Tests blockieren externe Anfragen.

## Lokale Prüfung

Alle neun Projekte bauen, dann in `timer` mit Node 24:
`npm run test:e2e -- --config playwright.ads.config.ts`.
Die Testserver nutzen Ports 4380–4388; Desktop und Mobilgerät, vier Sprachen,
Platzierung vor Einstellungen, Fokuswechsel und Datenschutzseiten werden geprüft.
Google-/Werbeauslieferung wird nicht live getestet.

Quellen:
- https://support.google.com/adsense/answer/9183460?hl=de
- https://support.google.com/adsense/answer/10960768?hl=de
- https://support.google.com/adsense/answer/10960771?hl=de
