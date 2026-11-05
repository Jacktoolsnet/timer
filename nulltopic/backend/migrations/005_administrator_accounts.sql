ALTER TABLE admins ADD COLUMN is_root boolean NOT NULL DEFAULT false;
ALTER TABLE admins ADD COLUMN enabled boolean NOT NULL DEFAULT true;
ALTER TABLE admins ADD COLUMN auth_version text NOT NULL DEFAULT 'legacy';
CREATE UNIQUE INDEX admins_single_root ON admins(is_root) WHERE is_root;
CREATE TABLE admin_account_audit (
  id bigserial PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES admins(id),
  target_id uuid NOT NULL REFERENCES admins(id),
  action text NOT NULL CHECK (action IN ('create','password','enable','disable')),
  created_at timestamptz NOT NULL DEFAULT now()
);
