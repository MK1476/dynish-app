import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { ShieldCheck, Store, Users, Receipt, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatINR } from '@/lib/utils';
import Link from 'next/link';

export default async function AdminPage() {
  const admin = createAdminClient();

  const [shopsRes, txRes, custRes] = await Promise.all([
    admin.from('shops').select('*').order('created_at', { ascending: false }),
    admin.from('transactions').select('*'),
    admin.from('customers').select('*'),
  ]);

  const shops = shopsRes.data || [];
  const transactions = txRes.data || [];
  const customers = custRes.data || [];

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const activeShops = shops.filter(s => new Date(s.expires_at) > now);
  const expiringShops = shops.filter(s => {
    const exp = new Date(s.expires_at);
    return exp > now && exp <= threeDaysFromNow;
  });
  const expiredShops = shops.filter(s => new Date(s.expires_at) <= now);

  const totalPlatformRevenue = transactions.reduce((sum, t) => sum + (Number(t.bill_amount) || 0), 0);

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-ivory-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-brand-500 text-espresso-950 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950">
              Dynish Admin Operations
            </h1>
          </div>
          <p className="text-espresso-500 text-xs sm:text-sm mt-0.5">
            Super-admin platform overview: shops, active subscriptions, transactions & retention.
          </p>
        </div>

        <Link
          href="/owner/dashboard"
          className="px-4 py-2 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-800 text-xs font-bold border border-ivory-300"
        >
          Vendor Portal &gt;
        </Link>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-5 rounded-3xl border border-ivory-200 shadow-soft">
          <span className="text-[11px] font-bold text-espresso-500 uppercase tracking-wider block mb-1">
            Active Stores
          </span>
          <div className="font-serif text-3xl font-bold text-espresso-950">
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
          <div className="font-serif text-3xl font-bold text-espresso-950">
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
          <div className="font-serif text-3xl font-bold text-espresso-950">
            {transactions.length}
          </div>
          <span className="text-[10px] text-brand-800 font-bold mt-1 block">
            Sub-5s counter speed
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-ivory-200 shadow-soft">
          <span className="text-[11px] font-bold text-espresso-500 uppercase tracking-wider block mb-1">
            Platform GMV
          </span>
          <div className="font-serif text-3xl font-bold text-espresso-950">
            {formatINR(totalPlatformRevenue)}
          </div>
          <span className="text-[10px] text-espresso-400 mt-1 block">
            Offline counter transaction volume
          </span>
        </div>
      </div>

      {/* SHOPS TABLE */}
      <div className="bg-white rounded-3xl border border-ivory-200 shadow-soft overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-ivory-100 flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-espresso-950">
            Registered Vendor Outlets ({shops.length})
          </h3>
          <span className="text-xs text-espresso-500">Live Supabase Database Records</span>
        </div>

        <div className="divide-y divide-ivory-100 overflow-x-auto">
          {shops.length === 0 ? (
            <div className="p-12 text-center text-xs text-espresso-400">
              No shops registered yet. Launch your first store via the Vendor Onboarding flow!
            </div>
          ) : (
            shops.map((s) => {
              const isExpired = new Date(s.expires_at) <= now;
              const isWarning = !isExpired && new Date(s.expires_at) <= threeDaysFromNow;

              return (
                <div key={s.id} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-ivory-50/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={s.logo_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=100'}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-brand-400 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-bold text-sm text-espresso-950 truncate">
                          {s.name}
                        </h4>
                        <span className="text-[10px] font-bold text-brand-800 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                          {s.category}
                        </span>
                      </div>
                      <div className="text-espresso-400 text-[11px] mt-0.5 truncate">
                        Owner: +91 {s.owner_phone} • {s.address}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isExpired 
                          ? 'bg-rose-100 text-rose-800' 
                          : isWarning 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isExpired ? 'Expired / Locked' : isWarning ? 'Expiring Soon' : 'Active Plan'}
                      </span>
                      <span className="block text-[10px] text-espresso-400 mt-0.5">
                        Expires: {new Date(s.expires_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <Link
                      href={`/store/${s.id}`}
                      target="_blank"
                      className="p-2 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-800"
                      title="View public storefront"
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
}
