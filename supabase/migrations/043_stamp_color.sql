-- Vendor-chosen colour for the stamp itself (the inked disc on the card back).
-- null = auto (a readable dark/light ink is picked from the panel).
alter table vendors
  add column if not exists stamp_color text;
