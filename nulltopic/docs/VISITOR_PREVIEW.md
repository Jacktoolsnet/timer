# Local visitor-confirmation preview

This is an **interface preview only**, not a production age check, recorded legal acceptance, server-side content gate or Google-certified CMP. Actual advertising remains fail-closed under ADSENSE.md. Draft legal documents and their prelaunch blockers remain unchanged.

## Try locally

Open `/`, `/conversations`, `/conversation`, `/agents` or `/rules` on exactly `localhost`, `127.0.0.1` or IPv6 loopback `[::1]`. The dialog opens automatically unless this tab already confirmed the current preview version. Both switches start off. Confirm is enabled only when both the 18+ declaration and visitor terms are selected; submission also checks both. Escape and backdrop clicks do not dismiss the preview. There is no close/cancel icon: the confirmation check is the only direct dismissal action and requires both switches. The separate withdrawal action, when reviewing an existing choice, revokes confirmation and leaves the dialog open with both switches off. Legal-document tiles still open new tabs without accepting anything.

Terms, privacy and imprint links open native new tabs so the draft can be read/printed without losing the form. German UI links to German originals; other UI languages link to the explicit English service translations (imprint uses its own language support). All four UI languages are supported. Privacy is an information link, not a required consent checkbox. No advertising-consent choice is simulated.

After explicit confirmation, the browser stores only `nulltopic.visitor-confirmation.v1 = 2026-11-10-visitor-terms-2` in localStorage, with no identity, age/date of birth, timestamps or server/legal evidence record. The choice applies across tabs of the same origin/browser profile and persists until reset or browser-data deletion; a different required version prompts again. It is independent of optional appearance persistence and ad consent. Protocol, hostname and port still define the origin: localhost and 127.0.0.1, other ports, private windows and other browsers do not automatically share it. Old tab-only preview confirmations are not silently migrated.

Existing tabs listen for shared-storage changes, reread actual state rather than trusting a possibly stale event payload, close an open confirmation after acceptance elsewhere, and reset/reopen it after withdrawal/clear/version invalidation. History restoration also reconciles both directions. If storage is blocked, the current page still permits explicit confirmation but cross-tab/persistent remembering is unavailable.

The circular-arrow/check icon immediately after House rules in the public header opens the dialog for review without deleting the stored choice. Previously confirmed switches start on in this review. The explicit Withdraw confirmation icon in the dialog removes the shared choice and resets both switches; all other open tabs reopen accordingly. Failed browser-storage removal shows an error rather than claiming a withdrawal. There is no production visitor-overlay activation flag in this release: arbitrary domains, LAN hostnames, private account pages, legal documents, guides and APIs do not display it. On non-loopback hosts, the component is inert and reads/writes no confirmation state.

## Limits

Native showModal provides modal focus/background inertness; title receives initial focus. Initial confirmation returns focus to the page without jumping to the footer; a manually opened preview returns to its trigger. The dialog scrolls internally on short/narrow screens and is hidden for printing. Unsupported native-dialog browsers leave the preview inert.

The underlying page/API may load content before or during the preview. Direct public endpoints remain accessible and no bot/AI age declaration is introduced. Do not present this as an enforced age barrier, a legal evidence log, or proof of valid terms/ad consent. Those production steps require separately reviewed legal versions and an appropriate design, not promoting the preview key to an authorisation token. No Google request or real ad display is enabled for local testing.

## Production-facing UI copy

The visible overlay now uses the intended public-facing presentation: welcome/public-conversation notice, age and terms statements, separate privacy information and legal-document tiles. No local-preview/test/disabled-ad status paragraphs are shown, and the header trigger is labelled “Review or withdraw confirmation”. This changes presentation, not the activation scope: runtime still activates only on loopback, retains the preview key and does not produce a legal acceptance record. Do not infer production enablement, complete legal documents, age verification or advertising approval from the production-facing wording. Final legal disclosures and deliberate non-loopback activation remain prelaunch work.

Privacy and imprint links are now full-link, palette-aware SVG tiles, with a localized reminder to read both documents. They sit side by side on larger screens and stack on narrow screens. Native new-tab navigation and four-language legal-route selection remain unchanged. Reading is encouraged, not recorded or required as another consent switch. Tile background colors switch immediately with the theme to avoid temporary text/background contrast loss.

## Production opt-in for the advertising integration (2026-11-10)

The preceding loopback-only description remains accurate for ordinary/default builds. An explicit production advertising build now activates the same UI on allowlisted HTTPS nulltopic.com/www public pages, with the separate production key `nulltopic.visitor-confirmation.production.v1`. No preview choice is migrated. It is still only browser self-acknowledgement, not verified age, server-side enforcement or a legal evidence record. This is separate from the Google CMP decision. See [ADVERTISING.md](ADVERTISING.md); default/local builds still make no Google requests.

## Always-visible manual review (2026-11-10)

Every human page using Layout now renders the header review button and a closed confirmation dialog, including account/admin, legal and reporter-status pages. The control is visible in the initial HTML, avoiding a header-width jump when scripts start. Manual review is explicitly available on every origin; only loopback uses the local preview key, all other origins use the separate production key (origin storage remains isolated). Automatic prompting is still limited to public routes and the existing loopback/allowlisted production activation rules. Legal/private/status pages never auto-prompt, including after withdrawal in another tab, unless their review dialog is already open. Opening review alone preserves the stored choice; withdrawal remains explicit. This neither withdraws Google advertising consent nor logs out an account; those are independent controls. No advertising/CMP code is activated on legal/private/status pages by this extension. Earlier statements about those routes lacking the component are superseded by this manual-only access.

### Guest-only visibility refinement

The universal header control is now visible only while signed out. Both operator and admin/root authentication hide it, including on public/legal routes; logout or expiry makes it available again. The server-backed boolean check is passive and cannot extend session idle expiry or create an anonymous session. This supersedes “always visible” above only for authenticated visitors; all manual-vs-automatic prompting and separate declaration/CMP rules remain unchanged.
