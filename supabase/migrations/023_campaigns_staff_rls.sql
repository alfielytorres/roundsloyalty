-- Campaigns and staff assumed the actor was a vendor_staff row, but a vendor
-- OWNER is not in vendor_staff. So owners couldn't create campaigns, and the
-- Staff page couldn't show staff names/emails. Grant owner-or-staff access.

-- round_campaigns: a vendor's owner OR active staff can manage campaigns.
drop policy if exists "campaigns: staff write" on round_campaigns;
drop policy if exists "campaigns: owner or staff write" on round_campaigns;
create policy "campaigns: owner or staff write"
  on round_campaigns for all
  using (
    is_vendor_staff(vendor_id)
    or exists (select 1 from vendors where id = vendor_id and owner_id = auth.uid())
  )
  with check (
    is_vendor_staff(vendor_id)
    or exists (select 1 from vendors where id = vendor_id and owner_id = auth.uid())
  );

-- profiles: a vendor's owner/staff can read the profiles of that vendor's staff
-- members, so the Staff page can show their name and email.
drop policy if exists "profiles: vendor staff read" on profiles;
create policy "profiles: vendor staff read"
  on profiles for select
  using (
    exists (
      select 1 from vendor_staff vs
      join vendors v on v.id = vs.vendor_id
      where vs.user_id = profiles.id
        and (v.owner_id = auth.uid() or is_vendor_staff(v.id))
    )
  );
