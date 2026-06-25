-- round_transactions could only be read by vendor_staff, but a vendor OWNER is
-- not a vendor_staff row — so the owner's dashboard showed "No activity" and
-- "Rounds today" / "Customers today" stats read 0 even with real transactions.
-- Grant owner-or-staff read, matching reward_instances / reward_collections.

drop policy if exists "transactions: staff read" on round_transactions;
create policy "transactions: staff read"
  on round_transactions for select
  using (
    is_vendor_staff(vendor_id)
    or exists (
      select 1 from vendors
      where vendors.id = round_transactions.vendor_id
        and vendors.owner_id = auth.uid()
    )
  );
