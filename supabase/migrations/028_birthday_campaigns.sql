-- Birthday campaigns: a standing campaign type that gives a customer a bonus
-- round multiplier when they visit on/around their birthday (using the birthday
-- we now collect). Adds campaign_type + birthday_window_days, a helper to measure
-- proximity to a birthday, and teaches the award RPC to pick the best applicable
-- multiplier (a normal active campaign OR an in-window birthday campaign).

alter table round_campaigns
  add column if not exists campaign_type text not null default 'standard'
    check (campaign_type in ('standard', 'birthday')),
  add column if not exists birthday_window_days int not null default 0;

-- Smallest number of days between today and the customer's birthday (0 = today),
-- handling year wrap-around and Feb 29 in non-leap years.
create or replace function days_to_birthday(bd date)
returns integer
language plpgsql
stable
as $$
declare
  y    int := extract(year from current_date)::int;
  yy   int;
  cand date;
  d    int;
  best int := 99999;
begin
  if bd is null then return null; end if;
  foreach yy in array array[y - 1, y, y + 1] loop
    begin
      cand := make_date(yy, extract(month from bd)::int, extract(day from bd)::int);
    exception when others then
      cand := make_date(yy, extract(month from bd)::int, 28); -- Feb 29 → Feb 28
    end;
    d := abs(current_date - cand);
    if d < best then best := d; end if;
  end loop;
  return best;
end;
$$;

-- Recreate the award RPC (body from migration 018; search_path from 019) with a
-- birthday-aware campaign selection.
create or replace function award_rounds_internal(
  p_customer_token   text,
  p_vendor_id        uuid,
  p_nfc_token        text    default null,
  p_source           text    default 'nfc',
  p_staff_user_id    uuid    default null,
  p_idempotency_key  text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
DECLARE
  v_customer    profiles%ROWTYPE;
  v_vendor      vendors%ROWTYPE;
  v_device      nfc_stamp_devices%ROWTYPE;
  v_membership  customer_vendor_memberships%ROWTYPE;
  v_program     loyalty_programs%ROWTYPE;
  v_campaign    round_campaigns%ROWTYPE;
  v_existing_tx uuid;
  v_tx_id       uuid;
  v_rounds_to_award   integer;
  v_new_total         integer;
  v_new_current       integer;
  v_rewards_count     integer := 0;
BEGIN
  SELECT * INTO v_customer FROM profiles WHERE customer_token = p_customer_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  SELECT * INTO v_vendor FROM vendors WHERE id = p_vendor_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor not found or not active';
  END IF;

  IF p_nfc_token IS NOT NULL THEN
    SELECT * INTO v_device
    FROM nfc_stamp_devices
    WHERE device_token_hash = encode(digest(p_nfc_token, 'sha256'), 'hex')
      AND vendor_id = p_vendor_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'NFC device not found or not associated with this vendor';
    END IF;
    IF v_device.status != 'active' THEN
      RAISE EXCEPTION 'NFC device is not active';
    END IF;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_tx
    FROM round_transactions
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;
    IF FOUND THEN
      SELECT * INTO v_membership
      FROM customer_vendor_memberships
      WHERE customer_id = v_customer.id AND vendor_id = p_vendor_id;
      SELECT * INTO v_program
      FROM loyalty_programs
      WHERE vendor_id = p_vendor_id AND status = 'active'
      LIMIT 1;
      RETURN jsonb_build_object(
        'transaction_id',   v_existing_tx,
        'rounds_awarded',   0,
        'campaign_id',      NULL,
        'campaign_name',    NULL,
        'balance',          jsonb_build_object(
                              'current_rounds',  v_membership.current_rounds,
                              'lifetime_rounds', v_membership.lifetime_rounds
                            ),
        'rewards_unlocked', 0,
        'membership_id',    v_membership.id,
        'vendor',           jsonb_build_object(
                              'id',              v_vendor.id,
                              'business_name',   v_vendor.business_name,
                              'brand_color',     v_vendor.brand_color,
                              'rounds_required', v_program.rounds_required
                            )
      );
    END IF;
  END IF;

  SELECT * INTO v_program
  FROM loyalty_programs
  WHERE vendor_id = p_vendor_id AND status = 'active'
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active loyalty program for this vendor';
  END IF;

  v_rounds_to_award := COALESCE(v_program.default_round_value, 1);

  -- Best applicable campaign multiplier: a standard campaign active now, OR a
  -- birthday campaign active now where the customer is within its birthday window.
  SELECT * INTO v_campaign
  FROM round_campaigns c
  WHERE c.vendor_id = p_vendor_id
    AND c.starts_at <= now()
    AND c.ends_at > now()
    AND c.status <> 'cancelled'
    AND (
      COALESCE(c.campaign_type, 'standard') = 'standard'
      OR (
        c.campaign_type = 'birthday'
        AND v_customer.birthday IS NOT NULL
        AND days_to_birthday(v_customer.birthday) <= COALESCE(c.birthday_window_days, 0)
      )
    )
  ORDER BY c.round_value DESC, c.starts_at DESC
  LIMIT 1;

  IF FOUND THEN
    v_rounds_to_award := v_campaign.round_value;
  END IF;

  INSERT INTO customer_vendor_memberships (customer_id, vendor_id, status, current_rounds, lifetime_rounds)
  VALUES (v_customer.id, p_vendor_id, 'active', 0, 0)
  ON CONFLICT (customer_id, vendor_id) DO UPDATE
    SET status       = 'active',
        activated_at = COALESCE(customer_vendor_memberships.activated_at, now())
  RETURNING * INTO v_membership;

  v_new_total     := v_membership.lifetime_rounds + v_rounds_to_award;
  v_rewards_count := floor(v_new_total::numeric / v_program.rounds_required)
                   - floor(v_membership.lifetime_rounds::numeric / v_program.rounds_required);
  v_new_current   := v_membership.current_rounds + v_rounds_to_award;
  IF v_rewards_count > 0 THEN
    v_new_current := v_new_current - (v_rewards_count * v_program.rounds_required);
    IF v_new_current < 0 THEN v_new_current := 0; END IF;
  END IF;

  UPDATE customer_vendor_memberships
  SET current_rounds  = v_new_current,
      lifetime_rounds = v_new_total,
      updated_at      = now()
  WHERE id = v_membership.id;

  INSERT INTO round_transactions (
    membership_id, customer_id, vendor_id,
    nfc_device_id, campaign_id, rounds_awarded, source,
    staff_user_id, idempotency_key
  ) VALUES (
    v_membership.id, v_customer.id, p_vendor_id,
    v_device.id, v_campaign.id, v_rounds_to_award, p_source,
    p_staff_user_id, p_idempotency_key
  )
  RETURNING id INTO v_tx_id;

  IF v_device.id IS NOT NULL THEN
    UPDATE nfc_stamp_devices SET last_used_at = now() WHERE id = v_device.id;
  END IF;

  IF v_rewards_count > 0 THEN
    FOR i IN 1..v_rewards_count LOOP
      INSERT INTO reward_instances (
        membership_id, customer_id, vendor_id, loyalty_program_id,
        reward_name, reward_description, status
      ) VALUES (
        v_membership.id, v_customer.id, p_vendor_id, v_program.id,
        v_program.reward_name, v_program.reward_description, 'available'
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'transaction_id',   v_tx_id,
    'rounds_awarded',   v_rounds_to_award,
    'campaign_id',      v_campaign.id,
    'campaign_name',    v_campaign.name,
    'balance',          jsonb_build_object(
                          'current_rounds',  v_new_current,
                          'lifetime_rounds', v_new_total
                        ),
    'rewards_unlocked', v_rewards_count,
    'membership_id',    v_membership.id,
    'vendor',           jsonb_build_object(
                          'id',              v_vendor.id,
                          'business_name',   v_vendor.business_name,
                          'brand_color',     v_vendor.brand_color,
                          'rounds_required', v_program.rounds_required
                        )
  );
END;
$$;

-- Birthday campaigns are a per-customer template, not a one-time blast — so the
-- standard fan-out skips them (the birthday processor below handles them).
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
  if c.notified_at is not null then return 0; end if;

  if auth.uid() is not null
     and not exists (select 1 from vendors v where v.id = c.vendor_id and v.owner_id = auth.uid())
     and not is_vendor_staff(c.vendor_id) then
    raise exception 'Not authorised to send for this campaign';
  end if;

  -- Birthday campaigns notify per customer around their birthday, not all at once.
  if c.campaign_type = 'birthday' or c.notify_mode = 'none' then
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

-- For each active birthday campaign, notify members whose birthday is within the
-- window and who haven't been wished this year. Idempotent (deduped per year via
-- customer_notifications). p_vendor_id limits it to one vendor's campaigns.
create or replace function process_due_birthday_notifications(p_vendor_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r             record;
  v_total       int := 0;
  v_vendor_name text;
  v_title       text;
  v_body        text;
begin
  for r in
    select c.id as campaign_id, c.vendor_id, c.name, c.customer_message,
           c.birthday_window_days, c.round_value, m.customer_id
    from round_campaigns c
    join customer_vendor_memberships m
      on m.vendor_id = c.vendor_id and m.status = 'active'
    join profiles p on p.id = m.customer_id
    where c.campaign_type = 'birthday'
      and c.status <> 'cancelled'
      and c.starts_at <= now() and c.ends_at > now()
      and (p_vendor_id is null or c.vendor_id = p_vendor_id)
      and p.birthday is not null
      and days_to_birthday(p.birthday) <= coalesce(c.birthday_window_days, 0)
      and not exists (
        select 1 from customer_notifications n
        where n.campaign_id = c.id
          and n.customer_id = m.customer_id
          and date_part('year', n.created_at) = date_part('year', now())
      )
  loop
    select business_name into v_vendor_name from vendors where id = r.vendor_id;
    v_title := coalesce(v_vendor_name, 'A store') || ' 🎂 Happy birthday!';
    v_body := coalesce(
      nullif(r.customer_message, ''),
      'Happy birthday from ' || coalesce(v_vendor_name, 'us') || '! ' ||
      case when r.round_value > 1
           then 'Enjoy ' || r.round_value || '× rounds this week.'
           else 'Come celebrate with us.' end
    );
    insert into customer_notifications (customer_id, vendor_id, campaign_id, title, body)
    values (r.customer_id, r.vendor_id, r.campaign_id, v_title, v_body);
    v_total := v_total + 1;
  end loop;
  return v_total;
end;
$$;

grant execute on function process_due_birthday_notifications(uuid) to authenticated;
