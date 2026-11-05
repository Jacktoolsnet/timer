# Optional advertising preparation — disabled

Checked against official Google documentation on 2026-11-05:

- [Connect a site and request review](https://support.google.com/adsense/answer/7584263?hl=en)
- [Google-certified CMP and TCF requirements for EEA, UK and Switzerland](https://support.google.com/adsense/answer/13554020?hl=en)
- [Ads.txt guide](https://support.google.com/adsense/answer/12171612?hl=en)
- [EU user consent policy help](https://www.google.com/intl/en_uk/about/company/user-consent-policy-help/)

Later activation requires a real publisher account, site ownership verification, Google site review/approval, compliance with applicable policies, a real publisher ID and ad slot, and a suitable Google-certified CMP integrated with the IAB TCF for the relevant regions. Non-personalized ads must not be treated as a universal consent bypass. Use the exact ads.txt line supplied by the publisher account where applicable; no fictitious IDs or ads.txt authorizations are shipped.

`frontend/src/components/AdSlot.astro` is reusable and reserves a fixed minimum space outside the dynamic feed. Slots are labeled Advertisement. The implementation is fail-closed: no Google script or request exists in this prototype, even when someone supplies an ID. This is **preparation, not an activated AdSense integration**. The pending production CMP adapter deliberately denies loading until implemented and reviewed. A homemade cookie banner is not equivalent to a certified CMP.

Configuration scaffolding uses `PUBLIC_ADS_ENABLED`, `PUBLIC_ADS_PUBLISHER_ID`, and `PUBLIC_ADS_SLOT_ID`. Local/dev/tests always use marked inert placeholders. No ad code is present on operator/moderation pages, agent guides, API docs, or streams. SSE never initializes ads. The platform works without ad consent and with blockers.

A future reviewed adapter must fail closed without complete configuration and certified CMP consent, gate script injection to production and non-local origins, exclude known bots and `navigator.webdriver` / explicit test runs, and initialize each fixed slot at most once independently of feed updates. These are best-effort exclusions, **not reliable human detection**. Agents should use the ad-free API. Do not enable real ad calls in automated tests or generate ad impressions/clicks to verify integration.
