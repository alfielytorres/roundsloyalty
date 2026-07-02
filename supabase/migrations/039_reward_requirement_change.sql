-- Make reward accounting robust to a store changing rounds_required (e.g. 10 -> 6)
-- without losing a customer's accumulated stamps.
--
-- Rewards outstanding for a membership should always equal
--   floor(current_rounds / rounds_required)
-- evaluated against the CURRENT requirement. award_rounds_internal now reconciles
-- to that target (never revoking already-granted rewards) instead of relying on
-- lifetime crossings, and a trigger reconciles every affected member the moment
-- the requirement changes. current_rounds keeps accumulating and only decrements
-- on collection, so surplus stamps carry over.

create or replace function award_rounds_internal(
  p_customer_token text, p_vendor_id uuid, p_nfc_token text default null,
  p_source text default 'nfc', p_staff_user_id uuid default null,
  p_idempotency_key text default null, p_location_id uuid default null
)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
DECLARE
  v_customer profiles%ROWTYPE; v_vendor vendors%ROWTYPE; v_device nfc_stamp_devices%ROWTYPE;
  v_membership customer_vendor_memberships%ROWTYPE; v_program loyalty_programs%ROWTYPE;
  v_campaign round_campaigns%ROWTYPE; v_existing_tx uuid; v_tx_id uuid;
  v_rounds_to_award integer; v_new_total integer; v_new_current integer; v_rewards_count integer := 0;
  v_existing_rewards integer; v_location uuid;
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

  v_new_total := v_membership.lifetime_rounds + v_rounds_to_award;   -- stats only
  v_new_current := v_membership.current_rounds + v_rounds_to_award;  -- unredeemed stamps

  -- Outstanding rewards should equal floor(current / required) at the current
  -- requirement. Create only the shortfall (never revoke earned rewards).
  SELECT count(*) INTO v_existing_rewards FROM reward_instances
  WHERE membership_id = v_membership.id AND status NOT IN ('collected', 'expired', 'cancelled');
  v_rewards_count := greatest(0, floor(v_new_current::numeric / v_program.rounds_required)::int - v_existing_rewards);

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
    INSERT INTO customer_notifications (customer_id, vendor_id, title, body)
    VALUES (v_customer.id, p_vendor_id,
      COALESCE(v_vendor.business_name, 'Your reward') || ': reward unlocked 🎉',
      'You earned ' || COALESCE(v_program.reward_name, 'a reward') || '! Open Rounds to collect it.');
  END IF;
  RETURN jsonb_build_object('transaction_id', v_tx_id, 'rounds_awarded', v_rounds_to_award,
    'campaign_id', v_campaign.id, 'campaign_name', v_campaign.name,
    'balance', jsonb_build_object('current_rounds', v_new_current, 'lifetime_rounds', v_new_total),
    'rewards_unlocked', v_rewards_count, 'membership_id', v_membership.id,
    'vendor', jsonb_build_object('id', v_vendor.id, 'business_name', v_vendor.business_name,
    'brand_color', v_vendor.brand_color, 'rounds_required', v_program.rounds_required));
END;
$function$;

-- Materialise any rewards that existing balances are now owed (used when the
-- requirement changes). Never revokes; never resets stamps.
create or replace function reconcile_vendor_rewards(p_vendor_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
DECLARE
  v_program loyalty_programs%ROWTYPE;
  v_biz text;
  m RECORD; v_target int; v_existing int; v_create int;
BEGIN
  SELECT * INTO v_program FROM loyalty_programs WHERE vendor_id = p_vendor_id AND status = 'active' LIMIT 1;
  IF NOT FOUND OR COALESCE(v_program.rounds_required, 0) < 1 THEN RETURN; END IF;
  SELECT business_name INTO v_biz FROM vendors WHERE id = p_vendor_id;
  FOR m IN
    SELECT * FROM customer_vendor_memberships
    WHERE vendor_id = p_vendor_id AND current_rounds >= v_program.rounds_required
  LOOP
    v_target := floor(m.current_rounds::numeric / v_program.rounds_required)::int;
    SELECT count(*) INTO v_existing FROM reward_instances
    WHERE membership_id = m.id AND status NOT IN ('collected', 'expired', 'cancelled');
    v_create := greatest(0, v_target - v_existing);
    IF v_create > 0 THEN
      FOR i IN 1..v_create LOOP
        INSERT INTO reward_instances (membership_id, customer_id, vendor_id, loyalty_program_id,
          reward_name, reward_description, status)
        VALUES (m.id, m.customer_id, p_vendor_id, v_program.id,
          v_program.reward_name, v_program.reward_description, 'available');
      END LOOP;
      INSERT INTO customer_notifications (customer_id, vendor_id, title, body)
      VALUES (m.customer_id, p_vendor_id,
        COALESCE(v_biz, 'Your reward') || ': reward unlocked 🎉',
        'You earned ' || COALESCE(v_program.reward_name, 'a reward') || '! Open Rounds to collect it.');
    END IF;
  END LOOP;
END;
$$;
revoke all on function reconcile_vendor_rewards(uuid) from public, anon, authenticated;

-- Reconcile everyone the instant the requirement changes.
create or replace function trg_reconcile_on_program_change()
returns trigger language plpgsql security definer set search_path to 'public' as $$
BEGIN
  IF new.status = 'active' AND new.rounds_required IS DISTINCT FROM old.rounds_required THEN
    PERFORM reconcile_vendor_rewards(new.vendor_id);
  END IF;
  RETURN new;
END;
$$;

drop trigger if exists reconcile_rewards_on_program_update on loyalty_programs;
create trigger reconcile_rewards_on_program_update
  after update on loyalty_programs
  for each row execute function trg_reconcile_on_program_change();
