-- Announcement / no-bonus campaigns use round_value = 1, but the original check
-- constraint required >= 2 and rejected them. Allow 1–10.

alter table round_campaigns drop constraint if exists round_campaigns_round_value_check;
alter table round_campaigns add constraint round_campaigns_round_value_check
  check (round_value >= 1 and round_value <= 10);
