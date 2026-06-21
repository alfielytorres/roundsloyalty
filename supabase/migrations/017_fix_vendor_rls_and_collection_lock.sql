-- Fix 1: vendors RLS — owner can always read their own vendor regardless of status
DROP POLICY IF EXISTS "vendors: owner read" ON vendors;
CREATE POLICY "vendors: owner read"
  ON vendors FOR SELECT
  USING (owner_id = auth.uid());

-- Fix 2: request_reward_collection — add SELECT FOR UPDATE to prevent concurrent double-deduct
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
  -- Look for any non-expired, non-collected reward instance (available OR already requested)
  SELECT id INTO v_reward_id
  FROM reward_instances
  WHERE reward_instances.membership_id = $1
    AND customer_id = auth.uid()
    AND status IN ('available', 'collection_requested', 'ready')
  ORDER BY created_at
  LIMIT 1;

  IF v_reward_id IS NULL THEN
    -- Lock membership row to prevent concurrent double-deduct
    SELECT * INTO v_membership
    FROM customer_vendor_memberships
    WHERE id = $1 AND customer_id = auth.uid()
    FOR UPDATE;

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

    -- Deduct rounds immediately so they can't double-collect
    UPDATE customer_vendor_memberships
    SET current_rounds = current_rounds - v_program.rounds_required,
        updated_at     = now()
    WHERE id = $1;

    -- Create the reward instance
    INSERT INTO reward_instances (
      membership_id, customer_id, vendor_id, loyalty_program_id,
      reward_name, reward_description, status
    ) VALUES (
      v_membership.id, auth.uid(), v_membership.vendor_id, v_program.id,
      v_program.reward_name, v_program.reward_description, 'available'
    )
    RETURNING id INTO v_reward_id;
  END IF;

  -- If already collection_requested or ready, return the existing collection
  IF (SELECT status FROM reward_instances WHERE id = v_reward_id) IN ('collection_requested', 'ready') THEN
    RETURN (
      SELECT jsonb_build_object(
        'collection_id',   rc.id,
        'collection_code', rc.collection_code
      )
      FROM reward_collections rc
      WHERE rc.reward_instance_id = v_reward_id
      ORDER BY rc.created_at DESC
      LIMIT 1
    );
  END IF;

  RETURN request_reward_collection(v_reward_id, auth.uid(), NULL, note);
END;
$$;

GRANT EXECUTE ON FUNCTION request_reward_collection(uuid, text) TO authenticated;
