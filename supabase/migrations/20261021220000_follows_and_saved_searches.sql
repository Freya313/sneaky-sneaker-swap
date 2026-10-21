-- Seller follows: a user can follow another user to see their listings in a feed
create table if not exists follows (
  id          uuid default gen_random_uuid() primary key,
  follower_id uuid references auth.users(id) on delete cascade not null,
  followed_id uuid references auth.users(id) on delete cascade not null,
  created_at  timestamp with time zone default now(),
  unique (follower_id, followed_id)
);

alter table follows enable row level security;

create policy "Followers manage own follows"
  on follows for all
  to authenticated
  using (follower_id = auth.uid())
  with check (follower_id = auth.uid());

-- Saved searches: stores a user's search/filter state for new-result notifications
create table if not exists saved_searches (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  name             text not null,
  filters          jsonb not null default '{}',
  last_notified_at timestamp with time zone default now(),
  created_at       timestamp with time zone default now()
);

alter table saved_searches enable row level security;

create policy "Users manage own saved searches"
  on saved_searches for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
