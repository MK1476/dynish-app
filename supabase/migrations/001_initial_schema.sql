-- ==============================================================================
-- DYNISH 2.0.0 — INITIAL DATABASE SCHEMA MIGRATION
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- 1. SHOPS TABLE
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
    plan_type text not null default 'trial', -- 'trial', 'monthly', 'yearly'
    trial_ends_at timestamptz not null default (now() + interval '14 days'),
    expires_at timestamptz not null default (now() + interval '14 days'),
    razorpay_subscription_id text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Index on owner phone and owner_id for fast lookup
create index if not exists idx_shops_owner_phone on public.shops(owner_phone);
create index if not exists idx_shops_owner_id on public.shops(owner_id);
create index if not exists idx_shops_expires_at on public.shops(expires_at);

-- 2. CATEGORIES TABLE
create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    shop_id uuid references public.shops(id) on delete cascade not null,
    name text not null,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_categories_shop_id on public.categories(shop_id, sort_order);

-- 3. ITEMS TABLE
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

-- 4. CUSTOMERS TABLE
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

-- 5. OFFERS TABLE
create table if not exists public.offers (
    id uuid primary key default gen_random_uuid(),
    shop_id uuid references public.shops(id) on delete cascade not null,
    title text not null,
    description text,
    discount_type text not null default 'percentage', -- 'percentage', 'flat'
    discount_value numeric,
    is_default boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists idx_offers_shop_id on public.offers(shop_id);

-- 6. TRANSACTIONS TABLE
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

-- 7. SUBSCRIPTIONS TABLE
create table if not exists public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    shop_id uuid references public.shops(id) on delete cascade not null,
    plan_type text not null, -- 'monthly', 'yearly'
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
