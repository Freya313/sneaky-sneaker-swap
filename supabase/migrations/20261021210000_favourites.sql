create table if not exists favourites (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  listing_id  uuid references listings(id)   on delete cascade not null,
  created_at  timestamp with time zone default now(),
  unique (user_id, listing_id)
);

alter table favourites enable row level security;

create policy "Users see own favourites"
  on favourites for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users create own favourites"
  on favourites for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users delete own favourites"
  on favourites for delete
  to authenticated
  using (user_id = auth.uid());
