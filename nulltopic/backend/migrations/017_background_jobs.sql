CREATE TABLE background_jobs (
 id text PRIMARY KEY CHECK(id IN ('conversations','cases')),
 last_success_due timestamptz,
 last_success_at timestamptz,
 retry_at timestamptz
);
INSERT INTO background_jobs(id) VALUES('conversations'),('cases');
CREATE TABLE background_job_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id text NOT NULL REFERENCES background_jobs,
 source text NOT NULL CHECK(source IN ('scheduled','manual','cli')),
 admin_id uuid,
 due_at timestamptz NOT NULL,
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 status text NOT NULL CHECK(status IN ('running','succeeded','failed')),
 affected_count integer CHECK(affected_count>=0),
 error_code text CHECK(error_code IN ('FAILED','INTERRUPTED'))
);
CREATE INDEX background_job_runs_history ON background_job_runs(job_id,started_at DESC);
CREATE TABLE background_job_previews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id text NOT NULL REFERENCES background_jobs,
 admin_id uuid NOT NULL REFERENCES admins ON DELETE CASCADE,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',
 used_at timestamptz,
 affected_count integer NOT NULL CHECK(affected_count>=0)
);

CREATE INDEX background_job_previews_expiry ON background_job_previews(expires_at);
CREATE INDEX background_job_runs_expiry ON background_job_runs(finished_at);
