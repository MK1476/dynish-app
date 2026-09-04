import React from 'react';
import { getOwnerShop } from '@/actions/shop';
import { SettingsClient } from './SettingsClient';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Store Settings | Dynish',
  description: 'Manage store branding, contact info, logo, cover banner, and themes.',
};

export default async function SettingsPage() {
  const shop = await getOwnerShop();
  if (!shop) {
    redirect('/owner/onboarding');
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-32 md:pb-24">
      <SettingsClient shop={shop} />
    </div>
  );
}
