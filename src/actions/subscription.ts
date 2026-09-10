'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpayClient, verifyRazorpaySignature } from '@/lib/razorpay';
import { revalidatePath } from 'next/cache';
import { PLANS } from '@/lib/plans';
import { isProductionEnvironment } from '@/lib/env';

export async function createSubscriptionOrder(
  shopId: string,
  planType: 'monthly' | 'yearly'
): Promise<{ success: boolean; orderId?: string; amount?: number; currency?: string; keyId?: string; error?: string }> {
  try {
    const razorpay = getRazorpayClient();
    const plan = PLANS[planType];

    const options = {
      amount: plan.amountInPaise,
      currency: 'INR',
      receipt: `dynish_${shopId.slice(0, 8)}_${Date.now()}`,
      notes: {
        shop_id: shopId,
        plan_type: planType,
      },
    };

    const order = await razorpay.orders.create(options);

    const envKey = process.env.RAZORPAY_KEY_ID?.trim();
    const envPublicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
    const activeKey = (envKey?.startsWith('rzp_live') ? envKey : null) ||
      (envPublicKey?.startsWith('rzp_live') ? envPublicKey : null) ||
      envKey ||
      envPublicKey;

    return {
      success: true,
      orderId: order.id,
      amount: plan.amountInPaise,
      currency: 'INR',
      keyId: activeKey,
    };
  } catch (err: any) {
    console.error('createSubscriptionOrder error:', err);
    return { success: false, error: err.message };
  }
}

export async function verifyPaymentAndRenew(
  shopId: string,
  paymentData: {
    orderId: string;
    paymentId: string;
    signature: string;
    planType: 'monthly' | 'yearly';
  }
): Promise<{ success: boolean; newExpiryDate?: string; error?: string }> {
  const isValid = verifyRazorpaySignature(
    paymentData.orderId,
    paymentData.paymentId,
    paymentData.signature
  );

  if (!isValid && process.env.PAYMENT_MODE !== 'test') {
    return { success: false, error: 'Invalid payment signature' };
  }

  const admin = createAdminClient();
  const plan = PLANS[paymentData.planType];

  try {
    // 1. Fetch current shop expiry
    const { data: shop } = await admin
      .from('shops')
      .select('expires_at')
      .eq('id', shopId)
      .single();

    const currentExpiry = shop?.expires_at ? new Date(shop.expires_at) : new Date();
    const now = new Date();
    // If already expired, base from now; if still active, extend from current expiry
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    const newExpiryIso = newExpiry.toISOString();

    // 2. Log subscription transaction
    await admin.from('subscriptions').insert({
      shop_id: shopId,
      plan_type: paymentData.planType,
      amount: plan.price,
      razorpay_order_id: paymentData.orderId,
      razorpay_payment_id: paymentData.paymentId,
      razorpay_signature: paymentData.signature,
      status: 'paid',
      starts_at: baseDate.toISOString(),
      expires_at: newExpiryIso,
    });

    // 3. Update shop status
    await admin
      .from('shops')
      .update({
        plan_type: paymentData.planType,
        expires_at: newExpiryIso,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shopId);

    revalidatePath('/owner/subscription');
    revalidatePath('/owner/dashboard');
    return { success: true, newExpiryDate: newExpiryIso };
  } catch (err: any) {
    console.error('verifyPaymentAndRenew error:', err);
    return { success: false, error: err.message };
  }
}

// Demo state simulator for testing 3-day warning or 0-day locked app state
export async function simulateSubscriptionDays(
  shopId: string,
  days: number
): Promise<{ success: boolean; error?: string }> {
  if (isProductionEnvironment()) {
    return { success: false, error: 'Subscription simulation is disabled in production.' };
  }

  const admin = createAdminClient();
  const simulatedExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin
    .from('shops')
    .update({ expires_at: simulatedExpiry, is_active: days > 0 })
    .eq('id', shopId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/owner');
  revalidatePath('/owner/dashboard');
  revalidatePath('/owner/subscription');
  return { success: true };
}
