-- Customer-initiated NFC stamp.
--
-- The store keeps its own registered tag and taps it on the customer's phone.
-- The customer (signed in to the iOS app) reads the tag — which holds only a
-- device token — and awards itself a round. This mirrors award_rounds(qr_payload):
-- identity comes from auth.uid(), and the vendor is resolved server-side.
--
-- It also reconciles the previously-unusable 'nfc' path:
--   1. award_rounds_internal pins search_path = public, but pgcrypto (digest)
--      lives in the `extensions` schema, so its NFC-branch digest() call could
--      never resolve. We widen the function's search_path to fix that.
--   2. The 6-arg award_rounds wrapper forbade a vendor_id for 'nfc' while the
--      internal requires one — so no caller could ever satisfy both. This
--      dedicated entrypoint resolves the vendor from the device and calls the
--      internal directly.

-- 1. Let award_rounds_internal find pgcrypto's digest() (used for the device hash).
ALTER FUNCTION award_rounds_internal(text, uuid, text, text, uuid, text)
  SET search_path = public, extensions;

-- 2. Customer-facing NFC entrypoint.
CREATE OR REPLACE FUNCTION award_rounds_nfc(p_nfc_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_customer profiles%ROWTYPE;
  v_device   nfc_stamp_devices%ROWTYPE;
  v_idem_key text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_nfc_token IS NULL OR length(trim(p_nfc_token)) = 0 THEN
    RAISE EXCEPTION 'NFC token required';
  END IF;

  -- Customers can only stamp themselves: identity comes from the session.
  SELECT * INTO v_customer FROM profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_customer.customer_token IS NULL THEN
    RAISE EXCEPTION 'Customer profile not found';
  END IF;

  -- Resolve the registered device (and therefore the vendor) from the token hash.
  SELECT * INTO v_device
  FROM nfc_stamp_devices
  WHERE device_token_hash = encode(digest(p_nfc_token, 'sha256'), 'hex');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NFC device not found for provided token';
  END IF;
  IF v_device.status <> 'active' THEN
    RAISE EXCEPTION 'NFC device is not active';
  END IF;

  -- One award per customer per device per hour (matches the QR-scan policy).
  v_idem_key := encode(
    sha256((auth.uid()::text || v_device.id::text ||
            to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD-HH24'))::bytea),
    'hex'
  );

  RETURN award_rounds_internal(
    v_customer.customer_token,
    v_device.vendor_id,
    p_nfc_token,
    'nfc',
    NULL,
    v_idem_key
  );
END;
$$;

REVOKE ALL ON FUNCTION award_rounds_nfc(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION award_rounds_nfc(text) TO authenticated;
