'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { generateWhatsAppBillMessage, generateWhatsAppUrl } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/types/database';
import { logger } from '@/lib/logger';

export type CustomerRow = Database['public']['Tables']['customers']['Row'];
export type TransactionRow = Database['public']['Tables']['transactions']['Row'];

export interface CustomerWithOffer extends CustomerRow {
  lastOfferAwarded?: string | null;
  lastBillDate?: string | null;
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

  return {
    ...customer,
    lastOfferAwarded: lastTx?.next_visit_offer || null,
    lastBillDate: lastTx?.created_at || null,
  };
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

    // 3. Log transaction
    const { data: transaction, error: txError } = await admin
      .from('transactions')
      .insert({
        shop_id: input.shopId,
        customer_id: customer.id,
        bill_amount: amountNum,
        applied_offer: input.appliedOffer || null,
        next_visit_offer: input.nextVisitOffer || null,
        visit_number: customer.visit_count,
        created_at: nowIso,
      })
      .select()
      .single();

    if (txError) throw txError;

    // 4. Generate WhatsApp Receipt Payload
    const rawMsg = generateWhatsAppBillMessage({
      shopName: shop.name,
      ownerName: shop.name,
      customerName: customer.name || undefined,
      customerPhone: digits,
      billAmount: amountNum,
      visitNumber: customer.visit_count,
      nextOfferTitle: input.nextVisitOffer || undefined,
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
      nextOffer: input.nextVisitOffer,
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
