import React from 'react';
import { getOwnerShop } from '@/actions/shop';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { CustomersClient } from './CustomersClient';

export default async function CustomersPage() {
  const shop = await getOwnerShop();
  if (!shop) {
    redirect('/owner/onboarding');
  }

  const admin = createAdminClient();
  const { data: customers } = await admin
    .from('customers')
    .select('*')
    .eq('shop_id', shop.id)
    .order('visit_count', { ascending: false });

  return (
    <div className="max-w-4xl mx-auto p-3.5 sm:p-6 pb-32 md:pb-24">
      <CustomersClient shop={shop} initialCustomers={customers || []} />
    </div>
  );
}
