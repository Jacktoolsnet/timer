-- Ordinary notifications never share the security-mail/token lifecycle.
ALTER TABLE operators ADD COLUMN notification_language text NOT NULL DEFAULT 'en' CHECK(notification_language IN ('en','de','es','fr'));
ALTER TABLE operators ADD COLUMN notification_language_saved boolean NOT NULL DEFAULT false;
ALTER TABLE operators ADD COLUMN notification_registration boolean NOT NULL DEFAULT true;
ALTER TABLE operators ADD COLUMN notification_moderation boolean NOT NULL DEFAULT true;
ALTER TABLE operators ADD COLUMN notification_review boolean NOT NULL DEFAULT true;
ALTER TABLE admins ADD COLUMN notification_language text NOT NULL DEFAULT 'en' CHECK(notification_language IN ('en','de','es','fr'));
ALTER TABLE admins ADD COLUMN notification_language_saved boolean NOT NULL DEFAULT false;
ALTER TABLE admins ADD COLUMN notification_queue boolean NOT NULL DEFAULT true;
CREATE TABLE notification_outbox (
 id bigserial PRIMARY KEY,
 operator_id uuid REFERENCES operators ON DELETE CASCADE,
 admin_id uuid REFERENCES admins ON DELETE CASCADE,
 recipient_version text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('registration','moderation','review','queue')),
 agent_id uuid REFERENCES agents ON DELETE CASCADE,
 case_id uuid REFERENCES moderation_cases ON DELETE CASCADE,
 source_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 due_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 8),
 CHECK((operator_id IS NULL) <> (admin_id IS NULL)),
 CHECK((kind='queue')=(admin_id IS NOT NULL))
);
CREATE INDEX notification_outbox_due ON notification_outbox(due_at,id);
CREATE UNIQUE INDEX notification_operator_event ON notification_outbox(operator_id,kind,source_id);
CREATE UNIQUE INDEX notification_admin_event ON notification_outbox(admin_id,kind,source_id);
CREATE FUNCTION capture_notification() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE oid uuid; cid uuid; aid uuid; k text; source text;
BEGIN
 source:=TG_TABLE_NAME||':'||NEW.id;
 IF TG_TABLE_NAME='agents' THEN
  oid:=NEW.operator_id; aid:=NEW.id; k:='registration';
 ELSIF TG_TABLE_NAME='moderation' THEN
  cid:=NEW.case_id; SELECT operator_id INTO oid FROM moderation_cases WHERE id=cid; k:='moderation';
 ELSIF TG_TABLE_NAME='appeals' AND TG_OP='UPDATE' THEN
  IF OLD.status<>'pending' OR NEW.status='pending' THEN RETURN NEW; END IF;
  cid:=NEW.case_id; oid:=NEW.operator_id; k:='review';
 ELSE
  cid:=NEW.case_id; k:='queue';
 END IF;
 IF k='queue' THEN
  INSERT INTO notification_outbox(admin_id,recipient_version,kind,case_id,source_id,due_at)
   SELECT id,auth_version,k,cid,source,now()+interval '2 minutes' FROM admins WHERE enabled AND NOT is_root AND email_verified_at IS NOT NULL AND email IS NOT NULL AND notification_queue ORDER BY id FOR SHARE
   ON CONFLICT DO NOTHING;
 ELSE
  INSERT INTO notification_outbox(operator_id,recipient_version,kind,agent_id,case_id,source_id)
   SELECT id,auth_version::text,k,aid,cid,source FROM operators WHERE id=oid AND NOT suspended AND email_verified_at IS NOT NULL AND email IS NOT NULL
   AND CASE k WHEN 'registration' THEN notification_registration WHEN 'moderation' THEN notification_moderation ELSE notification_review END FOR SHARE
   ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_agent AFTER INSERT ON agents FOR EACH ROW EXECUTE FUNCTION capture_notification();
CREATE TRIGGER notification_moderation AFTER INSERT ON moderation FOR EACH ROW EXECUTE FUNCTION capture_notification();
CREATE TRIGGER notification_report AFTER INSERT ON reports FOR EACH ROW EXECUTE FUNCTION capture_notification();
CREATE TRIGGER notification_appeal AFTER INSERT OR UPDATE OF status ON appeals FOR EACH ROW EXECUTE FUNCTION capture_notification();
-- New context on an open appeal also needs administrative attention, in the same digest.
CREATE FUNCTION capture_notification_context() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO notification_outbox(admin_id,recipient_version,kind,case_id,source_id,due_at)
 SELECT a.id,a.auth_version,'queue',p.case_id,'context:'||NEW.id,now()+interval '2 minutes'
 FROM admins a CROSS JOIN appeals p WHERE p.id=NEW.appeal_id AND a.enabled AND NOT a.is_root AND a.email_verified_at IS NOT NULL AND a.email IS NOT NULL AND a.notification_queue ORDER BY a.id FOR SHARE OF a;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_context AFTER INSERT ON appeal_messages FOR EACH ROW EXECUTE FUNCTION capture_notification_context();
