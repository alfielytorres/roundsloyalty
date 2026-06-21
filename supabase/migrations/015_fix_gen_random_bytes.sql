-- Fix generate_collection_code to use extensions.gen_random_bytes
-- Supabase exposes pgcrypto under the extensions schema, not public

CREATE OR REPLACE FUNCTION generate_collection_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code  text := '';
  v_bytes bytea;
  i       int;
BEGIN
  LOOP
    v_bytes := extensions.gen_random_bytes(4);
    v_code := '';
    FOR i IN 0..3 LOOP
      v_code := v_code || substr(v_chars, (get_byte(v_bytes, i) % 32) + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM reward_collections WHERE collection_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;
