import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS } from '@/lib/plans';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid && process.env.PAYMENT_MODE !== 'test') {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const admin = createAdminClient();

    // Handle payment.captured or order.paid
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const payment = event.payload.payment.entity;
      const notes = payment.notes || {};
      const shopId = notes.shop_id;
      const planType = (notes.plan_type as 'monthly' | 'yearly') || 'monthly';

      if (shopId) {
        const plan = PLANS[planType];
        const { data: shop } = await admin
          .from('shops')
          .select('expires_at')
          .eq('id', shopId)
          .single();

        const currentExpiry = shop?.expires_at ? new Date(shop.expires_at) : new Date();
        const now = new Date();
        const baseDate = currentExpiry > now ? currentExpiry : now;
        const newExpiry = new Date(baseDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString();

        await admin.from('subscriptions').insert({
          shop_id: shopId,
          plan_type: planType,
          amount: plan.price,
          razorpay_order_id: payment.order_id || null,
          razorpay_payment_id: payment.id,
          razorpay_signature: signature,
          status: 'paid',
          starts_at: baseDate.toISOString(),
          expires_at: newExpiry,
        });

        await admin.from('shops').update({
          plan_type: planType,
          expires_at: newExpiry,
          is_active: true,
          updated_at: new Date().toISOString(),
        }).eq('id', shopId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Razorpay webhook handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
