-- =====================================================================
-- USER NOTIFICATIONS
-- Activity notifications for users (e.g. "someone favourited your item")
-- =====================================================================

create table if not exists user_notifications (
  id          uuid    default gen_random_uuid() primary key,
  user_id     uuid    references auth.users(id) on delete cascade not null,  -- recipient
  actor_id    uuid    references auth.users(id) on delete cascade not null,  -- who triggered it
  type        text    not null default 'favourite'
              check (type in ('favourite', 'offer', 'message')),
  body        text    not null,
  listing_id  uuid    references listings(id)   on delete cascade,
  read_at     timestamp with time zone,
  created_at  timestamp with time zone default now()
);

alter table user_notifications enable row level security;

create policy "Users view own notifications"
  on user_notifications for select to authenticated
  using (user_id = auth.uid());

create policy "Users mark own notifications read"
  on user_notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- realtime so bell updates instantly
alter publication supabase_realtime add table user_notifications;

-- =====================================================================
-- TRIGGER — insert notification when a listing is favourited
-- security definer so the function can read profiles/listings and
-- insert the notification regardless of the caller's RLS context
-- =====================================================================
create or replace function handle_new_favourite()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_actor_name   text;
  v_listing_name text;
  v_seller_id    uuid;
begin
  -- resolve actor name (may be null for brand-new profiles)
  select name into v_actor_name
    from profiles where id = NEW.user_id;

  -- resolve listing title and seller
  select brand || ' ' || model, user_id
    into v_listing_name, v_seller_id
    from listings where id = NEW.listing_id;

  -- skip if listing not found, or the liker IS the seller
  if v_seller_id is null or v_seller_id = NEW.user_id then
    return NEW;
  end if;

  insert into user_notifications (user_id, actor_id, type, body, listing_id)
  values (
    v_seller_id,
    NEW.user_id,
    'favourite',
    '@' || coalesce(v_actor_name, 'Someone') || ' favourited your listing: ' || coalesce(v_listing_name, 'an item'),
    NEW.listing_id
  );

  return NEW;
end;
$$;

-- drop first in case of re-runs
drop trigger if exists on_favourite_created on favourites;

create trigger on_favourite_created
  after insert on favourites
  for each row execute procedure handle_new_favourite();
