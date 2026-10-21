-- Allow authenticated users to create their own profile row.
-- The with check ensures they can only insert a row where id matches
-- their own auth user id — they cannot create a profile for someone else.
create policy "Owner creates own profile"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());
