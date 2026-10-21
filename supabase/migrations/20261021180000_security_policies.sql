-- =====================================================================
-- LISTINGS — extend SELECT policies so seller/buyer always see their
-- own listings regardless of status. Active/reserved remain visible
-- to all authenticated users.
-- =====================================================================
drop policy if exists "Logged in users can view active listings" on listings;

-- All logged-in users see active and reserved listings
create policy "Active and reserved visible to authenticated"
  on listings for select
  to authenticated
  using (status in ('active', 'reserved'));

-- Sellers always see all their own listings (any status)
create policy "Sellers see own listings"
  on listings for select
  to authenticated
  using (seller_id = auth.uid() or user_id = auth.uid());

-- Buyers permanently see listings they purchased (any status)
create policy "Buyers see purchased listings"
  on listings for select
  to authenticated
  using (
    exists (
      select 1 from transactions t
      where t.listing_id = listings.id
        and t.buyer_id = auth.uid()
    )
  );

-- =====================================================================
-- PROFILES — RLS on; only owner reads full row (email included).
-- All authenticated users can read a safe view without email.
-- =====================================================================
alter table profiles enable row level security;

create policy "Owner reads own profile"
  on profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Owner updates own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Public-safe view: strips email so the rest of the app can show
-- names, avatars and reputation without exposing addresses.
create or replace view public_profiles
  with (security_invoker = true)
as
  select id, name, ciup_house, is_verified_resident,
         reputation_score, avatar_url, created_at
  from profiles;

grant select on public_profiles to authenticated;

-- =====================================================================
-- TRANSACTIONS — only buyer and seller of a transaction see it
-- =====================================================================
alter table transactions enable row level security;

create policy "Participants view transaction"
  on transactions for select
  to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid());

create policy "Buyer creates transaction"
  on transactions for insert
  to authenticated
  with check (buyer_id = auth.uid());

create policy "Participants update transaction"
  on transactions for update
  to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid())
  with check (buyer_id = auth.uid() or seller_id = auth.uid());

-- =====================================================================
-- INTERESTS — buyer sees their own; seller sees interest on their listing
-- =====================================================================
alter table interests enable row level security;

create policy "Buyer sees own interests"
  on interests for select
  to authenticated
  using (buyer_id = auth.uid());

create policy "Seller sees interests on their listing"
  on interests for select
  to authenticated
  using (
    exists (
      select 1 from listings l
      where l.id = interests.listing_id
        and (l.seller_id = auth.uid() or l.user_id = auth.uid())
    )
  );

create policy "Buyer creates interest"
  on interests for insert
  to authenticated
  with check (buyer_id = auth.uid());

create policy "Buyer updates own interest"
  on interests for update
  to authenticated
  using (buyer_id = auth.uid())
  with check (buyer_id = auth.uid());

-- =====================================================================
-- MESSAGES — only transaction participants
-- =====================================================================
alter table messages enable row level security;

create policy "Participants view messages"
  on messages for select
  to authenticated
  using (
    exists (
      select 1 from transactions t
      where t.id = messages.transaction_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

create policy "Participants send messages"
  on messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from transactions t
      where t.id = messages.transaction_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

-- =====================================================================
-- PAYMENTS — only transaction participants
-- =====================================================================
alter table payments enable row level security;

create policy "Participants view payments"
  on payments for select
  to authenticated
  using (
    exists (
      select 1 from transactions t
      where t.id = payments.transaction_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

-- =====================================================================
-- PICKUPS — only transaction participants
-- =====================================================================
alter table pickups enable row level security;

create policy "Participants view pickups"
  on pickups for select
  to authenticated
  using (
    exists (
      select 1 from transactions t
      where t.id = pickups.transaction_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

create policy "Participants update pickups"
  on pickups for update
  to authenticated
  using (
    exists (
      select 1 from transactions t
      where t.id = pickups.transaction_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from transactions t
      where t.id = pickups.transaction_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

-- =====================================================================
-- DISPUTES — only transaction participants
-- =====================================================================
alter table disputes enable row level security;

create policy "Participants view disputes"
  on disputes for select
  to authenticated
  using (
    exists (
      select 1 from transactions t
      where t.id = disputes.transaction_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

create policy "Participants raise dispute"
  on disputes for insert
  to authenticated
  with check (
    raised_by_id = auth.uid()
    and exists (
      select 1 from transactions t
      where t.id = disputes.transaction_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

-- =====================================================================
-- REVIEWS — author sees reviews they wrote; subject sees reviews about
-- them. Both sides of a transaction see both reviews (point 2 confirmed).
-- =====================================================================
alter table reviews enable row level security;

create policy "Author and subject view review"
  on reviews for select
  to authenticated
  using (author_id = auth.uid() or subject_id = auth.uid());

create policy "Transaction participant submits review"
  on reviews for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from transactions t
      where t.id = reviews.transaction_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

-- =====================================================================
-- BRANDS & PICKUP_LOCATIONS — public catalogues, read-only for all
-- authenticated users; no one writes from the app
-- =====================================================================
alter table brands enable row level security;

create policy "Authenticated users read brands"
  on brands for select
  to authenticated
  using (true);

alter table pickup_locations enable row level security;

create policy "Authenticated users read pickup locations"
  on pickup_locations for select
  to authenticated
  using (true);
