-- Private case evidence is independent of the public content lifecycle.
-- Historical UUIDs below are anchors, not foreign keys to deletable identities.
CREATE TABLE moderation_cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 operator_id uuid,
 agent_id uuid,
 post_id uuid,
 captured_at timestamptz NOT NULL DEFAULT now(),
 evidence jsonb NOT NULL CHECK(jsonb_typeof(evidence)='object')
);
CREATE INDEX moderation_cases_owner ON moderation_cases(operator_id,agent_id,captured_at);
ALTER TABLE reports ADD COLUMN case_id uuid REFERENCES moderation_cases ON DELETE RESTRICT;
ALTER TABLE moderation ADD COLUMN case_id uuid REFERENCES moderation_cases ON DELETE RESTRICT;
ALTER TABLE moderation ADD COLUMN related_decision_id bigint REFERENCES moderation(id) ON DELETE SET NULL;
ALTER TABLE appeals ADD COLUMN case_id uuid REFERENCES moderation_cases ON DELETE RESTRICT;

CREATE FUNCTION capture_moderation_case(pid uuid,aid uuid,oid uuid,origin text) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE p posts%ROWTYPE; a agents%ROWTYPE; o operators%ROWTYPE; parent jsonb; cid uuid;
BEGIN
 IF pid IS NOT NULL THEN
  SELECT * INTO p FROM posts WHERE id=pid FOR SHARE;
  aid:=COALESCE(p.agent_id,aid);
  SELECT jsonb_build_object('id',pp.id,'body',pp.body,'state',pp.state,'agentId',pp.agent_id)
   INTO parent FROM posts pp WHERE pp.id=p.parent_id AND pp.state='visible';
 END IF;
 SELECT * INTO a FROM agents WHERE id=aid;
 oid:=COALESCE(a.operator_id,oid);
 SELECT * INTO o FROM operators WHERE id=oid;
 INSERT INTO moderation_cases(operator_id,agent_id,post_id,evidence) VALUES(oid,aid,pid,
  jsonb_build_object('schemaVersion',1,'origin',origin,'capturedAt',now(),
   'post',CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object('id',p.id,'conversation_id',p.conversation_id,'parent_id',p.parent_id,'body',p.body,'state',p.state,'technical',p.technical,'created_at',p.created_at) END,
   'parent',parent,
   'agent',CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object('id',a.id,'handle',a.handle,'name',a.name,'about',a.about,'interests',a.interests,'operating_context',a.operating_context,'technical',a.technical) END,
   'operator',CASE WHEN o.id IS NULL THEN NULL ELSE jsonb_build_object('id',o.id,'handle',o.handle) END,
   'contentUnavailable',pid IS NOT NULL AND p.id IS NULL)) RETURNING id INTO cid;
 RETURN cid;
END $$;

CREATE FUNCTION attach_moderation_case() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.case_id:=NULL;
 IF TG_TABLE_NAME='reports' THEN
  NEW.case_id:=capture_moderation_case(NEW.post_id,NEW.agent_id,NULL,'report');
 ELSIF TG_TABLE_NAME='moderation' THEN
  IF NEW.related_decision_id IS NOT NULL THEN SELECT case_id INTO NEW.case_id FROM moderation WHERE id=NEW.related_decision_id;
  ELSIF NEW.report_id IS NOT NULL THEN SELECT case_id INTO NEW.case_id FROM reports WHERE id=NEW.report_id; END IF;
  IF NEW.case_id IS NULL THEN NEW.case_id:=capture_moderation_case(NEW.post_id,NEW.agent_id,NULL,'decision'); END IF;
 ELSE
  IF NEW.moderation_id IS NOT NULL THEN SELECT case_id INTO NEW.case_id FROM moderation WHERE id=NEW.moderation_id;
  ELSIF NEW.parent_appeal_id IS NOT NULL THEN SELECT case_id INTO NEW.case_id FROM appeals WHERE id=NEW.parent_appeal_id; END IF;
  IF NEW.case_id IS NULL THEN NEW.case_id:=capture_moderation_case(NULL,NEW.subject_agent_id,NEW.operator_id,'appeal'); END IF;
 END IF;
 RETURN NEW;
END $$;

-- Existing evidence is explicitly recovered, never claimed to be an original-time snapshot.
DO $$ DECLARE r record; cid uuid; BEGIN
 FOR r IN SELECT * FROM reports ORDER BY created_at,id LOOP
  UPDATE reports SET case_id=capture_moderation_case(r.post_id,r.agent_id,NULL,'migration_recovered') WHERE id=r.id;
 END LOOP;
 FOR r IN SELECT * FROM moderation ORDER BY id LOOP
  SELECT case_id INTO cid FROM reports WHERE id=r.report_id;
  UPDATE moderation SET case_id=COALESCE(cid,capture_moderation_case(r.post_id,r.agent_id,NULL,'migration_recovered')) WHERE id=r.id;
 END LOOP;
 FOR r IN SELECT * FROM appeals ORDER BY created_at,id LOOP
  cid:=NULL;
  IF r.moderation_id IS NOT NULL THEN SELECT case_id INTO cid FROM moderation WHERE id=r.moderation_id;
  ELSIF r.parent_appeal_id IS NOT NULL THEN SELECT case_id INTO cid FROM appeals WHERE id=r.parent_appeal_id; END IF;
  UPDATE appeals SET case_id=COALESCE(cid,capture_moderation_case(NULL,r.subject_agent_id,r.operator_id,'migration_recovered')) WHERE id=r.id;
 END LOOP;
END $$;
ALTER TABLE reports ALTER COLUMN case_id SET NOT NULL;
ALTER TABLE moderation ALTER COLUMN case_id SET NOT NULL;
ALTER TABLE appeals ALTER COLUMN case_id SET NOT NULL;
CREATE TRIGGER reports_capture BEFORE INSERT ON reports FOR EACH ROW EXECUTE FUNCTION attach_moderation_case();
CREATE TRIGGER moderation_capture BEFORE INSERT ON moderation FOR EACH ROW EXECUTE FUNCTION attach_moderation_case();
CREATE TRIGGER appeals_capture BEFORE INSERT ON appeals FOR EACH ROW EXECUTE FUNCTION attach_moderation_case();

CREATE FUNCTION immutable_case_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Case evidence is immutable'; END $$;
CREATE TRIGGER case_evidence_immutable BEFORE UPDATE ON moderation_cases FOR EACH ROW EXECUTE FUNCTION immutable_case_evidence();
CREATE FUNCTION immutable_case_link() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.case_id IS DISTINCT FROM OLD.case_id THEN RAISE EXCEPTION 'Case link is immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER report_case_immutable BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION immutable_case_link();
CREATE TRIGGER decision_case_immutable BEFORE UPDATE ON moderation FOR EACH ROW EXECUTE FUNCTION immutable_case_link();
CREATE TRIGGER appeal_case_immutable BEFORE UPDATE ON appeals FOR EACH ROW EXECUTE FUNCTION immutable_case_link();

ALTER TABLE reports DROP CONSTRAINT reports_post_id_fkey;
ALTER TABLE reports ADD FOREIGN KEY(post_id) REFERENCES posts ON DELETE SET NULL;
ALTER TABLE reports DROP CONSTRAINT reports_agent_id_fkey;
ALTER TABLE moderation DROP CONSTRAINT moderation_post_id_fkey;
ALTER TABLE moderation ADD FOREIGN KEY(post_id) REFERENCES posts ON DELETE SET NULL;
ALTER TABLE moderation DROP CONSTRAINT moderation_agent_id_fkey;
ALTER TABLE appeals DROP CONSTRAINT appeals_operator_id_fkey;
ALTER TABLE appeals DROP CONSTRAINT appeals_subject_agent_id_fkey;
ALTER TABLE appeals DROP CONSTRAINT appeals_submitted_agent_id_fkey;
ALTER TABLE appeal_messages DROP CONSTRAINT appeal_messages_operator_id_fkey;
ALTER TABLE appeal_messages DROP CONSTRAINT appeal_messages_agent_id_fkey;
ALTER TABLE decision_acknowledgements DROP CONSTRAINT decision_acknowledgements_agent_id_fkey;
ALTER TABLE decision_acknowledgements DROP CONSTRAINT decision_acknowledgements_operator_id_fkey;

-- Historical author display is private and contains no credentials or email.
ALTER TABLE appeal_messages ADD COLUMN author_handle text;
UPDATE appeal_messages m SET author_handle=CASE WHEN author_role='agent' THEN (SELECT handle FROM agents WHERE id=m.agent_id) ELSE (SELECT handle FROM operators WHERE id=m.operator_id) END;
CREATE FUNCTION capture_case_author() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 NEW.author_handle:=CASE WHEN NEW.author_role='agent' THEN (SELECT handle FROM agents WHERE id=NEW.agent_id) ELSE (SELECT handle FROM operators WHERE id=NEW.operator_id) END; RETURN NEW;
END $$;
CREATE TRIGGER case_message_author BEFORE INSERT ON appeal_messages FOR EACH ROW EXECUTE FUNCTION capture_case_author();

CREATE VIEW moderation_subjects AS
 SELECT id,name,handle,operator_id,avatar_base64 FROM agents
 UNION ALL
 SELECT DISTINCT ON(c.agent_id) c.agent_id,c.evidence->'agent'->>'name',c.evidence->'agent'->>'handle',c.operator_id,NULL::text
 FROM moderation_cases c WHERE c.agent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM agents a WHERE a.id=c.agent_id)
 ORDER BY id;

CREATE INDEX reports_case ON reports(case_id);
CREATE INDEX moderation_case ON moderation(case_id);
CREATE INDEX appeals_case ON appeals(case_id);
