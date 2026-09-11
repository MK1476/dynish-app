'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export interface ShopViewSummary {
  shopId: string;
  todayViews: number;
  totalViews: number;
}

/**
 * Record a link hit / view for a shop storefront.
 * Resiliently increments the view_count for today's date.
 */
export async function recordShopView(shopId: string): Promise<{ success: boolean; viewsToday?: number }> {
  if (!shopId) return { success: false };

  try {
    const admin = createAdminClient();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Try to find existing record for today
    const { data: existing, error: fetchErr } = await admin
      .from('shop_views' as any)
      .select('id, view_count')
      .eq('shop_id', shopId)
      .eq('view_date', today)
      .maybeSingle();

    if (fetchErr) {
      // If table does not exist in schema cache yet, fail silently without breaking page
      if (fetchErr.code === 'PGRST205') {
        return { success: false };
      }
      console.warn('recordShopView fetch error:', fetchErr.message);
      return { success: false };
    }

    if (existing) {
      const nextCount = (existing.view_count || 0) + 1;
      await admin
        .from('shop_views' as any)
        .update({ view_count: nextCount, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      return { success: true, viewsToday: nextCount };
    } else {
      await admin
        .from('shop_views' as any)
        .insert({
          shop_id: shopId,
          view_date: today,
          view_count: 1,
        });
      return { success: true, viewsToday: 1 };
    }
  } catch (err: any) {
    console.warn('recordShopView error:', err?.message || err);
    return { success: false };
  }
}

/**
 * Get aggregated view counts (today and all-time) for all shops.
 */
export async function getAllShopViewsStats(): Promise<Record<string, { todayViews: number; totalViews: number }>> {
  const result: Record<string, { todayViews: number; totalViews: number }> = {};

  try {
    const admin = createAdminClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await admin
      .from('shop_views' as any)
      .select('shop_id, view_date, view_count');

    if (error) {
      // Table may not exist yet in Supabase
      return result;
    }

    if (data && Array.isArray(data)) {
      for (const row of data) {
        const sid = row.shop_id;
        if (!result[sid]) {
          result[sid] = { todayViews: 0, totalViews: 0 };
        }
        const count = Number(row.view_count) || 0;
        result[sid].totalViews += count;
        if (row.view_date === today) {
          result[sid].todayViews += count;
        }
      }
    }
  } catch (err) {
    console.warn('getAllShopViewsStats error:', err);
  }

  return result;
}
