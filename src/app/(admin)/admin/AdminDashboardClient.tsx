'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, Store, Users, Receipt, ExternalLink, 
  CalendarPlus, CheckCircle2, Search, LogOut, RefreshCw, AlertCircle, Eye 
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { adminSignOut, extendShopSubscription } from '@/actions/admin';
import type { Database } from '@/types/database';

type ShopRow = Database['public']['Tables']['shops']['Row'];
type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type CustomerRow = Database['public']['Tables']['customers']['Row'];

interface AdminDashboardClientProps {
  initialShops: ShopRow[];
  transactions: TransactionRow[];
  customers: CustomerRow[];
  viewsStats?: Record<string, { todayViews: number; totalViews: number }>;
}

export const AdminDashboardClient: React.FC<AdminDashboardClientProps> = ({
  initialShops,
  transactions,
  customers,
  viewsStats = {},
}) => {
  const router = useRouter();
  const [shops, setShops] = useState<ShopRow[]>(initialShops);
  const [searchQuery, setSearchQuery] = useState('');
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const activeShops = shops.filter((s) => new Date(s.expires_at) > now);
  const expiringShops = shops.filter((s) => {
    const exp = new Date(s.expires_at);
    return exp > now && exp <= threeDaysFromNow;
  });
  const totalPlatformRevenue = transactions.reduce(
    (sum, t) => sum + (Number(t.bill_amount) || 0),
    0
  );

  const totalViewsToday = Object.values(viewsStats).reduce(
    (acc, s) => acc + (s.todayViews || 0),
    0
  );
  const totalViewsAllTime = Object.values(viewsStats).reduce(
    (acc, s) => acc + (s.totalViews || 0),
    0
  );

  const handleSignOut = async () => {
    await adminSignOut();
    router.refresh();
  };

  const handleExtendOneDay = async (shop: ShopRow) => {
    setExtendingId(shop.id);
    setToastMessage(null);
    setErrorMessage(null);

    const res = await extendShopSubscription(shop.id, 1);
    setExtendingId(null);

    if (res.success && res.newExpiresAt) {
      setShops((prev) =>
        prev.map((s) => (s.id === shop.id ? { ...s, expires_at: res.newExpiresAt!, is_active: true } : s))
      );
      const formatted = new Date(res.newExpiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      setToastMessage(`✓ Successfully extended ${shop.name} by +1 Day! Valid until ${formatted}.`);
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      setErrorMessage(res.error || 'Failed to extend subscription.');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const filteredShops = shops.filter((s) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      s.name.toLowerCase().includes(query) ||
      s.category.toLowerCase().includes(query) ||
      (s.owner_phone && s.owner_phone.includes(query)) ||
      (s.address && s.address.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Toast notifications */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-espresso-950 text-white shadow-2xl border border-brand-500/40 text-xs font-bold flex items-center gap-2 animate-scale-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-rose-600 text-white shadow-2xl text-xs font-bold flex items-center gap-2 animate-scale-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-ivory-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-brand-500 text-espresso-950 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950">
              Dynish Admin Operations
            </h1>
          </div>
          <p className="text-espresso-500 text-xs sm:text-sm mt-0.5">
            Super-admin platform control: outlets, subscription extensions & platform GMV.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/owner/dashboard"
            className="px-4 py-2 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-800 text-xs font-bold border border-ivory-300 transition-colors"
          >
            Vendor Portal →
          </Link>
          <button
            onClick={handleSignOut}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock Admin</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-5 rounded-3xl border border-ivory-200 shadow-soft">
          <span className="text-[11px] font-bold text-espresso-500 uppercase tracking-wider block mb-1">
            Active Stores
          </span>
          <div className="font-sans text-3xl font-extrabold text-espresso-950">
            {activeShops.length} <span className="text-xs font-normal text-espresso-400">/ {shops.length}</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
            {expiringShops.length} expiring within 3 days
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-ivory-200 shadow-soft">
          <span className="text-[11px] font-bold text-espresso-500 uppercase tracking-wider block mb-1">
            Registered Patrons
          </span>
          <div className="font-sans text-3xl font-extrabold text-espresso-950">
            {customers.length}
          </div>
          <span className="text-[10px] text-espresso-400 mt-1 block">
            Across all local businesses
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-ivory-200 shadow-soft">
          <span className="text-[11px] font-bold text-espresso-500 uppercase tracking-wider block mb-1">
            Total Bills Logged
          </span>
          <div className="font-sans text-3xl font-extrabold text-espresso-950">
            {transactions.length}
          </div>
          <span className="text-[10px] text-brand-800 font-bold mt-1 block">
            Sub-5s counter speed
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-ivory-200 shadow-soft">
          <span className="text-[11px] font-bold text-espresso-500 uppercase tracking-wider block mb-1">
            Storefront Hits
          </span>
          <div className="font-sans text-3xl font-extrabold text-espresso-950">
            {totalViewsToday} <span className="text-xs font-normal text-espresso-400">today</span>
          </div>
          <span className="text-[10px] text-amber-700 font-bold mt-1 block">
            {totalViewsAllTime} total link views
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-ivory-200 shadow-soft col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold text-espresso-500 uppercase tracking-wider block mb-1">
            Platform GMV
          </span>
          <div className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950 truncate">
            {formatINR(totalPlatformRevenue)}
          </div>
          <span className="text-[10px] text-espresso-400 mt-1 block truncate">
            Offline counter GMV
          </span>
        </div>
      </div>

      {/* SHOPS TABLE WITH EXTEND 1 DAY */}
      <div className="bg-white rounded-3xl border border-ivory-200 shadow-soft overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-ivory-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-sans text-lg font-bold text-espresso-950">
              Registered Outlets &amp; Subscription Control ({shops.length})
            </h3>
            <span className="text-xs text-espresso-500">Live Supabase Database Records</span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-espresso-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search store name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-ivory-50 border border-ivory-200 text-xs font-medium text-espresso-950 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="divide-y divide-ivory-100 overflow-x-auto">
          {filteredShops.length === 0 ? (
            <div className="p-12 text-center text-xs text-espresso-400">
              No matching outlets found.
            </div>
          ) : (
            filteredShops.map((s) => {
              const isExpired = new Date(s.expires_at) <= now;
              const isWarning = !isExpired && new Date(s.expires_at) <= threeDaysFromNow;
              const isExtendingThis = extendingId === s.id;

              return (
                <div
                  key={s.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:bg-ivory-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={s.logo_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=100'}
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover ring-1 ring-brand-400 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-sans font-bold text-sm text-espresso-950 truncate">
                          {s.name}
                        </h4>
                        <span className="text-[10px] font-bold text-brand-800 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                          {s.category}
                        </span>
                      </div>
                      <div className="text-espresso-500 text-[11px] mt-0.5 truncate">
                        Owner: +91 {s.owner_phone} • {s.address}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                          <Eye className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{viewsStats[s.id]?.todayViews || 0} hits today</span>
                          <span className="text-amber-400">•</span>
                          <span>{viewsStats[s.id]?.totalViews || 0} total</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                    <div className="text-right">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                          isExpired
                            ? 'bg-rose-100 text-rose-800'
                            : isWarning
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isExpired ? 'Expired / Locked' : isWarning ? 'Expiring Soon' : 'Active Plan'}
                      </span>
                      <span className="block text-[11px] text-espresso-600 font-semibold mt-0.5">
                        Expires: {new Date(s.expires_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* EXTEND 1 DAY BUTTON */}
                    <button
                      onClick={() => handleExtendOneDay(s)}
                      disabled={isExtendingThis}
                      className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 font-sans font-extrabold text-[11px] flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                      title="Extend this shop's subscription by 1 extra day"
                    >
                      {isExtendingThis ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CalendarPlus className="w-3.5 h-3.5 text-amber-700" />
                      )}
                      <span>+1 Day</span>
                    </button>

                    <Link
                      href={`/store/${s.id}`}
                      target="_blank"
                      className="p-2 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-800 transition-colors"
                      title="View public customer storefront"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
