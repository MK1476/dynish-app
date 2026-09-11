import React from 'react';
import { getCurrentVendorSession } from '@/actions/auth';
import { getOwnerShop } from '@/actions/shop';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { CustomersClient } from './CustomersClient';

export default async function CustomersPage() {
  const { phone, userId } = await getCurrentVendorSession();
  if (!phone && !userId) {
    redirect('/owner/login');
  }

  const shop = await getOwnerShop();
  if (!shop) {
    redirect('/owner/onboarding');
  }

  const admin = createAdminClient();
  const [customersRes, offersRes] = await Promise.all([
    admin
      .from('customers')
      .select('*')
      .eq('shop_id', shop.id)
      .order('visit_count', { ascending: false }),
    admin
      .from('offers')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <div className="max-w-4xl mx-auto p-3.5 sm:p-6 pb-32 md:pb-24">
      <CustomersClient
        shop={shop}
        initialCustomers={customersRes.data || []}
        initialOffers={offersRes.data || []}
      />
    </div>
  );
}
