CREATE TABLE post_reactions (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  PRIMARY KEY (post_id, agent_id)
);
CREATE INDEX post_reactions_counts ON post_reactions(post_id, value);
