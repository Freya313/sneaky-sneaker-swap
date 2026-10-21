alter table listings drop column if exists swap_only;
alter table listings drop column if exists image_url;

alter table listings add column if not exists size_system text;
alter table listings add column if not exists color text;
alter table listings add column if not exists authenticity_note text;
alter table listings add column if not exists status text not null default 'active';
alter table listings add column if not exists pickup_location text;
alter table listings add column if not exists photos text[] not null default '{}';
alter table listings add column if not exists updated_at timestamp with time zone default now();

alter table listings alter column size_system set not null;
alter table listings alter column color set not null;
alter table listings alter column price set not null;
alter table listings alter column authenticity_note set not null;
alter table listings alter column pickup_location set not null;

alter table listings alter column condition type text using condition::text;

alter table listings drop constraint if exists listings_condition_check;
alter table listings add constraint listings_condition_check
  check (condition in ('New', 'Like new', 'Very good', 'Good', 'Fair'));

alter table listings drop constraint if exists listings_size_system_check;
alter table listings add constraint listings_size_system_check
  check (size_system in ('EU', 'US', 'UK'));

alter table listings drop constraint if exists listings_status_check;
alter table listings add constraint listings_status_check
  check (status in ('active', 'reserved', 'sold', 'withdrawn'));

alter table listings drop constraint if exists listings_price_check;
alter table listings add constraint listings_price_check check (price >= 0);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_set_updated_at on listings;
create trigger listings_set_updated_at
  before update on listings
  for each row execute function set_updated_at();

drop policy if exists "Anyone can view listings" on listings;
drop policy if exists "Logged in users can view listings" on listings;
create policy "Logged in users can view listings"
  on listings for select
  to authenticated
  using (true);

drop policy if exists "Users can update their own listings" on listings;
create policy "Users can update their own listings"
  on listings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function sneak_peeks()
returns setof listings
language sql
stable
security definer
set search_path = public
as $$
  select * from listings
  where status = 'active' and condition = 'Very good'
  order by random()
  limit 5;
$$;

grant execute on function sneak_peeks() to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view listing photos" on storage.objects;
create policy "Anyone can view listing photos"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

drop policy if exists "Logged in users upload listing photos" on storage.objects;
create policy "Logged in users upload listing photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
