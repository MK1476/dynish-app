import React from 'react';
import { getCurrentVendorSession } from '@/actions/auth';
import { getOwnerShop } from '@/actions/shop';
import { redirect } from 'next/navigation';
import { OnboardingClient } from './OnboardingClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OnboardingPage() {
  const { phone, userId } = await getCurrentVendorSession();

  // 1. If user is NOT logged in, redirect to login page only
  if (!phone && !userId) {
    redirect('/owner/login');
  }

  // 2. If user is logged in, check if there is ALREADY a restaurant/shop on this number
  const shop = await getOwnerShop();
  if (shop) {
    // User already has a store on this number -> redirect to dashboard
    redirect('/owner/dashboard');
  }

  // 3. Only if user is logged in AND has no restaurant on this number -> open onboarding page
  return <OnboardingClient userPhone={phone || ''} />;
}
