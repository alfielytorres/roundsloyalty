-- Locations become first-class "stores": geocoded + visible on the customer map,
-- and NFC visits are attributed to a location for per-store analytics.

-- 1. Coordinates on locations + customer-readable for the map (like vendors).
alter table vendor_locations
  add column if not exists lat double precision,
  add column if not exists lng double precision;

drop policy if exists "locations: public read" on vendor_locations;
create policy "locations: public read" on vendor_locations for select using (true);

-- 2. Attribute transactions to a location (set from the NFC device on award).
alter table round_transactions
  add column if not exists location_id uuid references vendor_locations(id) on delete set null;
create index if not exists idx_round_transactions_location on round_transactions(location_id);

-- 3. Seed a location from each vendor's existing business address so stores show
--    on the map immediately.
insert into vendor_locations (vendor_id, name, address, lat, lng)
select v.id, coalesce(nullif(v.business_name, ''), 'Main'), v.address, v.lat, v.lng
from vendors v
where v.lat is not null and v.lng is not null
  and not exists (select 1 from vendor_locations l where l.vendor_id = v.id);

-- 4. Per-location analytics: visits, unique customers, avg days between a
--    customer's repeat visits at that store.
create or replace function location_visit_stats(p_vendor_id uuid)
returns table(location_id uuid, name text, visits bigint, unique_customers bigint, avg_return_days numeric)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is not null
     and not exists (select 1 from vendors v where v.id = p_vendor_id and v.owner_id = auth.uid())
     and not is_vendor_staff(p_vendor_id) then
    raise exception 'Not authorised';
  end if;

  return query
  with rt as (
    select round_transactions.location_id as loc, round_transactions.customer_id, round_transactions.created_at,
      round_transactions.created_at - lag(round_transactions.created_at)
        over (partition by round_transactions.location_id, round_transactions.customer_id order by round_transactions.created_at) as gap
    from round_transactions
    where round_transactions.vendor_id = p_vendor_id and round_transactions.location_id is not null
  ),
  agg as (
    select rt.loc,
      count(*)::bigint as visits,
      count(distinct rt.customer_id)::bigint as unique_customers,
      round(avg(extract(epoch from rt.gap) / 86400.0) filter (where rt.gap is not null)::numeric, 1) as avg_return_days
    from rt group by rt.loc
  )
  select l.id, l.name,
    coalesce(a.visits, 0)::bigint,
    coalesce(a.unique_customers, 0)::bigint,
    a.avg_return_days
  from vendor_locations l
  left join agg a on a.loc = l.id
  where l.vendor_id = p_vendor_id
  order by coalesce(a.visits, 0) desc;
end;
$$;

grant execute on function location_visit_stats(uuid) to authenticated;
