ALTER TABLE appeals ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','closed'));
ALTER TABLE appeals ADD COLUMN response text;
ALTER TABLE appeals ADD COLUMN decided_at timestamptz;
ALTER TABLE appeals ADD COLUMN decided_by uuid REFERENCES admins;
ALTER TABLE appeals ADD CONSTRAINT appeals_decision_complete CHECK (
  (status='pending' AND response IS NULL AND decided_at IS NULL AND decided_by IS NULL)
  OR (status<>'pending' AND response IS NOT NULL AND length(btrim(response)) BETWEEN 1 AND 2000 AND decided_at IS NOT NULL AND decided_by IS NOT NULL)
);
