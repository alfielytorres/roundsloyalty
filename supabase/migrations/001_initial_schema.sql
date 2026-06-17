-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('customer', 'vendor')),
  display_name text,
  avatar_url  text,
  expo_push_token text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- BUSINESSES
-- ============================================================
CREATE TABLE businesses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text,
  logo_url         text,
  address          text,
  lat              numeric(10, 7),
  lng              numeric(10, 7),
  location         geography(Point, 4326),
  qr_code_secret   text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Keep geography column in sync with lat/lng
CREATE OR REPLACE FUNCTION sync_business_location()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER businesses_location_sync
  BEFORE INSERT OR UPDATE OF lat, lng ON businesses
  FOR EACH ROW EXECUTE FUNCTION sync_business_location();

CREATE INDEX businesses_location_idx ON businesses USING GIST (location);

-- ============================================================
-- LOYALTY PROGRAMS
-- ============================================================
CREATE TABLE loyalty_programs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type                text NOT NULL CHECK (type IN ('stamp', 'points', 'tiered')),
  config              jsonb NOT NULL DEFAULT '{}',
  reward_description  text,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Only one active program per business
CREATE UNIQUE INDEX one_active_program_per_business
  ON loyalty_programs (business_id)
  WHERE is_active = true;

-- ============================================================
-- LOYALTY CARDS
-- ============================================================
CREATE TABLE loyalty_cards (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_id          uuid NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
  stamps_collected    int NOT NULL DEFAULT 0 CHECK (stamps_collected >= 0),
  points_accumulated  int NOT NULL DEFAULT 0 CHECK (points_accumulated >= 0),
  tier                text,
  wallet_pass_id      text,
  last_visit          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, program_id)
);

-- ============================================================
-- VISIT EVENTS (immutable audit log)
-- ============================================================
CREATE TABLE visit_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id          uuid NOT NULL REFERENCES loyalty_cards(id) ON DELETE CASCADE,
  business_id      uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stamps_added     int NOT NULL DEFAULT 0,
  points_added     int NOT NULL DEFAULT 0,
  vendor_device_id text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Prevent updates/deletes on visit_events (immutable log)
CREATE RULE no_update_visit_events AS ON UPDATE TO visit_events DO INSTEAD NOTHING;
CREATE RULE no_delete_visit_events AS ON DELETE TO visit_events DO INSTEAD NOTHING;

-- ============================================================
-- REDEMPTIONS
-- ============================================================
CREATE TABLE redemptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     uuid NOT NULL REFERENCES loyalty_cards(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  notes       text
);

-- ============================================================
-- OFFERS
-- ============================================================
CREATE TABLE offers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title           text NOT NULL,
  body            text NOT NULL,
  target_segment  text NOT NULL CHECK (target_segment IN ('all', 'returning', 'at_risk', 'top')),
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- OFFER RECIPIENTS
-- ============================================================
CREATE TABLE offer_recipients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id     uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  delivered_at timestamptz,
  opened_at    timestamptz,
  UNIQUE (offer_id, customer_id)
);

-- ============================================================
-- DATA CONSENTS (GDPR)
-- ============================================================
CREATE TABLE data_consents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  consented_at  timestamptz NOT NULL DEFAULT now(),
  withdrawn_at  timestamptz,
  UNIQUE (customer_id, business_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards    ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_consents    ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users read own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- businesses — vendors manage theirs; customers can read for discovery
CREATE POLICY "Vendors manage own business"   ON businesses FOR ALL    USING (auth.uid() = owner_id);
CREATE POLICY "Anyone can read businesses"    ON businesses FOR SELECT USING (true);

-- loyalty_programs — vendors manage; customers read active
CREATE POLICY "Vendors manage own programs"   ON loyalty_programs FOR ALL    USING (
  EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
);
CREATE POLICY "Customers read active programs" ON loyalty_programs FOR SELECT USING (is_active = true);

-- loyalty_cards — customer sees own; vendor sees cards for their programs
CREATE POLICY "Customer sees own cards" ON loyalty_cards FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Vendor sees cards for their programs" ON loyalty_cards FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM loyalty_programs lp
    JOIN businesses b ON lp.business_id = b.id
    WHERE lp.id = program_id AND b.owner_id = auth.uid()
  )
);

-- visit_events — no direct client INSERT (Edge Function only via service role)
CREATE POLICY "Customer sees own visit events" ON visit_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM loyalty_cards WHERE id = card_id AND customer_id = auth.uid())
);
CREATE POLICY "Vendor sees visit events for their business" ON visit_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
);

-- redemptions
CREATE POLICY "Customer sees own redemptions" ON redemptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM loyalty_cards WHERE id = card_id AND customer_id = auth.uid())
);
CREATE POLICY "Vendor sees redemptions for their programs" ON redemptions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM loyalty_cards lc
    JOIN loyalty_programs lp ON lc.program_id = lp.id
    JOIN businesses b ON lp.business_id = b.id
    WHERE lc.id = card_id AND b.owner_id = auth.uid()
  )
);
CREATE POLICY "Vendor inserts redemptions" ON redemptions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM loyalty_cards lc
    JOIN loyalty_programs lp ON lc.program_id = lp.id
    JOIN businesses b ON lp.business_id = b.id
    WHERE lc.id = card_id AND b.owner_id = auth.uid()
  )
);

-- offers
CREATE POLICY "Vendors manage own offers" ON offers FOR ALL USING (
  EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
);

-- offer_recipients — customers see their own; vendors see delivery for their offers
CREATE POLICY "Customer sees own offers" ON offer_recipients FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Customer marks offer opened" ON offer_recipients FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY "Vendor sees delivery stats" ON offer_recipients FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM offers o
    JOIN businesses b ON o.business_id = b.id
    WHERE o.id = offer_id AND b.owner_id = auth.uid()
  )
);

-- data_consents
CREATE POLICY "Customer manages own consents" ON data_consents FOR ALL USING (customer_id = auth.uid());
CREATE POLICY "Vendor reads consents for their business" ON data_consents FOR SELECT USING (
  EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
);

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Vendor: customer segments view
CREATE VIEW vendor_customer_segments AS
SELECT
  lc.id AS card_id,
  lc.customer_id,
  p.display_name,
  p.avatar_url,
  lp.business_id,
  lc.stamps_collected,
  lc.points_accumulated,
  lc.tier,
  lc.last_visit,
  lc.created_at AS first_visit,
  COUNT(ve.id) AS total_visits,
  CASE
    WHEN lc.last_visit > now() - interval '30 days' AND COUNT(ve.id) >= 5 THEN 'top'
    WHEN lc.last_visit > now() - interval '30 days' THEN 'returning'
    WHEN lc.last_visit <= now() - interval '30 days' THEN 'at_risk'
    ELSE 'new'
  END AS segment
FROM loyalty_cards lc
JOIN profiles p ON lc.customer_id = p.id
JOIN loyalty_programs lp ON lc.program_id = lp.id
LEFT JOIN visit_events ve ON ve.card_id = lc.id
GROUP BY lc.id, lc.customer_id, p.display_name, p.avatar_url, lp.business_id,
         lc.stamps_collected, lc.points_accumulated, lc.tier, lc.last_visit, lc.created_at;
