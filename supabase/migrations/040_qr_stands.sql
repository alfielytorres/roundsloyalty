-- Sellable QR/NFC stands, controlled by the ops admin only. A stand's code
-- points at /t/<token>; by default that lands on the Rounds loyalty flow (for
-- the assigned vendor, if any), but the admin can point it at any URL instead.
create table if not exists qr_stands (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null default encode(gen_random_bytes(9), 'hex'),
  label       text,
  vendor_id   uuid references vendors(id) on delete set null,
  redirect_url text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS on, no policies: only the service role (behind the admin-gated ops routes
-- and the public /t resolver) can read or write. Vendors never see this table.
alter table qr_stands enable row level security;
