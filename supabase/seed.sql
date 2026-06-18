-- ============================================================
-- seed.sql
-- Rounds Loyalty Platform — Demo Data
--
-- Uses hardcoded UUIDs so inserts are reproducible and
-- idempotent (wrapped in DO blocks with ON CONFLICT guards).
-- Safe to run multiple times.
-- ============================================================

DO $$
DECLARE
  v_patricia_vendor_id       uuid := 'a1000000-0000-0000-0000-000000000001';
  v_patricia_location_id     uuid := 'a1000000-0000-0000-0000-000000000002';
  v_patricia_stamp_prog_id   uuid := 'a1000000-0000-0000-0000-000000000003';
  v_patricia_stamp_rule_id   uuid := 'a1000000-0000-0000-0000-000000000004';
  v_patricia_newcust_prog_id uuid := 'a1000000-0000-0000-0000-000000000005';
  v_patricia_newcust_rule_id uuid := 'a1000000-0000-0000-0000-000000000006';
  v_barbers_vendor_id        uuid := 'b2000000-0000-0000-0000-000000000001';
  v_barbers_location_id      uuid := 'b2000000-0000-0000-0000-000000000002';
  v_barbers_stamp_prog_id    uuid := 'b2000000-0000-0000-0000-000000000003';
  v_barbers_stamp_rule_id    uuid := 'b2000000-0000-0000-0000-000000000004';
BEGIN

  -- Patricia Coffee
  INSERT INTO vendors (id, business_name, category, description, proof_of_purchase_enabled,
    proof_of_purchase_instructions, proof_of_purchase_max_claim_age_days, status)
  VALUES (v_patricia_vendor_id, 'Patricia Coffee', 'Cafe', 'Melbourne''s finest specialty coffee',
    true, 'Upload a clear receipt or order screenshot showing the store name, purchase date, and total.', 30, 'active')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO store_locations (id, vendor_id, name, address, suburb, state, country, status)
  VALUES (v_patricia_location_id, v_patricia_vendor_id, 'Patricia Coffee Melbourne CBD',
    '493 Swanston St', 'Melbourne CBD', 'VIC', 'AU', 'active')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO loyalty_programs (id, vendor_id, type, name, status)
  VALUES (v_patricia_stamp_prog_id, v_patricia_vendor_id, 'stamp_card', 'Buy 5 Coffees Get 1 Free', 'active')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO reward_rules (id, loyalty_program_id, vendor_id, type, required_stamps, reward_name, status)
  VALUES (v_patricia_stamp_rule_id, v_patricia_stamp_prog_id, v_patricia_vendor_id,
    'buy_x_get_y', 5, 'Free Coffee', 'active')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO loyalty_programs (id, vendor_id, type, name, status)
  VALUES (v_patricia_newcust_prog_id, v_patricia_vendor_id, 'new_customer', 'Welcome Gift', 'active')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO reward_rules (id, loyalty_program_id, vendor_id, type, reward_name, reward_description, status)
  VALUES (v_patricia_newcust_rule_id, v_patricia_newcust_prog_id, v_patricia_vendor_id,
    'new_customer', 'Free Cookie', 'A free cookie on your first visit', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Northside Barbers
  INSERT INTO vendors (id, business_name, category, description, proof_of_purchase_enabled, status)
  VALUES (v_barbers_vendor_id, 'Northside Barbers', 'Barber', 'Fitzroy''s neighbourhood barbershop', false, 'active')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO store_locations (id, vendor_id, name, address, suburb, state, country, status)
  VALUES (v_barbers_location_id, v_barbers_vendor_id, 'Northside Barbers Fitzroy',
    '273 Smith St', 'Fitzroy', 'VIC', 'AU', 'active')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO loyalty_programs (id, vendor_id, type, name, status)
  VALUES (v_barbers_stamp_prog_id, v_barbers_vendor_id, 'stamp_card', '5 Visits = $10 Off', 'active')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO reward_rules (id, loyalty_program_id, vendor_id, type, required_stamps, reward_name, status)
  VALUES (v_barbers_stamp_rule_id, v_barbers_stamp_prog_id, v_barbers_vendor_id,
    'buy_x_get_y', 5, '$10 Discount', 'active')
  ON CONFLICT (id) DO NOTHING;

END $$;
