-- Optional colour shown behind the stamps, so a vendor can keep the whole card
-- their brand colour while making the stamp area contrast (e.g. yellow card,
-- darker panel). Null falls back to a derived shade of brand_color in the app.

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS stamp_bg_color text;
