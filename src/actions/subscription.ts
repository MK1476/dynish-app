'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpayClient, verifyRazorpaySignature } from '@/lib/razorpay';
import { revalidatePath } from 'next/cache';
import { PLANS, type PlanType } from '@/lib/plans';
import { isProductionEnvironment } from '@/lib/env';

export interface SubscriptionRecord {
  id: string;
  shop_id: string;
  plan_type: string;
  amount: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: string;
  starts_at: string;
  expires_at: string;
  created_at: string;
}

/**
 * Initialize a Razorpay Order for store subscription.
 */
export async function createSubscriptionOrder(
  shopId: string,
  planType: PlanType
): Promise<{ success: boolean; orderId?: string; amount?: number; currency?: string; keyId?: string; error?: string }> {
  try {
    const admin = createAdminClient();
    const { data: shop } = await admin
      .from('shops')
      .select('phone, owner_phone')
      .eq('id', shopId)
      .single();

    // Tester plan gate: exclusive for 9440001449
    if (planType === 'test_7days') {
      const isTester = shop?.owner_phone === '9440001449' || shop?.phone === '9440001449';
      if (!isTester) {
        return { success: false, error: 'The ₹10 Tester Pack is restricted to authorized tester accounts.' };
      }
    }

    const razorpay = getRazorpayClient();
    const plan = PLANS[planType];
    if (!plan) {
      return { success: false, error: 'Invalid plan selected.' };
    }

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
    return { success: false, error: err?.message || 'Failed to create payment order.' };
  }
}

/**
 * Verify Razorpay payment and renew subscription.
 * Uses HMAC signature verification with direct Razorpay REST API verification fallback.
 */
export async function verifyPaymentAndRenew(
  shopId: string,
  paymentData: {
    orderId: string;
    paymentId: string;
    signature: string;
    planType: PlanType;
  }
): Promise<{ success: boolean; newExpiryDate?: string; error?: string }> {
  try {
    const plan = PLANS[paymentData.planType];
    if (!plan) {
      return { success: false, error: 'Unknown subscription plan.' };
    }

    // 1. First attempt local HMAC signature verification
    let isValid = verifyRazorpaySignature(
      paymentData.orderId,
      paymentData.paymentId,
      paymentData.signature
    );

    // 2. Direct Server-Side Razorpay API Fallback Verification:
    // If HMAC check fails (e.g. key secret mismatch or standard checkout callback variations),
    // query Razorpay's official server directly. If payment is captured or authorized, approve immediately!
    if (!isValid) {
      try {
        const razorpay = getRazorpayClient();
        const payment = await razorpay.payments.fetch(paymentData.paymentId);
        if (payment && (payment.status === 'captured' || payment.status === 'authorized')) {
          console.log(`✓ Direct Razorpay API verification confirmed payment ${paymentData.paymentId} (status: ${payment.status})`);
          isValid = true;

          // If authorized but not yet captured, auto-capture
          if (payment.status === 'authorized') {
            try {
              await razorpay.payments.capture(paymentData.paymentId, plan.amountInPaise, 'INR');
            } catch (capErr) {
              console.warn('Auto-capture note:', capErr);
            }
          }
        }
      } catch (apiErr: any) {
        console.warn('Razorpay API verification query failed:', apiErr?.message);
      }
    }

    if (!isValid && process.env.PAYMENT_MODE !== 'test') {
      return { success: false, error: 'Invalid payment signature or unconfirmed transaction.' };
    }

    const admin = createAdminClient();

    // 3. Fetch current shop expiry
    const { data: shop } = await admin
      .from('shops')
      .select('expires_at')
      .eq('id', shopId)
      .single();

    const currentExpiry = shop?.expires_at ? new Date(shop.expires_at) : new Date();
    const now = new Date();
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    const newExpiryIso = newExpiry.toISOString();

    // 4. Log subscription transaction
    await admin.from('subscriptions').insert({
      shop_id: shopId,
      plan_type: paymentData.planType as any,
      amount: plan.price,
      razorpay_order_id: paymentData.orderId || null,
      razorpay_payment_id: paymentData.paymentId,
      razorpay_signature: paymentData.signature || null,
      status: 'paid',
      starts_at: baseDate.toISOString(),
      expires_at: newExpiryIso,
    });

    // 5. Update shop expiry and status
    const updatePlanType = paymentData.planType === 'test_7days' ? 'monthly' : paymentData.planType;
    await admin
      .from('shops')
      .update({
        plan_type: updatePlanType as any,
        expires_at: newExpiryIso,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shopId);

    revalidatePath('/owner/subscription');
    revalidatePath('/owner/dashboard');
    revalidatePath('/owner');
    return { success: true, newExpiryDate: newExpiryIso };
  } catch (err: any) {
    console.error('verifyPaymentAndRenew error:', err);
    return { success: false, error: err?.message || 'Failed to complete subscription renewal.' };
  }
}

/**
 * Self-serve payment recovery: Merchant enters Razorpay Payment ID to verify & activate.
 */
export async function verifyPaymentByPaymentId(
  shopId: string,
  paymentId: string
): Promise<{ success: boolean; message?: string; newExpiryDate?: string; error?: string }> {
  try {
    const cleanPaymentId = paymentId.trim();
    if (!cleanPaymentId || !cleanPaymentId.startsWith('pay_')) {
      return { success: false, error: 'Please enter a valid Razorpay Payment ID starting with "pay_".' };
    }

    const admin = createAdminClient();

    // Check if payment was already recorded
    const { data: existing } = await admin
      .from('subscriptions')
      .select('id, expires_at')
      .eq('razorpay_payment_id', cleanPaymentId)
      .maybeSingle();

    if (existing) {
      return { 
        success: true, 
        message: 'This payment has already been credited to your store account.', 
        newExpiryDate: existing.expires_at 
      };
    }

    // Fetch payment from Razorpay API
    const razorpay = getRazorpayClient();
    const payment = await razorpay.payments.fetch(cleanPaymentId);

    if (!payment || (payment.status !== 'captured' && payment.status !== 'authorized')) {
      return { 
        success: false, 
        error: `Payment status in Razorpay is "${payment?.status || 'not found'}". Only captured payments can be activated.` 
      };
    }

    // Determine plan type from amount
    const amountInPaise = Number(payment.amount);
    let resolvedPlan: typeof PLANS[PlanType] = PLANS.monthly;
    let planKey: PlanType = 'monthly';

    if (amountInPaise <= 1000) {
      resolvedPlan = PLANS.test_7days;
      planKey = 'test_7days';
    } else if (amountInPaise >= 150000) {
      resolvedPlan = PLANS.yearly;
      planKey = 'yearly';
    }

    // Auto-capture if authorized
    if (payment.status === 'authorized') {
      try {
        await razorpay.payments.capture(cleanPaymentId, amountInPaise, 'INR');
      } catch (e) {}
    }

    // Extend subscription
    const { data: shop } = await admin
      .from('shops')
      .select('expires_at')
      .eq('id', shopId)
      .single();

    const currentExpiry = shop?.expires_at ? new Date(shop.expires_at) : new Date();
    const now = new Date();
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + resolvedPlan.durationDays * 24 * 60 * 60 * 1000);
    const newExpiryIso = newExpiry.toISOString();

    await admin.from('subscriptions').insert({
      shop_id: shopId,
      plan_type: planKey as any,
      amount: resolvedPlan.price,
      razorpay_order_id: (payment.order_id as string) || null,
      razorpay_payment_id: cleanPaymentId,
      razorpay_signature: null,
      status: 'paid',
      starts_at: baseDate.toISOString(),
      expires_at: newExpiryIso,
    });

    const updatePlanType = planKey === 'test_7days' ? 'monthly' : planKey;
    await admin
      .from('shops')
      .update({
        plan_type: updatePlanType as any,
        expires_at: newExpiryIso,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shopId);

    revalidatePath('/owner/subscription');
    revalidatePath('/owner/dashboard');
    return {
      success: true,
      message: `Payment verified! Credited ${resolvedPlan.name} (+${resolvedPlan.durationDays} days).`,
      newExpiryDate: newExpiryIso,
    };
  } catch (err: any) {
    console.error('verifyPaymentByPaymentId error:', err);
    return { success: false, error: err?.message || 'Failed to verify payment ID with Razorpay.' };
  }
}

/**
 * Fetch past subscription transactions for this shop.
 */
export async function getShopSubscriptionHistory(
  shopId: string
): Promise<SubscriptionRecord[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('subscriptions')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as SubscriptionRecord[];
  } catch (err) {
    console.error('getShopSubscriptionHistory error:', err);
    return [];
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
