import React from 'react';
import { getOwnerShop } from '@/actions/shop';
import { getShopOffers } from '@/actions/offers';
import { redirect } from 'next/navigation';
import { OffersClient } from './OffersClient';

export default async function OffersPage() {
  const shop = await getOwnerShop();
  if (!shop) {
    redirect('/owner/onboarding');
  }

  const offers = await getShopOffers(shop.id);

  return (
    <div className="max-w-4xl mx-auto p-3.5 sm:p-6 pb-32 md:pb-24">
      <OffersClient shop={shop} initialOffers={offers} />
    </div>
  );
}
