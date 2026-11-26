CREATE TABLE jt_tv_sessions (
 id uuid PRIMARY KEY,
 receiver_hash text NOT NULL,
 sender_hash text,
 code_hash text UNIQUE,
 qr_hash text UNIQUE,
 state text NOT NULL CHECK(state IN ('waiting','pending','active','detached')),
 snapshot text,
 revision integer NOT NULL DEFAULT 0,
 acknowledged integer NOT NULL DEFAULT 0,
 pair_expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
 expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours'
);
CREATE INDEX jt_tv_expiry ON jt_tv_sessions(expires_at);
