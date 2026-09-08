import React from 'react';
import { getCurrentVendorSession } from '@/actions/auth';
import { getOwnerShop } from '@/actions/shop';
import { getShopOffers } from '@/actions/offers';
import { BillingFormClient } from './BillingFormClient';
import { redirect } from 'next/navigation';

export default async function BillingPage() {
  const { phone, userId } = await getCurrentVendorSession();
  if (!phone && !userId) {
    redirect('/owner/login');
  }

  const shop = await getOwnerShop();
  if (!shop) {
    redirect('/owner/onboarding');
  }

  const offers = await getShopOffers(shop.id);

  return (
    <div className="max-w-2xl mx-auto p-3.5 sm:p-6 pb-32 md:pb-24">
      <BillingFormClient shop={shop} initialOffers={offers} />
    </div>
  );
}
