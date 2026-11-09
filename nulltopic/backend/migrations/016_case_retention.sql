-- Operational controls are separate from immutable original-time evidence.
CREATE TABLE case_controls (
 case_id uuid PRIMARY KEY REFERENCES moderation_cases ON DELETE CASCADE,
 retention_floor timestamptz NOT NULL DEFAULT now(),
 hold_reason text CHECK(hold_reason IS NULL OR length(btrim(hold_reason)) BETWEEN 1 AND 1000),
 hold_since timestamptz,
 reviewed_at timestamptz,
 review_due_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 CHECK((hold_reason IS NULL)=(hold_since IS NULL))
);
INSERT INTO case_controls(case_id) SELECT id FROM moderation_cases;
CREATE FUNCTION initialize_case_controls() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 INSERT INTO case_controls(case_id) VALUES(NEW.id); RETURN NEW;
END $$;
CREATE TRIGGER initialize_case_controls AFTER INSERT ON moderation_cases FOR EACH ROW EXECUTE FUNCTION initialize_case_controls();
CREATE TABLE case_control_audit (
 id bigserial PRIMARY KEY,
 case_id uuid NOT NULL REFERENCES moderation_cases ON DELETE CASCADE,
 admin_id uuid NOT NULL REFERENCES admins,
 action text NOT NULL CHECK(action IN ('hold','release','review')),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reports ADD COLUMN resolved_at timestamptz;
-- Do not pretend that historical notification/resolution dates are known.
UPDATE reports SET resolved_at=now() WHERE resolved;
CREATE FUNCTION record_report_resolution() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.resolved AND (TG_OP='INSERT' OR NOT OLD.resolved) THEN NEW.resolved_at:=now();
 ELSIF NOT NEW.resolved THEN NEW.resolved_at:=NULL; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER record_report_resolution BEFORE INSERT OR UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION record_report_resolution();

-- Application decisions become available in the authenticated inbox at commit.
-- The migration floor prevents historical cases expiring from guessed dates.
CREATE VIEW case_retention AS
 SELECT c.id AS case_id,c.captured_at,k.hold_reason,k.hold_since,k.reviewed_at,k.review_due_at,
 s.closed_at,
 CASE WHEN s.closed_at IS NOT NULL AND k.hold_reason IS NULL THEN
  ((s.closed_at AT TIME ZONE 'UTC')+interval '6 months') AT TIME ZONE 'UTC'
 END AS delete_after
 FROM moderation_cases c JOIN case_controls k ON k.case_id=c.id
 CROSS JOIN LATERAL (
 SELECT CASE WHEN
  NOT EXISTS(SELECT 1 FROM reports WHERE case_id=c.id AND NOT resolved)
  AND NOT EXISTS(SELECT 1 FROM appeals WHERE case_id=c.id AND status='pending')
  AND (EXISTS(SELECT 1 FROM reports WHERE case_id=c.id) OR EXISTS(SELECT 1 FROM moderation WHERE case_id=c.id) OR EXISTS(SELECT 1 FROM appeals WHERE case_id=c.id))
 THEN GREATEST(k.retention_floor,
  (SELECT max(resolved_at) FROM reports WHERE case_id=c.id),
  (SELECT max(created_at) FROM moderation WHERE case_id=c.id),
  (SELECT max(decided_at) FROM appeals WHERE case_id=c.id)) END AS closed_at
 ) s;
CREATE INDEX case_controls_review_due ON case_controls(review_due_at,case_id);
-- No content, contact data, reasons or actor IDs in the short-lived restore ledger.
CREATE TABLE case_purge_journal(case_id uuid PRIMARY KEY,purged_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX case_purge_journal_expiry ON case_purge_journal(purged_at);

-- Purging takes the exclusive version of this lock before any row locks.
-- Ordinary transactions and direct case writes take shared locks first.
CREATE FUNCTION protect_case_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM pg_advisory_xact_lock_shared(481920); RETURN NULL;
END $$;
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['moderation_cases','case_controls','case_control_audit','reports','moderation','appeals','appeal_messages','decision_acknowledgements'] LOOP
  EXECUTE format('CREATE TRIGGER protect_case_write BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION protect_case_write()',tab);
 END LOOP;
END $$;
