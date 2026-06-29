-- ACT step of the win-back loop: send a re-engagement push to a lapsed customer
-- and log it. Queues a row in customer_notifications (the existing push pipeline
-- delivers it) and records winback_messages so winback_stats can attribute any
-- return within 7 days.
create or replace function send_winback(
  p_vendor_id   uuid,
  p_customer_id uuid,
  p_title       text,
  p_body        text
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_winback_id uuid;
begin
  -- A signed-in caller must own/manage the vendor. The service role (auth.uid()
  -- null) is trusted and allowed, matching the other vendor RPCs.
  if auth.uid() is not null
     and not exists (select 1 from vendors v where v.id = p_vendor_id and v.owner_id = auth.uid())
     and not is_vendor_staff(p_vendor_id) then
    raise exception 'Not authorised';
  end if;

  if coalesce(btrim(p_title), '') = '' or coalesce(btrim(p_body), '') = '' then
    raise exception 'Title and message are required';
  end if;

  -- Only message customers who actually have history with this vendor.
  if not exists (
    select 1 from round_transactions rt
    where rt.vendor_id = p_vendor_id and rt.customer_id = p_customer_id
  ) then
    raise exception 'Customer has no history with this vendor';
  end if;

  insert into customer_notifications (customer_id, vendor_id, title, body)
  values (p_customer_id, p_vendor_id, left(btrim(p_title), 120), left(btrim(p_body), 300));

  insert into winback_messages (vendor_id, customer_id, message, channel, status)
  values (p_vendor_id, p_customer_id, left(btrim(p_body), 300), 'push', 'sent')
  returning id into v_winback_id;

  return v_winback_id;
end;
$$;

revoke execute on function send_winback(uuid, uuid, text, text) from public, anon;
grant execute on function send_winback(uuid, uuid, text, text) to authenticated, service_role;
