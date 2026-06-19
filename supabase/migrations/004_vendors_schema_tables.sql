-- ============================================================
-- 004_vendors_schema_tables.sql
-- Creates all tables required by the vendors-schema RPC functions.
-- Safe to run on a database that already has businesses/profiles.
-- ============================================================

-- VENDORS
CREATE TABLE IF NOT EXISTS vendors (
  id                                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name                        text NOT NULL,
  description                          text,
  logo_url                             text,
  address                              text,
  lat                                  numeric(10,7),
  lng                                  numeric(10,7),
  status                               text NOT NULL DEFAULT 'active',
  proof_of_purchase_enabled            boolean NOT NULL DEFAULT false,
  proof_of_purchase_max_claim_age_days int NOT NULL DEFAULT 30,
  created_at                           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vendors manage own record" ON vendors;
CREATE POLICY "Vendors manage own record" ON vendors FOR ALL USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Anyone can read vendors" ON vendors;
CREATE POLICY "Anyone can read vendors" ON vendors FOR SELECT USING (true);

-- VENDOR STAFF
CREATE TABLE IF NOT EXISTS vendor_staff (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, user_id)
);

ALTER TABLE vendor_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vendors manage own staff" ON vendor_staff;
CREATE POLICY "Vendors manage own staff" ON vendor_staff FOR ALL USING (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_staff.vendor_id AND v.owner_id = auth.uid())
);

-- CUSTOMER VENDOR MEMBERSHIPS
CREATE TABLE IF NOT EXISTS customer_vendor_memberships (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id        uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'pending',
  membership_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  activated_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, vendor_id)
);

ALTER TABLE customer_vendor_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customer sees own memberships" ON customer_vendor_memberships;
CREATE POLICY "Customer sees own memberships" ON customer_vendor_memberships FOR SELECT USING (customer_vendor_memberships.customer_id = auth.uid());
DROP POLICY IF EXISTS "Vendor sees own memberships" ON customer_vendor_memberships;
CREATE POLICY "Vendor sees own memberships" ON customer_vendor_memberships FOR SELECT USING (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = customer_vendor_memberships.vendor_id AND v.owner_id = auth.uid())
);

-- LOYALTY BALANCES
CREATE TABLE IF NOT EXISTS loyalty_balances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id   uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  stamps      int NOT NULL DEFAULT 0,
  points      int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, vendor_id)
);

ALTER TABLE loyalty_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customer sees own balance" ON loyalty_balances;
CREATE POLICY "Customer sees own balance" ON loyalty_balances FOR SELECT USING (loyalty_balances.customer_id = auth.uid());
DROP POLICY IF EXISTS "Vendor sees own balances" ON loyalty_balances;
CREATE POLICY "Vendor sees own balances" ON loyalty_balances FOR SELECT USING (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = loyalty_balances.vendor_id AND v.owner_id = auth.uid())
);

-- LOYALTY LEDGER
CREATE TABLE IF NOT EXISTS loyalty_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id     uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  membership_id uuid REFERENCES customer_vendor_memberships(id) ON DELETE SET NULL,
  event_type    text NOT NULL,
  stamps_delta  int NOT NULL DEFAULT 0,
  points_delta  int NOT NULL DEFAULT 0,
  source        text NOT NULL DEFAULT 'manual',
  staff_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE loyalty_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customer sees own ledger" ON loyalty_ledger;
CREATE POLICY "Customer sees own ledger" ON loyalty_ledger FOR SELECT USING (loyalty_ledger.customer_id = auth.uid());
DROP POLICY IF EXISTS "Vendor sees own ledger" ON loyalty_ledger;
CREATE POLICY "Vendor sees own ledger" ON loyalty_ledger FOR SELECT USING (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = loyalty_ledger.vendor_id AND v.owner_id = auth.uid())
);

-- LOYALTY PROGRAMS
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id          uuid REFERENCES vendors(id) ON DELETE CASCADE,
  type               text NOT NULL DEFAULT 'stamp_card',
  config             jsonb NOT NULL DEFAULT '{}',
  reward_description text,
  status             text NOT NULL DEFAULT 'active',
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vendors manage own programs" ON loyalty_programs;
CREATE POLICY "Vendors manage own programs" ON loyalty_programs FOR ALL USING (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = loyalty_programs.vendor_id AND v.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "Anyone can read active programs" ON loyalty_programs;
CREATE POLICY "Anyone can read active programs" ON loyalty_programs FOR SELECT USING (loyalty_programs.status = 'active');

-- REWARD RULES
CREATE TABLE IF NOT EXISTS reward_rules (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_program_id uuid NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
  type               text NOT NULL DEFAULT 'stamp_threshold',
  required_stamps    int,
  points_required    int,
  points_multiplier  numeric NOT NULL DEFAULT 1,
  reward_name        text NOT NULL DEFAULT 'Free Reward',
  reward_description text,
  expiry_days        int,
  status             text NOT NULL DEFAULT 'active',
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reward_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active rules" ON reward_rules;
CREATE POLICY "Anyone can read active rules" ON reward_rules FOR SELECT USING (true);

-- REWARD INSTANCES
CREATE TABLE IF NOT EXISTS reward_instances (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id          uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  reward_rule_id     uuid REFERENCES reward_rules(id) ON DELETE SET NULL,
  status             text NOT NULL DEFAULT 'available',
  reward_name        text NOT NULL,
  reward_description text,
  expires_at         timestamptz,
  redeemed_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reward_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customer sees own rewards" ON reward_instances;
CREATE POLICY "Customer sees own rewards" ON reward_instances FOR SELECT USING (reward_instances.customer_id = auth.uid());

-- PROOF OF PURCHASE CLAIMS
CREATE TABLE IF NOT EXISTS proof_of_purchase_claims (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id         uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  membership_id     uuid REFERENCES customer_vendor_memberships(id) ON DELETE SET NULL,
  receipt_image_url text,
  purchase_amount   numeric,
  purchase_date     date,
  customer_note     text,
  vendor_note       text,
  reward_action     text,
  status            text NOT NULL DEFAULT 'pending_review',
  reviewed_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proof_of_purchase_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customer sees own claims" ON proof_of_purchase_claims;
CREATE POLICY "Customer sees own claims" ON proof_of_purchase_claims FOR SELECT USING (proof_of_purchase_claims.customer_id = auth.uid());
DROP POLICY IF EXISTS "Vendor sees own claims" ON proof_of_purchase_claims;
CREATE POLICY "Vendor sees own claims" ON proof_of_purchase_claims FOR ALL USING (
  EXISTS (SELECT 1 FROM vendors v WHERE v.id = proof_of_purchase_claims.vendor_id AND v.owner_id = auth.uid())
);
