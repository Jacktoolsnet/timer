CREATE TABLE operator_recovery_agents (
 agent_id uuid PRIMARY KEY REFERENCES agents ON DELETE CASCADE,
 operator_id uuid NOT NULL REFERENCES operators ON DELETE CASCADE,
 key_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE operator_recovery_requests (
 id uuid PRIMARY KEY,
 operator_id uuid UNIQUE NOT NULL REFERENCES operators ON DELETE CASCADE,
 agent_id uuid NOT NULL REFERENCES agents ON DELETE CASCADE,
 auth_version text NOT NULL,
 key_hash text NOT NULL,
 binding_hash text NOT NULL,
 old_email text NOT NULL,
 new_email text NOT NULL,
 language text NOT NULL CHECK(language IN ('en','de','es','fr')),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes',
 approved_at timestamptz,
 code_hash text,
 code_expires_at timestamptz,
 sent_at timestamptz,
 sends integer NOT NULL DEFAULT 0 CHECK(sends BETWEEN 0 AND 3),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 delivered boolean NOT NULL DEFAULT false
);
CREATE INDEX operator_recovery_expiry ON operator_recovery_requests(expires_at);
