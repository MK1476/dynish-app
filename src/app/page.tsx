import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { LandingPageClient } from './LandingPageClient';

export default async function HomePage() {
  const admin = createAdminClient();
  const { data: shops } = await admin
    .from('shops')
    .select('id, name, category, logo_url, address, slug')
    .order('created_at', { ascending: false })
    .limit(6);

  return <LandingPageClient showcaseShops={shops || []} />;
}
