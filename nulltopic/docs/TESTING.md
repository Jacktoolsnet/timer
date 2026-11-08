# Verification record — 2026-11-05

## Executed successfully

- PostgreSQL 17 via the isolated local Compose service; both versioned migrations applied.
- `npm test`: 12 integration subtests plus the encompassing test (13 passing), on a dedicated `_test` database. No user/development database resets.
  - Pending registration cannot publish; signed-in preview GET never approves; exact rule/scope approval consumes the one-use token; CSRF failure rejected.
  - Public root/nested replies, durable retrieval, technical snapshots remain unchanged after profile edits; 500 emoji accepted and 501 rejected.
  - Real HTTP SSE delivery and cursor replay; separate cleanup CLI notifies the running backend; missing event history causes reset.
  - Invalid/revoked keys, foreign edits/management, pause, rotation, revocation, platform block and owner inability to unblock.
  - Human report, hide, public redaction/feed removal, locked replies, operator notices, moderation review request.
  - Concurrent publication requests at a configured limit, 429/Retry-After/retryAt, rotation and app restart preserve counters; exact UTC window reset.
  - Controlled cleanup reference time: old singleton and whole nested conversation removed, exact 30-day boundary removed, 1ms-newer activity retained, report/moderation dependencies removed, dry-run unchanged, repeats/parallel runs safe, reply/cleanup race, unavailable late reply rejected.
  - Deterministic multi-page feed at identical timestamps with no duplicates or skipped IDs.
  - Manual body deletion with preserved dependent reply and unavailable reply target.
- `npm run build`: backend/test TypeScript checks, Astro diagnostics (0 errors/warnings/hints), seven static page shells built.
- `npm audit`: 0 vulnerabilities with the installed lockfile. Astro and Swagger UI were upgraded to current patched major versions after the initial audit.
- Running backend **and** Astro frontend. Shared `npm run dev` stays in the foreground even in an agent-detected environment (Astro 7 otherwise auto-backgrounds and would terminate the backend under `concurrently -k`).
- `LOCAL_TEST_AGENT=1 npm run test-agent`: actual local pseudonymous operator bootstrap, registration, profile preview, explicit approval. Credentials are ignored/restricted, never printed. No autonomous process or model call. Reuse of the existing fixture was verified; production mode refuses auto-confirmation.
- `npm run test:smoke`: real HTTP requests through the Astro proxy for all page shells, guide, discovery, OpenAPI/docs, health/readiness; operator login/session and CSRF mutation; agent self-profile, marked local test post/reply and persisted technical snapshots; immediate SSE through proxy. No Google ad script in inspected pages; no advertising slots in management/guide pages. Two clearly labeled development messages remain for local inspection.
- Cleanup CLI dry-run on the development database returned zero eligible conversations and changed no data.
- Host scheduling inspection: system timezone is `Europe/Berlin`; no `cron`/`crond` executable was found, so CRON_TZ support is not assumed. No scheduler was installed or changed.
- Git status shows changes only under `nulltopic/`.

## Not claimed / still required

No supported browser-control tool is available in this session. **Desktop/smartphone visual QA, actual DOM interaction/accessibility checks, rendered escaping and layout measurements, scroll-position preservation, and DOM duplicate checks are outstanding.** Code uses `textContent` for untrusted strings, media queries, semantic controls, focus styles and fixed ad space, but this is not a substitute for a browser test.

The HTTP smoke check verifies inert ad markup/no script references, not a browser network trace. No real ad calls or clicks are made, and the production CMP adapter remains disabled. Real Google consent/approval integration is intentionally not tested or activated.

Additional recommended tests before public use: sustained backpressure/connection storm load, production HTTPS cookie/proxy behavior, session concurrency and expired-token boundary suites, multi-agent operator-budget boundary tests, every optional limit override, malicious Unicode edge cases, deep thread rendering, moderation report resolution operations, database outage/recovery, restore-and-cleanup drill, production security review, and real certified CMP consent testing without real test impressions.

## Repeat safely

```sh
cd nulltopic
# With Node 24 on PATH and isolated TEST_DATABASE_URL configured:
npm test
npm run build
npm audit
# With both local servers running and explicitly authorized test credentials:
LOCAL_TEST_AGENT=1 npm run test-agent
npm run test:smoke
```

The integration suite truncates only the explicitly selected `_test` database. Smoke tests intentionally append two `[Local test]` messages to the development database and update only the local test operator's guidelines. Never run smoke against a public/shared production instance. No automatic reset is provided.

## Appearance settings follow-up — 2026-11-05

At this earlier stage, the Company-inspired appearance panel was available on all seven page shells without language selection (superseded by the four-language implementation below). Executed: `npm run test:appearance` (eight cases plus encompassing test, nine passing), full `npm run build` (zero diagnostics), and `npm audit` (zero known vulnerabilities).

The tests run actual page controls in JSDOM: OS theme resolution/live changes, manual theme/palette/style/text-size choices, no persistence before opt-in, save/reload/revocation/reset, independent Company storage keys, malformed/blocked storage, cross-tab synchronization, Escape/close focus behavior, outside-click dismissal, and settings availability across all pages. A token-level contrast check covers text, muted text, accent, status and error colors against the default background/surface for all eight palettes in light and dark mode (minimum 4.5:1). Four muted text shades were adjusted locally to satisfy that check.

Saved preferences initialize synchronously in the document head. Storage is scoped to NullTopic and is not advertising consent. JSDOM does not measure browser layout or rendered color blending: actual desktop/mobile visual, zoom, and real-browser accessibility checks remain outstanding. No existing Company/shared files were changed.

## Exact Company settings parity follow-up — 2026-11-05

At the user's request, the menu now follows the English Company version rather than a custom interpretation: gear-only Settings trigger, original close/Auto/sun/moon/style SVGs, Colour palette, Font size, percentage spacing, four icon-only style choices, and the original Remember settings on this device switch. At that stage the language section was omitted; it is now present as documented below. The extra reset control and custom success messages were removed; disabling remembering still deletes saved preferences. NullTopic's independent storage namespace and existing default selection are preserved.

Original Company palette/style tokens replace the earlier local muted-colour adjustments. This intentionally supersedes the previous blanket 4.5:1 muted-text contrast claim; some original Company muted colours fall slightly below that ratio. Tests now verify exact token parity across 64 light/dark × palette × style combinations, plus the source labels and SVG paths. Executed successfully: frontend build, ten reported tests including the encompassing test, and backend/frontend typechecks with zero diagnostics. Real-browser pixel/layout verification remains outstanding. No Company or shared source was edited.

## Concrete onboarding prompt follow-up — 2026-11-05

The home-page introduction and `/guide` now share a visible, read-only onboarding prompt and a Copy prompt button. The prompt uses the actual browser origin (including custom ports), links the agent guide, asks for reuse of known details/existing registrations, preserves unknown model metadata, and stops at private handoff of the operator confirmation link. It explicitly forbids self-confirmation, posting, and autonomous activity. Opening the page or copying the prompt performs no registration or API mutation.

Executed successfully: `npm run build` (zero diagnostics) and `npm run test:appearance` (all frontend tests: 17 reported passes). New DOM tests cover click-only clipboard writes, exact copied text, custom origin handling, absent/rejected clipboard access with full manual selection, no-JavaScript fallback, local-runtime warning, and component/label availability on both pages. These tests use clipboard mocks; actual OS clipboard and visual mobile/desktop checks remain unverified without a browser tool.

## Ambient animation follow-up — 2026-11-05

Executed successfully: full `npm run build` (zero typecheck diagnostics) and `npm run test:appearance` (26 reported passes across appearance, onboarding, and background tests).

New pure-renderer and mocked-canvas/DOM tests verify distinct bounded scenes for all four styles, accent propagation, drawing-buffer/pixel-ratio caps, one animation loop with a drawing-rate cap, pause/resume, reduced-motion and forced-colors changes, live style/palette changes, suspension in hidden tabs, pagehide resource cleanup, cached-page restoration with a retained pause choice, unsupported-canvas fallback, and decorative/accessible markup across all seven pages. Canvas calls are mocked: actual glyph rendering, compositing/opacity, visual performance, and GPU/battery impact have not been measured in a real browser. No production-readiness or visual-contrast guarantee is inferred from these tests.

## Human/agent onboarding choices — 2026-11-05

The home card and guide now offer separate native disclosures for humans and agents. Human text offers optional social space beyond assigned work; agent text asks the user for scoped permission first. Both paths explicitly state that conversations are public, not confidential. No private messaging, automatic confirmation, or publication permission was introduced. Each copy action builds the appropriate text from the current browser origin, and choosing a path makes no API request or identity claim.

Executed: full build/typechecks and frontend tests (30 reported passes). Additional DOM/prompt cases cover both native choices, explicit public/private wording, optional participation, permission boundaries, and independent copying of the agent request. Existing clipboard-failure, URL, appearance, and animation tests remain passing. Actual visual/browser/OS-clipboard verification remains outstanding.

## Visible animation layer and Settings switch — 2026-11-05

The user reported that the animation became visible after the canvas was moved from a negative stacking layer to layer 0, with content on layer 1 and the header/settings on layer 5. Opacity was increased and the technical hero no longer masks the background; cards remain opaque. This is user feedback, not an independently executed full browser/contrast/performance verification.

The former footer button is removed. Settings now contains a Company-style **Background animation** checkbox/switch. Turning it off hides the decoration and stops frames; system reduced-motion/forced-colors preferences disable it with an explanatory status. The state remains page-local. Build/typechecks and all 30 reported frontend tests passed, including switch behavior, cached-page state, system preferences, unsupported canvas, and presence inside Settings rather than the footer on every page.

## Stronger nontechnical animation — 2026-11-05

Following user feedback, Warm now uses more/larger particles (radius 2.5–6px) with stronger opacity and faster drift; Minimal uses thicker rounded strokes, more visible marks and faster movement; Soft uses larger, stronger radial colours and faster drifting centres. Technical/Matrix rendering is unchanged. The routine “Background animation is off.” message was removed; system-accessibility and unsupported-browser explanations remain.

Executed: full build/typechecks with zero diagnostics and all 31 reported frontend tests passing. A new mocked-renderer regression checks stronger opacity/mark geometry and movement across successive times; the toggle test verifies the off-state status is empty. Perceived visibility and comfort still require real-browser/user verification; reduced-motion, buffering and frame limits remain unchanged.

## Agent entry without clipboard UI — 2026-11-05

The agent path now exposes direct guide/rules/platform/OpenAPI links and HTTP-oriented instructions, with a plain readable permission-message example. It has no textarea or copy button. Only the human invitation uses clipboard controls. Tests verify the agent content/links remain readable without scripts, initialization makes no clipboard writes, and runtime URL updates still apply. Full build/typechecks and all 32 reported frontend tests passed. Actual browser layout/clipboard checks remain separate.

## Avatar checks

Backend tests cover raster normalization, output dimensions/metadata, PNG/JPEG/WebP, malformed/noncanonical Base64, data URLs/SVG, truncated data, byte/pixel limits, active-agent authorization, paused-agent denial, rate charging, public binary delivery/nosniff, Base64 database persistence, omission from profile JSON, failed-upload preservation and explicit deletion. `npm test` uses only the isolated test database. The existing development test profile was separately assigned an explicitly generated ~25 KB avatar through the actual HTTP API; its public WebP response was checked. Browser visual verification remains outstanding.

## Report overlay

The feed and conversation Report actions share a palette-aware native modal dialog instead of browser prompt/alert. Frontend DOM tests cover accessible labelling, single-dialog behavior, cancel/focus restoration, whitespace validation, 1,000-character field limit, trimmed submission, duplicate/in-flight guards, retained input on errors, and successful cleanup. Native top-layer appearance, Escape/focus trapping and mobile layout still require real-browser QA; JSDOM shims only the showModal/close lifecycle. The existing reports endpoint and session/CSRF request helper are unchanged.

The self-reported-model action is now a labelled chip-icon button with a tooltip and compact native modal. DOM tests cover the per-message metadata snapshot, explicit Unknown fallbacks, unverified-data notice, text-only rendering of hostile values, duplicate-open prevention, close cleanup and focus restoration. Native Escape/focus containment and visual/mobile presentation still need browser verification.

## Reactions

Isolated PostgreSQL tests cover absent/revoked/inactive authorization, self-reaction denial, invalid values, unique concurrent/idempotent votes, switching/removal, own-reaction reads, counts across feed/thread/post endpoints, unchanged event cursor for duplicate no-ops, unavailable targets, rate limits, unchanged activity timestamp and cascade deletion. Frontend DOM tests assert separate visible like/dislike counts, accessible labels and no human voting controls. Native browser presentation remains unverified. Development migration 004 is additive and preserves existing posts.

## Conversation Stream status

The home stream has a more prominent status pill: Connecting (accent), Live (semantic green), Reconnecting (amber), Offline (muted/dashed), Update failed (error). Amber has separate light/dark shades; all other colors use existing theme tokens. Labels and descriptive titles accompany colors, and live-dot motion respects reduced-motion. Browser online/offline events update the indicator; online triggers a refresh, while EventSource handles reconnection. Fetch failures no longer leave a stale Live indicator. DOM tests cover state labels, data-state hooks and explanatory titles; real-browser network transitions, visual contrast/layout and animations still need manual QA.

## Conversation detail layout and return navigation

The detail page suppresses the generic hero, renders the root message in an accent-edged prominent card, groups chronological replies under Comments (with count/empty state), links nested replies to their parent and reserves an inert ad sidebar (below content on mobile). Back to stream carries a page count and root anchor in the URL; feed initialization restores those pages before scrolling to/highlighting the original. Direct anchors can load further pages up to a hard 100-page ceiling; invalid page counts reset to one. No browser storage is used. Back/forward-cache restoration reconnects SSE; pagehide closes streams. DOM tests cover root/comment separation, safe text, nested context links, absent hero, inactive ad, page bounds, return URLs and actual asynchronous page loading/scroll targeting with mocked fetch. Browser desktop/mobile layout and native scroll restoration remain unverified.

Comment-count checks assert that a root with a direct and nested reply reports two comments across post/feed/thread APIs, while the direct reply reports one child. Frontend tests cover visible zero/nonzero counts and accessible tooltips. Counts include unavailable-message placeholders, consistent with the detail page's Comments heading; roots count the entire thread and comments count direct replies. The existing conversation index supports the aggregate. Browser presentation remains unverified.

Comment navigation now carries `post=COMMENT_UUID` within the conversation URL. Detail rendering promotes that comment and filters the list to its descendants. The back icon targets its immediate parent view with `#post-COMMENT_UUID`; only a root message returns to the stream. Tests cover direct/nested parent URLs, subtree filtering, selected-message rendering and actual initial scroll/focus to the nested comment when returning. Browser-native visual scrolling remains unverified.

Follow-up: focused comment detail now shows only direct children, matching its API/button count. The root overview still includes the complete thread. A regression test uses a sibling and multiple reply generations to verify that a one-reply comment displays exactly one reply, and deeper levels require explicit navigation.

## Administration login

The administrator page moved to `/administration`; `/moderation` is a noindex static redirect with a manual link. Header icons, appearance/background checks and smoke paths target the new page. The login view has no generic hero or visible dashboard, uses a palette-aware inline SVG, labelled autocomplete-aware inputs, inline feedback and duplicate-submit protection. DOM tests check the redirect, header active state, operator-only sessions remaining unauthorised for admin UI, admin:true/CSRF on login, successful reveal/password clearing and safe failure feedback. API administrator authorisation remains unchanged; tests do not create an administrator account or print credentials. Browser visual/mobile verification remains outstanding.

VS Code account setup now uses promptString inputs (password:true), an internal-console Node launch and a finite bootstrap supervisor, instead of shell read commands in a debug terminal. The helper strips inherited NODE_OPTIONS/VSCODE_INSPECTOR_OPTIONS from children, propagates exit codes and forwards stop signals. The isolated backend integration suite creates a temporary administrator through the actual helper, verifies Argon2 storage and clean exit, checks output does not contain the test password, then removes only that isolated test account. An invalid-password helper invocation also exited with code 1 without creating an account. Launch JSON was parsed and local installed debugger schema inspected; actual VS Code prompt/paste interaction remains a manual check.

## Operator login card

The operator page now reuses the administration login layout/styles but has its own palette-aware agent-and-connections SVG, operator copy and inline login feedback. The generic hero is omitted before login; account management and registration review remain hidden until an operator session is confirmed. DOM tests cover the distinct illustration, admin-only sessions not unlocking operator management, operator (not administrator) login, password clearing, safe failed-login feedback and registration preview staying separate from explicit approval. Existing account-management/API behavior is preserved. Browser visual/mobile verification remains outstanding.

## Root administration

Isolated backend tests explicitly clear inherited root configuration before using the `_test` database. They test incomplete configuration rejection, root startup creation/idempotence, root login/role, anonymous/ordinary-admin denial, CSRF enforcement, safe account listing, ordinary admin creation and login, duplicate/short-password rejection, refusal to edit root via API, password reset/disabled-account session invalidation, re-enable, audit entries, root credential rotation across restart and disabling root when its environment is removed. Existing CLI/password and moderation regressions are retained. Tests do not use or print real root secrets or create a root in the development database. Frontend tests cover root-only account controls, ordinary-admin isolation, create/reset/disable actions, password clearing and login error feedback. Development migration 005 has been applied without changing existing accounts. Actual browser login remains unverified.

## Agent profile cards

Agent cards now separate avatar/name/handle/status, introduction, interest tags, operating context, approved scope, public operator guidelines and collapsed self-reported model details. All public values are inserted as text; image URLs remain local and failed/missing avatars fall back to initials. Status denotes participation, not verified identity. DOM tests cover the profile hierarchy, related-agent links, metadata fallbacks, hostile text, avatar failure, searching from a selected profile and shared-operator lookup caching. Search/layout still reserves the inert ad sidebar. Browser visual/mobile verification remains outstanding.

Empty agent results now render a palette-aware decorative sad-agent SVG with explanatory copy. Search misses offer Show all agents, which clears the query/selected profile and reloads the list; a genuinely empty platform has distinct copy without a reset loop. DOM tests cover hidden decorative SVG semantics, reset activation, query clearing and successful list recovery. Network failures remain errors rather than empty results. Browser visual/mobile verification remains outstanding.

## Administration workspace tiles

Authenticated administrators now enter an overview with palette-aware SVG tiles for User management and Moderation. User management remains root-only (disabled tile and guarded #users navigation for ordinary admins); sections load data only when opened. Internal views have back buttons, focus management and hash navigation. Account management adds filter/count, per-account identity/status cards, collapsed password forms, create-account panel and secret clearing when leaving/logout. Header navigation and brand links lose href/focus and gain aria-disabled while signed in; only the header logout and appearance controls remain enabled. Logout restores the login and original navigation. Frontend DOM tests cover overview-first/lazy data access, tile/back navigation, filtering, guarded deep links, disabled-link clicks, password clearing and logout recovery. Backend authorization/CSRF APIs are unchanged; no real account changes were made by these frontend tests. Browser visual/mobile verification remains outstanding.

The administration logout button now uses stronger accent styling and displays the authenticated session's `adminHandle`. `/api/session` supplies only the current validated administrator's handle (not credentials); the client uses textContent, includes the handle in the accessible tooltip and clears it on logout. DOM tests assert display/cleanup and backend integration verifies the root session's own handle. Browser visual verification remains outstanding.

## Human-readable moderation inbox

Reports and operator requests are now grouped cards with dates, status, reasons, author/message preview, contextual links and collapsed reference IDs. Empty queues show a themed All clear illustration. The protected API supplies only safe author/target context; ordinary public clients still cannot read the administration inbox. Tests cover enriched backend context/authorization/hidden-state data, card formatting, hostile content remaining plain text, unavailable messages, empty queues and Review selecting the correct post/agent while leaving the decision reason blank. Review never calls an action endpoint until explicit submission; leaving moderation clears selection. Browser visual verification remains outstanding.

### Moderation action picker and no-action decisions

Frontend DOM coverage checks all four custom options, native form values, two editable presets per action, focus/keyboard navigation, Escape/outside dismissal and reset. Backend isolated integration coverage checks dismiss authorization, required report/reason, mismatch rollback, selected-only report resolution, unchanged message/agent/activity and exactly one audit on duplicate attempts. These checks do not constitute real-browser visual/layout verification.


### Operator/admin session deadlines

Pure policy tests cover the exact eight-hour boundary, 30-minute rolling deadlines, both roles and missing/invalid/future authentication timestamps. Isolated PostgreSQL integration checks login age persistence, activity refresh, eight-hour capping, idle expiry, rejection despite a future DB deadline after absolute expiry, legacy-session invalidation, and non-persistent HttpOnly cookies. Tests age only isolated test sessions, never development/user sessions. Browser close/restoration behavior has not been visually tested.

### Operator workspace

DOM coverage verifies overview tiles and hash/back navigation, toolbar disabling/logout handle, agent settings and avatar display, readable moderation decisions, plain-text rendering, explicit editable appeal submission, empty states, one-time key removal on navigation/logout, and clearing private data when session expiry is detected. Registration confirmation remains explicit and never auto-submits. PostgreSQL integration verifies enriched own-message notices, no credential/avatar payload exposure, and isolation from other operators' decisions. Real-browser visual/mobile checks remain outstanding.

Operator review-selection coverage includes the initial hidden form/instruction, clicking message text, Enter/Space support, non-intercepted reference controls, selected-card highlighting, read-only context, an initially blank reason field and accessible icon action labels/tooltips. Explicit submissions retain decision references without inserting them into the editable reason.

### Review decision lifecycle

Backend integration covers anonymous/operator denial, CSRF, required outcome/nonblank response, missing request, concurrent decisions (one success/one 409), immutable completed decisions, recorded administrator/time, owner-only response visibility and unchanged agent status. Frontend tests cover explicit admin selection/reply submission with CSRF, completed-request rendering without another decision button, and safely rendered operator-visible replies. Migration 006 was applied locally without resetting data or deciding existing requests. Real-browser visual verification remains outstanding.


### Contextual workspace dialogs

Frontend tests cover full-width moderation containers, contextual form exclusivity, opening from a report/review/message, native dialog labels, close/Escape/backdrop handling, focus restoration, clearing cancelled drafts, pending-submit dismissal guards, in-modal error feedback and stale close-event handling. JSDOM uses a small open/close mock; native top-layer inertness, focus trapping, mobile scrolling and visual appearance still require real-browser QA. No real reports or reviews were submitted during these UI tests.

Review-picker DOM tests cover the empty required choice, validation focus, styled-option selection/form values, two editable responses for all three outcomes, preserved drafts, no automatic submission, keyboard/outside/Escape dismissal and reset. The admin decision workflow is also exercised using the custom selection and response preset before explicitly submitting. Existing moderation-action picker tests continue to cover the shared implementation. Visual browser QA remains outstanding.

### Accepted review corrections

Isolated backend integration checks operator ownership of structured decision references, explicit restore/unblock outcomes, concurrent duplicate decisions, restored feed presence, exactly one correction audit/event, retention neutrality, newer-decision rejection, deleted-body/ancestor protection, wrong/unlinked target rollback, unblock respecting independent operator pauses, owner-visible applied corrections and cleanup FK nulling. Frontend tests check contextual corrective options, editable response templates, explicit `accepted_restore` submission, structured operator references and correction labels. Migration 007 is applied locally without deciding any real review; actual corrective actions run only in the isolated tests. Visual/browser verification remains outstanding.

### Agent reporting process chain

Backend isolated integration exercises public agent reporting, exclusive target/nonblank input validation, unavailable targets, unchanged status on report/dismiss, admin-only decisions, invalid hide/unblock/mismatched-target denial, atomic resolution/block and duplicates. It then follows the actual operator-owned block notice into an appeal, an admin rejection/reply, a further appeal with additional context, explicit accepted-unblock, operator-visible response/correction, and the resulting participation status. Cross-operator isolation and report attempt budgets are also checked. Frontend tests cover the profile flag/agent-context overlay/explicit request, safe identity rendering, an agent-only admin preview, contextual block/no-action choices and agent-specific preset reasons. Tests never report/block real development profiles. Migration 008 was applied locally without creating real reports or deciding any existing case. Real-browser visual verification remains outstanding.

### Agent/operator appeal participation

Backend isolated integration covers blocked-agent own notice/appeal access, hidden-message appeals, pending/invalid/revoked-key denial, same-owner cross-agent and cross-operator isolation, duplicate pending submissions, server-assigned provenance, operator CSRF, bidirectional attributed additions, revision-conflict rejection, readable admin responses, immutable follow-ups from both roles, accepted restore/unblock respecting independent operator pauses, continued publishing/profile/reaction denial, reply/cleanup concurrency, historical subject access after retention, write budgets/Retry-After and the 50-addition cap. Existing active-only and key lifecycle suites also continue to pass. No real development profile is used or real appeal submitted.

Frontend DOM tests cover agent-origin case visibility, operator Add context and completed-case Reply overlays, explicit submission, role/follow-up rendering with untrusted text, and expectedRevision submission by administrators. Native modal focus trapping, browser layout and visual appearance still require real-browser verification.

### Admin request-status tabs

DOM coverage verifies the default pending queue, both counts, tab/panel ARIA state and Arrow/Home/End navigation, empty Processed copy, count updates after a verdict and read-only processed cases. PostgreSQL integration inserts more than 100 processed reports and reviews, then verifies older pending cases are still returned, totals include records beyond display limits, filters are exclusive, invalid status is rejected and access remains admin-only. No real moderation state is changed by these tests. Real-browser visual QA is outstanding.

### Independent acceptance and operator queues

Backend integration verifies anonymous/pending/revoked denial, same-owner cross-agent and cross-operator isolation, operator CSRF, independent role flags, concurrent idempotent acceptance, pending-review rejection, unchanged block/verdict/event state, blocked publication after acknowledgement, retained appeal rights, personal queue filtering before the 50-notice cap, total counts and separate acknowledgement budgets. No production/local fixture decision is accepted.

Frontend coverage checks personal tabs/counts/keyboard state, explicit acceptance buttons, moving accepted decisions out of Action required, showing agent acceptance without implicitly accepting for the operator, keeping processed-case appeal controls, and withholding acceptance for pending reviews. Browser visual/focus/layout verification remains outstanding; DOM tests use mocked dialog behavior.

Operator case history checks cover explicit report references, owner-scoped case context, linked chronological review rounds, collapsed/expanded case state, safe untrusted text, duplicate-complaint suppression and the remaining context action. The review integration lifecycle rejects a second initial appeal and parallel/obsolete follow-ups, while retaining immutable administrator responses and cleanup-compatible history. These DOM checks are not a real-browser visual/layout test.

Admin case-history checks verify that a pending follow-up includes its resolved source report, original moderation decision and previous rejected review, despite pending-tab filters. DOM checks cover a single collapsed case, preserved expansion, chronological parent-before-follow-up history, orphaned chains, unrelated-report separation, text escaping and only-current icon actions.

Hashtag tests cover Unicode NFC/case normalisation, token boundaries/oversized input, safe native links without nested anchors, unavailable-message suppression, comments/detail rendering, filtered back-navigation, pagination/live-refresh filter preservation, SQL filtering before pagination and exclusion of hidden comments/ancestors. Fixtures are created only in the isolated test database. These DOM tests do not constitute visual browser QA.


Independent pause regression checks cover operator-owned pause/resume provenance, legacy/unverified pause denial, blocked-state pause/activation denial, administrative unblock preserving an operator pause, accepted-unblock restoring participation without an operator pause, successful authenticated publication after correction, and a concurrent admin-block/operator-activate race. Real development moderation decisions are not changed by tests or migration.

Route-separation DOM checks verify the explanatory home/main-column onboarding without a feed, the dedicated `/conversations` live stream, ad-only sidebars, inactive advertising, canonical header/detail-back/hashtag destinations, appearance controls on the new page and compatibility redirects preserving old stream anchors without forwarding unrelated query parameters. Existing live refresh, pagination, nested-parent back-navigation and hashtag-filter tests continue on the new canonical route. Real-browser visual verification remains outstanding.

Landing-card checks verify that the redundant room/listener sections are removed, the explanation and onboarding remain, both native decorative SVGs use palette tokens without hard-coded colours or external resources, audience choices start collapsed, public-participation notices remain, and CSS defines stacked cards below the 1280px two-column breakpoint. Layout assertions are source/DOM checks, not visual browser verification.


Consolidated-onboarding DOM checks verify one homepage invitation, closed audience/information disclosures, retained avatar (static PNG/JPEG/WebP, 1 MB), operator-confirmation and external-runtime guidance, direct technical-guide/API links, no obsolete CTA and a no-script `/guide` compatibility redirect/fallback to the homepage onboarding anchor. The guide redirect is not expected to render appearance/animation settings or a duplicate onboarding form. No real registration, publication or management change is performed by this UI check; real-browser visual QA remains outstanding.

Public profile-dialog DOM checks cover accessible avatar buttons, avatar/author opening without navigation, a single modal, shared safe profile/operator rendering, unchanged URL/hash/filter, related-profile switching, X/Escape close and focus restoration after live card replacement, missing profiles and late responses after dismissal. These use mocked public GETs and dialog behavior, not real-browser focus-trap or visual/layout validation. Existing avatar, report, profile, conversation and appearance suites remain unchanged in behavior.

The profile overlay renders the shared profile in an unboxed `div.agent-profile-content` presentation, not an article/card inside the modal. DOM regressions verify no nested profile tile, one visible identity heading, accessible visually-hidden dialog labelling and the existing close/focus/async behavior. Standalone agent cards retain their original presentation. Visual browser QA remains outstanding.

The public profile overlay now uses an internally scrollable body and a separate, non-shrinking footer containing its single icon-only Close button. DOM checks assert footer placement and no duplicated close control in the profile body; existing close/Escape/focus/async tests remain applicable. Real-browser layout verification remains outstanding.

Profile horizontal-overflow regression coverage includes long unbroken names, introductions, operator guidelines and model metadata. Scoped CSS permits flex/grid children to shrink and wrap, anchors the report tooltip inward with a bounded width and prevents horizontal overflow in the modal body while preserving vertical scrolling. DOM/source checks do not measure real-browser scroll widths. A separate headless Chromium check was executed against the running public stream/profile overlay at 320×640, 390×844, 1280×900 and 1920×1080, both with the real profile and temporary DOM-only 300-character names / 500-character introductions. All eight checks had scrollWidth equal to clientWidth for the body and dialog, with the footer inside the viewport. No profile/database content was changed. This verifies overflow/layout measurements, not a comprehensive pixel-level visual review.

Fixed-profile-header checks assert avatar/identity outside the scroll body and description inside it. A headless Chromium check against the running stream expanded technical details, scrolled the profile body at 320×640, 390×844, 1280×900 and 1920×1080, and repeated with temporary DOM-only long names/descriptions. All eight measurements kept header/footer positions unchanged, footer visible and no horizontal overflow. Profiles fit without scrolling where height allows; no database/public profile content was changed.

Operator message-management checks use the isolated test database for owner/admin/agent-key isolation, hidden text visibility only to its owner, literal `%_` search, state/kind filtering before microsecond-precise pagination, CSRF/Origin denial, paused/blocked management, duplicate deletion idempotence, exactly one body-free audit/event, retained foreign/own replies, public body removal, unchanged agent status/retention and deletion/cleanup concurrency. Attempt budgets count rejected foreign targets and return Retry-After. DOM tests cover the new overview/agent tiles, search/filters/pagination, safe text, explicit/cancellable icon-only deletion, error handling, no publishing/native-confirm calls and private-content clearing/late-response protection. No real development post is deleted by these checks.

Executed headless Chromium UI checks used intercepted synthetic operator session, agent and message API responses (no real login, publication or deletion): overview tile → agent tile → message list → confirmation → one mocked DELETE → refreshed tombstone. At 1280×900, 390×844 and 320×640 the confirmation fit the viewport, actions followed the preview without overlap and no horizontal scroll existed. A desktop screenshot was visually inspected. The Cancel icon receives initial native focus, and confirmation tooltips are constrained inward. This complements the real PostgreSQL integration tests rather than replacing their authorization/transaction checks.

Human-language coverage (`frontend/test/i18n.test.ts`) checks browser regional preferences and fallback, consent-gated saved precedence, explicit page choices, blocked storage/invalid values, all four languages on seven main pages, unchanged prompts/URLs, a one-use static translation boundary, context-preserving picker links and opt-out removal. Dynamic checks cover original agent names/bodies/profile/metadata, localized labels/date tooltips/live statuses, report template localization before supplied context, unchanged enum values and empty response drafts, complete nonempty catalogs with preserved placeholders, and Company label parity in all languages. Existing English behavior and appearance checks still run.

Executed headless Chromium language QA against the running frontend used intercepted synthetic GET responses only (no real login, posting, report, moderation action or deletion). All seven main pages passed in all four languages at 320×844, 390×844 and 1280×844 (84 page checks), retaining original synthetic message/profile text. The Settings panel passed 192 layout checks across four languages, three widths, four styles, light/dark and 100%/130% text, with no horizontal page/panel overflow. Hovering stream-action tooltips also remained within the page. Browser `de-AT` selected German, saved French overrode it, actual picker/remember clicks persisted French across navigation, and opt-out restored browser German. Desktop German and mobile French screenshots were visually inspected. Longer labels exposed and led to fixes for hidden-tooltip overflow and the floating header's mobile fixed-panel containing block. No real development records or credentials were changed.

Operator settings draft regressions cover owned-agent/shared-guidelines tile navigation, explicit participation save with one raw action, read-only scope, administrative block/unverified-pause UI restrictions, Cancel without writes, Save/Discard/Keep editing and Escape, failure-preserved drafts, saving before deferred workspace navigation, guarded language/logout links, native beforeunload without autosave, real JSDOM Back cancellation/discard with consistent URL/view, separately confirmed/cancelled key operations, duplicate-save suppression and session-expiry private-data clearing. Prior activation/one-time-key/workspace-icon tests follow the new tile/detail UI. Static catalog coverage includes all new four-language settings/overlay labels.

Executed headless Chromium checks used synthetic intercepted session/operator GETs and intercepted POST/PATCH acknowledgements only, never real credentials or API mutations. Twelve complete settings flows passed across English/German/Spanish/French at 320×844, 390×844 and 1280×844, including 100% and 130% text: tiles → agent, draft without a write, Keep editing, Discard/Cancel, one explicit pause save, shared-guidelines save before navigation, actual browser Back cancellation/discard, and cancelling key confirmation without rotation. Dialogs/editor had no horizontal overflow and dialogs remained inside the viewport. An actual trusted mouse click followed by reload produced Chromium's native beforeunload warning; dismissing it preserved the draft. An actual language-picker replay was blocked until the custom overlay allowed it; Keep editing kept English and Discard continued to Spanish without a settings write. Desktop German and settled mobile French screenshots were visually inspected. DOM tests additionally cover permission-denied saves, acknowledged-write/failed-refresh non-repetition and CRLF baseline normalization without phantom dirty state.

Stream-search tests cover native accessible subheader controls, safe/allowlisted new-search URLs, pagination reset, preserved hashtag/language, original/nested-comment/back-link search context, literal unsafe-looking input, filtered pagination/SSE refresh requests, independent clears, oversized query rejection and empty results. Isolated PostgreSQL coverage verifies root/comment/name/@handle matches, NFC/case normalization, literal wildcard/SQL-looking queries, combination with hashtag before pagination (including both filters plus cursor), precise microsecond pagination, hidden/deleted roots and hidden ancestors, removal of a newly hidden match, no internal timestamp leakage and unchanged events/retention. No real development message is published, hidden or deleted by these tests.

Executed headless Chromium search checks used intercepted synthetic GET responses and a browser-local EventSource test double (no real login/publication/moderation or ad calls). The actual form submission reset pages while preserving tag; simulated live refresh retained both filters; opening the root and nested comment and using both Back links restored the search and root anchor. Independent clear and no-results flows passed. The subheader passed 192 geometry checks across all four languages, 320/390/1280px widths, all four styles, light/dark and 100%/130% text without horizontal page/subheader overflow. Desktop German and mobile French screenshots were visually inspected. Real backend filtering/visibility/cursor behavior is verified separately against isolated PostgreSQL, not inferred from browser mocks.

## 2026-11-08 — Operator declarations and scope-bound agent authorization

Executed for this feature:

- Full build/typechecks: successful, no Astro errors/warnings/hints.
- Frontend: 168 tests passing, including unchecked/separate age and organization declarations, native-form payloads, clearing passwords, accessible registration errors, explicit rules/publication consent and rejecting an outdated declaration UI.
- Backend: 36 tests passing on isolated `nulltopic_test`. Publishing fixtures now create their operator accounts and authorizations through the ordinary API. Added strict false/missing/string/forged-field/version checks, personal/organization evidence, intended-owner binding, no GET approval, expired/consumed/stale links, immutable snapshots, ordinary-profile edits, public-response privacy, scope CAS/duplicate approval, approval/publication and pause/publication races, independent block/pause/key revocation, and operator suspension/obsolete authority declarations. No general test approval bypass exists.
- Real Chromium, four human languages, 320/390/1280px, all four styles and 100/130% text: 24 registration flows, 12 authorization flows, 288 layout cases. Native mouse/form validation prevents missing consent requests; stale approval clears both checkboxes and focuses its alert. Browser mutations used fully synthetic API responses, not real operator actions. Desktop authorization and mobile organization-registration screenshots were visually inspected.
- The user explicitly authorized rebuilding the existing development database. Verified loopback port/database names before rebuilding only this app's `nulltopic` schema; the isolated test schema was initialized separately. Other projects/databases were not reset. Old development sessions/accounts/messages/keys are invalidated.
- Environment-defined root synchronization and real root login/logout verified without printing credentials. A replacement ignored 0600 local test fixture ran real HTTP operator registration, intended-agent registration, preview and explicit versioned approval through `npm run test-agent`. It represents a synthetic adult operator, not a verified age claim about a real person. No development messages were published.
- Dependency audit: zero vulnerabilities.

Scope and remaining work: self-declaration is not identity/age verification or a legal-compliance certification. Final terms/privacy texts, their future separate versioned acceptance, deletion and exports are not implemented. Scope editing currently uses the protected CAS API; Settings displays the scope read-only and supplies the review-authorization action. Operator suspension has a private server-side flag but no new administration UI. The mutating `test:smoke` script was intentionally not run for this feature; it would publish development messages.

## Operator-first onboarding entry (2026-11-08)

- Full build/typechecks passed with no Astro errors, warnings or hints; 172 frontend tests passed.
- Homepage has a four-step operator-first explanation and a direct account-creation shortcut, with no copyable invitation. Signed-in operators get an Add agent tile, a dedicated invitation view and guarded back navigation. Existing invitation clipboard, manual-copy fallback and authorization boundaries remain covered.
- Headless Chromium checked English, German, Spanish and French at 360px and 1280px: homepage has no prompt or horizontal overflow; its shortcut opens the registration modal when signed out; a synthetic signed-in session can open Add agent, explicitly copy the invitation and return to the overview without creating or publishing anything. The mobile German invitation was visually inspected. All browser APIs used synthetic responses; no real account or agent was created.

## Palette-aware fields and browser autofill (2026-11-08)

- Frontend build and 173 frontend tests passed. Field text, placeholders and autofill use the active palette tokens; forced-colors mode leaves system field colors in control.
- Headless Chromium forced the native `:autofill` pseudo-class and checked ordinary field backgrounds/text and autofill inset/text/caret colors across all 64 theme/palette/style combinations. Dark-blue login screenshot visually inspected. No saved credentials or real login were used.

## Stacked landing sections (2026-11-08)

- Frontend build and 173 frontend tests passed. Homepage sections remain in one vertical sequence; at 1000px and above each card has illustration/content columns. The homepage's More information disclosure is removed; operator onboarding keeps its technical guidance.
- Headless Chromium checked 80 layout cases: 320/390/768/1280/1600px, all four languages and all four styles. Verified section order, internal desktop columns, four titled steps, absence of the removed disclosure and no horizontal page overflow. German desktop/mobile screenshots visually inspected. No accounts, agent actions or advertising calls were made.

## Stable field surface during typing (2026-11-08)

- Extended the themed inset surface to text-like inputs and textareas regardless of autofill state, without affecting checkbox/radio/range controls or the focus outline. Placeholder colors remain separate; forced-colors mode uses Field/FieldText and no inset fill.
- Headless Chromium exercised native mouse focus and typing into both operator and administrator handle/password fields across 64 theme/palette/style combinations (256 field cases). An explicitly injected yellow background still left the palette-colored inset surface and matching text in place. This simulates a browser/password-manager highlight; no real password-manager extension or saved credentials were used.

## Desktop portrait landing artwork (2026-11-08)

- Frontend build and 174 frontend tests passed. The original landscape illustrations remain below 1000px; desktop cards display dedicated, undistorted 240×480 SVG compositions, vertically centered beside the content. Both variants use existing palette tokens and remain decorative/accessibility-hidden.
- Chromium checked 80 layout cases (390/999/1000/1280/1600px, four languages, four styles), including breakpoint visibility, a 2:1 portrait height/width ratio, at least 260px desktop artwork height and no page overflow. Desktop German screenshot visually inspected.

## Operator registration password confirmation (2026-11-08)

- Full build/typechecks and 175 frontend tests passed. Registration now includes a required repeat-password field and localized visible rules (12–256 characters; no composition requirement). Mismatches block submission locally; the confirmation is never sent to the API. Both password fields and custom validity are cleared on completion/cancel; server length validation and hashing are unchanged.
- Chromium checked eight scenarios (390/1280px × four languages) with native text input: maximum-length truncation at 256, rejection of 11-character input, mismatch blocking before any registration request, correction and a single successful mocked submission with cleared fields and no page overflow. Only synthetic API requests were permitted; no real operator was registered or age declaration made.

## Private operator email and recovery — phase 1 (2026-11-08)

- Migration 014 applied to this app's development database without deleting accounts, messages, approvals or root configuration. Existing email-less pre-release fixtures are not invented/verified automatically. The local `.env` is prepared for a separate NullTopic mailbox and currently uses local file delivery only; no MessageDrop values were copied.
- Full build/typechecks: no errors, warnings or hints. Frontend: 179 tests passed. Backend: 38 tests passed on isolated `nulltopic_test`. Audit: zero vulnerabilities. Development backend readiness and access page both return HTTP 200.
- Backend scenarios cover email validation/canonicalization, declaration/metadata tampering, unverified sign-in and agent-registration denial, private/public field separation, hashed tokens, purpose separation, expiry/resend, concurrent single-use verification/reset, password hashing, invalidating existing and late-restored sessions, consumed-token persistence after restart, neutral unknown/duplicate address responses, persistent address throttling, IP/token attempt limits and disabled-mail fail-closed behavior. Existing moderation/retention/authorization suites remain green. SMTP/local transport configuration and 0600 file delivery tested in an isolated temporary directory, with no real SMTP connection.
- Chromium checked registration in eight cases (390/1280px × en/de/es/fr) and 24 recovery/verification/reset flows. Verified required email before submission, removal of token fragments, no automatic token consumption, neutral recovery feedback, matching passwords, explicit single submissions, localized sign-in links and no horizontal page overflow. Pasting a mail fragment into an already-open recovery page is covered by real same-document navigation/reload. Mobile German reset screenshot visually inspected.
- All browser mutations and mailbox messages were fully synthetic. No real person was registered/verified, no external email was sent and no agent published. The real provider's SMTP credentials, inbox delivery, SPF/DKIM/DMARC and production HTTPS remain to be configured/tested when the dedicated mailbox exists. Email second factor, address changing/backfill, root/admin recovery and durable mail queues are not part of this phase.

## Operator-bound invitation prompt (2026-11-08)

- Full build/typechecks and 182 frontend tests passed. The invitation includes the signed-in operator's validated handle as `operatorHandle`, without asking for it again. The standalone fallback still asks for a missing handle. Initialization order is covered; logout/session clearing removes the previous account's handle and copy feedback.
- Chromium checked synthetic signed-in sessions at 390/1280px: the actual clipboard text contains the handle, excludes private email/guidelines, and resets after mocked logout. No real session, account data, agent registration or publishing was used.

## Labelled copy-prompt action (2026-11-08)

- Frontend build and 183 frontend tests passed. The prompt textarea is hidden by default; the primary full-width 60px action shows its localized Copy prompt label and icon. Denied/unavailable clipboard access reveals and selects the readonly textarea for manual copying; a later successful copy hides it again.
- Chromium checked 390/1280px with a synthetic operator/clipboard: German visible label, hidden initial text, current handle in copied content, primary-action height, no overflow and visible/focused manual fallback. No real account or clipboard data was accessed.

## Agent invitation and guidance tiles (2026-11-08)

- Full build/typechecks and 183 frontend tests passed. Add agent now has one primary instruction/copy tile plus four visible guidance tiles: operator approval, public-data safety, HTTP/runtime requirements and optional avatar. No nested outer card or More information disclosure. Current-handle personalization, hidden prompt, clipboard fallback and public/authorization boundaries remain intact.
- Chromium checked 48 layout cases (320/390/1280px × en/de/es/fr × four styles): five cards, one/two-column guidance layout, hidden initial text and no horizontal overflow. Explicit copy used the synthetic operator handle. German desktop/mobile screenshots visually inspected. No real account, registration, mail or agent activity was used.

## Themed copy-success toast (2026-11-08)

- Full build/typechecks and 185 frontend tests passed. Successful prompt copying now uses a polite live-region success toast with checkmark, palette-aware surface, semantic green marker, localized icon-only close control and no focus stealing. It expires after eight seconds, pauses during pointer/keyboard interaction, replaces duplicate feedback and clears on page departure/logout. Clipboard failures still reveal the manual-copy field with inline guidance instead of a success toast.
- Unit checks cover plain-text injection safety, replacement, close/focus restoration, expiry/interaction pause and page cleanup. Chromium checked all 64 theme/palette/style combinations at 320/1280px (128 cases), bounds/no overflow, translated German feedback, manual closing and denied-clipboard fallback. Mobile dark-blue screenshot visually inspected. Synthetic operator and clipboard only; no real account actions.

## Palette-only toast accents and three-second expiry (2026-11-08)

- Frontend build and 186 frontend tests passed. Toast border and plain SVG success marker now use the active palette accent, with no fixed green or button-like icon background. Only the X is interactive. Default expiry is three seconds; hover/focus pause remains for accessibility.
- Chromium checked violet light/dark in all four styles at 320/1280px (16 cases): matching border/icon accent, transparent icon background, one button, viewport bounds and actual three-second dismissal. Mobile dark-violet screenshot visually inspected. Synthetic session/clipboard only.


## Passive operator agent lists (2026-11-08)

- Full build/typechecks, 194 frontend tests and 38 isolated backend tests passed. Backend checks cover owner-bound pending snapshots, secret exclusion, rejected queries/guests, unchanged session expiry for passive success/failure, and normal renewal on ordinary requests.
- Frontend checks cover pending tiles and explicit review preparation without approval, preserved participation/guideline drafts and key output, foreign/expired session clearing without a renewing session request, single-flight/stale-generation guards, hidden/departed pages, rate-limit backoff and pageshow before asynchronous sign-in.
- Chromium checked actual automatic ten-second polling at 390/1280px with synthetic operator/agent responses. Pending registrations appeared without navigation or a mutation, with localized Waiting for approval labels and no horizontal overflow. Explicit tile clicks opened the authorization preview with both consent boxes unchecked; no confirmation POST occurred. Mobile screenshot visually inspected. No real registration, operator login, approval or publishing was performed.

## Settings picker layout and guidelines example (2026-11-08)

- Public operator guidelines now precede the agent grid, which is two columns from 720px and one column below that breakpoint. With no linked agents the grid is hidden. The guidelines editor includes a localized icon-only example action. It appends an editable template without replacing existing text or saving automatically; duplicate insertion, saving and insufficient remaining capacity disable the action. Normal Save/Cancel and unsaved-departure guards still apply.
- Chromium checked 390/1280px in en/de/es/fr using synthetic operator/agent responses: ordering, column count, no horizontal overflow, editable example and enabled explicit Save without any mutation. The empty-agent picker was also checked. Desktop screenshot visually inspected. No real account state was changed.
- Full build/typechecks and all 197 frontend tests passed, including ordering, empty-grid visibility, example insertion without writes, capacity/duplicate guards, cancellation and explicit saving of an adapted example.

## Quieter registration and wider operator sign-in (2026-11-08)

- Moved the labelled Create operator account action into the illustration column, outside the login form, with a neutral themed secondary surface and no primary shadow. Removed aria-hidden from its ancestor; only the decorative SVG is hidden from assistive technology. Operator sign-in now fills the form width (95% centered on small screens). Administrator sign-in is unchanged.
- Chromium checked 390/1280px in all four languages with synthetic guest session responses: secondary/primary contrast, login width, placement, no horizontal overflow, registration dialog opening and cancellation. German mobile/desktop screenshots visually inspected. No account creation or other writes occurred.
