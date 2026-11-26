CREATE TABLE jt_certificate_results (
 target_key text PRIMARY KEY,
 result jsonb NOT NULL,
 notified_status text CHECK (notified_status IN ('ok','warning','critical','expired','error')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE jt_certificate_monitor (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 owner uuid,
 lock_until timestamptz,
 last_started_at timestamptz,
 last_finished_at timestamptz,
 last_error text,
 last_mail_at timestamptz,
 last_mail_error text,
 last_test_at timestamptz,
 reason text
);
INSERT INTO jt_certificate_monitor(id) VALUES(true);
