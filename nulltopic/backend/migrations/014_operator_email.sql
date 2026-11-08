-- Never infer email ownership for pre-release accounts. No existing data is deleted.
ALTER TABLE operators ADD COLUMN email text;
ALTER TABLE operators ADD COLUMN email_verified_at timestamptz;
ALTER TABLE operators ADD COLUMN auth_version uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE operators ADD CONSTRAINT operators_email_canonical CHECK(email IS NULL OR (email=lower(btrim(email)) AND length(email)<=254));
CREATE UNIQUE INDEX operators_email_unique ON operators(email) WHERE email IS NOT NULL;
CREATE TABLE operator_email_tokens(
  token_hash text PRIMARY KEY,
  operator_id uuid NOT NULL REFERENCES operators ON DELETE CASCADE,
  purpose text NOT NULL CHECK(purpose IN ('verify','reset')),
  auth_version uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  UNIQUE(operator_id,purpose)
);
CREATE INDEX operator_email_tokens_expiry ON operator_email_tokens(expires_at);
