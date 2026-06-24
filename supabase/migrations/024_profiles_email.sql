-- profiles never stored email (it lives in auth.users), but staff invites look
-- users up by email and the Staff list displays it. Add the column, backfill
-- from auth.users, and keep it in sync on signup / email change.

alter table profiles add column if not exists email text;

update profiles p set email = u.email
from auth.users u
where u.id = p.id and p.email is distinct from u.email;

-- Set email on new signups (extends the existing handle_new_user).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, role, display_name, email)
  values (
    new.id,
    'customer',
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- Keep profiles.email current if a user changes their email.
create or replace function sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set email = new.email, updated_at = now() where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_sync on auth.users;
create trigger on_auth_user_email_sync
  after update of email on auth.users
  for each row execute function sync_profile_email();
