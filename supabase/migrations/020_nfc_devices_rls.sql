-- nfc_stamp_devices had only a staff-only SELECT policy, so:
--   * vendor owners (who are not rows in vendor_staff) couldn't read their devices,
--   * nobody could INSERT (registration) or UPDATE (pause/resume/revoke) —
--     every write failed with "new row violates row-level security policy".
--
-- Allow a vendor's owner OR its active staff to manage that vendor's devices.
-- award_rounds_internal updates last_used_at as SECURITY DEFINER, so it is
-- unaffected by these policies.

DROP POLICY IF EXISTS "nfc_devices: staff read" ON nfc_stamp_devices;
DROP POLICY IF EXISTS "nfc_devices: owner or staff read" ON nfc_stamp_devices;
DROP POLICY IF EXISTS "nfc_devices: owner or staff insert" ON nfc_stamp_devices;
DROP POLICY IF EXISTS "nfc_devices: owner or staff update" ON nfc_stamp_devices;

CREATE POLICY "nfc_devices: owner or staff read"
  ON nfc_stamp_devices FOR SELECT
  USING (
    is_vendor_staff(vendor_id)
    OR EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND owner_id = auth.uid())
  );

CREATE POLICY "nfc_devices: owner or staff insert"
  ON nfc_stamp_devices FOR INSERT
  WITH CHECK (
    is_vendor_staff(vendor_id)
    OR EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND owner_id = auth.uid())
  );

CREATE POLICY "nfc_devices: owner or staff update"
  ON nfc_stamp_devices FOR UPDATE
  USING (
    is_vendor_staff(vendor_id)
    OR EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND owner_id = auth.uid())
  )
  WITH CHECK (
    is_vendor_staff(vendor_id)
    OR EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND owner_id = auth.uid())
  );
