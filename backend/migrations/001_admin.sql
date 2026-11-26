CREATE TABLE jt_users (
 id uuid PRIMARY KEY,
 username text NOT NULL UNIQUE CHECK(username = lower(username)),
 display_name text NOT NULL DEFAULT '',
 email text NOT NULL DEFAULT '',
 role text NOT NULL CHECK(role IN ('root','admin')),
 password_hash text NOT NULL,
 active boolean NOT NULL DEFAULT true,
 must_change_password boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX jt_single_root ON jt_users(role) WHERE role='root';
CREATE TABLE jt_admin_sessions (
 token_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES jt_users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL
);
CREATE INDEX jt_session_user ON jt_admin_sessions(user_id);
CREATE INDEX jt_session_expiry ON jt_admin_sessions(expires_at);
CREATE TABLE jt_audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid REFERENCES jt_users(id) ON DELETE SET NULL,
 target_id uuid REFERENCES jt_users(id) ON DELETE SET NULL,
 action text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jt_audit_created ON jt_audit_events(created_at);
CREATE TABLE jt_rate_limits (
 key_hash text PRIMARY KEY,
 hits integer NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE INDEX jt_rate_expiry ON jt_rate_limits(expires_at);
