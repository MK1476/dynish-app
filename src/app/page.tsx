import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { LandingPageClient } from './LandingPageClient';
import { getCurrentVendorSession } from '@/actions/auth';
import { getOwnerShop } from '@/actions/shop';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  // Fast-path for shop owners: if already logged in, jump directly to counter billing
  const { phone, userId } = await getCurrentVendorSession();
  if (phone || userId) {
    const shop = await getOwnerShop();
    if (shop) {
      redirect('/owner/billing');
    }
  }

  const admin = createAdminClient();
  const { data: shops } = await admin
    .from('shops')
    .select('id, name, category, logo_url, address, slug')
    .order('created_at', { ascending: false })
    .limit(6);

  return <LandingPageClient showcaseShops={shops || []} />;
}
