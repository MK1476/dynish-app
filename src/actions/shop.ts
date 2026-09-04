'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentVendorSession } from './auth';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/types/database';

export type ShopRow = Database['public']['Tables']['shops']['Row'];

export async function getOwnerShop(): Promise<ShopRow | null> {
  const { phone, userId } = await getCurrentVendorSession();
  if (!phone && !userId) return null;

  const admin = createAdminClient();
  let query = admin.from('shops').select('*');

  if (userId) {
    query = query.or(`owner_id.eq.${userId},owner_phone.eq.${phone}`);
  } else if (phone) {
    query = query.eq('owner_phone', phone);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) {
    console.error('getOwnerShop error:', error);
    return null;
  }
  return data;
}

export async function getShopById(shopId: string): Promise<ShopRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .maybeSingle();

  if (error) {
    console.error('getShopById error:', error);
    return null;
  }
  return data;
}

export async function createShop(formData: {
  name: string;
  category: string;
  phone: string;
  whatsappNumber?: string;
  address?: string;
  mapsLink?: string;
  tagline?: string;
  logoUrl?: string;
  bannerUrl?: string;
  theme?: 'heritage' | 'minimal' | 'artisanal';
}): Promise<{ success: boolean; shop?: ShopRow; error?: string }> {
  const { phone, userId } = await getCurrentVendorSession();
  const admin = createAdminClient();

  const ownerPhone = phone || formData.phone.replace(/\D/g, '').slice(-10);
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const defaultBanner = formData.bannerUrl || 
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80';
  const defaultLogo = formData.logoUrl || 
    'https://images.unsplash.com/photo-1544441893-675973e31985?w=300&auto=format&fit=crop&q=80';

  const insertData = {
    owner_id: userId || null,
    owner_phone: ownerPhone,
    name: formData.name.trim(),
    category: formData.category || 'Boutique',
    category_label: formData.category || 'Ethnic Wear & Boutiques',
    phone: formData.phone.replace(/\D/g, '').slice(-10),
    whatsapp_number: (formData.whatsappNumber || formData.phone).replace(/\D/g, '').slice(-10),
    address: formData.address?.trim() || 'Main Market Plaza',
    maps_link: formData.mapsLink?.trim() || null,
    tagline: formData.tagline?.trim() || 'Premium Quality Handcrafted Collections',
    logo_url: defaultLogo,
    banner_url: defaultBanner,
    theme: formData.theme || 'heritage',
    plan_type: 'trial' as const,
    trial_ends_at: trialEndsAt,
    expires_at: trialEndsAt,
    is_active: true,
  };

  const { data, error } = await admin
    .from('shops')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('createShop error:', error);
    return { success: false, error: error.message };
  }

  // Create default starter categories & default next-visit retention offer
  await admin.from('categories').insert([
    { shop_id: data.id, name: 'New In', sort_order: 0 },
    { shop_id: data.id, name: 'Best Sellers', sort_order: 1 },
    { shop_id: data.id, name: 'Premium Edit', sort_order: 2 },
  ]);

  await admin.from('offers').insert([
    {
      shop_id: data.id,
      title: 'Flat 10% OFF on Next Visit',
      description: 'Show WhatsApp receipt at counter to claim discount on any purchase.',
      discount_type: 'percentage',
      discount_value: 10,
      is_default: true,
    },
  ]);

  revalidatePath('/owner/dashboard');
  return { success: true, shop: data };
}

export async function updateShop(
  shopId: string,
  updateData: Partial<Database['public']['Tables']['shops']['Update']>
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('shops')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', shopId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/store/${shopId}`);
  revalidatePath('/owner/settings');
  return { success: true };
}
