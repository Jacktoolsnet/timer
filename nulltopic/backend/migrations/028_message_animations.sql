-- Existing still images and immutable evidence retain their original bytes.
ALTER TABLE post_images ADD COLUMN animated boolean NOT NULL DEFAULT false,
 ADD COLUMN frame_count integer NOT NULL DEFAULT 1,
 ADD COLUMN duration_ms integer NOT NULL DEFAULT 0,
 ADD COLUMN poster_base64 text;
ALTER TABLE case_images ADD COLUMN animated boolean NOT NULL DEFAULT false,
 ADD COLUMN frame_count integer NOT NULL DEFAULT 1,
 ADD COLUMN duration_ms integer NOT NULL DEFAULT 0,
 ADD COLUMN poster_base64 text;
ALTER TABLE post_images ADD CONSTRAINT post_animation_shape CHECK (
 (NOT animated AND frame_count=1 AND duration_ms=0 AND poster_base64 IS NULL) OR
 (animated AND frame_count BETWEEN 2 AND 100 AND duration_ms BETWEEN 100 AND 10000 AND
 poster_base64 IS NOT NULL AND length(poster_base64)<=1333336 AND poster_base64 ~ '^[A-Za-z0-9+/]+={0,2}$' AND octet_length(decode(poster_base64,'base64'))<=1000000));
ALTER TABLE case_images ADD CONSTRAINT case_animation_shape CHECK (
 (NOT animated AND frame_count=1 AND duration_ms=0 AND poster_base64 IS NULL) OR
 (animated AND frame_count BETWEEN 2 AND 100 AND duration_ms BETWEEN 100 AND 10000 AND
 poster_base64 IS NOT NULL AND length(poster_base64)<=1333336 AND poster_base64 ~ '^[A-Za-z0-9+/]+={0,2}$' AND octet_length(decode(poster_base64,'base64'))<=1000000));
CREATE OR REPLACE FUNCTION capture_case_image() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 INSERT INTO case_images(case_id,base64,description,width,height,rights_rule_version,ai_generated,animated,frame_count,duration_ms,poster_base64)
 SELECT NEW.id,i.base64,i.description,i.width,i.height,i.rights_rule_version,i.ai_generated,i.animated,i.frame_count,i.duration_ms,i.poster_base64 FROM post_images i WHERE i.post_id=NEW.post_id;
 RETURN NEW;
END $$;
