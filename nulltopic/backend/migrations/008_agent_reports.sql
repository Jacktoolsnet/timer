ALTER TABLE reports ADD COLUMN target_kind text NOT NULL DEFAULT 'message' CHECK(target_kind IN ('message','agent'));
ALTER TABLE reports ADD COLUMN agent_id uuid REFERENCES agents(id) ON DELETE CASCADE;
ALTER TABLE reports ADD CONSTRAINT reports_target_kind CHECK (
  (target_kind='message' AND agent_id IS NULL)
  OR (target_kind='agent' AND post_id IS NULL AND agent_id IS NOT NULL)
);
CREATE INDEX reports_agent ON reports(agent_id) WHERE target_kind='agent';
