'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Database } from '@/types/database';
import { 
  LayoutDashboard, ShoppingBag, Zap, Users, Gift, 
  CreditCard, Settings, ExternalLink, Menu, X, ShieldAlert, Terminal 
} from 'lucide-react';
import { signOut } from '@/actions/auth';

type ShopRow = Database['public']['Tables']['shops']['Row'];

interface OwnerNavProps {
  shop: ShopRow | null;
  subscriptionStatus: {
    isExpired: boolean;
    isWarning: boolean;
    daysRemaining: number;
    expiryDateFormatted: string;
  } | null;
}

export const OwnerNavigation: React.FC<OwnerNavProps> = ({ shop, subscriptionStatus }) => {
  const pathname = usePathname();
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // If on login or onboarding page, don't show navigation
  if (pathname.includes('/owner/login') || pathname.includes('/owner/onboarding')) {
    return null;
  }

  const navItems = [
    { label: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
    { label: 'Catalog', href: '/owner/catalog', icon: ShoppingBag },
    { label: 'Billing Counter', href: '/owner/billing', icon: Zap, isHighlight: true },
    { label: 'Customers', href: '/owner/customers', icon: Users },
    { label: 'Offers', href: '/owner/offers', icon: Gift },
    { label: 'Subscription', href: '/owner/subscription', icon: CreditCard },
    { label: 'Store Settings', href: '/owner/settings', icon: Settings },
    { label: 'System Logs', href: '/owner/logs', icon: Terminal },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR (hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-ivory-200 shrink-0 min-h-screen p-4 justify-between">
        <div className="space-y-6">
          {/* Shop Header */}
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-ivory-50 border border-ivory-200">
            <img
              src={shop?.logo_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=100'}
              alt={shop?.name || 'Shop'}
              className="w-10 h-10 rounded-xl object-cover ring-1 ring-brand-400"
            />
            <div className="min-w-0">
              <h3 className="font-serif font-bold text-sm text-espresso-950 truncate">
                {shop?.name || 'My Store'}
              </h3>
              <span className="text-[10px] uppercase font-bold text-brand-800 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200 block truncate">
                {shop?.category || 'Retail Outlet'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-espresso-950 text-white shadow-xs'
                      : item.isHighlight
                      ? 'bg-gradient-to-r from-amber-500/10 to-brand-500/20 text-brand-900 hover:bg-brand-100 font-bold border border-brand-300'
                      : 'text-espresso-700 hover:bg-ivory-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : item.isHighlight ? 'text-amber-600' : 'text-espresso-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer & Subscription Status */}
        <div className="space-y-3 pt-4 border-t border-ivory-200 text-xs">
          {shop && (
            <Link
              href={`/store/${shop.id}`}
              target="_blank"
              className="w-full py-2 px-3 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-800 font-medium flex items-center justify-between transition-colors text-[11px]"
            >
              <span>View Live Storefront</span>
              <ExternalLink className="w-3.5 h-3.5 text-brand-600" />
            </Link>
          )}

          {subscriptionStatus && (
            <div className={`p-2.5 rounded-xl border text-[11px] ${
              subscriptionStatus.isWarning 
                ? 'bg-amber-50 border-amber-300 text-amber-900' 
                : 'bg-ivory-50 border-ivory-200 text-espresso-600'
            }`}>
              <div className="flex justify-between font-semibold">
                <span>Subscription:</span>
                <span>{subscriptionStatus.daysRemaining} days left</span>
              </div>
            </div>
          )}

          <button
            onClick={() => signOut()}
            className="w-full py-2 text-center text-xs text-rose-600 hover:underline"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-ivory-300 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <Link
          href="/owner/dashboard"
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-semibold ${
            pathname === '/owner/dashboard' ? 'text-brand-800 font-bold' : 'text-espresso-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </Link>

        <Link
          href="/owner/catalog"
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-semibold ${
            pathname === '/owner/catalog' ? 'text-brand-800 font-bold' : 'text-espresso-500'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Catalog</span>
        </Link>

        {/* ELEVATED CENTER BILLING BUTTON */}
        <Link
          href="/owner/billing"
          className="flex flex-col items-center -mt-5"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-amber-500 to-brand-400 text-espresso-950 flex items-center justify-center shadow-lg shadow-amber-500/30 ring-4 ring-white active:scale-95 transition-transform">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <span className="text-[10px] font-extrabold text-espresso-950 mt-0.5">Billing</span>
        </Link>

        <Link
          href="/owner/customers"
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-semibold ${
            pathname === '/owner/customers' ? 'text-brand-800 font-bold' : 'text-espresso-500'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Clients</span>
        </Link>

        <button
          onClick={() => setIsMobileMoreOpen(true)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-semibold ${
            isMobileMoreOpen ? 'text-brand-800 font-bold' : 'text-espresso-500'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span>More</span>
        </button>
      </div>

      {/* MOBILE MORE DRAWER */}
      {isMobileMoreOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end animate-fade-in"
          onClick={() => setIsMobileMoreOpen(false)}
        >
          <div 
            className="w-full bg-white rounded-t-3xl p-5 shadow-2xl space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
              <h3 className="font-serif font-bold text-base text-espresso-950">Store Menu</h3>
              <button 
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <Link
                href="/owner/offers"
                onClick={() => setIsMobileMoreOpen(false)}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-ivory-50 text-xs font-semibold text-espresso-800"
              >
                <Gift className="w-4 h-4 text-brand-600" />
                <span>Next-Visit Loyalty Offers</span>
              </Link>

              <Link
                href="/owner/subscription"
                onClick={() => setIsMobileMoreOpen(false)}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-ivory-50 text-xs font-semibold text-espresso-800"
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Subscription & Recharges</span>
              </Link>

              <Link
                href="/owner/settings"
                onClick={() => setIsMobileMoreOpen(false)}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-ivory-50 text-xs font-semibold text-espresso-800"
              >
                <Settings className="w-4 h-4 text-brand-600" />
                <span>Store Branding & Profile</span>
              </Link>

              <Link
                href="/owner/logs"
                onClick={() => setIsMobileMoreOpen(false)}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-ivory-50 text-xs font-semibold text-espresso-800"
              >
                <Terminal className="w-4 h-4 text-espresso-600" />
                <span>System Logs Recorder</span>
              </Link>

              {shop && (
                <Link
                  href={`/store/${shop.id}`}
                  target="_blank"
                  className="flex items-center justify-between p-3 rounded-2xl bg-ivory-100 text-xs font-bold text-espresso-950"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-brand-700" />
                    <span>Open Public Storefront</span>
                  </span>
                  <span className="text-[10px] text-brand-800 uppercase">View &gt;</span>
                </Link>
              )}

              <button
                onClick={() => signOut()}
                className="w-full text-left p-3 rounded-2xl text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
