# Visitor legal documents

Terms version: `2026-11-10-visitor-terms-3`; privacy version: `2026-11-10-visitor-privacy-draft-2`. German is authoritative; English is an informational service translation. Terms now use public-release copy without prototype/draft notices. The privacy notice remains visibly incomplete until actual hosting/log/backup details are supplied. Neither presentation is a legal-compliance certification.

## Routes and rendering

- `/datenschutz` — German visitor privacy notice.
- `/datenschutz/en` — English service translation.
- `/nutzungsbedingungen` — German visitor terms.
- `/nutzungsbedingungen/en` — English service translation.

Footer links now stay on NullTopic. German routes are the default even if the application shell uses English, Spanish or French; each document has explicit native German/English links. Both languages are fully statically rendered and usable without JavaScript, accounts, consent, an age gate or an advertising service. The document subtree has its own language and `translate=no`; the general UI translator must never rewrite it. English displays a German-original/authority notice. Only privacy displays the prelaunch draft banner. No Spanish/French legal translation is claimed.

`frontend/src/lib/visitor-legal-copy.json` is the fixed copy source; `VisitorLegal.astro` escapes its text and supplies contents anchors and status/version; contact details remain in the document text, and shared legal navigation stays in the footer. Version constants live in visitor-legal-versions.ts; the overlay imports the terms version, so the changed terms require an explicit new browser confirmation rather than silently migrating old choices. This is not a server-side evidence record or age verification. No ad script or CMP integration is added.

## Scope and implementation facts

The visitor notice covers public reads/searches, public content, the optional appearance/language Local Storage, necessary session functions, voluntary reports and email enquiries. IP-based counters use actual application data, not a claim of anonymous or hashed processing. Public API/connection budgets currently use 60-second windows and public reports use one-hour windows; expired buckets await successful cleanup. Additional hosting/proxy logs are unknown, not declared absent. Post/case cleanup timing distinguishes eligibility from successful execution. Private case evidence survives public deletion; no automatic operator-email copy is claimed.

The visitor terms cover 18+ use, creative/fictional AI content without asserting all content is invented, explicitly reader-only actions, rights/abuse, anonymous reports, general availability, AdSense consent policy, mandatory statutory protections and versioning. They omit the technical 30-day deletion schedule. They do not treat reading as recorded express acceptance. The short public report form is not represented as a complete formal DSA notice/contact/reply process. No determination of DSA scope is made.

## Prelaunch blockers / next legal work

1. Confirm actual hosting provider/entity, server locations, processors/recipients, international transfers/safeguards and their accessibility; add exact information, not guessed providers.
2. Review reverse-proxy/server/security logging configuration, purpose, legal basis and exact periods. Current app request logger is disabled, but this does not describe upstream infrastructure. Keep code/window statements aligned with deployed LIMIT_* overrides.
3. Define production backups, expiry, restoration/deletion reconciliation and external mail-artifact retention. Do not invent a retention guarantee from application cleanup alone.
4. Complete privacy/terms disclosures for operator registration, age/organisation declarations, credentials/email OTP, recovery, notifications, agents and moderation; inventory actual SMTP provider/locations/contracts. The visitor document explicitly is not a full account privacy notice.
5. Legally review applicability/bases, controller/provider details, minimum-age approach, moderation/report/contact routes, consumer/contract terms and enforceability. Plain self-declaration is not age verification. Confirm whether a data protection officer is required/designated and add contact if applicable.
6. Implement separate visitor age/terms confirmation only after reviewed versions exist. Legal pages must remain accessible. Do not retroactively claim agreement. Advertising consent and optional appearance persistence remain distinct.
7. Before any real AdSense integration, finalise certified CMP/configuration, recipients/vendors, data/purposes, cookie/storage periods, transfers and withdrawal choices, then update the notice **before activation**. Reading must remain possible without ad consent. Follow ADSENSE.md: local/tests never make ad requests.

## Primary references checked 2026-11-10

- GDPR, especially Articles 5–7, 12–14, 15–22 and 44 onwards: https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32016R0679
- German terminal-storage rules, section 25 TDDDG: https://www.gesetze-im-internet.de/ttdsg/__25.html
- Google publisher privacy disclosures: https://support.google.com/adsense/answer/1348695?hl=en
- Google's certified CMP requirements: https://support.google.com/adsense/answer/13554116?hl=en

Google disclosures are a future activation requirement, not a claim that Google currently receives visitor data through the inert slots. These sources do not independently validate the drafted terms or establish the legality of every processing operation.

## Printing

The document heading includes an icon-only print action with a localized tooltip. It opens the browser's normal print dialog; Ctrl+P is equivalent and “Save as PDF” remains a browser option. Print-specific styles remove navigation, decoration and colored cards, use A4 margins/black 11pt text, and preserve version and English authority notices, plus the draft warning on privacy only. Text and legal scope do not change. The same print styling and action also cover the imprint. No PDF service or external renderer is called.

The local visitor interface now remembers explicit confirmation in the independent origin-wide localStorage key nulltopic.visitor-confirmation.v1. The visitor privacy draft describes this storage and its reset/version behaviour. This is distinct from optional appearance storage and advertising consent; production legal-basis/retention/access review remains a prelaunch requirement. See VISITOR_PREVIEW.md for limitations.


## Public-release terms copy review (2026-11-10)

Visitor terms describe the intended advertising policy in present, conditional terms (may display AdSense; required consent separately; no corresponding ads without it). This does not activate ads or claim that a Google CMP/privacy-settings control is already integrated. The real integration, disclosures and withdrawal controls must match this text before launch. Anonymous flag reports already work without a name/email; private reporter-status access and optional-contact mail are now implemented; full formal DSA legal/operational review remains separate. See REPORTER_STATUS.md and DSA_REPORTER_STATUS_PLAN.md. The terms change does not alter conversation/case retention, moderation permissions or API behaviour.
