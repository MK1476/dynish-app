'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { generateWhatsAppBillMessage, generateWhatsAppUrl } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/types/database';
import { logger } from '@/lib/logger';

export type CustomerRow = Database['public']['Tables']['customers']['Row'];
export type TransactionRow = Database['public']['Tables']['transactions']['Row'];

export interface AvailableOfferItem {
  id: string;
  title: string;
  discountText: string;
  isLatest: boolean;
}

export interface CustomerWithOffer extends CustomerRow {
  lastOfferAwarded?: string | null;
  lastBillDate?: string | null;
  availableLoyaltyDiscount?: number | null;
  availableOffers?: AvailableOfferItem[];
}

export async function searchCustomers(
  shopId: string,
  query: string
): Promise<CustomerRow[]> {
  if (!query || query.trim().length < 2) return [];

  const admin = createAdminClient();
  const clean = query.trim();

  const { data, error } = await admin
    .from('customers')
    .select('*')
    .eq('shop_id', shopId)
    .or(`phone_number.ilike.%${clean}%,name.ilike.%${clean}%`)
    .order('visit_count', { ascending: false })
    .limit(5);

  if (error) {
    console.error('searchCustomers error:', error);
    return [];
  }
  return data || [];
}

export async function getCustomerByPhone(
  shopId: string,
  phoneNumber: string
): Promise<CustomerWithOffer | null> {
  const digits = phoneNumber.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return null;

  const admin = createAdminClient();
  const possibleNumbers = [digits, `+91${digits}`, `91${digits}`, `0${digits}`];
  const { data: customer } = await admin
    .from('customers')
    .select('*')
    .eq('shop_id', shopId)
    .in('phone_number', possibleNumbers)
    .limit(1)
    .maybeSingle();

  if (!customer) return null;

  // Retrieve offer from customer's latest visit
  const { data: lastTx } = await admin
    .from('transactions')
    .select('next_visit_offer, created_at')
    .eq('shop_id', shopId)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Retrieve any custom assigned offers from customer_offers table
  const { data: assignedOffers } = await admin
    .from('customer_offers' as any)
    .select('id, title, discount_type, discount_value, created_at')
    .eq('shop_id', shopId)
    .eq('customer_id', customer.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const rawOffer = lastTx?.next_visit_offer || null;
  let availableLoyaltyDiscount: number | null = null;

  if (rawOffer) {
    const flatMatch = rawOffer.match(/(?:₹|rs\.?|flat\s*)(\d+)/i);
    if (flatMatch) {
      availableLoyaltyDiscount = parseInt(flatMatch[1], 10);
    } else {
      const pctMatch = rawOffer.match(/(\d+(\.\d+)?)\s*%/);
      if (pctMatch && customer.last_bill_amount && Number(customer.last_bill_amount) > 0) {
        const pct = parseFloat(pctMatch[1]);
        availableLoyaltyDiscount = Math.round((Number(customer.last_bill_amount) * pct) / 100);
      }
    }
  }

  // Fallback: Default 10% next-visit loyalty reward from previous bill
  if ((availableLoyaltyDiscount === null || isNaN(availableLoyaltyDiscount)) && 
      customer.last_bill_amount && 
      Number(customer.last_bill_amount) > 0) {
    availableLoyaltyDiscount = Math.round(Number(customer.last_bill_amount) * 0.10);
  }

  // Compile full list of available offers for multi-offer resolution
  const availableOffers: AvailableOfferItem[] = [];

  if (rawOffer) {
    availableOffers.push({
      id: `loyalty-${lastTx?.created_at || 'latest'}`,
      title: rawOffer,
      discountText: rawOffer,
      isLatest: true,
    });
  }

  if (assignedOffers && Array.isArray(assignedOffers)) {
    for (const ao of assignedOffers) {
      if (!availableOffers.some((o) => o.title === ao.title)) {
        availableOffers.push({
          id: ao.id,
          title: ao.title,
          discountText: ao.title,
          isLatest: availableOffers.length === 0,
        });
      }
    }
  }

  if (availableOffers.length === 0 && availableLoyaltyDiscount && availableLoyaltyDiscount > 0) {
    availableOffers.push({
      id: 'default-10-loyalty',
      title: `10% Next Visit Discount (₹${availableLoyaltyDiscount} OFF)`,
      discountText: `₹${availableLoyaltyDiscount} OFF (10% Loyalty)`,
      isLatest: true,
    });
  }

  const primaryOfferText = availableOffers.length > 0 ? availableOffers[0].title : rawOffer;

  return {
    ...customer,
    lastOfferAwarded: primaryOfferText,
    lastBillDate: lastTx?.created_at || null,
    availableLoyaltyDiscount: availableLoyaltyDiscount && availableLoyaltyDiscount > 0 ? availableLoyaltyDiscount : null,
    availableOffers,
  };
}

/**
 * Fast bulk fetch of shop customers for offline/instant local caching.
 * Preloads up to 500 customers with their visit counts, spend, and offers.
 */
export async function getShopBillingCustomers(
  shopId: string
): Promise<CustomerWithOffer[]> {
  try {
    const admin = createAdminClient();
    const { data: customers, error } = await admin
      .from('customers')
      .select('*')
      .eq('shop_id', shopId)
      .order('last_visit_at', { ascending: false })
      .limit(500);

    if (error || !customers || customers.length === 0) return [];

    const customerIds = customers.map(c => c.id);
    const txMap = new Map<string, string>();
    if (customerIds.length > 0) {
      const { data: txs } = await admin
        .from('transactions')
        .select('customer_id, next_visit_offer, created_at')
        .eq('shop_id', shopId)
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false });

      if (txs) {
        for (const tx of txs) {
          if (tx.customer_id && !txMap.has(tx.customer_id) && tx.next_visit_offer) {
            txMap.set(tx.customer_id, tx.next_visit_offer);
          }
        }
      }
    }

    return customers.map(c => {
      const offer = txMap.get(c.id) || null;
      let loyaltyDiscount: number | null = null;
      if (offer) {
        const flat = offer.match(/(?:₹|rs\.?|flat\s*)(\d+)/i);
        if (flat) loyaltyDiscount = parseInt(flat[1], 10);
      }
      if (!loyaltyDiscount && c.last_bill_amount && Number(c.last_bill_amount) > 0) {
        loyaltyDiscount = Math.round(Number(c.last_bill_amount) * 0.10);
      }

      return {
        ...c,
        lastOfferAwarded: offer || (loyaltyDiscount ? `10% Next Visit Discount (₹${loyaltyDiscount} OFF)` : null),
        availableLoyaltyDiscount: loyaltyDiscount,
      };
    });
  } catch (err) {
    console.error('getShopBillingCustomers error:', err);
    return [];
  }
}

export interface RecordBillInput {
  shopId: string;
  phoneNumber: string;
  customerName?: string;
  billAmount?: number | null;
  appliedOffer?: string;
  nextVisitOffer?: string;
}

export interface RecordBillResult {
  success: boolean;
  customer?: CustomerRow;
  transaction?: TransactionRow;
  whatsAppUrl?: string;
  whatsAppText?: string;
  error?: string;
}

export async function recordBill(input: RecordBillInput): Promise<RecordBillResult> {
  const digits = input.phoneNumber.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) {
    return { success: false, error: 'Invalid 10-digit mobile number' };
  }

  const admin = createAdminClient();

  try {
    // 1. Fetch shop details for WhatsApp message (select * safely supports DB with or without migration 005)
    const { data: shop, error: shopError } = await admin
      .from('shops')
      .select('*')
      .eq('id', input.shopId)
      .single();

    if (shopError || !shop) {
      console.error('Shop fetch error in recordBill:', shopError, 'shopId:', input.shopId);
      return { success: false, error: 'Shop not found' };
    }

    const amountNum = input.billAmount && input.billAmount > 0 ? Number(input.billAmount) : null;
    const nowIso = new Date().toISOString();

    // 2. Fetch existing customer (matching clean 10-digits or with prefix)
    const possibleNumbers = [digits, `+91${digits}`, `91${digits}`, `0${digits}`];
    const { data: existingCustomer } = await admin
      .from('customers')
      .select('*')
      .eq('shop_id', input.shopId)
      .in('phone_number', possibleNumbers)
      .limit(1)
      .maybeSingle();

    let customer: CustomerRow;

    if (existingCustomer) {
      const newVisitCount = existingCustomer.visit_count + 1;
      const newTotalSpent = Number(existingCustomer.total_spent) + (amountNum || 0);

      const { data: updatedCustomer, error: updateError } = await admin
        .from('customers')
        .update({
          name: input.customerName?.trim() || existingCustomer.name,
          visit_count: newVisitCount,
          last_visit_at: nowIso,
          last_bill_amount: amountNum ?? existingCustomer.last_bill_amount,
          total_spent: newTotalSpent,
        })
        .eq('id', existingCustomer.id)
        .select()
        .single();

      if (updateError) throw updateError;
      customer = updatedCustomer;
    } else {
      const { data: newCustomer, error: insertError } = await admin
        .from('customers')
        .insert({
          shop_id: input.shopId,
          phone_number: digits,
          name: input.customerName?.trim() || null,
          visit_count: 1,
          first_seen_at: nowIso,
          last_visit_at: nowIso,
          last_bill_amount: amountNum,
          total_spent: amountNum || 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      customer = newCustomer;
    }

    // 3. Resolve dynamic next-visit loyalty offer (e.g. 10% of today's bill)
    let resolvedNextOffer = input.nextVisitOffer?.trim() || null;
    if (amountNum && amountNum > 0) {
      const isTenPercent = !resolvedNextOffer || 
        resolvedNextOffer.includes('10%') || 
        resolvedNextOffer.toLowerCase().includes('cashback') || 
        resolvedNextOffer === 'Flat 10% OFF on Next Visit' ||
        resolvedNextOffer === '10% Cashback on Next Visit';

      if (isTenPercent) {
        const rewardAmount = Math.round(amountNum * 0.10);
        resolvedNextOffer = `₹${rewardAmount} OFF on Next Visit (10% of today's bill ₹${amountNum})`;
      } else if (resolvedNextOffer) {
        const pctMatch = resolvedNextOffer.match(/(\d+(\.\d+)?)\s*%/);
        if (pctMatch) {
          const pct = parseFloat(pctMatch[1]);
          const rewardAmount = Math.round((amountNum * pct) / 100);
          resolvedNextOffer = `₹${rewardAmount} OFF on Next Visit (${pct}% of today's bill ₹${amountNum})`;
        }
      }
    }

    // 4. Log transaction
    const { data: transaction, error: txError } = await admin
      .from('transactions')
      .insert({
        shop_id: input.shopId,
        customer_id: customer.id,
        bill_amount: amountNum,
        applied_offer: input.appliedOffer || null,
        next_visit_offer: resolvedNextOffer,
        visit_number: customer.visit_count,
        created_at: nowIso,
      })
      .select()
      .single();

    if (txError) throw txError;

    // 5. Generate WhatsApp Receipt Payload
    const rawMsg = generateWhatsAppBillMessage({
      shopName: shop.name,
      ownerName: shop.name,
      customerName: customer.name || undefined,
      customerPhone: digits,
      billAmount: amountNum,
      visitNumber: customer.visit_count,
      nextOfferTitle: resolvedNextOffer || undefined,
      shopAddress: shop.address || undefined,
      shopId: input.shopId,
      shopSlug: (shop as any)?.slug || undefined,
      customTemplate: (shop as any)?.whatsapp_template || undefined,
    });

    const waUrl = generateWhatsAppUrl(digits, rawMsg);

    revalidatePath('/owner/dashboard');
    revalidatePath('/owner/customers');

    logger.info('billing', `Bill recorded: ₹${amountNum || 0} for customer +91 ${digits} (Visit #${customer.visit_count})`, {
      billAmount: amountNum,
      visitNumber: customer.visit_count,
      nextOffer: resolvedNextOffer,
      appliedOffer: input.appliedOffer
    }, input.shopId);

    return {
      success: true,
      customer,
      transaction,
      whatsAppUrl: waUrl,
      whatsAppText: rawMsg,
    };
  } catch (err: any) {
    logger.error('billing', `Failed to record bill for +91 ${digits}`, { error: err.message }, input.shopId);
    console.error('recordBill error:', err);
    return { success: false, error: err.message };
  }
}
