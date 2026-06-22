-- Recreate award_rounds_internal with correct table names.
-- Migration 014 dropped the function but failed to recreate it because
-- it referenced non-existent tables (nfc_devices, campaigns).
-- Correct names: nfc_stamp_devices (with device_token_hash) and round_campaigns.

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
  v_customer    profiles%ROWTYPE;
  v_vendor      vendors%ROWTYPE;
  v_device      nfc_stamp_devices%ROWTYPE;
  v_membership  customer_vendor_memberships%ROWTYPE;
  v_program     loyalty_programs%ROWTYPE;
  v_campaign    round_campaigns%ROWTYPE;
  v_existing_tx uuid;
  v_tx_id       uuid;
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
    SELECT * INTO v_device
    FROM nfc_stamp_devices
    WHERE device_token_hash = encode(digest(p_nfc_token, 'sha256'), 'hex')
      AND vendor_id = p_vendor_id;
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

  -- Base rounds from program
  v_rounds_to_award := COALESCE(v_program.default_round_value, 1);

  -- Check for active campaign (multiplies round_value)
  SELECT * INTO v_campaign
  FROM round_campaigns
  WHERE vendor_id = p_vendor_id
    AND starts_at <= now()
    AND ends_at > now()
    AND status != 'cancelled'
  ORDER BY starts_at DESC
  LIMIT 1;

  IF FOUND THEN
    v_rounds_to_award := v_campaign.round_value;
  END IF;

  -- Upsert membership
  INSERT INTO customer_vendor_memberships (customer_id, vendor_id, status, current_rounds, lifetime_rounds)
  VALUES (v_customer.id, p_vendor_id, 'active', 0, 0)
  ON CONFLICT (customer_id, vendor_id) DO UPDATE
    SET status       = 'active',
        activated_at = COALESCE(customer_vendor_memberships.activated_at, now())
  RETURNING * INTO v_membership;

  -- Calculate new totals
  v_new_total     := v_membership.lifetime_rounds + v_rounds_to_award;
  v_rewards_count := floor(v_new_total::numeric / v_program.rounds_required)
                   - floor(v_membership.lifetime_rounds::numeric / v_program.rounds_required);
  v_new_current   := v_membership.current_rounds + v_rounds_to_award;
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

  -- Update NFC device last_used_at
  IF v_device.id IS NOT NULL THEN
    UPDATE nfc_stamp_devices SET last_used_at = now() WHERE id = v_device.id;
  END IF;

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
                          'lifetime_rounds', v_new_total
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
