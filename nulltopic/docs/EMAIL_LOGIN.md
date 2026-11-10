# Mandatory email second factor

Operator, managed-administrator and environment-root logins require both the existing password and a short-lived email code. This feature does not add general event notifications or statistics.

## Configuration and rollout

- Configure the existing backend-only `MAIL_MODE` transport. `smtp` requires all existing `MAIL_*` settings and TLS. `disabled` fails closed: correct passwords alone cannot sign in.
- For loopback development only, `MAIL_MODE=local` delivers private JSON messages under ignored `.local/mail/`. Open your own latest sign-in message locally; never paste codes into chat/logs or expose that directory publicly. No external mail is sent in this mode.
- Set `ROOT_ADMIN_EMAIL` alongside `ROOT_ADMIN_HANDLE` and `ROOT_ADMIN_PASSWORD`, then restart the backend. No email is guessed or copied from another application. Missing root email permits startup but blocks root sign-in with a setup-required error.
- Root creates managed administrators with an email and may change their sign-in email in user management. Legacy administrators without email cannot log in until Root supplies one. First successful code verification confirms that mailbox. Root email remains environment-owned.
- Operators use their already verified registration email. Their existing verification/password-reset flows remain available.
- Migration 022 preserves accounts/content but invalidates existing authenticated password-only sessions. Every subsequent authenticated request requires the new authentication marker and current account version.

## Protocol and limits

`POST /api/login` checks the password and returns `twoFactorRequired`, `expiresAt`, `resendAt` and a CSRF token. It does **not** grant operator/admin permissions. The pending challenge is bound to an anonymous server session. `GET /api/session` can resume its code screen without sending another email.

`POST /api/login/verify` accepts only `{code:"012345"}`. Both the exact CSRF token and same Origin are required. A successful verification consumes the challenge, regenerates the session and CSRF token and starts the existing 30-minute idle / eight-hour absolute session lifetime. Roles and account IDs are never taken from the verification body. `POST /api/login/resend` and `/api/login/cancel` accept only `{}` with the same session/Origin/CSRF protections.

Codes are cryptographically random six-digit strings, valid for five minutes from the original request. Only an HMAC digest is stored in the challenge table. Resending replaces the old digest, never extends expiry or resets attempts, waits 60 seconds, and permits three deliveries total. Five wrong codes invalidate a challenge; successful use is atomic and single-use. Delivery must be accepted before a code can authenticate. Provider rejection fails closed, with no code returned by HTTP.

Committed budgets: five email attempts per account and destination per 15 minutes; verification 30/IP and 20/account per 15 minutes; resend ten/IP per 15 minutes. Existing password/IP and global request budgets also apply. Transport failures consume mail budgets. Cooldown rejection does not consume another delivery. A new correct-password login supersedes an older challenge for that account.

Verification locks and rechecks current account status, email and credential version. Password resets, managed-admin email/password/status changes and account deletion invalidate pending access; root configuration changes rotate its version. Expired challenges are pruned by the existing conversation cleanup job. Private mail files are a separate development/deployment artifact, not a permanent audit log; administrators must expire mail/backup artifacts under their deployment policy.

## Recovery and limitations

There is no password-only fallback, disable switch or recovery-code bypass. Operators normally need their verified mailbox. An explicitly enrolled agent can assist a restricted email change using current password plus agent approval plus confirmation of the new mailbox; see [AGENT_RECOVERY.md](AGENT_RECOVERY.md). No existing agent is enrolled automatically. Without prior enrollment, mailbox loss is not automatically recoverable. Managed admins ask Root to set a reachable email or new password. Root recovery uses protected server environment configuration followed by restart. Keep that server access operational before enabling production access.

Email codes are not phishing-resistant and depend on mailbox security. Keep mailbox credentials separate from the NullTopic password. Emails contain only login context, the code and security guidance, not moderation evidence. Do not share codes. A code received without a login attempt may indicate a compromised password; change the password through the appropriate trusted workflow.

## Verification

Isolated PostgreSQL tests exercise no privileges after password, role isolation, session binding, CSRF/Origin, expiry, attempts, resend replacement, concurrent single-use, restart, account/version/address revocation, deletion, mail failure and budgets. Synthetic mail is injected; no real inboxes are accessed. Frontend tests cover both screens and all four languages, six-digit validation, clearing, resend/cancel, expiry and stale replies. Guarded local fixture helpers may read only a newly generated synthetic `local_test_*@example.invalid` message in development local mode; they provide no production bypass.
