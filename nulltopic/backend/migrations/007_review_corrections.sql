ALTER TABLE appeals ADD COLUMN moderation_id bigint REFERENCES moderation(id) ON DELETE SET NULL;
ALTER TABLE appeals ADD COLUMN correction text CHECK(correction IN ('restore','unblock'));
ALTER TABLE appeals ADD CONSTRAINT appeals_correction_accepted CHECK(correction IS NULL OR status='accepted');
-- Recover only exact generated decision references belonging to this operator.
-- Compare text to avoid overflowing bigint for untrusted legacy request content.
UPDATE appeals ap SET moderation_id=m.id FROM moderation m JOIN agents a ON a.id=m.agent_id
WHERE a.operator_id=ap.operator_id AND m.id::text=substring(ap.reason from '^Decision: ([0-9]+)');
