-- Let any stamp (QR/portal as well as NFC) be attributed to a location. The
-- portal passes the staff's current location; NFC still falls back to the
-- device's location. Adds p_location_id to award_rounds + award_rounds_internal.

drop function if exists award_rounds(text, uuid, text, text, uuid, text);
drop function if exists award_rounds_internal(text, uuid, text, text, uuid, text);

create or replace function award_rounds_internal(
  p_customer_token text, p_vendor_id uuid, p_nfc_token text default null,
  p_source text default 'nfc', p_staff_user_id uuid default null,
  p_idempotency_key text default null, p_location_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
DECLARE
  v_customer profiles%ROWTYPE; v_vendor vendors%ROWTYPE; v_device nfc_stamp_devices%ROWTYPE;
  v_membership customer_vendor_memberships%ROWTYPE; v_program loyalty_programs%ROWTYPE;
  v_campaign round_campaigns%ROWTYPE; v_existing_tx uuid; v_tx_id uuid;
  v_rounds_to_award integer; v_new_total integer; v_new_current integer; v_rewards_count integer := 0;
  v_location uuid;
BEGIN
  SELECT * INTO v_customer FROM profiles WHERE customer_token = p_customer_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found'; END IF;
  SELECT * INTO v_vendor FROM vendors WHERE id = p_vendor_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Vendor not found or not active'; END IF;
  IF p_nfc_token IS NOT NULL THEN
    SELECT * INTO v_device FROM nfc_stamp_devices
    WHERE device_token_hash = encode(digest(p_nfc_token, 'sha256'), 'hex') AND vendor_id = p_vendor_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'NFC device not found or not associated with this vendor'; END IF;
    IF v_device.status != 'active' THEN RAISE EXCEPTION 'NFC device is not active'; END IF;
  END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_tx FROM round_transactions WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF FOUND THEN
      SELECT * INTO v_membership FROM customer_vendor_memberships WHERE customer_id = v_customer.id AND vendor_id = p_vendor_id;
      SELECT * INTO v_program FROM loyalty_programs WHERE vendor_id = p_vendor_id AND status = 'active' LIMIT 1;
      RETURN jsonb_build_object('transaction_id', v_existing_tx, 'rounds_awarded', 0, 'campaign_id', NULL,
        'campaign_name', NULL, 'balance', jsonb_build_object('current_rounds', v_membership.current_rounds,
        'lifetime_rounds', v_membership.lifetime_rounds), 'rewards_unlocked', 0, 'membership_id', v_membership.id,
        'vendor', jsonb_build_object('id', v_vendor.id, 'business_name', v_vendor.business_name,
        'brand_color', v_vendor.brand_color, 'rounds_required', v_program.rounds_required));
    END IF;
  END IF;
  SELECT * INTO v_program FROM loyalty_programs WHERE vendor_id = p_vendor_id AND status = 'active' LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active loyalty program for this vendor'; END IF;
  v_rounds_to_award := COALESCE(v_program.default_round_value, 1);

  SELECT * INTO v_campaign FROM round_campaigns c
  WHERE c.vendor_id = p_vendor_id AND c.starts_at <= now() AND c.ends_at > now() AND c.status <> 'cancelled'
    AND (COALESCE(c.campaign_type, 'standard') = 'standard'
      OR (c.campaign_type = 'birthday' AND v_customer.birthday IS NOT NULL
          AND days_to_birthday(v_customer.birthday) <= COALESCE(c.birthday_window_days, 0)))
  ORDER BY c.round_value DESC, c.starts_at DESC LIMIT 1;
  IF FOUND THEN v_rounds_to_award := v_campaign.round_value; END IF;

  -- Attribute to the passed location (portal) or the device's location (NFC),
  -- but only if it actually belongs to this vendor.
  v_location := COALESCE(p_location_id, v_device.location_id);
  IF v_location IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM vendor_locations WHERE id = v_location AND vendor_id = p_vendor_id
  ) THEN
    v_location := NULL;
  END IF;

  INSERT INTO customer_vendor_memberships (customer_id, vendor_id, status, current_rounds, lifetime_rounds)
  VALUES (v_customer.id, p_vendor_id, 'active', 0, 0)
  ON CONFLICT (customer_id, vendor_id) DO UPDATE
    SET status = 'active', activated_at = COALESCE(customer_vendor_memberships.activated_at, now())
  RETURNING * INTO v_membership;
  v_new_total := v_membership.lifetime_rounds + v_rounds_to_award;
  v_rewards_count := floor(v_new_total::numeric / v_program.rounds_required)
                   - floor(v_membership.lifetime_rounds::numeric / v_program.rounds_required);
  v_new_current := v_membership.current_rounds + v_rounds_to_award;
  IF v_rewards_count > 0 THEN
    v_new_current := v_new_current - (v_rewards_count * v_program.rounds_required);
    IF v_new_current < 0 THEN v_new_current := 0; END IF;
  END IF;
  UPDATE customer_vendor_memberships SET current_rounds = v_new_current, lifetime_rounds = v_new_total, updated_at = now()
  WHERE id = v_membership.id;
  INSERT INTO round_transactions (membership_id, customer_id, vendor_id, nfc_device_id, location_id, campaign_id,
    rounds_awarded, source, staff_user_id, idempotency_key)
  VALUES (v_membership.id, v_customer.id, p_vendor_id, v_device.id, v_location, v_campaign.id,
    v_rounds_to_award, p_source, p_staff_user_id, p_idempotency_key) RETURNING id INTO v_tx_id;
  IF v_device.id IS NOT NULL THEN UPDATE nfc_stamp_devices SET last_used_at = now() WHERE id = v_device.id; END IF;
  IF v_rewards_count > 0 THEN
    FOR i IN 1..v_rewards_count LOOP
      INSERT INTO reward_instances (membership_id, customer_id, vendor_id, loyalty_program_id,
        reward_name, reward_description, status)
      VALUES (v_membership.id, v_customer.id, p_vendor_id, v_program.id,
        v_program.reward_name, v_program.reward_description, 'available');
    END LOOP;
  END IF;
  RETURN jsonb_build_object('transaction_id', v_tx_id, 'rounds_awarded', v_rounds_to_award,
    'campaign_id', v_campaign.id, 'campaign_name', v_campaign.name,
    'balance', jsonb_build_object('current_rounds', v_new_current, 'lifetime_rounds', v_new_total),
    'rewards_unlocked', v_rewards_count, 'membership_id', v_membership.id,
    'vendor', jsonb_build_object('id', v_vendor.id, 'business_name', v_vendor.business_name,
    'brand_color', v_vendor.brand_color, 'rounds_required', v_program.rounds_required));
END;
$$;

-- search_path matches 019 so pgcrypto digest() resolves for the NFC branch.
alter function award_rounds_internal(text, uuid, text, text, uuid, text, uuid)
  set search_path = public, extensions;
revoke all on function award_rounds_internal(text, uuid, text, text, uuid, text, uuid) from public, anon;

create or replace function award_rounds(
  p_customer_token text, p_vendor_id uuid default null, p_nfc_device_token text default null,
  p_source text default 'nfc', p_staff_user_id uuid default null, p_idempotency_key text default null,
  p_location_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF p_source IN ('staff_scan', 'vendor_portal') THEN
    IF v_caller IS NULL OR p_staff_user_id IS DISTINCT FROM v_caller THEN
      RAISE EXCEPTION 'staff_user_id must match the authenticated user';
    END IF;
    IF p_vendor_id IS NULL OR NOT (
      is_vendor_staff(p_vendor_id)
      OR EXISTS (SELECT 1 FROM vendors WHERE id = p_vendor_id AND owner_id = v_caller)
    ) THEN
      RAISE EXCEPTION 'Authenticated user does not belong to this vendor';
    END IF;
  ELSIF p_source = 'server_stamp' THEN
    IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'server_stamp source requires the service role'; END IF;
    IF p_vendor_id IS NULL THEN RAISE EXCEPTION 'server_stamp requires p_vendor_id'; END IF;
  ELSIF p_source = 'nfc' THEN
    IF p_nfc_device_token IS NULL OR p_vendor_id IS NOT NULL THEN
      RAISE EXCEPTION 'NFC awards require a device token and no vendor override';
    END IF;
  ELSIF p_source = 'system' THEN
    IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'System awards require the service role'; END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported award source: %', p_source;
  END IF;

  RETURN award_rounds_internal(
    p_customer_token, p_vendor_id, p_nfc_device_token, p_source,
    p_staff_user_id, p_idempotency_key, p_location_id
  );
END;
$$;

revoke all on function award_rounds(text, uuid, text, text, uuid, text, uuid) from public, anon;
grant execute on function award_rounds(text, uuid, text, text, uuid, text, uuid) to authenticated, service_role;
