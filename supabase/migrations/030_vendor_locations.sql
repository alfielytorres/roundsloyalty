-- Multiple locations per vendor. One shared loyalty program/balance across all
-- of a vendor's locations; locations scope NFC stamp devices (and later staff/stats).
create table if not exists vendor_locations (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid not null references vendors(id) on delete cascade,
  name       text not null,
  address    text,
  created_at timestamptz not null default now()
);
create index if not exists idx_vendor_locations_vendor on vendor_locations(vendor_id);

alter table vendor_locations enable row level security;

drop policy if exists "locations: owner or staff read" on vendor_locations;
create policy "locations: owner or staff read" on vendor_locations for select
  using (exists (select 1 from vendors v where v.id = vendor_id and (v.owner_id = auth.uid() or is_vendor_staff(v.id))));

drop policy if exists "locations: owner or staff write" on vendor_locations;
create policy "locations: owner or staff write" on vendor_locations for all
  using (exists (select 1 from vendors v where v.id = vendor_id and (v.owner_id = auth.uid() or is_vendor_staff(v.id))))
  with check (exists (select 1 from vendors v where v.id = vendor_id and (v.owner_id = auth.uid() or is_vendor_staff(v.id))));

alter table nfc_stamp_devices add column if not exists location_id uuid references vendor_locations(id) on delete set null;
create index if not exists idx_nfc_devices_location on nfc_stamp_devices(location_id);
