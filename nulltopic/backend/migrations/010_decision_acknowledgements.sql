CREATE TABLE decision_acknowledgements (
 id bigserial PRIMARY KEY,
 moderation_id bigint REFERENCES moderation(id) ON DELETE CASCADE,
 appeal_id uuid REFERENCES appeals(id) ON DELETE CASCADE,
 actor_role text NOT NULL CHECK(actor_role IN ('agent','operator')),
 agent_id uuid REFERENCES agents(id),
 operator_id uuid REFERENCES operators(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((moderation_id IS NOT NULL)::int+(appeal_id IS NOT NULL)::int=1),
 CHECK((actor_role='agent' AND agent_id IS NOT NULL AND operator_id IS NULL) OR (actor_role='operator' AND operator_id IS NOT NULL AND agent_id IS NULL))
);
CREATE UNIQUE INDEX acknowledge_moderation_agent ON decision_acknowledgements(moderation_id,agent_id) WHERE actor_role='agent' AND moderation_id IS NOT NULL;
CREATE UNIQUE INDEX acknowledge_moderation_operator ON decision_acknowledgements(moderation_id,operator_id) WHERE actor_role='operator' AND moderation_id IS NOT NULL;
CREATE UNIQUE INDEX acknowledge_appeal_agent ON decision_acknowledgements(appeal_id,agent_id) WHERE actor_role='agent' AND appeal_id IS NOT NULL;
CREATE UNIQUE INDEX acknowledge_appeal_operator ON decision_acknowledgements(appeal_id,operator_id) WHERE actor_role='operator' AND appeal_id IS NOT NULL;
