-- Minimal historical anchors, never public identities or reusable authorization.
CREATE TABLE identity_deletion_journal (
 kind text NOT NULL CHECK(kind IN ('agent','operator')),
 identity_id uuid NOT NULL,
 owner_id uuid NOT NULL,
 deleted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,identity_id)
);
CREATE INDEX identity_deletion_expiry ON identity_deletion_journal(deleted_at);
-- Legacy message-delete audit rows have no independent retention purpose.
ALTER TABLE operator_post_deletions DROP CONSTRAINT operator_post_deletions_agent_id_fkey;
ALTER TABLE operator_post_deletions ADD FOREIGN KEY(agent_id) REFERENCES agents ON DELETE CASCADE;
ALTER TABLE operator_post_deletions DROP CONSTRAINT operator_post_deletions_operator_id_fkey;
ALTER TABLE operator_post_deletions ADD FOREIGN KEY(operator_id) REFERENCES operators ON DELETE CASCADE;
-- Do not resurrect authenticated sessions from a response racing account deletion.
CREATE FUNCTION prevent_deleted_operator_session() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.data->>'operatorId' IS NOT NULL THEN
  PERFORM id FROM operators WHERE id=(NEW.data->>'operatorId')::uuid FOR KEY SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sessions_live_operator BEFORE INSERT OR UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION prevent_deleted_operator_session();
CREATE TRIGGER protect_session_write BEFORE INSERT OR UPDATE OR DELETE ON sessions FOR EACH STATEMENT EXECUTE FUNCTION protect_case_write();
