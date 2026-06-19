-- ============================================================
-- 005_rounds_mvp_rebuild.sql
-- Rounds Loyalty MVP Rebuild
-- Drops all legacy application tables and rebuilds from scratch.
-- profiles is altered (not dropped) since it is managed by auth trigger.
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. DROP LEGACY TABLES (cascade, in FK-safe order)
-- ============================================================
DROP TABLE IF EXISTS proof_of_purchase_claims      CASCADE;
DROP TABLE IF EXISTS reward_instances              CASCADE;
DROP TABLE IF EXISTS reward_rules                  CASCADE;
DROP TABLE IF EXISTS loyalty_ledger                CASCADE;
DROP TABLE IF EXISTS loyalty_balances              CASCADE;
DROP TABLE IF EXISTS loyalty_programs              CASCADE;
DROP TABLE IF EXISTS customer_vendor_memberships   CASCADE;
DROP TABLE IF EXISTS vendor_staff                  CASCADE;
DROP TABLE IF EXISTS visit_events                  CASCADE;
DROP TABLE IF EXISTS redemptions                   CASCADE;
DROP TABLE IF EXISTS loyalty_cards                 CASCADE;
DROP TABLE IF EXISTS offers                        CASCADE;
DROP TABLE IF EXISTS offer_recipients              CASCADE;
DROP TABLE IF EXISTS data_consents                 CASCADE;
DROP TABLE IF EXISTS businesses                    CASCADE;
DROP TABLE IF EXISTS vendors                       CASCADE;

-- ============================================================
-- 2. ALTER profiles — add missing columns without recreating
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS push_token    text;

-- customer_token: unique, not null — add nullable first, backfill, then constrain
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'customer_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN customer_token text;
    -- Backfill existing rows before adding NOT NULL / UNIQUE
    UPDATE profiles SET customer_token = gen_random_uuid()::text WHERE customer_token IS NULL;
    ALTER TABLE profiles ALTER COLUMN customer_token SET NOT NULL;
    ALTER TABLE profiles ALTER COLUMN customer_token SET DEFAULT gen_random_uuid()::text;
    ALTER TABLE profiles ADD CONSTRAINT profiles_customer_token_key UNIQUE (customer_token);
  END IF;
END $$;

-- ============================================================
-- 3. CREATE NEW TABLES
-- ============================================================

-- ----------------------------------------------------------
-- vendors
-- ----------------------------------------------------------
CREATE TABLE vendors (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid        REFERENCES profiles(id),
  business_name  text        NOT NULL,
  description    text,
  category       text,
  logo_url       text,
  brand_color    text        NOT NULL DEFAULT '#16A34A',
  address        text,
  lat            double precision,
  lng            double precision,
  join_token     text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  status         text        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','paused','suspended')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- vendor_staff
-- ----------------------------------------------------------
CREATE TABLE vendor_staff (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  uuid        NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id),
  role       text        NOT NULL DEFAULT 'staff'
                         CHECK (role IN ('owner','manager','staff')),
  status     text        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','invited','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, user_id)
);

-- ----------------------------------------------------------
-- loyalty_programs
-- ----------------------------------------------------------
CREATE TABLE loyalty_programs (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id            uuid        NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name                 text        NOT NULL DEFAULT 'Coffee Round',
  rounds_required      integer     NOT NULL DEFAULT 8
                                   CHECK (rounds_required BETWEEN 1 AND 200),
  reward_name          text        NOT NULL,
  reward_description   text,
  reward_expiry_days   integer,
  default_round_value  integer     NOT NULL DEFAULT 1
                                   CHECK (default_round_value BETWEEN 1 AND 5),
  maximum_round_value  integer     NOT NULL DEFAULT 5
                                   CHECK (maximum_round_value BETWEEN 1 AND 10),
  status               text        NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active','paused','archived')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- One active program per vendor
CREATE UNIQUE INDEX loyalty_programs_one_active_per_vendor
  ON loyalty_programs (vendor_id)
  WHERE status = 'active';

-- ----------------------------------------------------------
-- customer_vendor_memberships
-- ----------------------------------------------------------
CREATE TABLE customer_vendor_memberships (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        uuid        NOT NULL REFERENCES profiles(id),
  vendor_id          uuid        NOT NULL REFERENCES vendors(id),
  loyalty_program_id uuid        REFERENCES loyalty_programs(id),
  current_rounds     integer     NOT NULL DEFAULT 0 CHECK (current_rounds >= 0),
  lifetime_rounds    integer     NOT NULL DEFAULT 0 CHECK (lifetime_rounds >= 0),
  status             text        NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active','suspended')),
  enrolled_via       text        NOT NULL DEFAULT 'system'
                                 CHECK (enrolled_via IN ('vendor_qr','staff_scan','nfc','system')),
  activated_at       timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, vendor_id)
);

-- ----------------------------------------------------------
-- nfc_stamp_devices
-- ----------------------------------------------------------
CREATE TABLE nfc_stamp_devices (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id         uuid        NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  device_token_hash text        NOT NULL UNIQUE,
  location_label    text,
  status            text        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','paused','revoked')),
  last_used_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- round_campaigns
-- ----------------------------------------------------------
CREATE TABLE round_campaigns (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id        uuid        NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  round_value      integer     NOT NULL CHECK (round_value BETWEEN 2 AND 10),
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz NOT NULL,
  status           text        NOT NULL DEFAULT 'scheduled'
                               CHECK (status IN ('draft','scheduled','cancelled')),
  customer_message text,
  created_by       uuid        REFERENCES profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_ends_after_starts CHECK (ends_at > starts_at)
);

-- ----------------------------------------------------------
-- round_transactions
-- ----------------------------------------------------------
CREATE TABLE round_transactions (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id      uuid        NOT NULL REFERENCES customer_vendor_memberships(id),
  customer_id        uuid        NOT NULL REFERENCES profiles(id),
  vendor_id          uuid        NOT NULL REFERENCES vendors(id),
  loyalty_program_id uuid        REFERENCES loyalty_programs(id),
  nfc_device_id      uuid        REFERENCES nfc_stamp_devices(id),
  campaign_id        uuid        REFERENCES round_campaigns(id),
  rounds_awarded     integer     NOT NULL,
  event_type         text        NOT NULL DEFAULT 'round_awarded'
                                 CHECK (event_type IN ('round_awarded','round_reversed','manual_adjustment')),
  source             text        NOT NULL DEFAULT 'nfc'
                                 CHECK (source IN ('nfc','staff_scan','vendor_portal','system')),
  staff_user_id      uuid        REFERENCES profiles(id),
  idempotency_key    text        NOT NULL UNIQUE,
  metadata           jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX round_transactions_membership_id_idx ON round_transactions (membership_id);
CREATE INDEX round_transactions_customer_id_idx   ON round_transactions (customer_id);
CREATE INDEX round_transactions_vendor_id_idx     ON round_transactions (vendor_id);
CREATE INDEX round_transactions_created_at_idx    ON round_transactions (created_at DESC);

-- ----------------------------------------------------------
-- reward_instances
-- ----------------------------------------------------------
CREATE TABLE reward_instances (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id      uuid        NOT NULL REFERENCES customer_vendor_memberships(id),
  customer_id        uuid        NOT NULL REFERENCES profiles(id),
  vendor_id          uuid        NOT NULL REFERENCES vendors(id),
  loyalty_program_id uuid        REFERENCES loyalty_programs(id),
  reward_name        text        NOT NULL,
  reward_description text,
  status             text        NOT NULL DEFAULT 'available'
                                 CHECK (status IN (
                                   'available','collection_requested','ready',
                                   'collected','expired','cancelled'
                                 )),
  expires_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reward_instances_customer_id_idx ON reward_instances (customer_id);
CREATE INDEX reward_instances_vendor_id_idx   ON reward_instances (vendor_id);

-- ----------------------------------------------------------
-- reward_collections
-- ----------------------------------------------------------
CREATE TABLE reward_collections (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_instance_id  uuid        NOT NULL REFERENCES reward_instances(id),
  customer_id         uuid        NOT NULL REFERENCES profiles(id),
  vendor_id           uuid        NOT NULL REFERENCES vendors(id),
  collection_code     text        NOT NULL UNIQUE,
  selected_option     text,
  customer_note       text,
  status              text        NOT NULL DEFAULT 'requested'
                                  CHECK (status IN ('requested','ready','collected','cancelled')),
  requested_at        timestamptz NOT NULL DEFAULT now(),
  ready_at            timestamptz,
  collected_at        timestamptz,
  completed_by        uuid        REFERENCES profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Only one active collection per reward
CREATE UNIQUE INDEX reward_collections_one_active_per_reward
  ON reward_collections (reward_instance_id)
  WHERE status IN ('requested','ready');

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_staff                ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_programs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_vendor_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_stamp_devices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_campaigns             ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_instances            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_collections          ENABLE ROW LEVEL SECURITY;

-- Helper: is the calling user a staff/owner/manager for a given vendor?
CREATE OR REPLACE FUNCTION is_vendor_staff(p_vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vendor_staff
    WHERE vendor_id = p_vendor_id
      AND user_id   = auth.uid()
      AND status    = 'active'
  );
$$;

-- ---- profiles ----
DROP POLICY IF EXISTS "profiles: own read"   ON profiles;
DROP POLICY IF EXISTS "profiles: own update" ON profiles;

CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ---- vendors (public read, staff can update their own) ----
DROP POLICY IF EXISTS "vendors: public read"   ON vendors;
DROP POLICY IF EXISTS "vendors: owner insert"  ON vendors;
DROP POLICY IF EXISTS "vendors: staff update"  ON vendors;

CREATE POLICY "vendors: public read"
  ON vendors FOR SELECT
  USING (status = 'active');

CREATE POLICY "vendors: owner insert"
  ON vendors FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "vendors: staff update"
  ON vendors FOR UPDATE
  USING (is_vendor_staff(id));

-- ---- vendor_staff ----
DROP POLICY IF EXISTS "vendor_staff: self read"   ON vendor_staff;
DROP POLICY IF EXISTS "vendor_staff: staff read"  ON vendor_staff;

CREATE POLICY "vendor_staff: self read"
  ON vendor_staff FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "vendor_staff: staff read others"
  ON vendor_staff FOR SELECT
  USING (is_vendor_staff(vendor_id));

-- ---- loyalty_programs ----
DROP POLICY IF EXISTS "loyalty_programs: public read"  ON loyalty_programs;
DROP POLICY IF EXISTS "loyalty_programs: staff write"  ON loyalty_programs;

CREATE POLICY "loyalty_programs: public read"
  ON loyalty_programs FOR SELECT
  USING (status IN ('active','paused'));

CREATE POLICY "loyalty_programs: staff write"
  ON loyalty_programs FOR ALL
  USING (is_vendor_staff(vendor_id));

-- ---- customer_vendor_memberships ----
DROP POLICY IF EXISTS "memberships: own read"    ON customer_vendor_memberships;
DROP POLICY IF EXISTS "memberships: staff read"  ON customer_vendor_memberships;

CREATE POLICY "memberships: own read"
  ON customer_vendor_memberships FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "memberships: staff read"
  ON customer_vendor_memberships FOR SELECT
  USING (is_vendor_staff(vendor_id));

-- ---- nfc_stamp_devices ----
DROP POLICY IF EXISTS "nfc_devices: staff read" ON nfc_stamp_devices;

CREATE POLICY "nfc_devices: staff read"
  ON nfc_stamp_devices FOR SELECT
  USING (is_vendor_staff(vendor_id));

-- ---- round_campaigns (public read for scheduled/active) ----
DROP POLICY IF EXISTS "campaigns: public read"  ON round_campaigns;
DROP POLICY IF EXISTS "campaigns: staff write"  ON round_campaigns;

CREATE POLICY "campaigns: public read"
  ON round_campaigns FOR SELECT
  USING (status IN ('scheduled','draft'));

CREATE POLICY "campaigns: staff write"
  ON round_campaigns FOR ALL
  USING (is_vendor_staff(vendor_id));

-- ---- round_transactions ----
DROP POLICY IF EXISTS "transactions: own read"   ON round_transactions;
DROP POLICY IF EXISTS "transactions: staff read" ON round_transactions;

CREATE POLICY "transactions: own read"
  ON round_transactions FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "transactions: staff read"
  ON round_transactions FOR SELECT
  USING (is_vendor_staff(vendor_id));

-- ---- reward_instances ----
DROP POLICY IF EXISTS "rewards: own read"   ON reward_instances;
DROP POLICY IF EXISTS "rewards: staff read" ON reward_instances;

CREATE POLICY "rewards: own read"
  ON reward_instances FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "rewards: staff read"
  ON reward_instances FOR SELECT
  USING (is_vendor_staff(vendor_id));

-- ---- reward_collections ----
DROP POLICY IF EXISTS "collections: own read"   ON reward_collections;
DROP POLICY IF EXISTS "collections: staff read" ON reward_collections;

CREATE POLICY "collections: own read"
  ON reward_collections FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "collections: staff read"
  ON reward_collections FOR SELECT
  USING (is_vendor_staff(vendor_id));

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- ----------------------------------------------------------
-- generate_collection_code: 4-char uppercase alphanumeric
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_collection_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chars  text    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- avoid 0/O/1/I
  v_len    integer := length(v_chars);
  v_code   text    := '';
  v_bytes  bytea;
  v_byte   integer;
  i        integer;
BEGIN
  v_bytes := gen_random_bytes(4);
  FOR i IN 0..3 LOOP
    v_byte := get_byte(v_bytes, i);
    v_code := v_code || substr(v_chars, (v_byte % v_len) + 1, 1);
  END LOOP;
  RETURN v_code;
END;
$$;

-- ----------------------------------------------------------
-- request_reward_collection
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION request_reward_collection(
  p_reward_instance_id uuid,
  p_customer_id        uuid,
  p_selected_option    text DEFAULT NULL,
  p_customer_note      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward   reward_instances%ROWTYPE;
  v_code     text;
  v_coll_id  uuid;
BEGIN
  -- Verify caller owns the reward
  SELECT * INTO v_reward
  FROM reward_instances
  WHERE id = p_reward_instance_id
    AND customer_id = p_customer_id
    AND status = 'available';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found or not available (id: %)', p_reward_instance_id;
  END IF;

  -- Generate a unique collection code (retry up to 10 times)
  FOR i IN 1..10 LOOP
    v_code := generate_collection_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM reward_collections WHERE collection_code = v_code);
  END LOOP;

  INSERT INTO reward_collections (
    reward_instance_id, customer_id, vendor_id,
    collection_code, selected_option, customer_note
  ) VALUES (
    p_reward_instance_id, p_customer_id, v_reward.vendor_id,
    v_code, p_selected_option, p_customer_note
  )
  RETURNING id INTO v_coll_id;

  UPDATE reward_instances
  SET status = 'collection_requested', updated_at = now()
  WHERE id = p_reward_instance_id;

  RETURN jsonb_build_object(
    'collection_id',   v_coll_id,
    'collection_code', v_code
  );
END;
$$;

-- ----------------------------------------------------------
-- mark_collection_ready
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_collection_ready(
  p_collection_id uuid,
  p_staff_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coll reward_collections%ROWTYPE;
BEGIN
  SELECT * INTO v_coll
  FROM reward_collections
  WHERE id = p_collection_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Collection not found (id: %)', p_collection_id;
  END IF;

  IF v_coll.status <> 'requested' THEN
    RAISE EXCEPTION 'Collection is not in requested state (current: %)', v_coll.status;
  END IF;

  IF NOT is_vendor_staff(v_coll.vendor_id) THEN
    RAISE EXCEPTION 'Staff user % does not belong to vendor %', p_staff_user_id, v_coll.vendor_id;
  END IF;

  UPDATE reward_collections
  SET status     = 'ready',
      ready_at   = now(),
      updated_at = now()
  WHERE id = p_collection_id;

  UPDATE reward_instances
  SET status = 'ready', updated_at = now()
  WHERE id = v_coll.reward_instance_id;

  RETURN jsonb_build_object('collection_id', p_collection_id, 'status', 'ready');
END;
$$;

-- ----------------------------------------------------------
-- complete_reward_collection
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION complete_reward_collection(
  p_collection_id uuid,
  p_staff_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coll reward_collections%ROWTYPE;
BEGIN
  SELECT * INTO v_coll
  FROM reward_collections
  WHERE id = p_collection_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Collection not found (id: %)', p_collection_id;
  END IF;

  IF v_coll.status = 'collected' THEN
    RAISE EXCEPTION 'Collection already completed';
  END IF;

  IF v_coll.status NOT IN ('requested','ready') THEN
    RAISE EXCEPTION 'Collection cannot be completed from state %', v_coll.status;
  END IF;

  IF NOT is_vendor_staff(v_coll.vendor_id) THEN
    RAISE EXCEPTION 'Staff user % does not belong to vendor %', p_staff_user_id, v_coll.vendor_id;
  END IF;

  UPDATE reward_collections
  SET status       = 'collected',
      collected_at = now(),
      completed_by = p_staff_user_id,
      updated_at   = now()
  WHERE id = p_collection_id;

  UPDATE reward_instances
  SET status = 'collected', updated_at = now()
  WHERE id = v_coll.reward_instance_id;

  RETURN jsonb_build_object('collection_id', p_collection_id, 'status', 'collected');
END;
$$;

-- ============================================================
-- 6. award_rounds — core transaction function
-- ============================================================
CREATE OR REPLACE FUNCTION award_rounds(
  p_customer_token    text,
  p_vendor_id         uuid    DEFAULT NULL,
  p_nfc_device_token  text    DEFAULT NULL,
  p_source            text    DEFAULT 'nfc',
  p_staff_user_id     uuid    DEFAULT NULL,
  p_idempotency_key   text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id        uuid;
  v_vendor           vendors%ROWTYPE;
  v_nfc_device       nfc_stamp_devices%ROWTYPE;
  v_program          loyalty_programs%ROWTYPE;
  v_campaign         round_campaigns%ROWTYPE;
  v_customer         profiles%ROWTYPE;
  v_membership       customer_vendor_memberships%ROWTYPE;
  v_existing_tx      round_transactions%ROWTYPE;
  v_rounds_to_award  integer;
  v_old_rounds       integer;
  v_new_total        integer;
  v_new_current      integer;
  v_rewards_count    integer;
  v_tx_id            uuid;
  v_reward_expires   timestamptz;
  i                  integer;
BEGIN
  -- ---- Validate idempotency key ----
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'idempotency_key is required';
  END IF;

  SELECT * INTO v_existing_tx
  FROM round_transactions
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    -- Return original result
    SELECT * INTO v_membership
    FROM customer_vendor_memberships
    WHERE id = v_existing_tx.membership_id;

    SELECT * INTO v_vendor
    FROM vendors
    WHERE id = v_existing_tx.vendor_id;

    RETURN jsonb_build_object(
      'idempotent',       true,
      'transaction_id',   v_existing_tx.id,
      'rounds_awarded',   v_existing_tx.rounds_awarded,
      'campaign_id',      v_existing_tx.campaign_id,
      'balance',          jsonb_build_object(
                            'current_rounds',  v_membership.current_rounds,
                            'lifetime_rounds', v_membership.lifetime_rounds
                          ),
      'membership_id',    v_membership.id,
      'vendor',           jsonb_build_object(
                            'id',            v_vendor.id,
                            'business_name', v_vendor.business_name,
                            'brand_color',   v_vendor.brand_color
                          )
    );
  END IF;

  -- ---- Resolve vendor ----
  IF p_vendor_id IS NOT NULL THEN
    v_vendor_id := p_vendor_id;
  ELSIF p_nfc_device_token IS NOT NULL THEN
    SELECT * INTO v_nfc_device
    FROM nfc_stamp_devices
    WHERE device_token_hash = encode(digest(p_nfc_device_token, 'sha256'), 'hex');

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NFC device not found for provided token';
    END IF;

    IF v_nfc_device.status <> 'active' THEN
      RAISE EXCEPTION 'NFC device is not active (status: %)', v_nfc_device.status;
    END IF;

    v_vendor_id := v_nfc_device.vendor_id;

    -- Update last_used_at
    UPDATE nfc_stamp_devices SET last_used_at = now() WHERE id = v_nfc_device.id;
  ELSE
    RAISE EXCEPTION 'Either p_vendor_id or p_nfc_device_token must be provided';
  END IF;

  -- ---- Fetch vendor ----
  SELECT * INTO v_vendor FROM vendors WHERE id = v_vendor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor not found (id: %)', v_vendor_id;
  END IF;
  IF v_vendor.status <> 'active' THEN
    RAISE EXCEPTION 'Vendor is not active (status: %)', v_vendor.status;
  END IF;

  -- ---- Validate staff for staff_scan source ----
  IF p_source = 'staff_scan' THEN
    IF p_staff_user_id IS NULL THEN
      RAISE EXCEPTION 'staff_user_id required for staff_scan source';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM vendor_staff
      WHERE vendor_id = v_vendor_id
        AND user_id   = p_staff_user_id
        AND status    = 'active'
    ) THEN
      RAISE EXCEPTION 'Staff user % does not belong to vendor %', p_staff_user_id, v_vendor_id;
    END IF;
  END IF;

  -- ---- Find active loyalty program ----
  SELECT * INTO v_program
  FROM loyalty_programs
  WHERE vendor_id = v_vendor_id
    AND status    = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active loyalty program for vendor %', v_vendor_id;
  END IF;

  -- ---- Find active campaign ----
  SELECT * INTO v_campaign
  FROM round_campaigns
  WHERE vendor_id  = v_vendor_id
    AND status     = 'scheduled'
    AND starts_at <= now()
    AND ends_at    > now()
  LIMIT 1;

  -- ---- Determine rounds to award ----
  IF v_campaign.id IS NOT NULL THEN
    v_rounds_to_award := v_campaign.round_value;
  ELSE
    v_rounds_to_award := v_program.default_round_value;
  END IF;

  -- Clamp to maximum_round_value
  IF v_rounds_to_award > v_program.maximum_round_value THEN
    v_rounds_to_award := v_program.maximum_round_value;
  END IF;

  -- ---- Find customer ----
  SELECT * INTO v_customer
  FROM profiles
  WHERE customer_token = p_customer_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found for token %', p_customer_token;
  END IF;

  -- ---- Find or create membership ----
  SELECT * INTO v_membership
  FROM customer_vendor_memberships
  WHERE customer_id = v_customer.id
    AND vendor_id   = v_vendor_id;

  IF NOT FOUND THEN
    INSERT INTO customer_vendor_memberships (
      customer_id, vendor_id, loyalty_program_id,
      current_rounds, lifetime_rounds,
      status, enrolled_via
    ) VALUES (
      v_customer.id, v_vendor_id, v_program.id,
      0, 0,
      'active', p_source
    )
    RETURNING * INTO v_membership;
  ELSE
    IF v_membership.status <> 'active' THEN
      RAISE EXCEPTION 'Membership is suspended for customer % at vendor %', v_customer.id, v_vendor_id;
    END IF;
  END IF;

  v_old_rounds  := v_membership.current_rounds;
  v_new_total   := v_old_rounds + v_rounds_to_award;

  -- ---- Calculate rewards unlocked ----
  v_rewards_count := floor(v_new_total::numeric / v_program.rounds_required);
  IF v_rewards_count > 0 THEN
    v_new_current := v_new_total % v_program.rounds_required;
  ELSE
    v_new_current := v_new_total;
  END IF;

  -- ---- Insert transaction ----
  INSERT INTO round_transactions (
    membership_id, customer_id, vendor_id,
    loyalty_program_id, nfc_device_id, campaign_id,
    rounds_awarded, event_type, source,
    staff_user_id, idempotency_key
  ) VALUES (
    v_membership.id, v_customer.id, v_vendor_id,
    v_program.id,
    CASE WHEN v_nfc_device.id IS NOT NULL THEN v_nfc_device.id ELSE NULL END,
    v_campaign.id,
    v_rounds_to_award, 'round_awarded', p_source,
    p_staff_user_id, p_idempotency_key
  )
  RETURNING id INTO v_tx_id;

  -- ---- Update membership ----
  UPDATE customer_vendor_memberships
  SET current_rounds  = v_new_current,
      lifetime_rounds = lifetime_rounds + v_rounds_to_award,
      updated_at      = now()
  WHERE id = v_membership.id;

  -- ---- Unlock reward instances ----
  IF v_rewards_count > 0 THEN
    IF v_program.reward_expiry_days IS NOT NULL THEN
      v_reward_expires := now() + (v_program.reward_expiry_days || ' days')::interval;
    END IF;

    FOR i IN 1..v_rewards_count LOOP
      INSERT INTO reward_instances (
        membership_id, customer_id, vendor_id, loyalty_program_id,
        reward_name, reward_description,
        status, expires_at
      ) VALUES (
        v_membership.id, v_customer.id, v_vendor_id, v_program.id,
        v_program.reward_name, v_program.reward_description,
        'available', v_reward_expires
      );
    END LOOP;
  END IF;

  -- ---- Return result ----
  RETURN jsonb_build_object(
    'transaction_id',   v_tx_id,
    'rounds_awarded',   v_rounds_to_award,
    'campaign_id',      v_campaign.id,
    'campaign_name',    v_campaign.name,
    'balance',          jsonb_build_object(
                          'current_rounds',  v_new_current,
                          'lifetime_rounds', v_membership.lifetime_rounds + v_rounds_to_award
                        ),
    'rewards_unlocked', v_rewards_count,
    'membership_id',    v_membership.id,
    'vendor',           jsonb_build_object(
                          'id',            v_vendor.id,
                          'business_name', v_vendor.business_name,
                          'brand_color',   v_vendor.brand_color
                        )
  );
END;
$$;

-- ============================================================
-- 7. UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER loyalty_programs_updated_at
  BEFORE UPDATE ON loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER memberships_updated_at
  BEFORE UPDATE ON customer_vendor_memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER nfc_devices_updated_at
  BEFORE UPDATE ON nfc_stamp_devices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER round_campaigns_updated_at
  BEFORE UPDATE ON round_campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER reward_instances_updated_at
  BEFORE UPDATE ON reward_instances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER reward_collections_updated_at
  BEFORE UPDATE ON reward_collections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 8. SEED DATA
-- (No real auth.users UUIDs are hardcoded — owner_id left NULL
--  so this works without a seeded auth user. Apply a real
--  owner_id via UPDATE after first sign-in if needed.)
-- ============================================================
DO $$
DECLARE
  v_vendor_id   uuid;
  v_program_id  uuid;
  v_device_id   uuid;
  v_device_token text := 'daily-grind-front-counter-v1';
BEGIN
  -- Vendor: Daily Grind
  INSERT INTO vendors (
    business_name, description, category,
    brand_color, status
  ) VALUES (
    'Daily Grind',
    'Your neighbourhood specialty coffee spot.',
    'Café',
    '#E8805A',
    'active'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_vendor_id;

  -- If already seeded, look it up
  IF v_vendor_id IS NULL THEN
    SELECT id INTO v_vendor_id FROM vendors WHERE business_name = 'Daily Grind' LIMIT 1;
  END IF;

  -- Loyalty program: Coffee Round
  INSERT INTO loyalty_programs (
    vendor_id, name, rounds_required,
    reward_name, reward_description,
    default_round_value, maximum_round_value,
    status
  ) VALUES (
    v_vendor_id,
    'Coffee Round',
    8,
    'Free regular coffee',
    'Redeem your completed round for any regular-sized coffee.',
    1,
    5,
    'active'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_program_id;

  IF v_program_id IS NULL THEN
    SELECT id INTO v_program_id FROM loyalty_programs WHERE vendor_id = v_vendor_id LIMIT 1;
  END IF;

  -- NFC device: Front Counter Round
  INSERT INTO nfc_stamp_devices (
    vendor_id, name,
    device_token_hash,
    location_label, status
  ) VALUES (
    v_vendor_id,
    'Front Counter Round',
    encode(digest(v_device_token, 'sha256'), 'hex'),
    'Front counter',
    'active'
  )
  ON CONFLICT (device_token_hash) DO NOTHING
  RETURNING id INTO v_device_id;

  -- Campaign: Double Round Afternoon
  INSERT INTO round_campaigns (
    vendor_id, name, round_value,
    starts_at, ends_at,
    status, customer_message
  ) VALUES (
    v_vendor_id,
    'Double Round Afternoon',
    2,
    now() + interval '1 hour',
    now() + interval '5 hours',
    'scheduled',
    'Pop in this afternoon for double rounds on every coffee!'
  )
  ON CONFLICT DO NOTHING;

END $$;
