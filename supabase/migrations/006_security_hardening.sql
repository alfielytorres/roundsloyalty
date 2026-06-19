-- Harden authorization and RPC access for the Rounds MVP schema.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, role, display_name)
  VALUES (
    NEW.id,
    'customer',
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- User-editable metadata must not control authorization fields.
REVOKE UPDATE ON profiles FROM anon, authenticated;
GRANT UPDATE (display_name, avatar_url, expo_push_token, push_token)
  ON profiles TO authenticated;

-- Owners need access before their vendor_staff record has been created.
DROP POLICY IF EXISTS "vendors: staff update" ON vendors;
CREATE POLICY "vendors: staff update"
  ON vendors FOR UPDATE
  USING (owner_id = auth.uid() OR is_vendor_staff(id))
  WITH CHECK (owner_id = auth.uid() OR is_vendor_staff(id));

DROP POLICY IF EXISTS "loyalty_programs: staff write" ON loyalty_programs;
CREATE POLICY "loyalty_programs: staff write"
  ON loyalty_programs FOR ALL
  USING (
    is_vendor_staff(vendor_id)
    OR EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = loyalty_programs.vendor_id
        AND vendors.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    is_vendor_staff(vendor_id)
    OR EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = loyalty_programs.vendor_id
        AND vendors.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vendor_staff: owner manage" ON vendor_staff;
CREATE POLICY "vendor_staff: owner manage"
  ON vendor_staff FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_staff.vendor_id
        AND vendors.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM vendors
      WHERE vendors.id = vendor_staff.vendor_id
        AND vendors.owner_id = auth.uid()
    )
  );

-- Keep the original transaction implementation private and validate its caller.
ALTER FUNCTION award_rounds(text, uuid, text, text, uuid, text)
  RENAME TO award_rounds_internal;

REVOKE ALL ON FUNCTION award_rounds_internal(text, uuid, text, text, uuid, text)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION award_rounds(
  p_customer_token    text,
  p_vendor_id         uuid    DEFAULT NULL,
  p_nfc_device_token  text    DEFAULT NULL,
  p_source            text    DEFAULT 'nfc',
  p_staff_user_id     uuid    DEFAULT NULL,
  p_idempotency_key   text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF p_source IN ('staff_scan', 'vendor_portal') THEN
    IF v_caller IS NULL OR p_staff_user_id IS DISTINCT FROM v_caller THEN
      RAISE EXCEPTION 'staff_user_id must match the authenticated user';
    END IF;
    IF p_vendor_id IS NULL OR NOT (
      is_vendor_staff(p_vendor_id)
      OR EXISTS (
        SELECT 1 FROM vendors
        WHERE id = p_vendor_id AND owner_id = v_caller
      )
    ) THEN
      RAISE EXCEPTION 'Authenticated user does not belong to this vendor';
    END IF;
  ELSIF p_source = 'nfc' THEN
    IF p_nfc_device_token IS NULL OR p_vendor_id IS NOT NULL THEN
      RAISE EXCEPTION 'NFC awards require a device token and no vendor override';
    END IF;
  ELSIF p_source = 'system' THEN
    IF auth.role() <> 'service_role' THEN
      RAISE EXCEPTION 'System awards require the service role';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported award source: %', p_source;
  END IF;

  RETURN award_rounds_internal(
    p_customer_token,
    p_vendor_id,
    p_nfc_device_token,
    p_source,
    p_staff_user_id,
    p_idempotency_key
  );
END;
$$;

REVOKE ALL ON FUNCTION award_rounds(text, uuid, text, text, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION award_rounds(text, uuid, text, text, uuid, text)
  TO authenticated, service_role;

-- Customer collection requests must belong to the authenticated user.
CREATE OR REPLACE FUNCTION request_reward_collection(
  p_reward_instance_id uuid,
  p_customer_id        uuid,
  p_selected_option    text DEFAULT NULL,
  p_customer_note      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward  reward_instances%ROWTYPE;
  v_code    text;
  v_coll_id uuid;
  i         integer;
BEGIN
  IF auth.uid() IS NULL OR p_customer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Customer ID must match the authenticated user';
  END IF;

  SELECT * INTO v_reward
  FROM reward_instances
  WHERE id = p_reward_instance_id
    AND customer_id = auth.uid()
    AND status = 'available';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found or not available';
  END IF;

  FOR i IN 1..10 LOOP
    v_code := generate_collection_code();
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM reward_collections WHERE collection_code = v_code
    );
  END LOOP;

  INSERT INTO reward_collections (
    reward_instance_id, customer_id, vendor_id,
    collection_code, selected_option, customer_note
  ) VALUES (
    v_reward.id, auth.uid(), v_reward.vendor_id,
    v_code, p_selected_option, p_customer_note
  )
  RETURNING id INTO v_coll_id;

  UPDATE reward_instances
  SET status = 'collection_requested', updated_at = now()
  WHERE id = v_reward.id;

  RETURN jsonb_build_object(
    'collection_id', v_coll_id,
    'collection_code', v_code
  );
END;
$$;

-- Compatibility overload for the current iOS client.
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
  v_reward_id uuid;
BEGIN
  SELECT id INTO v_reward_id
  FROM reward_instances
  WHERE reward_instances.membership_id = $1
    AND customer_id = auth.uid()
    AND status = 'available'
  ORDER BY created_at
  LIMIT 1;

  IF v_reward_id IS NULL THEN
    RAISE EXCEPTION 'No available reward found for this membership';
  END IF;

  RETURN request_reward_collection(v_reward_id, auth.uid(), NULL, note);
END;
$$;

REVOKE ALL ON FUNCTION request_reward_collection(uuid, uuid, text, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION request_reward_collection(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION request_reward_collection(uuid, uuid, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION request_reward_collection(uuid, text)
  TO authenticated;

-- Staff collection actions derive identity from auth.uid().
DROP FUNCTION mark_collection_ready(uuid, uuid);
CREATE FUNCTION mark_collection_ready(p_collection_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coll reward_collections%ROWTYPE;
BEGIN
  SELECT * INTO v_coll FROM reward_collections WHERE id = p_collection_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Collection not found'; END IF;
  IF v_coll.status <> 'requested' THEN
    RAISE EXCEPTION 'Collection is not in requested state';
  END IF;
  IF auth.uid() IS NULL OR NOT (
    is_vendor_staff(v_coll.vendor_id)
    OR EXISTS (
      SELECT 1 FROM vendors
      WHERE id = v_coll.vendor_id AND owner_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Authenticated user does not belong to this vendor';
  END IF;

  UPDATE reward_collections
  SET status = 'ready', ready_at = now(), updated_at = now()
  WHERE id = p_collection_id;
  UPDATE reward_instances
  SET status = 'ready', updated_at = now()
  WHERE id = v_coll.reward_instance_id;

  RETURN jsonb_build_object('collection_id', p_collection_id, 'status', 'ready');
END;
$$;

DROP FUNCTION complete_reward_collection(uuid, uuid);
CREATE FUNCTION complete_reward_collection(p_collection_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coll reward_collections%ROWTYPE;
BEGIN
  SELECT * INTO v_coll FROM reward_collections WHERE id = p_collection_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Collection not found'; END IF;
  IF v_coll.status NOT IN ('requested', 'ready') THEN
    RAISE EXCEPTION 'Collection cannot be completed from its current state';
  END IF;
  IF auth.uid() IS NULL OR NOT (
    is_vendor_staff(v_coll.vendor_id)
    OR EXISTS (
      SELECT 1 FROM vendors
      WHERE id = v_coll.vendor_id AND owner_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Authenticated user does not belong to this vendor';
  END IF;

  UPDATE reward_collections
  SET status = 'collected',
      collected_at = now(),
      completed_by = auth.uid(),
      updated_at = now()
  WHERE id = p_collection_id;
  UPDATE reward_instances
  SET status = 'collected', updated_at = now()
  WHERE id = v_coll.reward_instance_id;

  RETURN jsonb_build_object('collection_id', p_collection_id, 'status', 'collected');
END;
$$;

REVOKE ALL ON FUNCTION mark_collection_ready(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION complete_reward_collection(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mark_collection_ready(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_reward_collection(uuid) TO authenticated;

REVOKE ALL ON FUNCTION generate_collection_code() FROM PUBLIC, anon, authenticated;
