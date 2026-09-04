'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Database } from '@/types/database';
import { 
  LayoutDashboard, ShoppingBag, Zap, Users, Gift, 
  CreditCard, Settings, ExternalLink, Menu, X, ShieldAlert, 
  Terminal, QrCode, Lock, Unlock, Download 
} from 'lucide-react';
import { signOut } from '@/actions/auth';
import { BrandLogo } from '@/components/common/BrandLogo';
import { useStaffMode } from '@/lib/useStaffMode';
import { PinUnlockModal } from '@/components/common/PinUnlockModal';

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
  const router = useRouter();
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // PWA install prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  const { isStaffMode, enableStaffMode, unlockOwnerMode } = useStaffMode();

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
  };

  // If on login or onboarding page, don't show navigation
  if (pathname.includes('/owner/login') || pathname.includes('/owner/onboarding')) {
    return null;
  }

  const navItems = [
    { label: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
    { label: 'Catalog', href: '/owner/catalog', icon: ShoppingBag },
    { label: 'Billing Counter', href: '/owner/billing', icon: Zap, isHighlight: true },
    { label: 'Counter Standee', href: '/owner/standee', icon: QrCode },
    { label: 'Customers', href: '/owner/customers', icon: Users },
    { label: 'Offers', href: '/owner/offers', icon: Gift },
    { label: 'Subscription', href: '/owner/subscription', icon: CreditCard },
    { label: 'Store Settings', href: '/owner/settings', icon: Settings },
    { label: 'System Logs', href: '/owner/logs', icon: Terminal },
  ];

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    // If staff mode is active and target is not billing, intercept with PIN
    if (isStaffMode && href !== '/owner/billing') {
      e.preventDefault();
      setPendingHref(href);
      setIsPinModalOpen(true);
    }
  };

  const handlePinSuccess = () => {
    setIsPinModalOpen(false);
    if (pendingHref) {
      router.push(pendingHref);
      setPendingHref(null);
    }
  };

  return (
    <>
      {/* DESKTOP SIDEBAR (hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-ivory-200 shrink-0 min-h-screen p-4 justify-between">
        <div className="space-y-4">
          
          {/* Brand Logo Header */}
          <div className="flex items-center justify-between pb-3 border-b border-ivory-200">
            <BrandLogo size="sm" subtext="Merchant OS" />
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-brand-100 text-brand-900 border border-brand-200">
              v2.0
            </span>
          </div>

          {/* Staff Mode Active Badge */}
          {isStaffMode && (
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="w-full p-2.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center justify-between text-xs font-bold shadow-2xs hover:bg-rose-100 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                <span>Cashier Mode Active</span>
              </span>
              <span className="text-[10px] uppercase underline">Unlock</span>
            </button>
          )}

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
              const isLockedForStaff = isStaffMode && item.href !== '/owner/billing';

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-espresso-950 text-white shadow-xs'
                      : item.isHighlight
                      ? 'bg-gradient-to-r from-amber-500/10 to-brand-500/20 text-brand-900 hover:bg-brand-100 font-bold border border-brand-300'
                      : isLockedForStaff
                      ? 'text-espresso-400 hover:bg-ivory-50 opacity-70'
                      : 'text-espresso-700 hover:bg-ivory-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : item.isHighlight ? 'text-amber-600' : 'text-espresso-500'}`} />
                    <span>{item.label}</span>
                  </div>

                  {isLockedForStaff && (
                    <Lock className="w-3.5 h-3.5 text-espresso-400" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer, Staff Mode Switch, and Subscription Status */}
        <div className="space-y-2.5 pt-4 border-t border-ivory-200 text-xs">
          
          {/* Staff Mode Toggle */}
          <button
            onClick={() => {
              if (isStaffMode) {
                setIsPinModalOpen(true);
              } else {
                enableStaffMode();
                router.push('/owner/billing');
              }
            }}
            className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between text-[11px] font-semibold transition-colors ${
              isStaffMode
                ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                : 'bg-ivory-50 border-ivory-200 text-espresso-700 hover:bg-ivory-100'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {isStaffMode ? <Lock className="w-3.5 h-3.5 text-rose-600" /> : <Unlock className="w-3.5 h-3.5 text-espresso-500" />}
              <span>{isStaffMode ? 'Staff Mode (Locked)' : 'Lock Staff Mode (PIN)'}</span>
            </span>
            <span className="text-[10px] text-espresso-400 font-mono">1234</span>
          </button>

          {/* PWA Install Button */}
          {canInstall && (
            <button
              onClick={handleInstallApp}
              className="w-full py-2 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-900 border border-brand-200 font-bold flex items-center justify-between transition-colors text-[11px]"
            >
              <span className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-brand-700" />
                <span>Install Dynish App</span>
              </span>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-brand-200">PWA</span>
            </button>
          )}

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
            className="w-full py-1 text-center text-xs text-rose-600 hover:underline"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-ivory-300 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <Link
          href="/owner/dashboard"
          onClick={(e) => handleNavClick(e, '/owner/dashboard')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-semibold ${
            pathname === '/owner/dashboard' ? 'text-brand-800 font-bold' : 'text-espresso-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </Link>

        <Link
          href="/owner/catalog"
          onClick={(e) => handleNavClick(e, '/owner/catalog')}
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
          onClick={(e) => handleNavClick(e, '/owner/customers')}
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
            className="w-full bg-white rounded-t-3xl p-5 shadow-2xl space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
              <BrandLogo size="xs" subtext="Store Menu" />
              <button 
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Staff Mode Switch in Mobile Drawer */}
            <div className="p-3 rounded-2xl bg-ivory-50 border border-ivory-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-espresso-950 block">Cashier Staff PIN Mode</span>
                <span className="text-[10px] text-espresso-500">Lock app to counter billing only</span>
              </div>
              <button
                onClick={() => {
                  setIsMobileMoreOpen(false);
                  if (isStaffMode) {
                    setIsPinModalOpen(true);
                  } else {
                    enableStaffMode();
                    router.push('/owner/billing');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                  isStaffMode 
                    ? 'bg-rose-100 text-rose-800 border-rose-300' 
                    : 'bg-white text-espresso-800 border-ivory-300'
                }`}
              >
                {isStaffMode ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isStaffMode ? 'Unlock' : 'Lock'}</span>
              </button>
            </div>

            <div className="space-y-1">
              <Link
                href="/owner/standee"
                onClick={(e) => {
                  setIsMobileMoreOpen(false);
                  handleNavClick(e, '/owner/standee');
                }}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-ivory-50 text-xs font-semibold text-espresso-800"
              >
                <QrCode className="w-4 h-4 text-brand-600" />
                <span>Print Counter QR Standee</span>
              </Link>

              <Link
                href="/owner/offers"
                onClick={(e) => {
                  setIsMobileMoreOpen(false);
                  handleNavClick(e, '/owner/offers');
                }}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-ivory-50 text-xs font-semibold text-espresso-800"
              >
                <Gift className="w-4 h-4 text-brand-600" />
                <span>Next-Visit Loyalty Offers</span>
              </Link>

              <Link
                href="/owner/subscription"
                onClick={(e) => {
                  setIsMobileMoreOpen(false);
                  handleNavClick(e, '/owner/subscription');
                }}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-ivory-50 text-xs font-semibold text-espresso-800"
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Subscription & Recharges</span>
              </Link>

              <Link
                href="/owner/settings"
                onClick={(e) => {
                  setIsMobileMoreOpen(false);
                  handleNavClick(e, '/owner/settings');
                }}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-ivory-50 text-xs font-semibold text-espresso-800"
              >
                <Settings className="w-4 h-4 text-brand-600" />
                <span>Store Branding & Profile</span>
              </Link>

              <Link
                href="/owner/logs"
                onClick={(e) => {
                  setIsMobileMoreOpen(false);
                  handleNavClick(e, '/owner/logs');
                }}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-ivory-50 text-xs font-semibold text-espresso-800"
              >
                <Terminal className="w-4 h-4 text-espresso-600" />
                <span>System Logs Recorder</span>
              </Link>

              {canInstall && (
                <button
                  onClick={() => {
                    setIsMobileMoreOpen(false);
                    handleInstallApp();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-brand-50 text-xs font-bold text-brand-900 border border-brand-200"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-brand-700" />
                    <span>Install Dynish on Device</span>
                  </span>
                  <span className="text-[10px] uppercase">Install &gt;</span>
                </button>
              )}

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

      {/* PIN UNLOCK MODAL */}
      <PinUnlockModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={handlePinSuccess}
        unlockOwnerMode={unlockOwnerMode}
      />
    </>
  );
};
