'use server';

import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

const ADMIN_COOKIE_NAME = 'dynish_admin_auth';
const DEFAULT_ADMIN_PIN = '14763170';

export async function verifyAdminPin(pin: string): Promise<{ success: boolean; error?: string }> {
  const targetPin = (process.env.ADMIN_PIN || DEFAULT_ADMIN_PIN).trim();
  const cleanPin = (pin || '').trim();

  if (!cleanPin || cleanPin !== targetPin) {
    logger.warn('admin', 'Failed admin PIN authentication attempt', { enteredLength: cleanPin.length });
    return { success: false, error: 'Incorrect 8-digit Admin PIN. Access denied.' };
  }

  const cookieStore = cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, 'authorized', {
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  logger.info('admin', 'Admin session successfully authenticated with 8-digit PIN');
  return { success: true };
}

export async function adminSignOut(): Promise<{ success: boolean }> {
  const cookieStore = cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  return { success: true };
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = cookies();
  return cookieStore.get(ADMIN_COOKIE_NAME)?.value === 'authorized';
}

export async function extendShopSubscription(
  shopId: string,
  days: number = 1
): Promise<{ success: boolean; newExpiresAt?: string; error?: string }> {
  const isAuthed = await isAdminAuthenticated();
  if (!isAuthed) {
    return { success: false, error: 'Super-admin PIN verification required.' };
  }

  const admin = createAdminClient();

  const { data: shop, error: fetchErr } = await admin
    .from('shops')
    .select('id, name, expires_at')
    .eq('id', shopId)
    .maybeSingle();

  if (fetchErr || !shop) {
    return { success: false, error: fetchErr?.message || 'Shop not found.' };
  }

  const now = new Date();
  const currentExpiry = new Date(shop.expires_at);

  // If already expired, extend from now; otherwise, add days to existing expiry date
  const baseTime = currentExpiry > now ? currentExpiry.getTime() : now.getTime();
  const newExpiryDate = new Date(baseTime + days * 24 * 60 * 60 * 1000);
  const newExpiresAt = newExpiryDate.toISOString();

  const { error: updateErr } = await admin
    .from('shops')
    .update({
      expires_at: newExpiresAt,
      is_active: true,
      updated_at: now.toISOString(),
    })
    .eq('id', shopId);

  if (updateErr) {
    logger.error('admin', `Failed to extend subscription for ${shop.name}`, { error: updateErr.message }, shopId);
    return { success: false, error: updateErr.message };
  }

  logger.info('admin', `Extended subscription for ${shop.name} by ${days} day(s)`, { newExpiresAt }, shopId);
  revalidatePath('/admin');
  revalidatePath('/owner/dashboard');
  revalidatePath('/owner/subscription');

  return { success: true, newExpiresAt };
}
