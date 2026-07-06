-- Per-side text colour override for the loyalty card. null = auto (contrast is
-- chosen from the background), 'dark' = black ink, 'light' = white ink.
alter table vendors
  add column if not exists card_front_text_color text,
  add column if not exists card_back_text_color  text;
