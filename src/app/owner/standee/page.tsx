import React from 'react';
import { getOwnerShop } from '@/actions/shop';
import { StandeeClient } from './StandeeClient';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Counter Standee Generator | Dynish',
  description: 'Print high-resolution acrylic QR standees for your shop billing counter.',
};

export default async function StandeePage() {
  const shop = await getOwnerShop();
  if (!shop) {
    redirect('/owner/onboarding');
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-32 md:pb-24">
      <StandeeClient shop={shop} />
    </div>
  );
}
