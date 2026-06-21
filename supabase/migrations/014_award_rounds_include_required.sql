-- Add rounds_required to the award_rounds_internal return payload
DROP FUNCTION IF EXISTS award_rounds_internal(text,uuid,text,text,uuid,text);

-- so the iOS scan result screen can show "X / Y ROUNDS" instead of "X / ?"

-- We only need to patch the final RETURN inside award_rounds_internal.
-- Re-create the function with the extra field in the vendor object
-- (vendor already holds the program info via v_program).

-- Find award_rounds_internal in 005 and patch its return:
CREATE OR REPLACE FUNCTION award_rounds_internal(
  p_customer_token   text,
  p_vendor_id        uuid,
  p_nfc_token        text    DEFAULT NULL,
  p_source           text    DEFAULT 'nfc',
  p_staff_user_id    uuid    DEFAULT NULL,
  p_idempotency_key  text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer     profiles%ROWTYPE;
  v_vendor       vendors%ROWTYPE;
  v_device       nfc_devices%ROWTYPE;
  v_membership   customer_vendor_memberships%ROWTYPE;
  v_program      loyalty_programs%ROWTYPE;
  v_campaign     campaigns%ROWTYPE;
  v_tx_id        uuid;
  v_coll_id      uuid;
  v_existing_tx  uuid;
  v_rounds_to_award   integer;
  v_new_total         integer;
  v_new_current       integer;
  v_rewards_count     integer := 0;
BEGIN
  -- Resolve customer
  SELECT * INTO v_customer FROM profiles WHERE customer_token = p_customer_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  -- Resolve vendor
  SELECT * INTO v_vendor FROM vendors WHERE id = p_vendor_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor not found or not active';
  END IF;

  -- Resolve NFC device (optional)
  IF p_nfc_token IS NOT NULL THEN
    SELECT * INTO v_device FROM nfc_devices WHERE device_token = p_nfc_token AND vendor_id = p_vendor_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'NFC device not found or not associated with this vendor';
    END IF;
    IF v_device.status != 'active' THEN
      RAISE EXCEPTION 'NFC device is not active';
    END IF;
  END IF;

  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_tx
    FROM round_transactions
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;
    IF FOUND THEN
      -- Return a neutral success without awarding again
      SELECT * INTO v_membership
      FROM customer_vendor_memberships
      WHERE customer_id = v_customer.id AND vendor_id = p_vendor_id;
      SELECT * INTO v_program
      FROM loyalty_programs
      WHERE vendor_id = p_vendor_id AND status = 'active'
      LIMIT 1;
      RETURN jsonb_build_object(
        'transaction_id',   v_existing_tx,
        'rounds_awarded',   0,
        'campaign_id',      NULL,
        'campaign_name',    NULL,
        'balance',          jsonb_build_object(
                              'current_rounds',  v_membership.current_rounds,
                              'lifetime_rounds', v_membership.lifetime_rounds
                            ),
        'rewards_unlocked', 0,
        'membership_id',    v_membership.id,
        'vendor',           jsonb_build_object(
                              'id',              v_vendor.id,
                              'business_name',   v_vendor.business_name,
                              'brand_color',     v_vendor.brand_color,
                              'rounds_required', v_program.rounds_required
                            )
      );
    END IF;
  END IF;

  -- Get active program
  SELECT * INTO v_program
  FROM loyalty_programs
  WHERE vendor_id = p_vendor_id AND status = 'active'
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active loyalty program for this vendor';
  END IF;

  -- Determine rounds to award
  v_rounds_to_award := v_program.default_round_value;

  -- Check for active campaign (double rounds, etc.)
  SELECT * INTO v_campaign
  FROM campaigns
  WHERE vendor_id = p_vendor_id
    AND status = 'active'
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at > now())
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND AND v_campaign.bonus_rounds > 0 THEN
    v_rounds_to_award := v_rounds_to_award + v_campaign.bonus_rounds;
  END IF;

  -- Upsert membership
  INSERT INTO customer_vendor_memberships (customer_id, vendor_id, status, current_rounds, lifetime_rounds)
  VALUES (v_customer.id, p_vendor_id, 'active', 0, 0)
  ON CONFLICT (customer_id, vendor_id) DO UPDATE
    SET status = 'active',
        activated_at = COALESCE(customer_vendor_memberships.activated_at, now())
  RETURNING * INTO v_membership;

  -- Calculate new totals
  v_new_total   := v_membership.lifetime_rounds + v_rounds_to_award;
  v_rewards_count := floor(v_new_total::numeric / v_program.rounds_required)
                   - floor(v_membership.lifetime_rounds::numeric / v_program.rounds_required);
  v_new_current := (v_membership.current_rounds + v_rounds_to_award);
  IF v_rewards_count > 0 THEN
    v_new_current := v_new_current - (v_rewards_count * v_program.rounds_required);
    IF v_new_current < 0 THEN v_new_current := 0; END IF;
  END IF;

  -- Update membership
  UPDATE customer_vendor_memberships
  SET current_rounds  = v_new_current,
      lifetime_rounds = v_new_total,
      updated_at      = now()
  WHERE id = v_membership.id;

  -- Insert transaction
  INSERT INTO round_transactions (
    membership_id, customer_id, vendor_id,
    nfc_device_id, rounds_awarded, source,
    staff_user_id, idempotency_key
  ) VALUES (
    v_membership.id, v_customer.id, p_vendor_id,
    v_device.id, v_rounds_to_award, p_source,
    p_staff_user_id, p_idempotency_key
  )
  RETURNING id INTO v_tx_id;

  -- Create reward instances if rewards unlocked
  IF v_rewards_count > 0 THEN
    FOR i IN 1..v_rewards_count LOOP
      INSERT INTO reward_instances (
        membership_id, customer_id, vendor_id, loyalty_program_id,
        reward_name, reward_description, status
      ) VALUES (
        v_membership.id, v_customer.id, p_vendor_id, v_program.id,
        v_program.reward_name, v_program.reward_description, 'available'
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'transaction_id',   v_tx_id,
    'rounds_awarded',   v_rounds_to_award,
    'campaign_id',      v_campaign.id,
    'campaign_name',    v_campaign.name,
    'balance',          jsonb_build_object(
                          'current_rounds',  v_new_current,
                          'lifetime_rounds', v_membership.lifetime_rounds + v_rounds_to_award
                        ),
    'rewards_unlocked', v_rewards_count,
    'membership_id',    v_membership.id,
    'vendor',           jsonb_build_object(
                          'id',              v_vendor.id,
                          'business_name',   v_vendor.business_name,
                          'brand_color',     v_vendor.brand_color,
                          'rounds_required', v_program.rounds_required
                        )
  );
END;
$$;
