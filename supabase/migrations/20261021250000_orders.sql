-- ================================================================
-- ORDERS — escrow checkout for in-person sneaker handovers
-- ================================================================

create table if not exists public.orders (
  id                           uuid          default gen_random_uuid() primary key,
  listing_id                   uuid          references public.listings(id) on delete restrict not null,
  buyer_id                     uuid          references auth.users(id) on delete restrict not null,
  seller_id                    uuid          references auth.users(id) on delete restrict not null,
  item_price                   numeric(10,2) not null,
  service_fee                  numeric(10,2) not null default 0,
  total_paid                   numeric(10,2) not null,
  currency                     text          not null default 'EUR',
  status                       text          not null default 'pending_payment'
    check (status in (
      'pending_payment','payment_held','awaiting_handover',
      'buyer_confirmed_handover','seller_confirmed_handover',
      'completed','disputed','refunded','cancelled'
    )),
  payment_intent_id            text,
  meetup_location              text,
  meetup_time                  timestamptz,
  buyer_handover_confirmed_at  timestamptz,
  seller_handover_confirmed_at timestamptz,
  payout_released_at           timestamptz,
  dispute_reason               text,
  created_at                   timestamptz   default now(),
  updated_at                   timestamptz   default now()
);

-- One active order per buyer+listing at a time
create unique index if not exists orders_buyer_listing_active
  on public.orders(buyer_id, listing_id)
  where status not in ('cancelled','refunded');

-- RLS
alter table public.orders enable row level security;

create policy "Parties can view their orders"
  on public.orders for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Buyer can create order"
  on public.orders for insert
  with check (auth.uid() = buyer_id);

create policy "Buyer can update order"
  on public.orders for update
  using (auth.uid() = buyer_id);

create policy "Seller can update order"
  on public.orders for update
  using (auth.uid() = seller_id);

-- Realtime
alter publication supabase_realtime add table public.orders;

-- Extend user_notifications type to include 'order'
alter table public.user_notifications
  drop constraint if exists user_notifications_type_check;
alter table public.user_notifications
  add constraint user_notifications_type_check
  check (type in ('favourite','offer','message','order'));

-- Auto-update updated_at on orders
create or replace function public.orders_set_updated_at()
returns trigger language plpgsql as $$
begin
  NEW.updated_at = now();
  return NEW;
end; $$;

create trigger orders_updated_at
  before update on public.orders
  for each row execute procedure public.orders_set_updated_at();

-- Notifications on order events
create or replace function public.handle_order_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_buyer_name  text;
  v_seller_name text;
  v_item        text;
  v_total       text;
begin
  select name into v_buyer_name  from profiles where id = NEW.buyer_id;
  select name into v_seller_name from profiles where id = NEW.seller_id;
  select brand || ' ' || model into v_item from listings where id = NEW.listing_id;
  v_total := '€' || NEW.total_paid;

  -- Payment captured (INSERT with payment_held, or UPDATE from pending_payment)
  if NEW.status = 'payment_held' and (TG_OP = 'INSERT' or coalesce(OLD.status,'') = 'pending_payment') then
    insert into user_notifications(user_id, actor_id, type, body, listing_id) values
      (NEW.buyer_id, NEW.seller_id, 'order',
       'Payment secured. Your ' || v_total || ' for "' || v_item || '" is safely held. It will be released to @' || coalesce(v_seller_name,'seller') || ' after both of you confirm the handover.',
       NEW.listing_id),
      (NEW.seller_id, NEW.buyer_id, 'order',
       '@' || coalesce(v_buyer_name,'Someone') || ' paid ' || v_total || ' for "' || v_item || '". Money is held safely — you will receive it after both of you confirm the handover.',
       NEW.listing_id);
  end if;

  -- Meetup location set for the first time
  if TG_OP = 'UPDATE' and NEW.meetup_location is not null and OLD.meetup_location is null then
    insert into user_notifications(user_id, actor_id, type, body, listing_id) values
      (NEW.buyer_id,  NEW.seller_id, 'order', 'Meetup arranged for "' || v_item || '". Confirm the handover in the app after the exchange.', NEW.listing_id),
      (NEW.seller_id, NEW.buyer_id,  'order', 'Meetup arranged for "' || v_item || '". Confirm the handover in the app after the exchange.', NEW.listing_id);
  end if;

  -- Buyer confirms
  if TG_OP = 'UPDATE' and NEW.buyer_handover_confirmed_at is not null and OLD.buyer_handover_confirmed_at is null then
    insert into user_notifications(user_id, actor_id, type, body, listing_id) values
      (NEW.seller_id, NEW.buyer_id, 'order',
       '@' || coalesce(v_buyer_name,'Buyer') || ' confirmed the handover for "' || v_item || '". Please confirm once you have handed over the sneakers.',
       NEW.listing_id);
  end if;

  -- Seller confirms
  if TG_OP = 'UPDATE' and NEW.seller_handover_confirmed_at is not null and OLD.seller_handover_confirmed_at is null then
    insert into user_notifications(user_id, actor_id, type, body, listing_id) values
      (NEW.buyer_id, NEW.seller_id, 'order',
       '@' || coalesce(v_seller_name,'Seller') || ' confirmed the handover for "' || v_item || '". Please confirm once you have received the sneakers.',
       NEW.listing_id);
  end if;

  -- Both confirmed → completed
  if TG_OP = 'UPDATE' and NEW.status = 'completed' and OLD.status != 'completed' then
    insert into user_notifications(user_id, actor_id, type, body, listing_id) values
      (NEW.buyer_id,  NEW.seller_id, 'order', 'Order complete! Handover confirmed for "' || v_item || '". Enjoy your new sneakers.', NEW.listing_id),
      (NEW.seller_id, NEW.buyer_id,  'order', 'Order complete! Handover confirmed for "' || v_item || '". Your payment has been released.', NEW.listing_id);
  end if;

  -- Dispute opened
  if TG_OP = 'UPDATE' and NEW.status = 'disputed' and OLD.status != 'disputed' then
    insert into user_notifications(user_id, actor_id, type, body, listing_id) values
      (NEW.seller_id, NEW.buyer_id, 'order',
       'A dispute has been opened for "' || v_item || '". Payment is frozen until support resolves it.',
       NEW.listing_id);
  end if;

  return NEW;
end; $$;

create trigger on_order_event
  after insert or update on public.orders
  for each row execute procedure public.handle_order_event();
