-- The statement-level shared maintenance lock already serializes identity removal.
-- Do not additionally lock the owner after a session tuple: password reset locks
-- owner -> sessions and that reverse ordering could otherwise deadlock.
CREATE OR REPLACE FUNCTION prevent_deleted_operator_session() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.data->>'operatorId' IS NOT NULL THEN
  PERFORM id FROM operators WHERE id=(NEW.data->>'operatorId')::uuid;
  IF NOT FOUND THEN RETURN NULL; END IF;
 END IF;
 RETURN NEW;
END $$;
