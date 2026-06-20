-- Allow vendor owners to read their customers even without a vendor_staff record.

DROP POLICY IF EXISTS "memberships: staff read" ON customer_vendor_memberships;
CREATE POLICY "memberships: staff read"
  ON customer_vendor_memberships FOR SELECT
  USING (
    is_vendor_staff(vendor_id)
    OR EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = customer_vendor_memberships.vendor_id
        AND vendors.owner_id = auth.uid()
    )
  );

-- Also allow vendor owners to read customer profiles.
DROP POLICY IF EXISTS "profiles: vendor customer read" ON profiles;
CREATE POLICY "profiles: vendor customer read"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM customer_vendor_memberships cvm
      JOIN vendors v ON v.id = cvm.vendor_id
      WHERE cvm.customer_id = profiles.id
        AND (v.owner_id = auth.uid() OR is_vendor_staff(v.id))
    )
  );
