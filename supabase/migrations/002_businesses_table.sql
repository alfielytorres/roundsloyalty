-- Create businesses table (required for QR code and loyalty system)
CREATE TABLE IF NOT EXISTS businesses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text,
  logo_url         text,
  address          text,
  lat              numeric(10, 7),
  lng              numeric(10, 7),
  qr_code_secret   text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Vendors manage own business"
  ON businesses FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY IF NOT EXISTS "Anyone can read businesses"
  ON businesses FOR SELECT USING (true);
