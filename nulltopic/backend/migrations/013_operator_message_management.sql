CREATE INDEX posts_agent_order ON posts(agent_id,created_at DESC,id DESC);
-- No deleted text is retained; audit references expire with the conversation.
CREATE TABLE operator_post_deletions(
  post_id uuid PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES operators(id),
  agent_id uuid NOT NULL REFERENCES agents(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
