-- Migration 005: Add custom vanity slug and custom WhatsApp message template to shops table
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS whatsapp_template TEXT;

CREATE INDEX IF NOT EXISTS idx_shops_slug ON public.shops(slug);

-- Force PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
