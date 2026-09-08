import React from 'react';
import { getCurrentVendorSession } from '@/actions/auth';
import { getOwnerShop } from '@/actions/shop';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const { phone, userId } = await getCurrentVendorSession();
  if (!phone && !userId) {
    redirect('/owner/login');
  }

  const shop = await getOwnerShop();
  if (!shop) {
    redirect('/owner/onboarding');
  }

  const admin = createAdminClient();

  // Fetch transactions and customers for metrics
  const [txRes, custRes] = await Promise.all([
    admin.from('transactions').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false }),
    admin.from('customers').select('*').eq('shop_id', shop.id).order('visit_count', { ascending: false }),
  ]);

  return (
    <div className="max-w-5xl mx-auto p-3.5 sm:p-6 pb-32 md:pb-24">
      <DashboardClient 
        shop={shop} 
        transactions={txRes.data || []} 
        customers={custRes.data || []} 
      />
    </div>
  );
}
