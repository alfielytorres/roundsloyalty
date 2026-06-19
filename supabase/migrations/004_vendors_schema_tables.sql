-- ============================================================
-- 004_vendors_schema_tables.sql
-- Creates all tables required by the vendors-schema RPC functions
-- Safe to run on a database that already has businesses/profiles.
-- ============================================================

-- VENDORS
CREATE TABLE IF NOT EXISTS vendors (
  id                                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name                       text NOT NULL,
  description                         text,
  logo_url                            text,
  address                             text,
  lat                                 numeric(10,7),
  lng                                 numeric(10,7),
  status                              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  proof_of_purchase_enabled           boolean NOT NULL DEFAULT false,
  proof_of_purchase_max_claim_age_days int NOT NULL DEFAULT 30,
  created_at                          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendors' AND policyname='Vendors manage own record') THEN
    CREATE POLICY "Vendors manage own record" ON vendors FOR ALL USING (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendors' AND policyname='Anyone can read vendors') THEN
    CREATE POLICY "Anyone can read vendors" ON vendors FOR SELECT USING (true);
  END IF;
END $$;

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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendor_staff' AND policyname='Vendors manage own staff') THEN
    CREATE POLICY "Vendors manage own staff" ON vendor_staff FOR ALL USING (
      EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND owner_id = auth.uid())
    );
  END IF;
END $$;

-- CUSTOMER VENDOR MEMBERSHIPS
CREATE TABLE IF NOT EXISTS customer_vendor_memberships (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id        uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','left')),
  membership_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  activated_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, vendor_id)
);

ALTER TABLE customer_vendor_memberships ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer_vendor_memberships' AND policyname='Customer sees own memberships') THEN
    CREATE POLICY "Customer sees own memberships" ON customer_vendor_memberships FOR SELECT USING (customer_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer_vendor_memberships' AND policyname='Vendor sees own memberships') THEN
    CREATE POLICY "Vendor sees own memberships" ON customer_vendor_memberships FOR SELECT USING (
      EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND owner_id = auth.uid())
    );
  END IF;
END $$;

-- LOYALTY BALANCES
CREATE TABLE IF NOT EXISTS loyalty_balances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id   uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  stamps      int NOT NULL DEFAULT 0 CHECK (stamps >= 0),
  points      int NOT NULL DEFAULT 0 CHECK (points >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, vendor_id)
);

ALTER TABLE loyalty_balances ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loyalty_balances' AND policyname='Customer sees own balance') THEN
    CREATE POLICY "Customer sees own balance" ON loyalty_balances FOR SELECT USING (customer_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loyalty_balances' AND policyname='Vendor sees own balances') THEN
    CREATE POLICY "Vendor sees own balances" ON loyalty_balances FOR SELECT USING (
      EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND owner_id = auth.uid())
    );
  END IF;
END $$;

-- LOYALTY LEDGER
CREATE TABLE IF NOT EXISTS loyalty_ledger (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id    uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  membership_id uuid REFERENCES customer_vendor_memberships(id) ON DELETE SET NULL,
  event_type   text NOT NULL,
  stamps_delta int NOT NULL DEFAULT 0,
  points_delta int NOT NULL DEFAULT 0,
  source       text NOT NULL DEFAULT 'manual',
  staff_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE loyalty_ledger ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loyalty_ledger' AND policyname='Customer sees own ledger') THEN
    CREATE POLICY "Customer sees own ledger" ON loyalty_ledger FOR SELECT USING (customer_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loyalty_ledger' AND policyname='Vendor sees own ledger') THEN
    CREATE POLICY "Vendor sees own ledger" ON loyalty_ledger FOR SELECT USING (
      EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND owner_id = auth.uid())
    );
  END IF;
END $$;

-- LOYALTY PROGRAMS (vendors schema version — vendor_id instead of business_id)
-- Add vendor_id column if loyalty_programs already exists with business_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loyalty_programs') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loyalty_programs' AND column_name = 'vendor_id') THEN
      ALTER TABLE loyalty_programs ADD COLUMN vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE;
      ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
    END IF;
  ELSE
    CREATE TABLE loyalty_programs (
      id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vendor_id          uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      type               text NOT NULL,
      config             jsonb NOT NULL DEFAULT '{}',
      reward_description text,
      status             text NOT NULL DEFAULT 'active',
      created_at         timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- REWARD RULES
CREATE TABLE IF NOT EXISTS reward_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_program_id uuid NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
  type              text NOT NULL DEFAULT 'stamp_threshold',
  required_stamps   int,
  points_required   int,
  points_multiplier numeric NOT NULL DEFAULT 1,
  reward_name       text NOT NULL DEFAULT 'Free Reward',
  reward_description text,
  expiry_days       int,
  status            text NOT NULL DEFAULT 'active',
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reward_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reward_rules' AND policyname='Anyone can read active rules') THEN
    CREATE POLICY "Anyone can read active rules" ON reward_rules FOR SELECT USING (status = 'active');
  END IF;
END $$;

-- REWARD INSTANCES
CREATE TABLE IF NOT EXISTS reward_instances (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id       uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  reward_rule_id  uuid REFERENCES reward_rules(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'available' CHECK (status IN ('available','redeemed','expired','voided')),
  reward_name     text NOT NULL,
  reward_description text,
  expires_at      timestamptz,
  redeemed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reward_instances ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reward_instances' AND policyname='Customer sees own rewards') THEN
    CREATE POLICY "Customer sees own rewards" ON reward_instances FOR SELECT USING (customer_id = auth.uid());
  END IF;
END $$;

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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='proof_of_purchase_claims' AND policyname='Customer sees own claims') THEN
    CREATE POLICY "Customer sees own claims" ON proof_of_purchase_claims FOR SELECT USING (customer_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='proof_of_purchase_claims' AND policyname='Vendor sees own claims') THEN
    CREATE POLICY "Vendor sees own claims" ON proof_of_purchase_claims FOR ALL USING (
      EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND owner_id = auth.uid())
    );
  END IF;
END $$;
