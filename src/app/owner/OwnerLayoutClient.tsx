'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { OwnerNavigation } from './OwnerNavigation';
import { AlertTriangle, Lock } from 'lucide-react';
import Link from 'next/link';
import type { Database } from '@/types/database';

type ShopRow = Database['public']['Tables']['shops']['Row'];

interface OwnerLayoutClientProps {
  children: React.ReactNode;
  shop: ShopRow | null;
  subscriptionStatus: {
    isExpired: boolean;
    isWarning: boolean;
    daysRemaining: number;
    expiryDateFormatted: string;
  } | null;
}

export function OwnerLayoutClient({
  children,
  shop,
  subscriptionStatus,
}: OwnerLayoutClientProps) {
  const pathname = usePathname();
  const isAuthOrOnboarding = 
    pathname.startsWith('/owner/login') || 
    pathname.startsWith('/owner/onboarding') ||
    pathname === '/login';

  // If on login or onboarding page, render children cleanly without merchant banners, overlays or sidebars
  if (isAuthOrOnboarding) {
    return <main className="min-h-screen bg-[#FDFBF7]">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col md:flex-row text-espresso-950 font-sans">
      {/* 3-DAY WARNING BANNER (Sticky across owner portal) */}
      {subscriptionStatus?.isWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-espresso-950 px-4 py-2 font-bold text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">
              ⚠️ Subscription alert: Only <strong>{subscriptionStatus.daysRemaining} days</strong> remaining on your shop.
            </span>
            <Link 
              href="/owner/subscription" 
              className="ml-auto underline shrink-0 hover:text-black font-extrabold"
            >
              Recharge Now →
            </Link>
          </div>
        </div>
      )}

      {/* EXPIRED LOCKED OVERLAY */}
      {subscriptionStatus?.isExpired && (
        <div className="fixed inset-0 z-50 bg-espresso-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border border-ivory-300">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="font-sans text-2xl font-extrabold text-espresso-950 mb-2">
              Subscription Expired
            </h2>
            <p className="text-espresso-600 text-xs sm:text-sm mb-6 leading-relaxed">
              Your {shop?.name} catalog is currently paused for public customers. Recharge your plan to restore full access instantly.
            </p>

            <Link
              href="/owner/subscription"
              className="w-full py-3.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-espresso-950 font-sans font-bold text-sm block shadow-md"
            >
              Recharge for ₹199 / month →
            </Link>
          </div>
        </div>
      )}

      {/* NAVIGATION (Desktop Sidebar + Mobile Bottom Dock) */}
      <OwnerNavigation shop={shop} subscriptionStatus={subscriptionStatus} />

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 min-w-0 ${subscriptionStatus?.isWarning ? 'pt-10' : ''}`}>
        {children}
      </main>
    </div>
  );
}
