-- Campaigns can now announce themselves to customers as a push notification,
-- and we track delivery/open status per campaign so the store sees a funnel.
--
-- The store chooses WHEN the announcement goes out via round_campaigns.notify_mode:
--   'immediate' – fan out the moment the campaign is created/saved
--   'on_start'  – fan out when the campaign's start time arrives (default)
--   'none'      – never notify
-- notified_at records that the one-time announcement has been fanned out
-- (idempotency guard so a campaign is never announced twice).

alter table round_campaigns
  add column if not exists notify_mode text not null default 'on_start'
    check (notify_mode in ('immediate', 'on_start', 'none')),
  add column if not exists notified_at timestamptz;

-- Tie each generated notification back to the campaign that produced it.
alter table customer_notifications
  add column if not exists campaign_id uuid references round_campaigns(id) on delete set null;

create index if not exists idx_customer_notifications_campaign
  on customer_notifications (campaign_id);

-- A vendor's owner/staff can read their own customers' notifications, so the
-- portal can chart per-campaign delivery. (Customers still only see their own.)
drop policy if exists "notifications: vendor read" on customer_notifications;
create policy "notifications: vendor read"
  on customer_notifications for select
  using (
    vendor_id is not null and exists (
      select 1 from vendors v
      where v.id = customer_notifications.vendor_id
        and (v.owner_id = auth.uid() or is_vendor_staff(v.id))
    )
  );

-- Fan out a campaign's announcement to every active member (idempotent).
-- Returns the number of recipients queued.
create or replace function fanout_campaign_notifications(p_campaign_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  c             round_campaigns%rowtype;
  v_vendor_name text;
  v_title       text;
  v_body        text;
  v_when        text;
  v_count       int;
begin
  select * into c from round_campaigns where id = p_campaign_id;
  if not found then return 0; end if;
  if c.notified_at is not null then return 0; end if;  -- already announced

  -- A signed-in caller must own/manage the vendor. pg_cron and the lazy
  -- processor run with auth.uid() = null, which is allowed.
  if auth.uid() is not null
     and not exists (select 1 from vendors v where v.id = c.vendor_id and v.owner_id = auth.uid())
     and not is_vendor_staff(c.vendor_id) then
    raise exception 'Not authorised to send for this campaign';
  end if;

  if c.notify_mode = 'none' then
    update round_campaigns set notified_at = now() where id = p_campaign_id;
    return 0;
  end if;

  select business_name into v_vendor_name from vendors where id = c.vendor_id;

  if c.starts_at <= now() then
    v_when := 'now through ' || to_char(c.ends_at, 'Mon FMDD');
  else
    v_when := 'starting ' || to_char(c.starts_at, 'Mon FMDD');
  end if;

  v_title := coalesce(v_vendor_name, 'Your store') || ': ' || c.round_value || '× rounds!';
  v_body := coalesce(
    nullif(c.customer_message, ''),
    c.name || ' — earn ' || c.round_value || '× rounds ' || v_when || '.'
  );

  insert into customer_notifications (customer_id, vendor_id, campaign_id, title, body)
  select m.customer_id, c.vendor_id, p_campaign_id, v_title, v_body
  from customer_vendor_memberships m
  where m.vendor_id = c.vendor_id and m.status = 'active';

  get diagnostics v_count = row_count;
  update round_campaigns set notified_at = now() where id = p_campaign_id;
  return v_count;
end;
$$;

grant execute on function fanout_campaign_notifications(uuid) to authenticated;

-- Announce any 'on_start' campaigns whose start time has arrived. Safe to call
-- repeatedly (notified_at guards against doubles). When p_vendor_id is given,
-- only that vendor's campaigns are processed (used for lazy per-portal-load
-- processing); pg_cron calls it with null to sweep everyone.
create or replace function process_due_campaign_notifications(p_vendor_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r       record;
  v_total int := 0;
begin
  for r in
    select id from round_campaigns
    where notify_mode = 'on_start'
      and notified_at is null
      and status <> 'cancelled'
      and starts_at <= now()
      and ends_at > now()
      and (p_vendor_id is null or vendor_id = p_vendor_id)
  loop
    v_total := v_total + fanout_campaign_notifications(r.id);
  end loop;
  return v_total;
end;
$$;

grant execute on function process_due_campaign_notifications(uuid) to authenticated;
