-- Win-back engine: detect lapsing customers, log outreach, attribute returns.
-- The AI-native loop reads at_risk_customers (sense), drafts a message (decide),
-- sends it via the notification pipeline + logs winback_messages (act), and
-- winback_stats attributes returns within 7 days (measure).

create table if not exists winback_messages (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references vendors(id) on delete cascade,
  customer_id uuid not null references profiles(id) on delete cascade,
  message     text,
  channel     text not null default 'push',
  status      text not null default 'sent',
  sent_at     timestamptz default now(),
  created_at  timestamptz default now()
);
create index if not exists idx_winback_vendor on winback_messages(vendor_id, customer_id);

alter table winback_messages enable row level security;
drop policy if exists "winback: owner or staff" on winback_messages;
create policy "winback: owner or staff" on winback_messages for all
  using (exists (select 1 from vendors v where v.id = vendor_id and (v.owner_id = auth.uid() or is_vendor_staff(v.id))))
  with check (exists (select 1 from vendors v where v.id = vendor_id and (v.owner_id = auth.uid() or is_vendor_staff(v.id))));

-- SENSE: customers who have visited before but not within p_threshold_days.
create or replace function at_risk_customers(p_vendor_id uuid, p_threshold_days int default 10)
returns table(
  customer_id uuid, name text, last_visit timestamptz, days_since int,
  visits bigint, avg_gap_days numeric, last_contacted_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and not exists (select 1 from vendors v where v.id = p_vendor_id and v.owner_id = auth.uid())
     and not is_vendor_staff(p_vendor_id) then
    raise exception 'Not authorised';
  end if;

  return query
  with v as (
    select rt.customer_id as cid, max(rt.created_at) as last_v, min(rt.created_at) as first_v, count(*) as n
    from round_transactions rt
    where rt.vendor_id = p_vendor_id
    group by rt.customer_id
  )
  select v.cid, p.display_name, v.last_v,
    floor(extract(epoch from (now() - v.last_v)) / 86400.0)::int as days_since,
    v.n,
    case when v.n > 1
      then round(((extract(epoch from (v.last_v - v.first_v)) / 86400.0) / (v.n - 1))::numeric, 1)
      else null end as avg_gap_days,
    (select max(w.sent_at) from winback_messages w where w.vendor_id = p_vendor_id and w.customer_id = v.cid) as last_contacted_at
  from v
  join profiles p on p.id = v.cid
  where floor(extract(epoch from (now() - v.last_v)) / 86400.0) >= p_threshold_days
  order by days_since desc;
end;
$$;
grant execute on function at_risk_customers(uuid, int) to authenticated;

-- MEASURE: outreach sent, how many led to a return within 7 days, recovered visits.
create or replace function winback_stats(p_vendor_id uuid)
returns table(sent bigint, returned bigint, recovered_visits bigint)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and not exists (select 1 from vendors v where v.id = p_vendor_id and v.owner_id = auth.uid())
     and not is_vendor_staff(p_vendor_id) then
    raise exception 'Not authorised';
  end if;

  return query
  with ret as (
    select w.id,
      (select count(*) from round_transactions rt
       where rt.vendor_id = p_vendor_id and rt.customer_id = w.customer_id
         and rt.created_at > w.sent_at and rt.created_at <= w.sent_at + interval '7 days') as rcount
    from winback_messages w
    where w.vendor_id = p_vendor_id and w.sent_at is not null
  )
  select count(*)::bigint,
    count(*) filter (where rcount > 0)::bigint,
    coalesce(sum(rcount), 0)::bigint
  from ret;
end;
$$;
grant execute on function winback_stats(uuid) to authenticated;
