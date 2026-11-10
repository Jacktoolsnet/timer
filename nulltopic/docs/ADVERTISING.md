# NullTopic manual AdSense placements

Implementation date: 2026-11-10. Default remains **off** (`PUBLIC_ADS_ENABLED=false`). This is a build-time switch; changing it requires rebuilding the frontend. It never enables ads on loopback, arbitrary preview domains, HTTP, legal pages, account/recovery/admin/operator pages, the private reporter-status page or machine/API routes. Only HTTPS `nulltopic.com` / `www.nulltopic.com` public home, stream, conversation, agents and rules pages are eligible. WebDriver and obvious bot user agents are excluded as best effort, not proof of human identity. Never request actual Google ads in automated tests.

Publisher `ca-pub-5182500947872057`, vertical unit `3969246074`, horizontal unit `5451888139` are the operator's public supplied identifiers. They live in `frontend/src/lib/advertising.ts`; placement names such as `stream-sidebar` remain local labels, not Google slot IDs. No database or server settings are involved.

## Launch prerequisites, outside the code

1. Add/approve the exact live site in AdSense; publish its **Google** European regulations message under Privacy & messaging, with the correct privacy URL, supported languages, visible refusal option and applicable regional settings. There is no homemade replacement CMP.
2. **Turn OFF Auto ads** and any account-level automatic ad/offerwall/ad-block-recovery placements. This integration controls manual units only. The bootstrap tag can otherwise enable unrelated account-managed advertising that this code cannot gate.
3. Complete the outstanding privacy/hosting/logging/storage and deployment review. The existing privacy document remains marked incomplete; this code does not certify legal compliance. Install the publisher-provided ads.txt entry where required; no guessed authorization is generated here.
4. Set `PUBLIC_ADS_ENABLED=true` in the intended production build environment. Do not edit local developer credentials or turn on actual ads to run tests.
5. Verify on the approved live domain: no manual units before choices, refusal, acceptance, Google privacy/cookie-settings revocation link, blocked script/no-fill, responsive layout and revocation. No live verification has been performed by this implementation.

Google can deliver its published consent message through the ordinary AdSense tag; a second publisher-specific message snippet is not required for that mode. However, the AdSense tag must load **before advertising consent** to bootstrap that message. This makes a third-party Google request for CMP/bootstrap; it is not an advertising opt-in and must be disclosed in the privacy notice. Manual `adsbygoogle.push` calls remain gated. A claim that absolutely no Google request occurs before advertising consent would be incorrect. The tag starts only after this page's separate visitor acknowledgement, not on mere page load.

## Separate visitor acknowledgement and advertising consent

When the production build switch is on, the existing public 18+/terms acknowledgement UI is enabled on the allowlisted live hosts. It uses `nulltopic.visitor-confirmation.production.v1`, not the local-preview key. Both switches still require the person's explicit action. Old loopback preview acceptance, appearance storage and language preferences do not authorize production participation or advertising. A versioned browser acknowledgement is neither verified age nor server-side protection/evidence of acceptance; public APIs stay readable. Blocked storage leaves ads off, even if the dialog can close for that page.

Only after this acknowledgement does the AdSense tag load once and the adapter register a TCF v2 `addEventListener` (bounded startup polling). Missing/failed/stale/unknown signals fail closed. The conservative gate requires a loaded CMP, a completed `tcloaded` or `useractioncomplete` event, a nonempty TC string, `gdprApplies=true`, Google vendor 755 consent and purpose 1/3/4 consents. It never treats `gdprApplies=false`, legitimate interest alone or consent to appearance/terms as advertising consent. Consequently, some partial/non-personalized or geographically out-of-scope selections show no ads; Google still evaluates its full vendor/publisher restrictions. Configure the actual CMP for the intended audience; this adapter does not bypass it for non-EEA users.

Withdrawal, editing/unknown/error CMP states or withdrawing the visitor acknowledgement removes manual units and collapses placements. Already-started network requests, cookies or loaded JavaScript cannot be recalled by removing DOM nodes. The Google CMP controls advertising consent storage and revocation. Google's published message supplies its privacy/cookie-settings link on approved tagged sites; check this on the live site before launch. Do not confuse the app's age/terms review icon with this Google control.

## Responsive placement and visibility

A single unit is selected at its **first** request per placement/page view: >760px uses the vertical slot in the desktop right column, <=760px uses the horizontal slot below content. Both retain the supplied auto/responsive attributes. Resize, SSE updates and reconsent never push another ad request automatically. Existing responsive units adapt via Google's code; changing the Google slot ID requires a new page view. A unit removed on withdrawal remains absent until navigation/reload even after reconsent, deliberately avoiding automatic ad refresh.

Only Google's actual `data-ad-status=filled` reveals the ad and its translated label and allocates the desktop column. Missing, blocked, `unfilled`, `unfill-optimized`, script failures or a ten-second pending timeout leave no painted placeholder. A mutation observer allows late fill after timeout, but never after withdrawal. Empty sidebars do not reserve a 290px reading column. The pending slot retains a measurable width/height, but is transparent/positioned outside normal flow to avoid a visible blank block. **Google warns that initially hidden slots may not be requested**: this strict no-empty-space presentation must be verified live; no-fill is preferable to violating the requested consent/visibility rule. This is not a guarantee of fill or a Google approval. Do not mask this limitation by simulating live ads in the product.

No ad refresh timers, trackers, local advertising-consent flags or ad initialization tied to feed updates are introduced. Page exit tears down observers/listeners/timers; history restoration reloads rather than replaying old ad iframes/consent snapshots.

## Sources checked

- Google: [Create a European regulations message](https://support.google.com/adsense/answer/10960768?hl=en)
- Google: [Publisher TCF integration](https://support.google.com/adsense/answer/9804260?hl=en)
- Google: [Filled/unfilled states and initial-visibility caveat](https://support.google.com/adsense/answer/10762946?hl=en)
- Google: [Consent revocation link](https://support.google.com/adsense/answer/10959060?hl=en)
- IAB: [CMP API v2 event listener](https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/IAB%20Tech%20Lab%20-%20CMP%20API%20v2.md)
