-- Two-sided loyalty card. Front is the identity/art side, back is the stamp
-- grid. All optional — a vendor that sets nothing keeps today's card.
alter table vendors
  add column if not exists card_front_url      text,
  add column if not exists card_front_headline text,
  add column if not exists card_front_subtext  text,
  add column if not exists card_back_message   text;
