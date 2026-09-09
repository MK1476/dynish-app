'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentVendorSession } from './auth';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import { isValidUUID } from '@/lib/utils';
import { logger } from '@/lib/logger';

export type ShopRow = Database['public']['Tables']['shops']['Row'];

export async function getOwnerShop(): Promise<ShopRow | null> {
  const { phone, userId } = await getCurrentVendorSession();
  
  // An unauthenticated session can never own a shop
  if (!phone && !userId) return null;

  const cookieStore = cookies();
  const explicitShopId = cookieStore.get('dynish_shop_id')?.value;

  const admin = createAdminClient();

  // If a specific shop ID is stored in the session cookie, prioritize fetching that shop
  if (explicitShopId && isValidUUID(explicitShopId)) {
    const { data: explicitShop } = await admin
      .from('shops')
      .select('*')
      .eq('id', explicitShopId)
      .maybeSingle();

    if (explicitShop) {
      // Must verify ownership with authenticated credentials
      const matchesPhone = phone && (explicitShop.owner_phone === phone || explicitShop.phone === phone);
      const matchesUser = userId && explicitShop.owner_id === userId;
      if (matchesPhone || matchesUser) {
        return explicitShop;
      }
    }
  }

  let query = admin.from('shops').select('*');

  if (phone) {
    query = query.eq('owner_phone', phone);
  } else if (userId && isValidUUID(userId)) {
    query = query.eq('owner_id', userId);
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
  const trimmedName = (formData.name || '').trim();
  if (!trimmedName) {
    return { success: false, error: 'Store name is required.' };
  }

  const cleanPhone = (formData.phone || '').replace(/\D/g, '').slice(-10);
  if (!cleanPhone || cleanPhone.length !== 10) {
    return { success: false, error: 'A valid 10-digit mobile number is required.' };
  }

  const { phone, userId } = await getCurrentVendorSession();
  const admin = createAdminClient();

  const ownerPhone = cleanPhone || phone || '';
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const defaultBanner = formData.bannerUrl || 
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80';
  const defaultLogo = formData.logoUrl || 
    'https://images.unsplash.com/photo-1544441893-675973e31985?w=300&auto=format&fit=crop&q=80';

  // Only attach owner_id if it's a valid UUID in auth.users
  let validOwnerId: string | null = null;
  if (userId && isValidUUID(userId)) {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      if (authUser?.user) {
        validOwnerId = authUser.user.id;
      }
    } catch {
      validOwnerId = null;
    }
  }

  const cleanSlug = trimmedName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  const baseInsertData: any = {
    owner_id: validOwnerId,
    owner_phone: ownerPhone,
    name: trimmedName,
    category: formData.category || 'Boutique',
    category_label: formData.category || 'Ethnic Wear & Boutiques',
    phone: cleanPhone,
    whatsapp_number: (formData.whatsappNumber || cleanPhone).replace(/\D/g, '').slice(-10),
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

  // Attempt insert with slug if candidate is at least 3 characters
  let insertPayload = { ...baseInsertData };
  if (cleanSlug && cleanSlug.length >= 3) {
    insertPayload.slug = cleanSlug;
  }

  let { data, error } = await admin
    .from('shops')
    .insert(insertPayload)
    .select()
    .single();

  // Defensive fallback: If database schema cache lacks 'slug', retry insert without slug
  if (error && (error.message.includes('slug') || error.code === 'PGRST204' || error.code === '42703' || error.code === '23505')) {
    const fallbackPayload = { ...baseInsertData };
    const retryRes = await admin
      .from('shops')
      .insert(fallbackPayload)
      .select()
      .single();
    data = retryRes.data;
    error = retryRes.error;
  }

  if (error || !data) {
    logger.error('shop', `createShop error for ${trimmedName}`, { error: error?.message, details: error?.details }, null);
    console.error('createShop error:', error);
    return { success: false, error: error?.message || 'Failed to create shop.' };
  }

  // Establish persistent session cookies for the new shop owner
  const cookieStore = cookies();
  cookieStore.set('dynish_phone', ownerPhone, { 
    path: '/', 
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: 'lax',
  });
  cookieStore.set('dynish_shop_id', data.id, { 
    path: '/', 
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: 'lax',
  });
  if (validOwnerId) {
    cookieStore.set('dynish_uid', validOwnerId, { 
      path: '/', 
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      sameSite: 'lax',
    });
  }

  logger.info('shop', `Shop created successfully: ${data.name} (${data.id})`, { category: data.category }, data.id);

  // Create default starter categories & default next-visit retention offer
  await admin.from('categories').insert([
    { shop_id: data.id, name: 'New In', sort_order: 0 },
    { shop_id: data.id, name: 'Best Sellers', sort_order: 1 },
    { shop_id: data.id, name: 'Premium Edit', sort_order: 2 },
  ]);

  await admin.from('offers').insert([
    {
      shop_id: data.id,
      title: '10% Cashback on Next Visit',
      description: 'Earn 10% of today’s bill as flat discount on your next visit.',
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
  let payload = { ...updateData, updated_at: new Date().toISOString() };

  let { error } = await admin
    .from('shops')
    .update(payload)
    .eq('id', shopId);

  // If column doesn't exist yet (e.g. migration 005 not run yet on remote DB), retry without those columns
  if (error && (error.message.includes('slug') || error.message.includes('whatsapp_template') || error.code === '42703')) {
    delete (payload as any).slug;
    delete (payload as any).whatsapp_template;
    const retry = await admin.from('shops').update(payload).eq('id', shopId);
    error = retry.error;
  }

  if (error) {
    logger.error('shop', `Failed to update settings for shop ${shopId}`, { error: error.message }, shopId);
    return { success: false, error: error.message };
  }

  logger.info('shop', `Shop settings updated for shop ${shopId}`, { updatedFields: Object.keys(updateData) }, shopId);
  try {
    const { data: s } = await admin.from('shops').select('slug').eq('id', shopId).maybeSingle();
    if (s?.slug) revalidatePath(`/store/${s.slug}`);
  } catch {}
  revalidatePath(`/store/${shopId}`);
  revalidatePath('/store/[shopId]', 'page');
  revalidatePath('/owner/settings');
  return { success: true };
}

const RESERVED_SLUGS = new Set([
  'owner', 'admin', 'api', 'login', 'store', 'settings', 'billing', 'catalog', 
  'dashboard', 'auth', 'public', 'static', 'dynish', 'root', 'system', 'app'
]);

export async function checkSlugAvailability(
  slugCandidate: string,
  currentShopId: string
): Promise<{ available: boolean; slug: string; error?: string }> {
  const clean = slugCandidate
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (clean.length < 3) {
    return { available: false, slug: clean, error: 'Handle must be at least 3 characters long.' };
  }

  if (clean.length > 30) {
    return { available: false, slug: clean, error: 'Maximum 30 characters allowed.' };
  }

  if (RESERVED_SLUGS.has(clean)) {
    return { available: false, slug: clean, error: 'This URL handle is reserved.' };
  }

  const admin = createAdminClient();
  try {
    const { data: existing, error } = await admin
      .from('shops')
      .select('id')
      .eq('slug', clean)
      .neq('id', currentShopId)
      .maybeSingle();

    if (error) {
      const isMissingCol = error.message?.includes('slug') || error.code === 'PGRST204' || error.code === '42703';
      if (isMissingCol) {
        return {
          available: false,
          slug: clean,
          error: "Database setup required: The 'slug' column is not yet enabled in your Supabase database. Run: ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE; in Supabase SQL Editor.",
        };
      }
      return { available: true, slug: clean };
    }

    if (existing) {
      return { available: false, slug: clean, error: 'Handle already taken by another store.' };
    }
  } catch {
    return { available: true, slug: clean };
  }

  return { available: true, slug: clean };
}

export async function updateShopSlug(
  shopId: string,
  slugCandidate: string
): Promise<{ success: boolean; slug?: string; error?: string }> {
  const admin = createAdminClient();

  try {
    const { data: currentShop } = await admin
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if ((currentShop as any)?.slug) {
      return { success: false, error: 'Store URL handle is already locked and permanently fixed.' };
    }
  } catch (e) {
    // Ignore if column check fails
  }

  const check = await checkSlugAvailability(slugCandidate, shopId);
  if (!check.available) {
    return { success: false, error: check.error || 'Handle is unavailable.' };
  }

  const { error: updateError } = await admin
    .from('shops')
    .update({ slug: check.slug, updated_at: new Date().toISOString() } as any)
    .eq('id', shopId);

  if (updateError) {
    const isMissingCol = updateError.message?.includes('slug') || updateError.code === 'PGRST204' || updateError.code === '42703';
    if (isMissingCol) {
      return {
        success: false,
        error: "Database migration required: The 'slug' column does not exist in your Supabase 'shops' table. Run this SQL in your Supabase SQL Editor:\nALTER TABLE public.shops ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;\nNOTIFY pgrst, 'reload schema';",
      };
    }
    return { success: false, error: updateError.message };
  }

  revalidatePath(`/store/${check.slug}`);
  revalidatePath(`/store/${shopId}`);
  revalidatePath('/owner/settings');
  revalidatePath('/owner/standee');
  return { success: true, slug: check.slug };
}

export async function getShopBySlugOrId(identifier: string): Promise<ShopRow | null> {
  const admin = createAdminClient();

  if (isValidUUID(identifier)) {
    const { data: shopById } = await admin
      .from('shops')
      .select('*')
      .eq('id', identifier)
      .maybeSingle();
    if (shopById) return shopById;
  }

  try {
    const { data: shopBySlug, error } = await admin
      .from('shops')
      .select('*')
      .eq('slug', identifier.toLowerCase().trim())
      .maybeSingle();

    if (!error && shopBySlug) return shopBySlug;
  } catch {
    // Fallback if slug column not queryable
  }

  return null;
}

export async function uploadShopAsset(
  shopId: string,
  formData: FormData,
  type: 'logo' | 'banner'
): Promise<{ success: boolean; url?: string; error?: string }> {
  const file = formData.get('file') as File | null;
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  const admin = createAdminClient();
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${shopId}/${type}_${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from('shop-assets')
    .upload(fileName, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    });

  if (uploadError) {
    console.error('uploadShopAsset storage error:', uploadError);
    return { success: false, error: uploadError.message };
  }

  const { data: urlData } = admin.storage.from('shop-assets').getPublicUrl(fileName);
  return { success: true, url: urlData.publicUrl };
}
