-- Fix 1: QR scan overload so iOS customers can scan a store QR code.
-- The store QR encodes base64(JSON({ join_token: "..." })).
-- This function decodes that payload and calls award_rounds_internal.

CREATE OR REPLACE FUNCTION award_rounds(qr_payload text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_json        jsonb;
  v_join_token  text;
  v_vendor      vendors%ROWTYPE;
  v_customer    profiles%ROWTYPE;
  v_idem_key    text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Decode base64 JSON
  BEGIN
    v_json := convert_from(decode(qr_payload, 'base64'), 'UTF8')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid QR payload';
  END;

  v_join_token := v_json->>'join_token';
  IF v_join_token IS NULL THEN
    RAISE EXCEPTION 'QR payload missing join_token';
  END IF;

  SELECT * INTO v_vendor FROM vendors WHERE join_token = v_join_token AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store not found or not active';
  END IF;

  SELECT * INTO v_customer FROM profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_customer.customer_token IS NULL THEN
    RAISE EXCEPTION 'Customer profile not found';
  END IF;

  -- Idempotency window: one award per customer per store per hour
  v_idem_key := encode(
    sha256((auth.uid()::text || v_join_token || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD-HH24'))::bytea),
    'hex'
  );

  RETURN award_rounds_internal(
    v_customer.customer_token,
    v_vendor.id,
    NULL,         -- no NFC device token
    'qr_scan',
    NULL,         -- no staff user
    v_idem_key
  );
END;
$$;

REVOKE ALL ON FUNCTION award_rounds(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION award_rounds(text) TO authenticated;


-- Fix 2: Add 'server_stamp' source to award_rounds so the Next.js API route
-- can use the service role key (bypassing auth.uid() check after validating
-- staff/owner server-side).

CREATE OR REPLACE FUNCTION award_rounds(
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
  ELSIF p_source = 'server_stamp' THEN
    -- Called from the Next.js API route using the service role key.
    -- Staff/owner validation was already performed server-side.
    IF auth.role() <> 'service_role' THEN
      RAISE EXCEPTION 'server_stamp source requires the service role';
    END IF;
    IF p_vendor_id IS NULL THEN
      RAISE EXCEPTION 'server_stamp requires p_vendor_id';
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
