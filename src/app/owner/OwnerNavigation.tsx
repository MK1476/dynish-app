'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Database } from '@/types/database';
import { 
  LayoutDashboard, ShoppingBag, Zap, Users, Gift, 
  CreditCard, Settings, ExternalLink, Menu, X, ShieldAlert, 
  Terminal, QrCode, Lock, Unlock, Download, Store, LayoutGrid, ShieldCheck 
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
              <h3 className="font-sans font-bold text-sm text-espresso-950 truncate">
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
            <span className="text-[10px] text-espresso-400 font-sans font-bold">1234</span>
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

      {/* MOBILE BOTTOM NAVIGATION BAR (CLASSIC & PREMIUM WITH ELEVATED BILLING) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8E2D8] px-3 py-2 flex items-center justify-around shadow-2xl">
        {/* Dashboard */}
        <Link
          href="/owner/dashboard"
          onClick={(e) => handleNavClick(e, '/owner/dashboard')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-sans font-semibold transition-colors ${
            pathname === '/owner/dashboard' ? 'text-[#C27835] font-bold' : 'text-espresso-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Home</span>
        </Link>

        {/* Catalog */}
        <Link
          href="/owner/catalog"
          onClick={(e) => handleNavClick(e, '/owner/catalog')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-sans font-semibold transition-colors ${
            pathname === '/owner/catalog' ? 'text-[#C27835] font-bold' : 'text-espresso-500'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span>Catalog</span>
        </Link>

        {/* ELEVATED CENTER BILLING BUTTON */}
        <Link
          href="/owner/billing"
          className="flex flex-col items-center -mt-6 active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 text-espresso-950 flex items-center justify-center shadow-lg shadow-amber-500/30 ring-4 ring-white">
            <Zap className="w-7 h-7 fill-current" />
          </div>
          <span className="text-[11px] font-sans font-extrabold text-espresso-950 mt-1">Billing</span>
        </Link>

        {/* Clients */}
        <Link
          href="/owner/customers"
          onClick={(e) => handleNavClick(e, '/owner/customers')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-sans font-semibold transition-colors ${
            pathname === '/owner/customers' ? 'text-[#C27835] font-bold' : 'text-espresso-500'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Clients</span>
        </Link>

        {/* More Menu Drawer Trigger */}
        <button
          type="button"
          onClick={() => setIsMobileMoreOpen(true)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-sans font-semibold transition-colors ${
            isMobileMoreOpen ? 'text-[#C27835] font-bold' : 'text-espresso-500'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span>Menu</span>
        </button>
      </div>

      {/* MOBILE MORE DRAWER (MATCHING media_1788637855357.png) */}
      {isMobileMoreOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end animate-fade-in"
          onClick={() => setIsMobileMoreOpen(false)}
        >
          <div 
            className="w-full bg-white rounded-t-3xl p-5 shadow-2xl space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Avatar, Name, Management subtitle, Close button */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EBE5DA]">
              <div className="flex items-center gap-3">
                <img
                  src={shop?.logo_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=100'}
                  alt={shop?.name || 'Shop'}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#EBE5DA]"
                />
                <div>
                  <h3 className="font-sans font-bold text-sm sm:text-base text-espresso-950">
                    {shop?.name || 'Aadya Couture & Kurtis'}
                  </h3>
                  <p className="text-[11px] text-espresso-500">
                    Shop Menu &amp; Management
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1.5 rounded-full text-espresso-400 hover:text-espresso-800 hover:bg-black/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2x2 Grid matching Image */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Offers */}
              <Link
                href="/owner/offers"
                onClick={(e) => {
                  setIsMobileMoreOpen(false);
                  handleNavClick(e, '/owner/offers');
                }}
                className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EBE5DA] hover:border-[#C27835] flex items-center gap-3 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="font-sans font-bold text-xs text-espresso-950 block truncate">Offers</span>
                  <span className="text-[10px] text-espresso-500 block truncate">Discounts &amp; Promos</span>
                </div>
              </Link>

              {/* Card 2: Subscription */}
              <Link
                href="/owner/subscription"
                onClick={(e) => {
                  setIsMobileMoreOpen(false);
                  handleNavClick(e, '/owner/subscription');
                }}
                className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EBE5DA] hover:border-[#C27835] flex items-center gap-3 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="font-sans font-bold text-xs text-espresso-950 block truncate">Subscription</span>
                  <span className="text-[10px] font-bold text-emerald-600 block truncate">
                    {subscriptionStatus?.daysRemaining ?? 14}d Left
                  </span>
                </div>
              </Link>

              {/* Card 3: Shop Profile */}
              <Link
                href="/owner/settings"
                onClick={(e) => {
                  setIsMobileMoreOpen(false);
                  handleNavClick(e, '/owner/settings');
                }}
                className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EBE5DA] hover:border-[#C27835] flex items-center gap-3 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/60 text-purple-600 flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="font-sans font-bold text-xs text-espresso-950 block truncate">Shop Profile</span>
                  <span className="text-[10px] text-espresso-500 block truncate">Contact &amp; Socials</span>
                </div>
              </Link>

              {/* Card 4: Storefront */}
              <Link
                href={`/store/${shop?.slug || shop?.id || ''}`}
                target="_blank"
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EBE5DA] hover:border-[#C27835] flex items-center gap-3 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="font-sans font-bold text-xs text-espresso-950 block truncate">Storefront</span>
                  <span className="text-[10px] text-espresso-500 block truncate">Customer View</span>
                </div>
              </Link>
            </div>

            {/* Quick Standee & Staff PIN Tools */}
            <div className="flex items-center gap-2">
              <Link
                href="/owner/standee"
                onClick={(e) => {
                  setIsMobileMoreOpen(false);
                  handleNavClick(e, '/owner/standee');
                }}
                className="flex-1 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#EBE5DA] hover:bg-[#F2ECE4] text-xs font-bold text-espresso-900 flex items-center justify-center gap-2 transition-colors"
              >
                <QrCode className="w-4 h-4 text-amber-600" />
                <span>QR Standee</span>
              </Link>

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
                className={`flex-1 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  isStaffMode 
                    ? 'bg-rose-100 text-rose-800 border-rose-300' 
                    : 'bg-[#FAF7F2] text-espresso-800 border-[#EBE5DA] hover:bg-[#F2ECE4]'
                }`}
              >
                {isStaffMode ? <Lock className="w-3.5 h-3.5 text-rose-600" /> : <Unlock className="w-3.5 h-3.5 text-espresso-600" />}
                <span>{isStaffMode ? 'Staff Locked' : 'Staff PIN'}</span>
              </button>
            </div>

            {/* Subscription Days Remaining Card (Matching Screenshot) */}
            <div className="rounded-2xl bg-[#FAF7F2] border border-[#EBE5DA] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-espresso-950">
                  {subscriptionStatus?.daysRemaining ?? 14} Days Remaining
                </span>
                <span className="text-espresso-500 font-medium">
                  ₹199 / month
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-[#E8E2D8] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(10, ((subscriptionStatus?.daysRemaining ?? 14) / 30) * 100))}%` }}
                />
              </div>

              <Link
                href="/owner/subscription"
                onClick={() => setIsMobileMoreOpen(false)}
                className="w-full py-2.5 px-4 rounded-full bg-[#14100F] hover:bg-black text-white text-xs font-bold text-center block transition-all shadow-xs"
              >
                Manage Subscription &amp; Recharge
              </Link>
            </div>

            {/* Red Sign Out Link (Matching Screenshot) */}
            <div className="pt-2 text-center">
              <button
                onClick={() => signOut()}
                className="inline-flex items-center justify-center gap-2 text-rose-600 hover:text-rose-700 text-xs font-bold hover:underline py-1"
              >
                <ExternalLink className="w-3.5 h-3.5 rotate-90" />
                <span>Sign Out of Shop Owner</span>
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
