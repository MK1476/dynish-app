'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/types/database';
import type { ExcelCatalogRow } from '@/lib/excel-parser';

export type CategoryRow = Database['public']['Tables']['categories']['Row'];
export type ItemRow = Database['public']['Tables']['items']['Row'];

export async function getShopCatalog(shopId: string): Promise<{
  categories: CategoryRow[];
  items: ItemRow[];
}> {
  const admin = createAdminClient();

  const [catRes, itemRes] = await Promise.all([
    admin.from('categories').select('*').eq('shop_id', shopId).order('sort_order', { ascending: true }),
    admin.from('items').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
  ]);

  return {
    categories: catRes.data || [],
    items: itemRes.data || [],
  };
}

export async function createCategory(
  shopId: string,
  name: string
): Promise<{ success: boolean; category?: CategoryRow; error?: string }> {
  const admin = createAdminClient();
  const trimmedName = name.trim();
  if (!trimmedName) return { success: false, error: 'Category name cannot be empty.' };

  // Get current highest sort order
  const { data: existing } = await admin
    .from('categories')
    .select('sort_order')
    .eq('shop_id', shopId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = existing && existing.length > 0 ? (existing[0].sort_order + 1) : 0;

  const { data, error } = await admin
    .from('categories')
    .insert({
      shop_id: shopId,
      name: trimmedName,
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/store/${shopId}`);
  revalidatePath('/owner/catalog');
  return { success: true, category: data };
}

export async function reorderCategories(
  shopId: string,
  categoryIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const updates = categoryIds.map((id, index) =>
    admin.from('categories').update({ sort_order: index }).eq('id', id)
  );

  await Promise.all(updates);

  revalidatePath(`/store/${shopId}`);
  revalidatePath('/owner/catalog');
  return { success: true };
}

export async function deleteCategory(
  categoryId: string,
  shopId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from('categories').delete().eq('id', categoryId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/store/${shopId}`);
  revalidatePath('/owner/catalog');
  return { success: true };
}

export async function createItem(itemData: {
  shopId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  imageUrls: string[];
  isAvailable?: boolean;
  isFeatured?: boolean;
  unit?: string;
  scarcityTag?: string;
}): Promise<{ success: boolean; item?: ItemRow; error?: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('items')
    .insert({
      shop_id: itemData.shopId,
      category_id: itemData.categoryId,
      name: itemData.name.trim(),
      description: itemData.description?.trim() || null,
      price: itemData.price,
      original_price: itemData.originalPrice || null,
      image_urls: itemData.imageUrls.length > 0 ? itemData.imageUrls : [
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800'
      ],
      is_available: itemData.isAvailable ?? true,
      is_featured: itemData.isFeatured ?? false,
      unit: itemData.unit || 'per piece',
      scarcity_tag: itemData.scarcityTag || null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/store/${itemData.shopId}`);
  revalidatePath('/owner/catalog');
  return { success: true, item: data };
}

export async function updateItem(
  itemId: string,
  shopId: string,
  itemData: Partial<Database['public']['Tables']['items']['Update']>
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('items')
    .update({ ...itemData, updated_at: new Date().toISOString() })
    .eq('id', itemId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/store/${shopId}`);
  revalidatePath('/owner/catalog');
  return { success: true };
}

export async function deleteItem(
  itemId: string,
  shopId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from('items').delete().eq('id', itemId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/store/${shopId}`);
  revalidatePath('/owner/catalog');
  return { success: true };
}

export async function toggleItemAvailability(
  itemId: string,
  shopId: string,
  currentStatus: boolean
): Promise<{ success: boolean; error?: string }> {
  return updateItem(itemId, shopId, { is_available: !currentStatus });
}

export async function bulkUploadCatalog(
  shopId: string,
  rows: ExcelCatalogRow[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const admin = createAdminClient();

  try {
    // 1. Fetch existing categories
    const { data: existingCategories } = await admin
      .from('categories')
      .select('*')
      .eq('shop_id', shopId);

    const categoryMap = new Map<string, string>();
    existingCategories?.forEach(c => categoryMap.set(c.name.toLowerCase(), c.id));

    // 2. Insert any missing categories in bulk
    const rowCategoryNames = Array.from(new Set(rows.map(r => r.category.trim())));
    for (const catName of rowCategoryNames) {
      if (!categoryMap.has(catName.toLowerCase())) {
        const { data: newCat } = await admin
          .from('categories')
          .insert({ shop_id: shopId, name: catName, sort_order: categoryMap.size })
          .select()
          .single();
        if (newCat) {
          categoryMap.set(catName.toLowerCase(), newCat.id);
        }
      }
    }

    // 3. Prepare items for bulk insert
    const itemsToInsert = rows.map(r => {
      const catId = categoryMap.get(r.category.toLowerCase()) || Array.from(categoryMap.values())[0];
      return {
        shop_id: shopId,
        category_id: catId,
        name: r.name,
        description: r.description || null,
        price: r.price,
        original_price: r.originalPrice || null,
        image_urls: r.imageUrl ? [r.imageUrl] : [
          'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800'
        ],
        is_available: true,
        unit: r.unit || 'per piece',
        scarcity_tag: r.scarcityTag || null,
      };
    });

    const { error: insertError } = await admin.from('items').insert(itemsToInsert);
    if (insertError) throw insertError;

    revalidatePath(`/store/${shopId}`);
    revalidatePath('/owner/catalog');
    return { success: true, count: itemsToInsert.length };
  } catch (err: any) {
    console.error('bulkUploadCatalog error:', err);
    return { success: false, count: 0, error: err.message };
  }
}
