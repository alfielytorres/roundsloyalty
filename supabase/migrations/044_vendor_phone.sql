-- Contact phone for the store. Required during onboarding (enforced in the app),
-- alongside a loyalty program and an address, before a vendor reaches the dashboard.
alter table vendors
  add column if not exists phone text;
