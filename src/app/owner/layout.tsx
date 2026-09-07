import React from 'react';
import { getOwnerShop } from '@/actions/shop';
import { calculateSubscriptionStatus } from '@/lib/utils';
import { OwnerLayoutClient } from './OwnerLayoutClient';

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shop = await getOwnerShop();
  const subscriptionStatus = shop ? calculateSubscriptionStatus(shop.expires_at) : null;

  return (
    <OwnerLayoutClient shop={shop} subscriptionStatus={subscriptionStatus}>
      {children}
    </OwnerLayoutClient>
  );
}

