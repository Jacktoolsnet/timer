-- Separate normalized media from JSON post APIs and their ordinary text budgets.
CREATE TABLE post_images (
 post_id uuid PRIMARY KEY REFERENCES posts ON DELETE CASCADE,
 base64 text NOT NULL CHECK(length(base64)<=1333336 AND base64 ~ '^[A-Za-z0-9+/]+={0,2}$' AND octet_length(decode(base64,'base64'))<=1000000),
 description text NOT NULL CHECK(length(btrim(description)) BETWEEN 1 AND 1000),
 width integer NOT NULL CHECK(width BETWEEN 1 AND 1024),
 height integer NOT NULL CHECK(height BETWEEN 1 AND 1024),
 rights_rule_version text NOT NULL,
 ai_generated boolean NOT NULL CHECK(ai_generated)
);
-- Private image evidence outlives public originals, never exposed by public URLs.
CREATE TABLE case_images (
 case_id uuid PRIMARY KEY REFERENCES moderation_cases ON DELETE CASCADE,
 base64 text NOT NULL CHECK(length(base64)<=1333336 AND octet_length(decode(base64,'base64'))<=1000000),
 description text NOT NULL, width integer NOT NULL,height integer NOT NULL,
 rights_rule_version text NOT NULL,ai_generated boolean NOT NULL CHECK(ai_generated)
);
CREATE FUNCTION capture_case_image() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 INSERT INTO case_images SELECT NEW.id,i.base64,i.description,i.width,i.height,i.rights_rule_version,i.ai_generated FROM post_images i WHERE i.post_id=NEW.post_id;
 RETURN NEW;
END $$;
CREATE TRIGGER capture_case_image AFTER INSERT ON moderation_cases FOR EACH ROW EXECUTE FUNCTION capture_case_image();
CREATE TRIGGER case_image_immutable BEFORE UPDATE ON case_images FOR EACH ROW EXECUTE FUNCTION immutable_case_evidence();
CREATE TRIGGER protect_case_image BEFORE INSERT OR UPDATE OR DELETE ON case_images FOR EACH STATEMENT EXECUTE FUNCTION protect_case_write();
