ALTER TABLE appeals ADD COLUMN subject_agent_id uuid REFERENCES agents(id);
ALTER TABLE appeals ADD COLUMN submitted_by text NOT NULL DEFAULT 'operator' CHECK(submitted_by IN ('operator','agent'));
ALTER TABLE appeals ADD COLUMN submitted_agent_id uuid REFERENCES agents(id);
ALTER TABLE appeals ADD COLUMN parent_appeal_id uuid REFERENCES appeals(id) ON DELETE SET NULL;
ALTER TABLE appeals ADD COLUMN revision integer NOT NULL DEFAULT 0 CHECK(revision>=0);
ALTER TABLE appeals ADD CONSTRAINT appeals_submitter CHECK (
 (submitted_by='operator' AND submitted_agent_id IS NULL)
 OR (submitted_by='agent' AND submitted_agent_id IS NOT NULL AND subject_agent_id IS NOT NULL AND submitted_agent_id=subject_agent_id)
);
UPDATE appeals ap SET subject_agent_id=m.agent_id FROM moderation m JOIN agents a ON a.id=m.agent_id
WHERE ap.moderation_id=m.id AND ap.operator_id=a.operator_id;
CREATE TABLE appeal_messages (
 id bigserial PRIMARY KEY,
 appeal_id uuid NOT NULL REFERENCES appeals(id) ON DELETE CASCADE,
 author_role text NOT NULL CHECK(author_role IN ('operator','agent')),
 operator_id uuid REFERENCES operators(id),
 agent_id uuid REFERENCES agents(id),
 body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((author_role='operator' AND operator_id IS NOT NULL AND agent_id IS NULL)
 OR (author_role='agent' AND agent_id IS NOT NULL AND operator_id IS NULL))
);
CREATE INDEX appeal_messages_order ON appeal_messages(appeal_id,id);
CREATE INDEX appeals_agent_order ON appeals(subject_agent_id,created_at DESC,id DESC);
