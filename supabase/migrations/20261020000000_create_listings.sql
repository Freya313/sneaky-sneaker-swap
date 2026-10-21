create table if not exists listings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  brand text not null,
  model text not null,
  size numeric not null,
  condition text not null,
  price numeric,
  swap_only boolean default false,
  description text,
  image_url text
);

alter table listings add column if not exists created_at timestamp with time zone default now();
alter table listings add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table listings add column if not exists brand text;
alter table listings add column if not exists model text;
alter table listings add column if not exists size numeric;
alter table listings add column if not exists condition text;
alter table listings add column if not exists price numeric;
alter table listings add column if not exists swap_only boolean default false;
alter table listings add column if not exists description text;
alter table listings add column if not exists image_url text;

alter table listings enable row level security;

drop policy if exists "Anyone can view listings" on listings;
create policy "Anyone can view listings"
  on listings for select
  using (true);

drop policy if exists "Users can insert their own listings" on listings;
create policy "Users can insert their own listings"
  on listings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own listings" on listings;
create policy "Users can delete their own listings"
  on listings for delete
  using (auth.uid() = user_id);
