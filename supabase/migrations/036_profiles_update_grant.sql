-- Customers edit their own profile (display name, birthday) from the iOS app.
-- The authenticated role held every privilege on profiles EXCEPT UPDATE, so those
-- writes failed with "permission denied for table profiles" even though the RLS
-- UPDATE policies (id = auth.uid()) were correct. Grant the table privilege; RLS
-- still restricts each user to their own row.
grant update on public.profiles to authenticated;
