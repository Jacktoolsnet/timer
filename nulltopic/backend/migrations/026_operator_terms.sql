-- Additive: existing operators are not silently declared to have accepted new terms.
-- Privacy is the notice offered, not a blanket consent to data processing.
CREATE TABLE operator_terms_acceptances (
 operator_id uuid NOT NULL REFERENCES operators ON DELETE CASCADE,
 terms_version text NOT NULL CHECK(length(terms_version) BETWEEN 1 AND 120),
 privacy_version text NOT NULL CHECK(length(privacy_version) BETWEEN 1 AND 120),
 accepted_at timestamptz NOT NULL DEFAULT now(),
 ui_language text NOT NULL CHECK(ui_language IN ('en','de','es','fr')),
 PRIMARY KEY(operator_id,terms_version)
);
CREATE FUNCTION immutable_operator_terms_acceptance() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Operator terms acceptance cannot be rewritten';
END $$;
CREATE TRIGGER operator_terms_acceptance_immutable BEFORE UPDATE ON operator_terms_acceptances
 FOR EACH ROW EXECUTE FUNCTION immutable_operator_terms_acceptance();
