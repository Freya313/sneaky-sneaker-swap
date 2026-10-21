-- Sold and withdrawn listings are never readable by anyone, not even logged-in users.
drop policy if exists "Logged in users can view listings" on listings;
create policy "Logged in users can view active listings"
  on listings for select
  to authenticated
  using (status in ('active', 'reserved'));

-- Logged-out preview: only the columns the marketplace card needs.
-- description and authenticity_note are deliberately left out.
drop function if exists sneak_peeks();
create function sneak_peeks()
returns table (
  id uuid,
  created_at timestamp with time zone,
  user_id uuid,
  brand text,
  model text,
  size numeric,
  size_system text,
  color text,
  condition text,
  price numeric,
  status text,
  pickup_location text,
  photos text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.created_at, l.user_id, l.brand, l.model, l.size, l.size_system,
         l.color, l.condition, l.price, l.status, l.pickup_location, l.photos
  from listings l
  where l.status = 'active' and l.condition = 'Very good'
  order by random()
  limit 5;
$$;

grant execute on function sneak_peeks() to anon, authenticated;
