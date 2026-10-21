-- =====================================================================
-- CONVERSATIONS — one per buyer + listing (never duplicated)
-- =====================================================================
create table if not exists conversations (
  id                   uuid default gen_random_uuid() primary key,
  listing_id           uuid references listings(id) on delete set null,
  buyer_id             uuid references auth.users(id) on delete cascade not null,
  seller_id            uuid references auth.users(id) on delete cascade not null,
  last_message_at      timestamp with time zone default now(),
  last_message_preview text,
  created_at           timestamp with time zone default now(),
  unique (buyer_id, listing_id)
);

alter table conversations enable row level security;

create policy "Participants view own conversations"
  on conversations for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid());

create policy "Buyer creates conversation"
  on conversations for insert to authenticated
  with check (buyer_id = auth.uid());

create policy "Participants update conversation"
  on conversations for update to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid());

-- =====================================================================
-- CHAT OFFERS — the monetary offer object; messages reference these
-- =====================================================================
create table if not exists chat_offers (
  id              uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  buyer_id        uuid references auth.users(id) on delete cascade not null,
  seller_id       uuid references auth.users(id) on delete cascade not null,
  proposed_by_id  uuid references auth.users(id) not null,
  amount          numeric not null check (amount > 0),
  status          text not null default 'pending'
                  check (status in ('pending','accepted','declined','countered','expired','withdrawn')),
  expires_at      timestamp with time zone not null,
  created_at      timestamp with time zone default now()
);

alter table chat_offers enable row level security;

create policy "Participants view offers"
  on chat_offers for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid());

create policy "Participants create offers"
  on chat_offers for insert to authenticated
  with check (buyer_id = auth.uid() or seller_id = auth.uid());

create policy "Participants update offers"
  on chat_offers for update to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid());

-- =====================================================================
-- CHAT MESSAGES — text | image | offer | system | tracking
-- =====================================================================
create table if not exists chat_messages (
  id              uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id       uuid references auth.users(id) on delete cascade not null,
  type            text not null default 'text'
                  check (type in ('text','image','offer','system','tracking')),
  body            text,
  image_url       text,
  offer_id        uuid references chat_offers(id) on delete set null,
  read_at         timestamp with time zone,
  created_at      timestamp with time zone default now()
);

alter table chat_messages enable row level security;

create policy "Participants view chat messages"
  on chat_messages for select to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = chat_messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "Participants send messages"
  on chat_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = chat_messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Recipients (not senders) can mark messages read
create policy "Recipients mark messages read"
  on chat_messages for update to authenticated
  using (
    sender_id != auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = chat_messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  )
  with check (true);

-- =====================================================================
-- REALTIME — subscribe to live updates in these tables
-- =====================================================================
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table chat_offers;

-- =====================================================================
-- STORAGE — private bucket for images sent in chat
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

create policy "Authenticated users upload chat images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-images');

create policy "Authenticated users view chat images"
  on storage.objects for select to authenticated
  using (bucket_id = 'chat-images');
