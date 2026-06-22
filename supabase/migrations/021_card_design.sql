-- Loyalty-card design: vendors can choose the stamp icon (an emoji) shown on
-- the card and an optional background image. brand_color already exists.
-- These flow to the customer's card in the iOS app via the membership→vendor join.

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS stamp_icon text NOT NULL DEFAULT '☕';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS card_background_url text;
