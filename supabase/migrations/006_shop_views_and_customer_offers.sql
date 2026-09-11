-- ==============================================================================
-- DYNISH 2.0.0 — MIGRATION 006: SHOP VIEWS & CUSTOMER OFFERS
-- Copy and paste this file into the Supabase SQL Editor and click "RUN"
-- ==============================================================================

-- 1. SHOP VIEWS TRACKING
CREATE TABLE IF NOT EXISTS public.shop_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
    view_date DATE NOT NULL DEFAULT CURRENT_DATE,
    view_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_shop_view_date UNIQUE (shop_id, view_date)
);

CREATE INDEX IF NOT EXISTS idx_shop_views_shop_date ON public.shop_views(shop_id, view_date DESC);
CREATE INDEX IF NOT EXISTS idx_shop_views_date ON public.shop_views(view_date);

ALTER TABLE public.shop_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can select shop views"
    ON public.shop_views FOR SELECT
    USING (true);

CREATE POLICY "Public can insert and update shop views"
    ON public.shop_views FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. CUSTOMER ASSIGNED OFFERS
CREATE TABLE IF NOT EXISTS public.customer_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'flat'
    discount_value NUMERIC,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'redeemed', 'expired'
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_offers_customer ON public.customer_offers(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_offers_shop ON public.customer_offers(shop_id, status);

ALTER TABLE public.customer_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can select customer offers"
    ON public.customer_offers FOR SELECT
    USING (true);

CREATE POLICY "Public can manage customer offers"
    ON public.customer_offers FOR ALL
    USING (true)
    WITH CHECK (true);

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
