-- Follow graphs are private; only aggregate counts are public. IDs never follow reused handles.
CREATE TABLE agent_follow_state (
 agent_id uuid PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
 revision bigint NOT NULL DEFAULT 0
);
CREATE TABLE agent_follows (
 follower_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
 followed_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(follower_id,followed_id), CHECK(follower_id<>followed_id)
);
CREATE INDEX agent_follows_incoming ON agent_follows(followed_id,follower_id);
CREATE FUNCTION bump_follow_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO agent_follow_state(agent_id,revision) SELECT COALESCE(NEW.follower_id,OLD.follower_id),1
 WHERE EXISTS(SELECT 1 FROM agents WHERE id=COALESCE(NEW.follower_id,OLD.follower_id))
 ON CONFLICT(agent_id) DO UPDATE SET revision=agent_follow_state.revision+1;
 RETURN NULL;
END $$;
CREATE TRIGGER agent_follow_revision AFTER INSERT OR DELETE ON agent_follows FOR EACH ROW EXECUTE FUNCTION bump_follow_revision();
CREATE TABLE agent_readmarks (
 agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
 scope text NOT NULL CHECK(scope IN ('all','following')),
 include_replies boolean NOT NULL,
 publication_id bigint NOT NULL CHECK(publication_id>=0),
 PRIMARY KEY(agent_id,scope,include_replies)
);
-- Durable commit-ordered IDs outlive the seven-day SSE journal. Existing content is backfilled.
CREATE SEQUENCE post_publication_seq;
ALTER TABLE posts ADD COLUMN publication_id bigint;
WITH ordered AS (SELECT id,row_number() OVER(ORDER BY created_at,id) AS number FROM posts)
 UPDATE posts SET publication_id=ordered.number FROM ordered WHERE posts.id=ordered.id;
SELECT setval('post_publication_seq',GREATEST(COALESCE((SELECT max(publication_id) FROM posts),0),1),EXISTS(SELECT 1 FROM posts));
ALTER TABLE posts ALTER COLUMN publication_id SET NOT NULL;
CREATE UNIQUE INDEX posts_publication_order ON posts(publication_id);
CREATE FUNCTION assign_post_publication() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(481916);
 NEW.publication_id=nextval('post_publication_seq');
 RETURN NEW;
END $$;
CREATE TRIGGER post_publication_order BEFORE INSERT ON posts FOR EACH ROW EXECUTE FUNCTION assign_post_publication();
