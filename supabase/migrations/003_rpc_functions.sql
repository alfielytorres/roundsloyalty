-- ============================================================
-- 003_rpc_functions.sql
-- Rounds Loyalty Platform — RPC Functions
--
-- All functions are SECURITY DEFINER so they can bypass RLS
-- and mutate loyalty_balances, loyalty_ledger, reward_instances,
-- customer_vendor_memberships, and proof_of_purchase_claims on
-- behalf of authenticated callers.
--
-- Clients MUST call these instead of mutating tables directly.
-- ============================================================

-- ============================================================
-- join_vendor
-- A customer enrols with a vendor. Safe to call multiple times
-- (idempotent — returns existing membership if already joined).
-- ============================================================
CREATE OR REPLACE FUNCTION join_vendor(p_vendor_id uuid)
RETURNS customer_vendor_memberships
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_vendor        vendors%ROWTYPE;
  v_profile       profiles%ROWTYPE;
  v_membership    customer_vendor_memberships%ROWTYPE;
  v_token         text;
BEGIN
  -- 1. Verify vendor exists and is active
  SELECT * INTO v_vendor FROM vendors WHERE id = p_vendor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor not found';
  END IF;
  IF v_vendor.status != 'active' THEN
    RAISE EXCEPTION 'Vendor is not currently accepting new members';
  END IF;

  -- 2. Verify caller is a customer profile
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  IF v_profile.role != 'customer' THEN
    RAISE EXCEPTION 'Only customers can join a vendor';
  END IF;

  -- 3. Return existing membership if already joined (idempotent)
  SELECT * INTO v_membership
  FROM customer_vendor_memberships
  WHERE customer_id = auth.uid() AND vendor_id = p_vendor_id;

  IF FOUND THEN
    RETURN v_membership;
  END IF;

  -- 4. Generate a unique membership token (no customer/vendor IDs)
  v_token := encode(gen_random_bytes(32), 'hex');

  -- 5. Create membership
  INSERT INTO customer_vendor_memberships
    (customer_id, vendor_id, status, membership_token)
  VALUES
    (auth.uid(), p_vendor_id, 'pending', v_token)
  RETURNING * INTO v_membership;

  -- 6. Initialise loyalty balance if not present
  INSERT INTO loyalty_balances (customer_id, vendor_id, stamps, points)
  VALUES (auth.uid(), p_vendor_id, 0, 0)
  ON CONFLICT (customer_id, vendor_id) DO NOTHING;

  -- 7. Ledger: joined event
  INSERT INTO loyalty_ledger
    (customer_id, vendor_id, membership_id, event_type, source)
  VALUES
    (auth.uid(), p_vendor_id, v_membership.id, 'joined', 'manual');

  RETURN v_membership;
END;
$$;

-- ============================================================
-- activate_membership
-- Staff scans a customer QR code to activate their membership.
-- Optionally issues a new_customer reward if configured.
-- ============================================================
CREATE OR REPLACE FUNCTION activate_membership(
  p_membership_token text,
  p_staff_user_id    uuid
)
RETURNS customer_vendor_memberships
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_membership   customer_vendor_memberships%ROWTYPE;
  v_program      loyalty_programs%ROWTYPE;
  v_rule         reward_rules%ROWTYPE;
  v_already_got  boolean;
BEGIN
  -- 1. Resolve token to membership
  SELECT * INTO v_membership
  FROM customer_vendor_memberships
  WHERE membership_token = p_membership_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership token not found';
  END IF;

  -- 2. Verify the acting staff user belongs to this vendor
  IF NOT (
    EXISTS (
      SELECT 1 FROM vendor_staff
      WHERE vendor_id = v_membership.vendor_id AND user_id = p_staff_user_id
    ) OR EXISTS (
      SELECT 1 FROM vendors
      WHERE id = v_membership.vendor_id AND owner_id = p_staff_user_id
    )
  ) THEN
    RAISE EXCEPTION 'Staff user does not belong to this vendor';
  END IF;

  -- 3. Activate (idempotent — already active memberships are returned unchanged)
  IF v_membership.status != 'active' THEN
    UPDATE customer_vendor_memberships
    SET status = 'active', activated_at = now()
    WHERE id = v_membership.id
    RETURNING * INTO v_membership;

    -- 4. Ledger: activated event
    INSERT INTO loyalty_ledger
      (customer_id, vendor_id, membership_id, event_type, source, staff_user_id)
    VALUES
      (v_membership.customer_id, v_membership.vendor_id, v_membership.id,
       'activated', 'qr', p_staff_user_id);

    -- 5. Check for active new_customer loyalty program + rule
    SELECT lp.* INTO v_program
    FROM loyalty_programs lp
    WHERE lp.vendor_id = v_membership.vendor_id
      AND lp.type = 'new_customer'
      AND lp.status = 'active'
    LIMIT 1;

    IF FOUND THEN
      SELECT rr.* INTO v_rule
      FROM reward_rules rr
      WHERE rr.loyalty_program_id = v_program.id
        AND rr.status = 'active'
      LIMIT 1;

      IF FOUND THEN
        -- Only issue if customer hasn't already received this reward
        SELECT EXISTS (
          SELECT 1 FROM reward_instances
          WHERE customer_id = v_membership.customer_id
            AND reward_rule_id = v_rule.id
        ) INTO v_already_got;

        IF NOT v_already_got THEN
          INSERT INTO reward_instances
            (customer_id, vendor_id, reward_rule_id, status,
             reward_name, reward_description,
             expires_at)
          VALUES (
            v_membership.customer_id,
            v_membership.vendor_id,
            v_rule.id,
            'available',
            v_rule.reward_name,
            v_rule.reward_description,
            CASE WHEN v_rule.expiry_days IS NOT NULL
                 THEN now() + (v_rule.expiry_days || ' days')::interval
                 ELSE NULL END
          );

          INSERT INTO loyalty_ledger
            (customer_id, vendor_id, membership_id, event_type, source, staff_user_id)
          VALUES
            (v_membership.customer_id, v_membership.vendor_id, v_membership.id,
             'reward_earned', 'qr', p_staff_user_id);
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN v_membership;
END;
$$;

-- ============================================================
-- add_stamp
-- Staff adds a stamp to an active membership.
-- Rate-limited to 1 stamp per customer/vendor per 15 minutes.
-- Automatically issues a reward when the threshold is reached.
-- ============================================================
CREATE OR REPLACE FUNCTION add_stamp(
  p_membership_token text,
  p_staff_user_id    uuid
)
RETURNS loyalty_balances
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_membership   customer_vendor_memberships%ROWTYPE;
  v_program      loyalty_programs%ROWTYPE;
  v_rule         reward_rules%ROWTYPE;
  v_balance      loyalty_balances%ROWTYPE;
  v_new_stamps   integer;
  v_recent_stamp boolean;
BEGIN
  -- 1. Resolve token
  SELECT * INTO v_membership
  FROM customer_vendor_memberships
  WHERE membership_token = p_membership_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership token not found';
  END IF;

  -- 2. Verify staff
  IF NOT (
    EXISTS (
      SELECT 1 FROM vendor_staff
      WHERE vendor_id = v_membership.vendor_id AND user_id = p_staff_user_id
    ) OR EXISTS (
      SELECT 1 FROM vendors
      WHERE id = v_membership.vendor_id AND owner_id = p_staff_user_id
    )
  ) THEN
    RAISE EXCEPTION 'Staff user does not belong to this vendor';
  END IF;

  -- 3. Membership must be active
  IF v_membership.status != 'active' THEN
    RAISE EXCEPTION 'Membership is not active';
  END IF;

  -- 4. Rate limit: max 1 stamp per 15 minutes per customer/vendor
  SELECT EXISTS (
    SELECT 1 FROM loyalty_ledger
    WHERE customer_id = v_membership.customer_id
      AND vendor_id   = v_membership.vendor_id
      AND event_type  = 'stamp_added'
      AND created_at  > now() - interval '15 minutes'
  ) INTO v_recent_stamp;

  IF v_recent_stamp THEN
    RAISE EXCEPTION 'Rate limit: max 1 stamp per 15 minutes';
  END IF;

  -- 5. Find active stamp_card program and its rule
  SELECT lp.* INTO v_program
  FROM loyalty_programs lp
  WHERE lp.vendor_id = v_membership.vendor_id
    AND lp.type = 'stamp_card'
    AND lp.status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active stamp card program found for this vendor';
  END IF;

  SELECT rr.* INTO v_rule
  FROM reward_rules rr
  WHERE rr.loyalty_program_id = v_program.id
    AND rr.status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active reward rule found for this stamp program';
  END IF;

  -- 6. Increment stamps
  UPDATE loyalty_balances
  SET stamps     = stamps + 1,
      updated_at = now()
  WHERE customer_id = v_membership.customer_id
    AND vendor_id   = v_membership.vendor_id
  RETURNING * INTO v_balance;

  IF NOT FOUND THEN
    INSERT INTO loyalty_balances (customer_id, vendor_id, stamps, points)
    VALUES (v_membership.customer_id, v_membership.vendor_id, 1, 0)
    RETURNING * INTO v_balance;
  END IF;

  v_new_stamps := v_balance.stamps;

  -- 7. Ledger: stamp_added
  INSERT INTO loyalty_ledger
    (customer_id, vendor_id, membership_id, event_type, stamps_delta, source, staff_user_id)
  VALUES
    (v_membership.customer_id, v_membership.vendor_id, v_membership.id,
     'stamp_added', 1, 'qr', p_staff_user_id);

  -- 8. Threshold reached — issue reward and reset stamps
  IF v_new_stamps >= v_rule.required_stamps THEN
    INSERT INTO reward_instances
      (customer_id, vendor_id, reward_rule_id, status,
       reward_name, reward_description, expires_at)
    VALUES (
      v_membership.customer_id,
      v_membership.vendor_id,
      v_rule.id,
      'available',
      v_rule.reward_name,
      v_rule.reward_description,
      CASE WHEN v_rule.expiry_days IS NOT NULL
           THEN now() + (v_rule.expiry_days || ' days')::interval
           ELSE NULL END
    );

    INSERT INTO loyalty_ledger
      (customer_id, vendor_id, membership_id, event_type, source, staff_user_id)
    VALUES
      (v_membership.customer_id, v_membership.vendor_id, v_membership.id,
       'reward_earned', 'qr', p_staff_user_id);

    -- Reset stamp counter
    UPDATE loyalty_balances
    SET stamps     = 0,
        updated_at = now()
    WHERE customer_id = v_membership.customer_id
      AND vendor_id   = v_membership.vendor_id
    RETURNING * INTO v_balance;
  END IF;

  RETURN v_balance;
END;
$$;

-- ============================================================
-- add_points_from_spend
-- Staff records a purchase amount; points are calculated and
-- added. Issues a reward when the points threshold is reached.
-- ============================================================
CREATE OR REPLACE FUNCTION add_points_from_spend(
  p_membership_token text,
  p_purchase_amount  numeric,
  p_staff_user_id    uuid
)
RETURNS loyalty_balances
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_membership    customer_vendor_memberships%ROWTYPE;
  v_program       loyalty_programs%ROWTYPE;
  v_rule          reward_rules%ROWTYPE;
  v_balance       loyalty_balances%ROWTYPE;
  v_points_earned integer;
  v_has_reward    boolean;
BEGIN
  SELECT * INTO v_membership
  FROM customer_vendor_memberships
  WHERE membership_token = p_membership_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership token not found';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM vendor_staff WHERE vendor_id = v_membership.vendor_id AND user_id = p_staff_user_id)
    OR EXISTS (SELECT 1 FROM vendors WHERE id = v_membership.vendor_id AND owner_id = p_staff_user_id)
  ) THEN
    RAISE EXCEPTION 'Staff user does not belong to this vendor';
  END IF;

  IF v_membership.status != 'active' THEN
    RAISE EXCEPTION 'Membership is not active';
  END IF;

  SELECT lp.* INTO v_program
  FROM loyalty_programs lp
  WHERE lp.vendor_id = v_membership.vendor_id AND lp.type = 'points' AND lp.status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active points program found for this vendor';
  END IF;

  SELECT rr.* INTO v_rule FROM reward_rules rr
  WHERE rr.loyalty_program_id = v_program.id AND rr.status = 'active' LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active reward rule found for this points program';
  END IF;

  v_points_earned := floor(p_purchase_amount * v_rule.points_multiplier);

  IF v_points_earned < 0 THEN
    RAISE EXCEPTION 'Invalid purchase amount';
  END IF;

  UPDATE loyalty_balances
  SET points = points + v_points_earned, updated_at = now()
  WHERE customer_id = v_membership.customer_id AND vendor_id = v_membership.vendor_id
  RETURNING * INTO v_balance;

  IF NOT FOUND THEN
    INSERT INTO loyalty_balances (customer_id, vendor_id, stamps, points)
    VALUES (v_membership.customer_id, v_membership.vendor_id, 0, v_points_earned)
    RETURNING * INTO v_balance;
  END IF;

  INSERT INTO loyalty_ledger
    (customer_id, vendor_id, membership_id, event_type, points_delta, source, staff_user_id, metadata)
  VALUES
    (v_membership.customer_id, v_membership.vendor_id, v_membership.id,
     'points_added', v_points_earned, 'qr', p_staff_user_id,
     jsonb_build_object('purchase_amount', p_purchase_amount));

  IF v_balance.points >= v_rule.points_required THEN
    SELECT EXISTS (
      SELECT 1 FROM reward_instances
      WHERE customer_id = v_membership.customer_id AND vendor_id = v_membership.vendor_id
        AND reward_rule_id = v_rule.id AND status = 'available'
    ) INTO v_has_reward;

    IF NOT v_has_reward THEN
      INSERT INTO reward_instances
        (customer_id, vendor_id, reward_rule_id, status, reward_name, reward_description, expires_at)
      VALUES (
        v_membership.customer_id, v_membership.vendor_id, v_rule.id, 'available',
        v_rule.reward_name, v_rule.reward_description,
        CASE WHEN v_rule.expiry_days IS NOT NULL
             THEN now() + (v_rule.expiry_days || ' days')::interval ELSE NULL END
      );

      INSERT INTO loyalty_ledger
        (customer_id, vendor_id, membership_id, event_type, source, staff_user_id)
      VALUES
        (v_membership.customer_id, v_membership.vendor_id, v_membership.id,
         'reward_earned', 'qr', p_staff_user_id);
    END IF;
  END IF;

  RETURN v_balance;
END;
$$;

-- ============================================================
-- redeem_reward
-- ============================================================
CREATE OR REPLACE FUNCTION redeem_reward(
  p_reward_instance_id uuid,
  p_staff_user_id      uuid
)
RETURNS reward_instances
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reward   reward_instances%ROWTYPE;
  v_rule     reward_rules%ROWTYPE;
BEGIN
  SELECT * INTO v_reward FROM reward_instances WHERE id = p_reward_instance_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reward not found'; END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM vendor_staff WHERE vendor_id = v_reward.vendor_id AND user_id = p_staff_user_id)
    OR EXISTS (SELECT 1 FROM vendors WHERE id = v_reward.vendor_id AND owner_id = p_staff_user_id)
  ) THEN
    RAISE EXCEPTION 'Staff user does not belong to this vendor';
  END IF;

  IF v_reward.status != 'available' THEN
    RAISE EXCEPTION 'Reward is not available for redemption (status: %)', v_reward.status;
  END IF;

  IF v_reward.expires_at IS NOT NULL AND now() > v_reward.expires_at THEN
    RAISE EXCEPTION 'Reward has expired';
  END IF;

  UPDATE reward_instances SET status = 'redeemed', redeemed_at = now()
  WHERE id = p_reward_instance_id RETURNING * INTO v_reward;

  IF v_reward.reward_rule_id IS NOT NULL THEN
    SELECT * INTO v_rule FROM reward_rules WHERE id = v_reward.reward_rule_id;
    IF FOUND AND v_rule.type IN ('spend_points', 'points_redemption') AND v_rule.points_required IS NOT NULL THEN
      UPDATE loyalty_balances
      SET points = GREATEST(0, points - v_rule.points_required), updated_at = now()
      WHERE customer_id = v_reward.customer_id AND vendor_id = v_reward.vendor_id;
    END IF;
  END IF;

  INSERT INTO loyalty_ledger
    (customer_id, vendor_id, event_type, source, staff_user_id, metadata)
  VALUES
    (v_reward.customer_id, v_reward.vendor_id, 'reward_redeemed', 'qr', p_staff_user_id,
     jsonb_build_object('reward_instance_id', p_reward_instance_id));

  RETURN v_reward;
END;
$$;

-- ============================================================
-- void_last_transaction
-- ============================================================
CREATE OR REPLACE FUNCTION void_last_transaction(
  p_ledger_id     uuid,
  p_staff_user_id uuid
)
RETURNS loyalty_ledger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entry loyalty_ledger%ROWTYPE;
BEGIN
  SELECT * INTO v_entry FROM loyalty_ledger WHERE id = p_ledger_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ledger entry not found'; END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM vendor_staff WHERE vendor_id = v_entry.vendor_id AND user_id = p_staff_user_id)
    OR EXISTS (SELECT 1 FROM vendors WHERE id = v_entry.vendor_id AND owner_id = p_staff_user_id)
  ) THEN
    RAISE EXCEPTION 'Staff user does not belong to this vendor';
  END IF;

  IF v_entry.created_at <= now() - interval '24 hours' THEN
    RAISE EXCEPTION 'Transaction can only be voided within 24 hours';
  END IF;

  IF v_entry.event_type IN ('transaction_voided', 'joined', 'activated') THEN
    RAISE EXCEPTION 'Cannot void event of type: %', v_entry.event_type;
  END IF;

  IF v_entry.stamps_delta != 0 OR v_entry.points_delta != 0 THEN
    UPDATE loyalty_balances
    SET stamps = GREATEST(0, stamps - v_entry.stamps_delta),
        points = GREATEST(0, points - v_entry.points_delta),
        updated_at = now()
    WHERE customer_id = v_entry.customer_id AND vendor_id = v_entry.vendor_id;
  END IF;

  INSERT INTO loyalty_ledger
    (customer_id, vendor_id, membership_id, event_type, points_delta, stamps_delta,
     source, staff_user_id, metadata)
  VALUES
    (v_entry.customer_id, v_entry.vendor_id, v_entry.membership_id,
     'transaction_voided', -v_entry.points_delta, -v_entry.stamps_delta,
     'manual', p_staff_user_id, jsonb_build_object('voided_ledger_id', p_ledger_id));

  RETURN v_entry;
END;
$$;

-- ============================================================
-- submit_proof_of_purchase
-- ============================================================
CREATE OR REPLACE FUNCTION submit_proof_of_purchase(
  p_vendor_id         uuid,
  p_receipt_image_url text,
  p_purchase_amount   numeric,
  p_purchase_date     date,
  p_customer_note     text
)
RETURNS proof_of_purchase_claims
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_vendor     vendors%ROWTYPE;
  v_profile    profiles%ROWTYPE;
  v_membership customer_vendor_memberships%ROWTYPE;
  v_claim      proof_of_purchase_claims%ROWTYPE;
BEGIN
  SELECT * INTO v_vendor FROM vendors WHERE id = p_vendor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vendor not found'; END IF;
  IF NOT v_vendor.proof_of_purchase_enabled THEN
    RAISE EXCEPTION 'This vendor does not accept proof of purchase claims';
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_profile.role != 'customer' THEN
    RAISE EXCEPTION 'Only customers can submit proof of purchase claims';
  END IF;

  SELECT * INTO v_membership
  FROM customer_vendor_memberships
  WHERE customer_id = auth.uid() AND vendor_id = p_vendor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'You must be a member of this vendor before submitting a claim';
  END IF;

  IF p_purchase_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Purchase date cannot be in the future';
  END IF;

  IF p_purchase_date < (CURRENT_DATE - (v_vendor.proof_of_purchase_max_claim_age_days || ' days')::interval)::date THEN
    RAISE EXCEPTION 'Purchase date is older than the maximum claim age of % days',
      v_vendor.proof_of_purchase_max_claim_age_days;
  END IF;

  INSERT INTO proof_of_purchase_claims
    (customer_id, vendor_id, membership_id, receipt_image_url, purchase_amount,
     purchase_date, customer_note, status)
  VALUES
    (auth.uid(), p_vendor_id, v_membership.id, p_receipt_image_url, p_purchase_amount,
     p_purchase_date, p_customer_note, 'pending_review')
  RETURNING * INTO v_claim;

  INSERT INTO loyalty_ledger
    (customer_id, vendor_id, membership_id, event_type, source, metadata)
  VALUES
    (auth.uid(), p_vendor_id, v_membership.id,
     'proof_purchase_submitted', 'proof_of_purchase',
     jsonb_build_object('claim_id', v_claim.id));

  RETURN v_claim;
END;
$$;

-- ============================================================
-- review_proof_of_purchase
-- ============================================================
CREATE OR REPLACE FUNCTION review_proof_of_purchase(
  p_claim_id        uuid,
  p_decision        text,
  p_reward_action   text,
  p_purchase_amount numeric,
  p_vendor_note     text,
  p_staff_user_id   uuid
)
RETURNS proof_of_purchase_claims
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_claim      proof_of_purchase_claims%ROWTYPE;
  v_membership customer_vendor_memberships%ROWTYPE;
  v_program    loyalty_programs%ROWTYPE;
  v_rule       reward_rules%ROWTYPE;
  v_balance    loyalty_balances%ROWTYPE;
  v_new_stamps integer;
  v_points     integer;
  v_already    boolean;
  v_amount     numeric;
BEGIN
  SELECT * INTO v_claim FROM proof_of_purchase_claims WHERE id = p_claim_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found'; END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM vendor_staff WHERE vendor_id = v_claim.vendor_id AND user_id = p_staff_user_id)
    OR EXISTS (SELECT 1 FROM vendors WHERE id = v_claim.vendor_id AND owner_id = p_staff_user_id)
  ) THEN
    RAISE EXCEPTION 'Staff user does not belong to this vendor';
  END IF;

  -- Prevent self-review
  IF auth.uid() = v_claim.customer_id THEN
    RAISE EXCEPTION 'You cannot review your own proof of purchase claim';
  END IF;

  IF v_claim.status NOT IN ('pending_review', 'needs_more_info') THEN
    RAISE EXCEPTION 'Claim is not in a reviewable state (status: %)', v_claim.status;
  END IF;

  IF p_decision NOT IN ('approved', 'rejected', 'needs_more_info') THEN
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  UPDATE proof_of_purchase_claims
  SET status = p_decision, reviewed_by = p_staff_user_id, reviewed_at = now(),
      vendor_note = p_vendor_note, reward_action = p_reward_action
  WHERE id = p_claim_id RETURNING * INTO v_claim;

  IF p_decision = 'rejected' THEN
    INSERT INTO loyalty_ledger
      (customer_id, vendor_id, membership_id, event_type, source, staff_user_id, metadata)
    VALUES
      (v_claim.customer_id, v_claim.vendor_id, v_claim.membership_id,
       'proof_purchase_rejected', 'proof_of_purchase', p_staff_user_id,
       jsonb_build_object('claim_id', p_claim_id));

  ELSIF p_decision = 'needs_more_info' THEN
    INSERT INTO loyalty_ledger
      (customer_id, vendor_id, membership_id, event_type, source, staff_user_id, metadata)
    VALUES
      (v_claim.customer_id, v_claim.vendor_id, v_claim.membership_id,
       'proof_purchase_needs_more_info', 'proof_of_purchase', p_staff_user_id,
       jsonb_build_object('claim_id', p_claim_id));

  ELSIF p_decision = 'approved' THEN
    INSERT INTO loyalty_ledger
      (customer_id, vendor_id, membership_id, event_type, source, staff_user_id, metadata)
    VALUES
      (v_claim.customer_id, v_claim.vendor_id, v_claim.membership_id,
       'proof_purchase_approved', 'proof_of_purchase', p_staff_user_id,
       jsonb_build_object('claim_id', p_claim_id));

    SELECT * INTO v_membership FROM customer_vendor_memberships WHERE id = v_claim.membership_id;

    IF v_membership.status = 'pending' THEN
      UPDATE customer_vendor_memberships SET status = 'active', activated_at = now()
      WHERE id = v_membership.id;
      INSERT INTO loyalty_ledger
        (customer_id, vendor_id, membership_id, event_type, source, staff_user_id)
      VALUES
        (v_claim.customer_id, v_claim.vendor_id, v_membership.id,
         'activated', 'proof_of_purchase', p_staff_user_id);
    END IF;

    -- Check new_customer reward
    SELECT lp.* INTO v_program FROM loyalty_programs lp
    WHERE lp.vendor_id = v_claim.vendor_id AND lp.type = 'new_customer' AND lp.status = 'active' LIMIT 1;
    IF FOUND THEN
      SELECT rr.* INTO v_rule FROM reward_rules rr
      WHERE rr.loyalty_program_id = v_program.id AND rr.status = 'active' LIMIT 1;
      IF FOUND THEN
        SELECT EXISTS (SELECT 1 FROM reward_instances
          WHERE customer_id = v_claim.customer_id AND reward_rule_id = v_rule.id) INTO v_already;
        IF NOT v_already THEN
          INSERT INTO reward_instances
            (customer_id, vendor_id, reward_rule_id, status, reward_name, reward_description, expires_at)
          VALUES (v_claim.customer_id, v_claim.vendor_id, v_rule.id, 'available',
            v_rule.reward_name, v_rule.reward_description,
            CASE WHEN v_rule.expiry_days IS NOT NULL
                 THEN now() + (v_rule.expiry_days || ' days')::interval ELSE NULL END);
          INSERT INTO loyalty_ledger
            (customer_id, vendor_id, membership_id, event_type, source, staff_user_id)
          VALUES (v_claim.customer_id, v_claim.vendor_id, v_membership.id,
            'reward_earned', 'proof_of_purchase', p_staff_user_id);
        END IF;
      END IF;
    END IF;

    -- Execute reward_action
    IF p_reward_action = 'add_stamp' THEN
      SELECT lp.* INTO v_program FROM loyalty_programs lp
      WHERE lp.vendor_id = v_claim.vendor_id AND lp.type = 'stamp_card' AND lp.status = 'active' LIMIT 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'No active stamp card program found for this vendor'; END IF;
      SELECT rr.* INTO v_rule FROM reward_rules rr
      WHERE rr.loyalty_program_id = v_program.id AND rr.status = 'active' LIMIT 1;

      UPDATE loyalty_balances SET stamps = stamps + 1, updated_at = now()
      WHERE customer_id = v_claim.customer_id AND vendor_id = v_claim.vendor_id
      RETURNING * INTO v_balance;
      IF NOT FOUND THEN
        INSERT INTO loyalty_balances (customer_id, vendor_id, stamps, points)
        VALUES (v_claim.customer_id, v_claim.vendor_id, 1, 0) RETURNING * INTO v_balance;
      END IF;
      v_new_stamps := v_balance.stamps;

      INSERT INTO loyalty_ledger
        (customer_id, vendor_id, membership_id, event_type, stamps_delta, source, staff_user_id, metadata)
      VALUES (v_claim.customer_id, v_claim.vendor_id, v_claim.membership_id,
        'proof_purchase_stamp_added', 1, 'proof_of_purchase', p_staff_user_id,
        jsonb_build_object('claim_id', p_claim_id));

      IF v_rule.required_stamps IS NOT NULL AND v_new_stamps >= v_rule.required_stamps THEN
        INSERT INTO reward_instances
          (customer_id, vendor_id, reward_rule_id, status, reward_name, reward_description, expires_at)
        VALUES (v_claim.customer_id, v_claim.vendor_id, v_rule.id, 'available',
          v_rule.reward_name, v_rule.reward_description,
          CASE WHEN v_rule.expiry_days IS NOT NULL
               THEN now() + (v_rule.expiry_days || ' days')::interval ELSE NULL END);
        INSERT INTO loyalty_ledger
          (customer_id, vendor_id, membership_id, event_type, source, staff_user_id)
        VALUES (v_claim.customer_id, v_claim.vendor_id, v_claim.membership_id,
          'reward_earned', 'proof_of_purchase', p_staff_user_id);
        UPDATE loyalty_balances SET stamps = 0, updated_at = now()
        WHERE customer_id = v_claim.customer_id AND vendor_id = v_claim.vendor_id;
      END IF;

    ELSIF p_reward_action = 'add_points' THEN
      v_amount := COALESCE(NULLIF(p_purchase_amount, 0), v_claim.purchase_amount);
      IF v_amount IS NULL OR v_amount <= 0 THEN
        RAISE EXCEPTION 'A valid purchase amount is required to add points';
      END IF;

      SELECT lp.* INTO v_program FROM loyalty_programs lp
      WHERE lp.vendor_id = v_claim.vendor_id AND lp.type = 'points' AND lp.status = 'active' LIMIT 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'No active points program found for this vendor'; END IF;
      SELECT rr.* INTO v_rule FROM reward_rules rr
      WHERE rr.loyalty_program_id = v_program.id AND rr.status = 'active' LIMIT 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'No active reward rule found for this points program'; END IF;

      v_points := floor(v_amount * v_rule.points_multiplier);

      UPDATE loyalty_balances SET points = points + v_points, updated_at = now()
      WHERE customer_id = v_claim.customer_id AND vendor_id = v_claim.vendor_id
      RETURNING * INTO v_balance;
      IF NOT FOUND THEN
        INSERT INTO loyalty_balances (customer_id, vendor_id, stamps, points)
        VALUES (v_claim.customer_id, v_claim.vendor_id, 0, v_points) RETURNING * INTO v_balance;
      END IF;

      INSERT INTO loyalty_ledger
        (customer_id, vendor_id, membership_id, event_type, points_delta, source, staff_user_id, metadata)
      VALUES (v_claim.customer_id, v_claim.vendor_id, v_claim.membership_id,
        'proof_purchase_points_added', v_points, 'proof_of_purchase', p_staff_user_id,
        jsonb_build_object('claim_id', p_claim_id, 'purchase_amount', v_amount));

      IF v_rule.points_required IS NOT NULL AND v_balance.points >= v_rule.points_required THEN
        SELECT EXISTS (SELECT 1 FROM reward_instances
          WHERE customer_id = v_claim.customer_id AND vendor_id = v_claim.vendor_id
            AND reward_rule_id = v_rule.id AND status = 'available') INTO v_already;
        IF NOT v_already THEN
          INSERT INTO reward_instances
            (customer_id, vendor_id, reward_rule_id, status, reward_name, reward_description, expires_at)
          VALUES (v_claim.customer_id, v_claim.vendor_id, v_rule.id, 'available',
            v_rule.reward_name, v_rule.reward_description,
            CASE WHEN v_rule.expiry_days IS NOT NULL
                 THEN now() + (v_rule.expiry_days || ' days')::interval ELSE NULL END);
          INSERT INTO loyalty_ledger
            (customer_id, vendor_id, membership_id, event_type, source, staff_user_id)
          VALUES (v_claim.customer_id, v_claim.vendor_id, v_claim.membership_id,
            'reward_earned', 'proof_of_purchase', p_staff_user_id);
        END IF;
      END IF;

    ELSIF p_reward_action = 'issue_reward' THEN
      SELECT rr.* INTO v_rule
      FROM reward_rules rr
      JOIN loyalty_programs lp ON lp.id = rr.loyalty_program_id
      WHERE lp.vendor_id = v_claim.vendor_id AND rr.status = 'active' AND lp.status = 'active'
      ORDER BY lp.type LIMIT 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'No active reward rule found to issue a reward'; END IF;

      INSERT INTO reward_instances
        (customer_id, vendor_id, reward_rule_id, status, reward_name, reward_description, expires_at)
      VALUES (v_claim.customer_id, v_claim.vendor_id, v_rule.id, 'available',
        v_rule.reward_name, v_rule.reward_description,
        CASE WHEN v_rule.expiry_days IS NOT NULL
             THEN now() + (v_rule.expiry_days || ' days')::interval ELSE NULL END);

      INSERT INTO loyalty_ledger
        (customer_id, vendor_id, membership_id, event_type, source, staff_user_id, metadata)
      VALUES (v_claim.customer_id, v_claim.vendor_id, v_claim.membership_id,
        'proof_purchase_reward_issued', 'proof_of_purchase', p_staff_user_id,
        jsonb_build_object('claim_id', p_claim_id));
    END IF;
    -- 'approve_only' and 'none': no reward action needed
  END IF;

  RETURN v_claim;
END;
$$;
