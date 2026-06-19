-- Allow vendor owners to load the collection board even before a vendor_staff row exists.

DROP POLICY IF EXISTS "collections: staff read" ON reward_collections;
CREATE POLICY "collections: staff read"
  ON reward_collections FOR SELECT
  USING (
    is_vendor_staff(vendor_id)
    OR EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = reward_collections.vendor_id
        AND vendors.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "rewards: staff read" ON reward_instances;
CREATE POLICY "rewards: staff read"
  ON reward_instances FOR SELECT
  USING (
    is_vendor_staff(vendor_id)
    OR EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = reward_instances.vendor_id
        AND vendors.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profiles: vendor customer read" ON profiles;
CREATE POLICY "profiles: vendor customer read"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM reward_collections rc
      JOIN vendors v ON v.id = rc.vendor_id
      WHERE rc.customer_id = profiles.id
        AND (v.owner_id = auth.uid() OR is_vendor_staff(v.id))
    )
  );
