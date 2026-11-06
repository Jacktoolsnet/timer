-- Separate an explicit operator pause from an administrative block.
-- Existing paused rows have unknown provenance: never grant operator activation
-- based solely on that legacy status. An administrator must clear those pauses.
ALTER TABLE agents ADD COLUMN operator_paused boolean NOT NULL DEFAULT false;
