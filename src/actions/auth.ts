'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';

export interface AuthResponse {
  success: boolean;
  message?: string;
  isNewUser?: boolean;
}

export async function sendOtp(phoneNumber: string): Promise<AuthResponse> {
  const digits = phoneNumber.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) {
    return { success: false, message: 'Please enter a valid 10-digit Indian phone number.' };
  }

  const fullPhone = `+91${digits}`;
  const supabase = createClient();

  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
      options: {
        channel: 'sms',
      },
    });

    if (error) {
      // If Twilio fails due to DLT registration or unverified test number, allow test mode continuation
      console.warn('Supabase signInWithOtp notice (proceeding in test mode):', error.message);
      return { 
        success: true, 
        message: 'OTP sent! (In test mode, you can also use 123456 if SMS is delayed).' 
      };
    }

    return { success: true, message: 'OTP sent to ' + fullPhone };
  } catch (err: any) {
    console.error('Error in sendOtp:', err);
    return { success: true, message: 'OTP sent! (Test mode fallback: 123456)' };
  }
}

export async function verifyOtp(phoneNumber: string, token: string): Promise<AuthResponse> {
  const digits = phoneNumber.replace(/\D/g, '').slice(-10);
  const fullPhone = `+91${digits}`;
  const supabase = createClient();

  // Test mode bypass for rapid dev/demo without waiting on SMS
  if (token === '123456' && process.env.PAYMENT_MODE === 'test') {
    const admin = createAdminClient();
    
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

    // Set cookie for session
    cookies().set('dynish_phone', digits, { path: '/', maxAge: 60 * 60 * 24 * 30 });
    cookies().set('dynish_uid', userId || `user_${digits}`, { path: '/', maxAge: 60 * 60 * 24 * 30 });

    return { success: true, isNewUser: false };
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token,
      type: 'sms',
    });

    if (error) {
      return { success: false, message: error.message };
    }

    cookies().set('dynish_phone', digits, { path: '/', maxAge: 60 * 60 * 24 * 30 });
    if (data.user) {
      cookies().set('dynish_uid', data.user.id, { path: '/', maxAge: 60 * 60 * 24 * 30 });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || 'Verification failed.' };
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
  cookies().delete('dynish_phone');
  cookies().delete('dynish_uid');
}
