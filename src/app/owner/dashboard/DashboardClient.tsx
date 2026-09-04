'use client';

import React, { useState, useMemo } from 'react';
import type { Database } from '@/types/database';
import { 
  TrendingUp, Users, Receipt, Repeat, Calendar, 
  ExternalLink, Zap, ArrowRight, MessageCircle 
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import Link from 'next/link';

type ShopRow = Database['public']['Tables']['shops']['Row'];
type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type CustomerRow = Database['public']['Tables']['customers']['Row'];

interface DashboardProps {
  shop: ShopRow;
  transactions: TransactionRow[];
  customers: CustomerRow[];
}

export const DashboardClient: React.FC<DashboardProps> = ({
  shop,
  transactions,
  customers,
}) => {
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('week');

  // Filter transactions by selected date range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    return transactions.filter((tx) => {
      const txTime = new Date(tx.created_at).getTime();
      if (dateFilter === 'today') return txTime >= startOfToday;
      if (dateFilter === 'yesterday') return txTime >= startOfYesterday && txTime < startOfToday;
      if (dateFilter === 'week') return txTime >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
      if (dateFilter === 'month') return txTime >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return true;
    });
  }, [transactions, dateFilter]);

  // Aggregate metrics
  const totalRevenue = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => sum + (Number(tx.bill_amount) || 0), 0);
  }, [filteredTransactions]);

  const totalBills = filteredTransactions.length;

  const repeatCustomersCount = useMemo(() => {
    return customers.filter(c => c.visit_count > 1).length;
  }, [customers]);

  const repeatRate = customers.length > 0 
    ? Math.round((repeatCustomersCount / customers.length) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header & Date Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950">
            {shop.name} Analytics
          </h1>
          <p className="text-espresso-500 text-xs sm:text-sm mt-0.5">
            Monitor real-time sales metrics and customer retention performance.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-ivory-200 overflow-x-auto shadow-xs text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
                dateFilter === f.id
                  ? 'bg-espresso-950 text-white shadow-xs font-bold'
                  : 'text-espresso-600 hover:text-espresso-950 hover:bg-ivory-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* METRIC CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-ivory-200 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-espresso-500 uppercase tracking-wider">Revenue</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950">
            {formatINR(totalRevenue)}
          </div>
          <span className="text-[10px] text-espresso-400 mt-1">In selected timeframe</span>
        </div>

        {/* Bills Logged */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-ivory-200 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-espresso-500 uppercase tracking-wider">Bills Made</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950">
            {totalBills}
          </div>
          <span className="text-[10px] text-espresso-400 mt-1">Logged at counter</span>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-ivory-200 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-espresso-500 uppercase tracking-wider">Clients</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950">
            {customers.length}
          </div>
          <span className="text-[10px] text-espresso-400 mt-1">Registered patrons</span>
        </div>

        {/* Repeat Rate */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-ivory-200 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-espresso-500 uppercase tracking-wider">Repeat Rate</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-brand-800">
            {repeatRate}%
          </div>
          <span className="text-[10px] text-espresso-400 mt-1">{repeatCustomersCount} returning guests</span>
        </div>
      </div>

      {/* QUICK BILLING HERO BANNER */}
      <div className="bg-gradient-to-r from-espresso-950 via-espresso-900 to-espresso-950 text-white p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2 py-0.5 rounded bg-brand-500 text-espresso-950 text-[10px] font-bold uppercase tracking-wider mb-1 inline-block">
            Counter Ready
          </span>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
            Ready to log customer bills in &lt;5 seconds?
          </h3>
          <p className="text-xs text-espresso-300 mt-0.5">
            Auto-suggests repeat clients, assigns next-visit gifts, and launches WhatsApp.
          </p>
        </div>

        <Link
          href="/owner/billing"
          className="px-5 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-espresso-950 font-serif font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 shrink-0"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>Open Billing Counter</span>
        </Link>
      </div>

      {/* RECENT TRANSACTIONS LOG */}
      <div className="bg-white rounded-3xl border border-ivory-200 p-5 shadow-soft space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-ivory-100">
          <h3 className="font-serif text-lg font-bold text-espresso-950">
            Recent Counter Transactions
          </h3>
          <span className="text-xs text-espresso-500">
            Showing {filteredTransactions.length} records
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-xs text-espresso-400">
            No bills logged in this date range. Record your first sale via the Billing Counter!
          </div>
        ) : (
          <div className="divide-y divide-ivory-100">
            {filteredTransactions.slice(0, 10).map((tx) => {
              const customer = customers.find(c => c.id === tx.customer_id);

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-ivory-100 text-brand-800 flex items-center justify-center font-bold font-serif text-sm shrink-0">
                      {customer?.name ? customer.name[0] : 'G'}
                    </div>
                    <div>
                      <div className="font-bold text-espresso-950 text-sm">
                        {customer?.name || 'Guest'} (+91 {customer?.phone_number})
                      </div>
                      <div className="text-espresso-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                        <span>Visit #{tx.visit_number}</span>
                        <span>•</span>
                        <span>{new Date(tx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        {tx.next_visit_offer && (
                          <>
                            <span>•</span>
                            <span className="text-brand-800 font-semibold">{tx.next_visit_offer}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-serif font-bold text-sm text-espresso-950 block">
                      {formatINR(tx.bill_amount)}
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                      WhatsApp Sent
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
