'use client';

import React, { useState, useMemo } from 'react';
import type { Database } from '@/types/database';
import { 
  TrendingUp, Users, Receipt, Repeat, Calendar, 
  ExternalLink, Zap, ArrowRight, MessageCircle, ChevronDown 
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

export type DateFilterType = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_30_days' | 'custom' | 'all';

export const DashboardClient: React.FC<DashboardProps> = ({
  shop,
  transactions,
  customers,
}) => {
  const [dateFilter, setDateFilter] = useState<DateFilterType>('this_week');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Filter transactions by selected date range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    // Start of this week (Monday)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of this month (1st)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).getTime();

    return transactions.filter((tx) => {
      const txTime = new Date(tx.created_at).getTime();
      if (dateFilter === 'today') return txTime >= startOfToday;
      if (dateFilter === 'yesterday') return txTime >= startOfYesterday && txTime < startOfToday;
      if (dateFilter === 'this_week') return txTime >= startOfWeek.getTime();
      if (dateFilter === 'this_month') return txTime >= startOfMonth;
      if (dateFilter === 'last_30_days') return txTime >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
      if (dateFilter === 'custom') {
        const startTime = new Date(customStart).setHours(0, 0, 0, 0);
        const endTime = new Date(customEnd).setHours(23, 59, 59, 999);
        return txTime >= startTime && txTime <= endTime;
      }
      return true;
    });
  }, [transactions, dateFilter, customStart, customEnd]);

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

        {/* Dropdown Date Filter & Custom Range Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative inline-flex items-center">
            <Calendar className="w-3.5 h-3.5 text-brand-700 absolute left-3 pointer-events-none" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
              className="pl-8 pr-8 py-2 rounded-2xl bg-white border-2 border-ivory-300 hover:border-brand-400 text-xs font-bold text-espresso-950 focus:outline-none focus:border-brand-500 shadow-xs appearance-none cursor-pointer transition-colors"
            >
              <option value="today">📅 Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">📊 This Week (Mon - Today)</option>
              <option value="this_month">📈 This Month (1st - Today)</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="custom">🎯 Custom Date Range...</option>
              <option value="all">🌐 All Time</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-espresso-400 absolute right-3 pointer-events-none" />
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5 animate-slide-up bg-white p-1.5 rounded-2xl border-2 border-brand-300 shadow-xs text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 rounded-xl bg-ivory-50 border border-ivory-200 text-xs text-espresso-900 font-semibold focus:outline-none"
              />
              <span className="text-espresso-400 font-bold text-[10px] uppercase">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 rounded-xl bg-ivory-50 border border-ivory-200 text-xs text-espresso-900 font-semibold focus:outline-none"
              />
            </div>
          )}
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
