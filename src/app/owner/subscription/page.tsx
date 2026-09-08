import React from 'react';
import { getCurrentVendorSession } from '@/actions/auth';
import { getOwnerShop } from '@/actions/shop';
import { calculateSubscriptionStatus } from '@/lib/utils';
import { redirect } from 'next/navigation';
import { SubscriptionClient } from './SubscriptionClient';

export default async function SubscriptionPage() {
  const { phone, userId } = await getCurrentVendorSession();
  if (!phone && !userId) {
    redirect('/owner/login');
  }

  const shop = await getOwnerShop();
  if (!shop) {
    redirect('/owner/onboarding');
  }

  const status = calculateSubscriptionStatus(shop.expires_at);

  return (
    <div className="max-w-4xl mx-auto p-3.5 sm:p-6 pb-32 md:pb-24">
      <SubscriptionClient shop={shop} status={status} />
    </div>
  );
}
