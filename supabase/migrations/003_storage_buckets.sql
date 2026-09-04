-- ==============================================================================
-- DYNISH 2.0.0 — STORAGE BUCKETS & ACCESS POLICIES
-- ==============================================================================

-- Storage policies for public image reading
create policy "Public can view product images"
on storage.objects for select
to public
using (bucket_id in ('product-images', 'shop-assets'));

-- Authenticated vendors can upload images
create policy "Authenticated users can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id in ('product-images', 'shop-assets'));

-- Authenticated vendors can update their uploaded images
create policy "Authenticated users can update product images"
on storage.objects for update
to authenticated
using (bucket_id in ('product-images', 'shop-assets'));

-- Authenticated vendors can delete their uploaded images
create policy "Authenticated users can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id in ('product-images', 'shop-assets'));
