'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { generateWhatsAppUrl } from '@/lib/utils';
import type { Database } from '@/types/database';

export interface CustomerVisitRecord {
  id: string;
  visitNumber: number;
  date: string;
  billAmount: number | null;
  appliedOffer: string | null;
  nextVisitOffer: string | null;
}

export interface CustomerActiveOffer {
  id: string;
  title: string;
  description?: string | null;
  discountType: 'percentage' | 'flat';
  discountValue: number | null;
  source: 'loyalty_reward' | 'custom_assigned' | 'shop_offer';
  createdAt: string;
}

/**
 * Fetch full visit-by-visit transaction history for a specific customer.
 */
export async function getCustomerVisitHistory(
  shopId: string,
  customerId: string
): Promise<CustomerVisitRecord[]> {
  try {
    const admin = createAdminClient();
    const { data: txs, error } = await admin
      .from('transactions')
      .select('*')
      .eq('shop_id', shopId)
      .eq('customer_id', customerId)
      .order('visit_number', { ascending: true });

    if (error || !txs) return [];

    return txs.map((t) => ({
      id: t.id,
      visitNumber: t.visit_number,
      date: t.created_at,
      billAmount: t.bill_amount !== null ? Number(t.bill_amount) : null,
      appliedOffer: t.applied_offer,
      nextVisitOffer: t.next_visit_offer,
    }));
  } catch (err) {
    console.error('getCustomerVisitHistory error:', err);
    return [];
  }
}

/**
 * Fetch active offers currently associated with a customer.
 */
export async function getCustomerActiveOffers(
  shopId: string,
  customerId: string
): Promise<CustomerActiveOffer[]> {
  const offers: CustomerActiveOffer[] = [];

  try {
    const admin = createAdminClient();

    // 1. Try customer_offers table
    const { data: customOffers, error: coErr } = await admin
      .from('customer_offers' as any)
      .select('*')
      .eq('shop_id', shopId)
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!coErr && customOffers && Array.isArray(customOffers)) {
      for (const co of customOffers) {
        offers.push({
          id: co.id,
          title: co.title,
          description: co.description,
          discountType: co.discount_type || 'percentage',
          discountValue: co.discount_value ? Number(co.discount_value) : null,
          source: 'custom_assigned',
          createdAt: co.created_at,
        });
      }
    }

    // 2. Also check latest transaction's next_visit_offer or loyalty reward
    const { data: lastTx } = await admin
      .from('transactions')
      .select('next_visit_offer, created_at')
      .eq('shop_id', shopId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastTx?.next_visit_offer) {
      // Check if already in list
      const alreadyInList = offers.some((o) => o.title === lastTx.next_visit_offer);
      if (!alreadyInList) {
        const isFlat = /(?:₹|rs\.?|flat\s*)(\d+)/i.test(lastTx.next_visit_offer);
        offers.push({
          id: `tx-reward-${lastTx.created_at}`,
          title: lastTx.next_visit_offer,
          discountType: isFlat ? 'flat' : 'percentage',
          discountValue: null,
          source: 'loyalty_reward',
          createdAt: lastTx.created_at,
        });
      }
    }
  } catch (err) {
    console.error('getCustomerActiveOffers error:', err);
  }

  return offers;
}

/**
 * Fetch available shop offers to present in the offer selector.
 */
export async function getShopOffers(shopId: string) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('offers')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data;
  } catch (err) {
    console.error('getShopOffers error:', err);
    return [];
  }
}

/**
 * Assign a new offer to the customer and generate the wa.me WhatsApp URL with prefilled offer text.
 */
export async function assignAndSendCustomerOffer(params: {
  shopId: string;
  customerId: string;
  offerTitle: string;
  discountType?: 'percentage' | 'flat';
  discountValue?: number;
}): Promise<{ success: boolean; whatsappUrl?: string; error?: string }> {
  try {
    const { shopId, customerId, offerTitle, discountType = 'percentage', discountValue } = params;
    if (!shopId || !customerId || !offerTitle.trim()) {
      return { success: false, error: 'Missing required parameters.' };
    }

    const admin = createAdminClient();

    // 1. Fetch customer and shop details
    const [custRes, shopRes] = await Promise.all([
      admin.from('customers').select('*').eq('id', customerId).single(),
      admin.from('shops').select('id, name, slug').eq('id', shopId).single(),
    ]);

    if (!custRes.data) {
      return { success: false, error: 'Customer not found.' };
    }
    if (!shopRes.data) {
      return { success: false, error: 'Shop not found.' };
    }

    const customer = custRes.data;
    const shop = shopRes.data;

    // 2. Persist offer in customer_offers table (with graceful fallback)
    const { error: insertErr } = await admin.from('customer_offers' as any).insert({
      shop_id: shopId,
      customer_id: customerId,
      title: offerTitle.trim(),
      discount_type: discountType,
      discount_value: discountValue || null,
      status: 'active',
    });

    // If customer_offers table not yet in Supabase schema cache, record in transactions table
    if (insertErr) {
      await admin.from('transactions').insert({
        shop_id: shopId,
        customer_id: customerId,
        visit_number: customer.visit_count || 1,
        bill_amount: null,
        applied_offer: 'CUSTOM_OFFER_DISPATCH',
        next_visit_offer: offerTitle.trim(),
      });
    }

    // 3. Format WhatsApp link
    const cleanCustomerName = customer.name?.trim() || 'Valued Patron';
    const storeLink = `https://dynish.com/${shop.slug || shop.id}`;
    const cleanPhone = customer.phone_number.replace(/\D/g, '').slice(-10);

    const message = `Hi ${cleanCustomerName}! ✨\n\nHere is an exclusive special offer for you from *${shop.name}*:\n🎁 *${offerTitle.trim()}*\n\nShow this message at the counter on your next visit to redeem your reward!\n\nBrowse our latest collection here: ${storeLink}`;

    const whatsappUrl = generateWhatsAppUrl(cleanPhone, message);

    return {
      success: true,
      whatsappUrl,
    };
  } catch (err: any) {
    console.error('assignAndSendCustomerOffer error:', err);
    return { success: false, error: err?.message || 'Failed to dispatch offer.' };
  }
}
