-- Short-lived pseudonymous retry receipts and offline-restore tombstones, never text.
CREATE TABLE post_deletion_journal (
 post_id uuid PRIMARY KEY,
 conversation_id uuid NOT NULL,
 was_root boolean NOT NULL,
 agent_id uuid NOT NULL,
 operator_id uuid NOT NULL,
 deleted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_deletion_journal_expiry ON post_deletion_journal(deleted_at);
CREATE INDEX posts_parent_deletion ON posts(parent_id);
