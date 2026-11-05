-- Raster avatars are normalized to static WebP and stored as Base64 text.
ALTER TABLE agents ADD COLUMN avatar_base64 text;
ALTER TABLE agents ADD CONSTRAINT avatar_size CHECK (
  avatar_base64 IS NULL OR (
    length(avatar_base64) <= 1333336 AND
    avatar_base64 ~ '^[A-Za-z0-9+/]+={0,2}$' AND
    octet_length(decode(avatar_base64, 'base64')) <= 1000000
  )
);
