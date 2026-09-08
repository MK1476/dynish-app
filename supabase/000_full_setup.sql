-- ==============================================================================
-- DYNISH 2.0.0 — ALL-IN-ONE SETUP MIGRATION
-- Copy and paste this file into the Supabase SQL Editor and click "RUN"
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "pgcrypto";

-- 2. SHOPS
create table if not exists public.shops (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid references auth.users(id) on delete set null,
    owner_phone text not null,
    name text not null,
    tagline text,
    category text not null default 'Boutique',
    category_label text default 'Ethnic Wear & Boutiques',
    phone text not null,
    whatsapp_number text not null,
    address text not null,
    maps_link text,
    logo_url text,
    banner_url text,
    theme text not null default 'heritage',
    plan_type text not null default 'trial',
    trial_ends_at timestamptz not null default (now() + interval '14 days'),
    expires_at timestamptz not null default (now() + interval '14 days'),
    razorpay_subscription_id text,
    slug text unique,
    whatsapp_template text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_shops_owner_phone on public.shops(owner_phone);
create index if not exists idx_shops_owner_id on public.shops(owner_id);
create index if not exists idx_shops_expires_at on public.shops(expires_at);
create index if not exists idx_shops_slug on public.shops(slug);

-- 3. CATEGORIES
create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    shop_id uuid references public.shops(id) on delete cascade not null,
    name text not null,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_categories_shop_id on public.categories(shop_id, sort_order);

-- 4. ITEMS
create table if not exists public.items (
    id uuid primary key default gen_random_uuid(),
    shop_id uuid references public.shops(id) on delete cascade not null,
    category_id uuid references public.categories(id) on delete cascade not null,
    name text not null,
    description text,
    price numeric not null check (price >= 0),
    original_price numeric check (original_price is null or original_price >= 0),
    image_urls text[] not null default '{}',
    is_available boolean not null default true,
    is_featured boolean not null default false,
    unit text default 'per piece',
    scarcity_tag text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_items_shop_category on public.items(shop_id, category_id);
create index if not exists idx_items_available on public.items(shop_id, is_available);

-- 5. CUSTOMERS
create table if not exists public.customers (
    id uuid primary key default gen_random_uuid(),
    shop_id uuid references public.shops(id) on delete cascade not null,
    phone_number text not null,
    name text,
    first_seen_at timestamptz not null default now(),
    visit_count integer not null default 1,
    last_visit_at timestamptz not null default now(),
    last_bill_amount numeric,
    total_spent numeric not null default 0,
    created_at timestamptz not null default now(),
    constraint unique_shop_customer unique (shop_id, phone_number)
);

create index if not exists idx_customers_shop_phone on public.customers(shop_id, phone_number);
create index if not exists idx_customers_visits on public.customers(shop_id, visit_count desc);

-- 6. OFFERS
create table if not exists public.offers (
    id uuid primary key default gen_random_uuid(),
    shop_id uuid references public.shops(id) on delete cascade not null,
    title text not null,
    description text,
    discount_type text not null default 'percentage',
    discount_value numeric,
    is_default boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists idx_offers_shop_id on public.offers(shop_id);

-- 7. TRANSACTIONS
create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),
    shop_id uuid references public.shops(id) on delete cascade not null,
    customer_id uuid references public.customers(id) on delete cascade not null,
    bill_amount numeric check (bill_amount is null or bill_amount >= 0),
    applied_offer text,
    next_visit_offer text,
    visit_number integer not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_transactions_shop_date on public.transactions(shop_id, created_at desc);

-- 8. SUBSCRIPTIONS
create table if not exists public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    shop_id uuid references public.shops(id) on delete cascade not null,
    plan_type text not null,
    amount numeric not null,
    razorpay_order_id text,
    razorpay_payment_id text,
    razorpay_signature text,
    status text not null default 'paid',
    starts_at timestamptz not null default now(),
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_shop on public.subscriptions(shop_id, created_at desc);

-- 9. ENABLE ROW LEVEL SECURITY
alter table public.shops enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.customers enable row level security;
alter table public.offers enable row level security;
alter table public.transactions enable row level security;
alter table public.subscriptions enable row level security;

-- 10. RLS POLICIES
drop policy if exists "Public can view active shops" on public.shops;
create policy "Public can view active shops"
on public.shops for select
to anon, authenticated
using (is_active = true and expires_at > now());

drop policy if exists "Owners can view their own shop" on public.shops;
create policy "Owners can view their own shop"
on public.shops for select
to authenticated
using (owner_id = auth.uid() or owner_phone = (auth.jwt()->>'phone'));

drop policy if exists "Owners can create a shop" on public.shops;
create policy "Owners can create a shop"
on public.shops for insert
to authenticated
with check (owner_id = auth.uid() or owner_phone = (auth.jwt()->>'phone'));

drop policy if exists "Owners can update their shop" on public.shops;
create policy "Owners can update their shop"
on public.shops for update
to authenticated
using (owner_id = auth.uid() or owner_phone = (auth.jwt()->>'phone'));

-- Categories
drop policy if exists "Public can view categories of active shops" on public.categories;
create policy "Public can view categories of active shops"
on public.categories for select
to anon, authenticated
using (exists (select 1 from public.shops where shops.id = categories.shop_id and shops.is_active = true and shops.expires_at > now()));

drop policy if exists "Owners can manage categories" on public.categories;
create policy "Owners can manage categories"
on public.categories for all
to authenticated
using (exists (select 1 from public.shops where shops.id = categories.shop_id and (shops.owner_id = auth.uid() or shops.owner_phone = (auth.jwt()->>'phone'))));

-- Items
drop policy if exists "Public can view available items" on public.items;
create policy "Public can view available items"
on public.items for select
to anon, authenticated
using (is_available = true and exists (select 1 from public.shops where shops.id = items.shop_id and shops.is_active = true and shops.expires_at > now()));

drop policy if exists "Owners can manage items" on public.items;
create policy "Owners can manage items"
on public.items for all
to authenticated
using (exists (select 1 from public.shops where shops.id = items.shop_id and (shops.owner_id = auth.uid() or shops.owner_phone = (auth.jwt()->>'phone'))));

-- Customers
drop policy if exists "Owners can manage customers" on public.customers;
create policy "Owners can manage customers"
on public.customers for all
to authenticated
using (exists (select 1 from public.shops where shops.id = customers.shop_id and (shops.owner_id = auth.uid() or shops.owner_phone = (auth.jwt()->>'phone'))));

-- Offers
drop policy if exists "Public can view active shop offers" on public.offers;
create policy "Public can view active shop offers"
on public.offers for select
to anon, authenticated
using (exists (select 1 from public.shops where shops.id = offers.shop_id and shops.is_active = true and shops.expires_at > now()));

drop policy if exists "Owners can manage offers" on public.offers;
create policy "Owners can manage offers"
on public.offers for all
to authenticated
using (exists (select 1 from public.shops where shops.id = offers.shop_id and (shops.owner_id = auth.uid() or shops.owner_phone = (auth.jwt()->>'phone'))));

-- Transactions
drop policy if exists "Owners can manage transactions" on public.transactions;
create policy "Owners can manage transactions"
on public.transactions for all
to authenticated
using (exists (select 1 from public.shops where shops.id = transactions.shop_id and (shops.owner_id = auth.uid() or shops.owner_phone = (auth.jwt()->>'phone'))));

-- Subscriptions
drop policy if exists "Owners can view subscriptions" on public.subscriptions;
create policy "Owners can view subscriptions"
on public.subscriptions for select
to authenticated
using (exists (select 1 from public.shops where shops.id = subscriptions.shop_id and (shops.owner_id = auth.uid() or shops.owner_phone = (auth.jwt()->>'phone'))));

-- 11. REALTIME PUBLICATIONS
do $$
begin
  alter publication supabase_realtime add table public.items, public.categories, public.shops;
exception
  when duplicate_object then null;
  when others then null;
end $$;

