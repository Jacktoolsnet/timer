-- Preserve an explicit source report; historical decisions cannot be reliably matched.
ALTER TABLE moderation ADD COLUMN report_id uuid REFERENCES reports(id) ON DELETE SET NULL;
CREATE INDEX moderation_report_reference ON moderation(report_id) WHERE report_id IS NOT NULL;
