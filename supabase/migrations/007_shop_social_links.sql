-- Migration 007: Add instagram_handle and youtube_url to shops table
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Force PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
