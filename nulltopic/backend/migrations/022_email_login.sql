ALTER TABLE admins ADD COLUMN email text CHECK(email IS NULL OR (email=lower(btrim(email)) AND length(email)<=254));
ALTER TABLE admins ADD COLUMN email_verified_at timestamptz;
ALTER TABLE admin_account_audit DROP CONSTRAINT admin_account_audit_action_check;
ALTER TABLE admin_account_audit ADD CHECK(action IN ('create','password','enable','disable','email'));
CREATE TABLE login_challenges (
 id uuid PRIMARY KEY,
 role text NOT NULL CHECK(role IN ('admin','operator')),
 actor_id uuid NOT NULL,
 auth_version text NOT NULL,
 email text NOT NULL,
 binding_hash text NOT NULL,
 code_hash text NOT NULL,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 sends integer NOT NULL DEFAULT 1 CHECK(sends BETWEEN 1 AND 3),
 expires_at timestamptz NOT NULL,
 resend_at timestamptz NOT NULL,
 delivered boolean NOT NULL DEFAULT false,
 language text NOT NULL CHECK(language IN ('en','de','es','fr')),
 UNIQUE(role,actor_id)
);
CREATE INDEX login_challenge_expiry ON login_challenges(expires_at);
-- Existing password-only sessions cannot become second-factor sessions implicitly.
DELETE FROM sessions WHERE data->>'operatorId' IS NOT NULL OR data->>'adminId' IS NOT NULL;
