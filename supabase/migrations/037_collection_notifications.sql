-- Notify the customer through the collection lifecycle, and let the vendor portal
-- react in real time to new requests.
--
-- 1. mark_collection_ready / complete_reward_collection now queue a
--    customer_notifications row (the send-push-notifications Edge Function delivers
--    it; the iOS NotificationsView shows it regardless of push config).
-- 2. reward_collections is added to the supabase_realtime publication so the
--    vendor notifications bell updates live when a customer requests a collection.
--
-- The owner-or-staff read policy on reward_collections already covers owners, so
-- no RLS change is needed here.

create or replace function mark_collection_ready(p_collection_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_coll     reward_collections%rowtype;
  v_business text;
  v_reward   text;
begin
  select * into v_coll from reward_collections where id = p_collection_id;
  if not found then raise exception 'Collection not found'; end if;
  if v_coll.status <> 'requested' then raise exception 'Collection is not in requested state'; end if;
  if auth.uid() is null or not (
    is_vendor_staff(v_coll.vendor_id)
    or exists (select 1 from vendors where id = v_coll.vendor_id and owner_id = auth.uid())
  ) then
    raise exception 'Authenticated user does not belong to this vendor';
  end if;

  update reward_collections set status = 'ready', ready_at = now(), updated_at = now()
  where id = p_collection_id;
  update reward_instances set status = 'ready', updated_at = now()
  where id = v_coll.reward_instance_id;

  select business_name into v_business from vendors where id = v_coll.vendor_id;
  select reward_name into v_reward from reward_instances where id = v_coll.reward_instance_id;
  insert into customer_notifications (customer_id, vendor_id, title, body)
  values (v_coll.customer_id, v_coll.vendor_id,
    coalesce(v_business, 'Your reward') || ': reward ready 🎉',
    'Your ' || coalesce(v_reward, 'reward') || ' is ready to collect.');

  return jsonb_build_object('collection_id', p_collection_id, 'status', 'ready');
end;
$function$;

create or replace function complete_reward_collection(p_collection_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_coll     reward_collections%rowtype;
  v_business text;
  v_reward   text;
begin
  select * into v_coll from reward_collections where id = p_collection_id;
  if not found then raise exception 'Collection not found'; end if;
  if v_coll.status not in ('requested', 'ready') then
    raise exception 'Collection cannot be completed from its current state';
  end if;
  if auth.uid() is null or not (
    is_vendor_staff(v_coll.vendor_id)
    or exists (select 1 from vendors where id = v_coll.vendor_id and owner_id = auth.uid())
  ) then
    raise exception 'Authenticated user does not belong to this vendor';
  end if;

  update reward_collections
  set status = 'collected', collected_at = now(), completed_by = auth.uid(), updated_at = now()
  where id = p_collection_id;
  update reward_instances set status = 'collected', updated_at = now()
  where id = v_coll.reward_instance_id;

  select business_name into v_business from vendors where id = v_coll.vendor_id;
  select reward_name into v_reward from reward_instances where id = v_coll.reward_instance_id;
  insert into customer_notifications (customer_id, vendor_id, title, body)
  values (v_coll.customer_id, v_coll.vendor_id,
    coalesce(v_business, 'Your reward') || ': enjoy! ☕',
    'You picked up your ' || coalesce(v_reward, 'reward') || ' — see you next time!');

  return jsonb_build_object('collection_id', p_collection_id, 'status', 'collected');
end;
$function$;

-- Live updates for the vendor notifications bell.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reward_collections'
  ) then
    alter publication supabase_realtime add table reward_collections;
  end if;
end $$;
