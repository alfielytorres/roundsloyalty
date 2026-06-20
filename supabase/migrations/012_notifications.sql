-- Push tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token       text NOT NULL,
  platform    text NOT NULL DEFAULT 'ios',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (customer_id, token)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens: own read/write"
  ON push_tokens FOR ALL
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Notification log
CREATE TABLE IF NOT EXISTS customer_notifications (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id     uuid REFERENCES vendors(id) ON DELETE SET NULL,
  title         text NOT NULL,
  body          text NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  error_message text,
  read_at       timestamptz,
  sent_at       timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX ON customer_notifications (customer_id, created_at DESC);

ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;

-- Customers can read their own notifications
CREATE POLICY "notifications: customer read"
  ON customer_notifications FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can mark as read (update read_at only)
CREATE POLICY "notifications: customer update"
  ON customer_notifications FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Service role / triggers can insert
CREATE POLICY "notifications: service insert"
  ON customer_notifications FOR INSERT
  WITH CHECK (true);

-- Trigger: insert a notification row whenever rounds are awarded
CREATE OR REPLACE FUNCTION notify_customer_on_stamp()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_customer_id uuid;
  v_vendor_name text;
  v_reward_name text;
  v_rounds_req  int;
  v_current     int;
  v_remaining   int;
  v_title       text;
  v_body        text;
BEGIN
  -- Resolve customer from membership
  SELECT customer_id INTO v_customer_id
    FROM customer_vendor_memberships WHERE id = NEW.membership_id;
  IF v_customer_id IS NULL THEN RETURN NEW; END IF;

  -- Vendor name
  SELECT business_name INTO v_vendor_name FROM vendors WHERE id = NEW.vendor_id;

  -- Active program
  SELECT reward_name, rounds_required INTO v_reward_name, v_rounds_req
    FROM loyalty_programs
    WHERE vendor_id = NEW.vendor_id AND status = 'active'
    LIMIT 1;

  -- Current rounds on membership (freshest value)
  SELECT current_rounds INTO v_current
    FROM customer_vendor_memberships WHERE id = NEW.membership_id;

  v_title := coalesce(v_vendor_name, 'Your store') || ' stamped your card!';

  IF v_reward_name IS NOT NULL AND v_rounds_req IS NOT NULL THEN
    v_remaining := GREATEST(0, v_rounds_req - v_current);
    IF v_remaining = 0 THEN
      v_body := 'You''re ready to claim your ' || v_reward_name || '! 🎉';
    ELSE
      v_body := 'You now have ' || v_current || ' round' ||
                CASE WHEN v_current = 1 THEN '' ELSE 's' END ||
                '. ' || v_remaining || ' more for ' || v_reward_name || '.';
    END IF;
  ELSE
    v_body := 'You earned ' || NEW.rounds_awarded || ' round' ||
              CASE WHEN NEW.rounds_awarded = 1 THEN '' ELSE 's' END || '. Keep it up! 🎯';
  END IF;

  INSERT INTO customer_notifications (customer_id, vendor_id, title, body)
  VALUES (v_customer_id, NEW.vendor_id, v_title, v_body);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_round_awarded ON round_transactions;
CREATE TRIGGER on_round_awarded
  AFTER INSERT ON round_transactions
  FOR EACH ROW EXECUTE FUNCTION notify_customer_on_stamp();
