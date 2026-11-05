-- JavaScript serializes timestamps to milliseconds. Match database precision so
-- the public (timestamp, UUID) keyset cursor cannot skip sub-millisecond rows.
ALTER TABLE posts ALTER COLUMN created_at TYPE timestamptz(3);
ALTER TABLE posts ALTER COLUMN created_at SET DEFAULT date_trunc('milliseconds',now());
