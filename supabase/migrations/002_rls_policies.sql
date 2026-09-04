-- ==============================================================================
-- DYNISH 2.0.0 — ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
alter table public.shops enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.customers enable row level security;
alter table public.offers enable row level security;
alter table public.transactions enable row level security;
alter table public.subscriptions enable row level security;

-- ------------------------------------------------------------------------------
-- 1. SHOPS POLICIES
-- ------------------------------------------------------------------------------
-- Public can view active non-expired shops
create policy "Public can view active shops"
on public.shops for select
to anon, authenticated
using (is_active = true and expires_at > now());

-- Owners can view their own shop (even if expired)
create policy "Owners can view their own shop"
on public.shops for select
to authenticated
using (owner_id = auth.uid() or owner_phone = (auth.jwt()->>'phone'));

-- Owners can insert their shop on onboarding
create policy "Owners can create a shop"
on public.shops for insert
to authenticated
with check (owner_id = auth.uid() or owner_phone = (auth.jwt()->>'phone'));

-- Owners can update their own shop
create policy "Owners can update their shop"
on public.shops for update
to authenticated
using (owner_id = auth.uid() or owner_phone = (auth.jwt()->>'phone'));

-- ------------------------------------------------------------------------------
-- 2. CATEGORIES POLICIES
-- ------------------------------------------------------------------------------
-- Public can view categories of active shops
create policy "Public can view categories of active shops"
on public.categories for select
to anon, authenticated
using (
    exists (
        select 1 from public.shops
        where shops.id = categories.shop_id
          and shops.is_active = true
          and shops.expires_at > now()
    )
);

-- Owners can CRUD their shop's categories
create policy "Owners can manage categories"
on public.categories for all
to authenticated
using (
    exists (
        select 1 from public.shops
        where shops.id = categories.shop_id
          and (shops.owner_id = auth.uid() or shops.owner_phone = (auth.jwt()->>'phone'))
    )
);

-- ------------------------------------------------------------------------------
-- 3. ITEMS POLICIES
-- ------------------------------------------------------------------------------
-- Public can view available items of active shops
create policy "Public can view available items"
on public.items for select
to anon, authenticated
using (
    is_available = true and exists (
        select 1 from public.shops
        where shops.id = items.shop_id
          and shops.is_active = true
          and shops.expires_at > now()
    )
);

-- Owners can CRUD all items in their shop
create policy "Owners can manage items"
on public.items for all
to authenticated
using (
    exists (
        select 1 from public.shops
        where shops.id = items.shop_id
          and (shops.owner_id = auth.uid() or shops.owner_phone = (auth.jwt()->>'phone'))
    )
);

-- ------------------------------------------------------------------------------
-- 4. CUSTOMERS POLICIES (Owner Only - No public access)
-- ------------------------------------------------------------------------------
create policy "Owners can manage customers"
on public.customers for all
to authenticated
using (
    exists (
        select 1 from public.shops
        where shops.id = customers.shop_id
          and (shops.owner_id = auth.uid() or shops.owner_phone = (auth.jwt()->>'phone'))
    )
);

-- ------------------------------------------------------------------------------
-- 5. OFFERS POLICIES
-- ------------------------------------------------------------------------------
-- Public can view default offers for active shops
create policy "Public can view active shop offers"
on public.offers for select
to anon, authenticated
using (
    exists (
        select 1 from public.shops
        where shops.id = offers.shop_id
          and shops.is_active = true
          and shops.expires_at > now()
    )
);

-- Owners can manage offers
create policy "Owners can manage offers"
on public.offers for all
to authenticated
using (
    exists (
        select 1 from public.shops
        where shops.id = offers.shop_id
          and (shops.owner_id = auth.uid() or shops.owner_phone = (auth.jwt()->>'phone'))
    )
);

-- ------------------------------------------------------------------------------
-- 6. TRANSACTIONS POLICIES (Owner Only)
-- ------------------------------------------------------------------------------
create policy "Owners can manage transactions"
on public.transactions for all
to authenticated
using (
    exists (
        select 1 from public.shops
        where shops.id = transactions.shop_id
          and (shops.owner_id = auth.uid() or shops.owner_phone = (auth.jwt()->>'phone'))
    )
);

-- ------------------------------------------------------------------------------
-- 7. SUBSCRIPTIONS POLICIES (Owner Only)
-- ------------------------------------------------------------------------------
create policy "Owners can view subscriptions"
on public.subscriptions for select
to authenticated
using (
    exists (
        select 1 from public.shops
        where shops.id = subscriptions.shop_id
          and (shops.owner_id = auth.uid() or shops.owner_phone = (auth.jwt()->>'phone'))
    )
);
