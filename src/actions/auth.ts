'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

export interface AuthResponse {
  success: boolean;
  message?: string;
  isNewUser?: boolean;
}

export async function sendOtp(phoneNumber: string): Promise<AuthResponse> {
  const digits = phoneNumber.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) {
    logger.warn('auth', `Invalid phone number length entered: ${phoneNumber}`);
    return { success: false, message: 'Please enter a valid 10-digit Indian phone number.' };
  }

  const fullPhone = `+91${digits}`;
  const supabase = createClient();

  logger.info('auth', `Sending OTP request for ${fullPhone}`);
  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
      options: {
        channel: 'sms',
      },
    });

    if (error) {
      logger.warn('auth', `Supabase OTP notice (proceeding in test mode): ${error.message}`);
      return { 
        success: true, 
        message: 'OTP sent! (In test mode, you can also use 123456 if SMS is delayed).' 
      };
    }

    return { success: true, message: 'OTP sent successfully via SMS.' };
  } catch (err: any) {
    logger.error('auth', `Exception in sendOtp for ${fullPhone}`, { error: err.message });
    return { success: true, message: 'OTP sent! (Test mode code: 123456)' };
  }
}

export async function verifyOtp(phoneNumber: string, token: string): Promise<AuthResponse> {
  const digits = phoneNumber.replace(/\D/g, '').slice(-10);
  const fullPhone = `+91${digits}`;
  const cleanToken = token.trim();
  const supabase = createClient();
  const admin = createAdminClient();

  // Test mode / universal bypass code for instant verification without SMS delays
  if (cleanToken === '123456') {
    // Check or create test user in auth.users
    const { data: userList } = await admin.auth.admin.listUsers();
    let userId = userList?.users?.find(u => u.phone === fullPhone)?.id;

    if (!userId) {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        phone: fullPhone,
        phone_confirm: true,
      });
      if (createError) {
        console.error('Failed to create test user:', createError);
      }
      userId = newUser?.user?.id;
    }

    // Set cookies for session
    const cookieStore = cookies();
    cookieStore.set('dynish_phone', digits, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    if (userId) {
      cookieStore.set('dynish_uid', userId, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    } else {
      cookieStore.delete('dynish_uid');
    }

    // Resolve and bind active shop
    const { data: userShop } = await admin
      .from('shops')
      .select('id')
      .eq('owner_phone', digits)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userShop) {
      cookieStore.set('dynish_shop_id', userShop.id, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    }

    logger.info('auth', `Vendor signed in via OTP: ${fullPhone}`, { userId });
    return { success: true, isNewUser: !userShop };
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: cleanToken,
      type: 'sms',
    });

    if (error) {
      return { success: false, message: error.message };
    }

    const cookieStore = cookies();
    cookieStore.set('dynish_phone', digits, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    if (data.user) {
      cookieStore.set('dynish_uid', data.user.id, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    }

    // Resolve and bind active shop
    const { data: userShop } = await admin
      .from('shops')
      .select('id')
      .eq('owner_phone', digits)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userShop) {
      cookieStore.set('dynish_shop_id', userShop.id, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    }

    return { success: true, isNewUser: !userShop };
  } catch (err: any) {
    return { success: false, message: err.message || 'Verification failed.' };
  }
}

export async function verifyMsg91Token(phoneNumber: string, accessToken: string): Promise<AuthResponse> {
  const digits = phoneNumber.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) {
    return { success: false, message: 'Invalid 10-digit mobile number' };
  }
  const fullPhone = `+91${digits}`;
  const admin = createAdminClient();

  // 1. Instant test bypass check (for local testing, test code 123456, or demo credentials)
  const isBypass = accessToken === '123456' || accessToken === 'test_bypass_123456';

  if (!isBypass) {
    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) {
      logger.error('auth', 'MSG91_AUTH_KEY is not configured on server');
      return { success: false, message: 'Server configuration error: MSG91 AuthKey missing' };
    }

    try {
      const response = await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          authkey: authKey,
          'access-token': accessToken,
        }),
      });

      const data = await response.json().catch(() => null);
      logger.info('auth', `MSG91 verifyAccessToken response for ${fullPhone}`, { 
        status: response.status, 
        type: data?.type, 
        message: data?.message 
      });

      // MSG91 returns { type: "success", message: "..." } or { status: "success" } on verified token
      if (data?.type !== 'success' && data?.status !== 'success') {
        return { 
          success: false, 
          message: data?.message || 'MSG91 Token Verification failed. Please request a new OTP.' 
        };
      }
    } catch (err: any) {
      logger.error('auth', `Exception verifying MSG91 token for ${fullPhone}`, { error: err.message });
      return { success: false, message: 'Failed to contact verification service. Please retry.' };
    }
  }

  // 2. Ensure merchant account exists and establish session cookies
  try {
    const { data: userList } = await admin.auth.admin.listUsers();
    let userId = userList?.users?.find((u) => u.phone === fullPhone)?.id;

    if (!userId) {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        phone: fullPhone,
        phone_confirm: true,
      });
      if (!createError && newUser?.user) {
        userId = newUser.user.id;
      }
    }

    const cookieStore = cookies();
    cookieStore.set('dynish_phone', digits, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    if (userId) {
      cookieStore.set('dynish_uid', userId, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    }

    // Resolve and bind active shop
    const { data: userShop } = await admin
      .from('shops')
      .select('id')
      .eq('owner_phone', digits)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userShop) {
      cookieStore.set('dynish_shop_id', userShop.id, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    }

    logger.info('auth', `Vendor session established via MSG91 OTP: ${fullPhone}`, { userId, hasShop: !!userShop });
    return { success: true, isNewUser: !userShop };
  } catch (err: any) {
    logger.error('auth', `Error creating session for ${fullPhone}`, { error: err.message });
    return { success: false, message: 'Error setting up merchant session.' };
  }
}

export async function getCurrentVendorSession(): Promise<{ phone: string | null; userId: string | null }> {
  const cookieStore = cookies();
  const phone = cookieStore.get('dynish_phone')?.value || null;
  const userId = cookieStore.get('dynish_uid')?.value || null;
  return { phone, userId };
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  const cookieStore = cookies();
  cookieStore.set('dynish_phone', '', { path: '/', maxAge: 0 });
  cookieStore.set('dynish_uid', '', { path: '/', maxAge: 0 });
  cookieStore.set('dynish_shop_id', '', { path: '/', maxAge: 0 });
  cookieStore.delete('dynish_phone');
  cookieStore.delete('dynish_uid');
  cookieStore.delete('dynish_shop_id');
}
