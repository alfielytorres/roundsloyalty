-- Fix request_reward_collection to create a reward_instance on-the-fly
-- when the customer has enough rounds but no available instance exists.
-- This handles the case where rounds_required was lowered after rounds were earned.

CREATE OR REPLACE FUNCTION request_reward_collection(
  membership_id uuid,
  note          text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward_id  uuid;
  v_membership customer_vendor_memberships%ROWTYPE;
  v_program    loyalty_programs%ROWTYPE;
BEGIN
  -- Try to find an existing available reward instance
  SELECT id INTO v_reward_id
  FROM reward_instances
  WHERE reward_instances.membership_id = $1
    AND customer_id = auth.uid()
    AND status = 'available'
  ORDER BY created_at
  LIMIT 1;

  -- If none found, check if customer has enough rounds and create one
  IF v_reward_id IS NULL THEN
    SELECT * INTO v_membership
    FROM customer_vendor_memberships
    WHERE id = $1 AND customer_id = auth.uid();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Membership not found';
    END IF;

    SELECT * INTO v_program
    FROM loyalty_programs
    WHERE vendor_id = v_membership.vendor_id AND status = 'active'
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No active loyalty program found';
    END IF;

    IF v_membership.current_rounds < v_program.rounds_required THEN
      RAISE EXCEPTION 'Not enough rounds (have %, need %)',
        v_membership.current_rounds, v_program.rounds_required;
    END IF;

    -- Customer qualifies — create the missing reward instance
    INSERT INTO reward_instances (
      membership_id, customer_id, vendor_id, loyalty_program_id,
      reward_name, reward_description, status
    ) VALUES (
      v_membership.id, auth.uid(), v_membership.vendor_id, v_program.id,
      v_program.reward_name, v_program.reward_description, 'available'
    )
    RETURNING id INTO v_reward_id;
  END IF;

  RETURN request_reward_collection(v_reward_id, auth.uid(), NULL, note);
END;
$$;

GRANT EXECUTE ON FUNCTION request_reward_collection(uuid, text) TO authenticated;
