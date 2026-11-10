-- Contacts are private operational data, never copied into immutable case evidence.
CREATE TABLE reporter_receipts (
 report_id uuid PRIMARY KEY REFERENCES reports ON DELETE CASCADE,
 token_hash text UNIQUE NOT NULL CHECK(length(token_hash)=64),
 nonce text NOT NULL,
 reporter_name text CHECK(reporter_name IS NULL OR length(reporter_name) BETWEEN 1 AND 120),
 reporter_email text CHECK(reporter_email IS NULL OR length(reporter_email) BETWEEN 3 AND 254),
 language text NOT NULL CHECK(language IN ('en','de','es','fr')),
 good_faith boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE moderation ADD COLUMN reporter_response text CHECK(reporter_response IS NULL OR length(reporter_response)<=2000);
ALTER TABLE appeals ADD COLUMN reporter_response text CHECK(reporter_response IS NULL OR length(reporter_response)<=2000);
CREATE TABLE reporter_events (
 id bigserial PRIMARY KEY,
 report_id uuid NOT NULL REFERENCES reporter_receipts(report_id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('received','decision','review_pending','review')),
 action text CHECK(action IS NULL OR action IN ('hide','block','unblock','restore','dismiss','accepted','rejected','closed')),
 public_response text CHECK(public_response IS NULL OR length(public_response)<=2000),
 source text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(report_id,source)
);
CREATE INDEX reporter_events_report ON reporter_events(report_id,id);
CREATE TABLE reporter_mail_outbox (
 event_id bigint PRIMARY KEY REFERENCES reporter_events ON DELETE CASCADE,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 8),
 due_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION queue_reporter_mail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM reporter_receipts WHERE report_id=NEW.report_id AND reporter_email IS NOT NULL) THEN
  INSERT INTO reporter_mail_outbox(event_id) VALUES(NEW.id);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER reporter_event_mail AFTER INSERT ON reporter_events FOR EACH ROW EXECUTE FUNCTION queue_reporter_mail();
CREATE FUNCTION capture_reporter_update() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE k text; a text; response text;
BEGIN
 IF TG_TABLE_NAME='moderation' THEN k:='decision';a:=NEW.action;response:=NEW.reporter_response;
 ELSIF TG_OP='INSERT' THEN k:='review_pending';
 ELSE
  IF OLD.status<>'pending' OR NEW.status='pending' THEN RETURN NEW; END IF;
  k:='review';a:=NEW.status;response:=NEW.reporter_response;
 END IF;
 INSERT INTO reporter_events(report_id,kind,action,public_response,source)
 SELECT rr.report_id,k,a,response,TG_TABLE_NAME||':'||NEW.id||':'||k
 FROM reporter_receipts rr JOIN reports r ON r.id=rr.report_id WHERE r.case_id=NEW.case_id
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER reporter_moderation AFTER INSERT ON moderation FOR EACH ROW EXECUTE FUNCTION capture_reporter_update();
CREATE TRIGGER reporter_appeal AFTER INSERT OR UPDATE OF status ON appeals FOR EACH ROW EXECUTE FUNCTION capture_reporter_update();
