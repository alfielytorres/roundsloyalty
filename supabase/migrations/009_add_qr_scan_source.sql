-- Add qr_scan and server_stamp to allowed source/enrolled_via values.

ALTER TABLE customer_vendor_memberships
  DROP CONSTRAINT IF EXISTS customer_vendor_memberships_enrolled_via_check;
ALTER TABLE customer_vendor_memberships
  ADD CONSTRAINT customer_vendor_memberships_enrolled_via_check
  CHECK (enrolled_via IN ('vendor_qr','staff_scan','nfc','system','qr_scan','server_stamp'));

ALTER TABLE round_transactions
  DROP CONSTRAINT IF EXISTS round_transactions_source_check;
ALTER TABLE round_transactions
  ADD CONSTRAINT round_transactions_source_check
  CHECK (source IN ('nfc','staff_scan','vendor_portal','system','qr_scan','server_stamp'));
