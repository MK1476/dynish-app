'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/types/database';

export type OfferRow = Database['public']['Tables']['offers']['Row'];

export async function getShopOffers(shopId: string): Promise<OfferRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('offers')
    .select('*')
    .eq('shop_id', shopId)
    .order('is_default', { ascending: false });

  if (error) {
    console.error('getShopOffers error:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [
      {
        id: `default-${shopId}`,
        shop_id: shopId,
        title: '10% Cashback on Next Visit',
        description: 'Earn 10% of today’s bill as flat discount on your next visit.',
        discount_type: 'percentage',
        discount_value: 10,
        is_default: true,
        created_at: new Date().toISOString(),
      },
    ];
  }

  return data;
}

export async function createOffer(
  shopId: string,
  offerData: {
    title: string;
    description?: string;
    discountType?: 'percentage' | 'flat';
    discountValue?: number;
    isDefault?: boolean;
  }
): Promise<{ success: boolean; offer?: OfferRow; error?: string }> {
  const admin = createAdminClient();

  if (offerData.isDefault) {
    // Unset any existing default offer for this shop
    await admin.from('offers').update({ is_default: false }).eq('shop_id', shopId);
  }

  const { data, error } = await admin
    .from('offers')
    .insert({
      shop_id: shopId,
      title: offerData.title.trim(),
      description: offerData.description?.trim() || null,
      discount_type: offerData.discountType || 'percentage',
      discount_value: offerData.discountValue || null,
      is_default: offerData.isDefault ?? false,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/owner/offers');
  revalidatePath('/owner/billing');
  return { success: true, offer: data };
}

export async function deleteOffer(
  offerId: string,
  shopId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from('offers').delete().eq('id', offerId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/owner/offers');
  revalidatePath('/owner/billing');
  return { success: true };
}

export async function setDefaultOffer(
  shopId: string,
  offerId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  // Reset all
  await admin.from('offers').update({ is_default: false }).eq('shop_id', shopId);
  // Set selected
  const { error } = await admin.from('offers').update({ is_default: true }).eq('id', offerId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/owner/offers');
  revalidatePath('/owner/billing');
  return { success: true };
}
