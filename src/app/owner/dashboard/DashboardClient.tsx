'use client';

import React, { useState, useMemo } from 'react';
import type { Database } from '@/types/database';
import { 
  TrendingUp, Users, Receipt, Repeat, Calendar, 
  ExternalLink, Zap, ArrowRight, MessageCircle, ChevronDown, QrCode,
  BarChart3, Clock, Flame, Sparkles, ArrowUpRight
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
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
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
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff)).setHours(0, 0, 0, 0);

    // Start of this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return transactions.filter((tx) => {
      const txTime = new Date(tx.created_at).getTime();
      if (dateFilter === 'today') return txTime >= startOfToday;
      if (dateFilter === 'yesterday') return txTime >= startOfYesterday && txTime < startOfToday;
      if (dateFilter === 'this_week') return txTime >= startOfWeek;
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

  // Chart Metric Toggle: 'visits' (footfall) vs 'revenue' (rupees)
  const [chartMetric, setChartMetric] = useState<'visits' | 'revenue'>('visits');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group transactions into visual chart buckets depending on the selected date filter
  const chartData = useMemo(() => {
    if (dateFilter === 'today' || dateFilter === 'yesterday') {
      const timeSlots = [
        { id: 't08', label: '8 AM', rangeText: '8:00 AM - 10:00 AM', startHour: 8, endHour: 10 },
        { id: 't10', label: '10 AM', rangeText: '10:00 AM - 12:00 PM', startHour: 10, endHour: 12 },
        { id: 't12', label: '12 PM', rangeText: '12:00 PM - 2:00 PM', startHour: 12, endHour: 14 },
        { id: 't14', label: '2 PM', rangeText: '2:00 PM - 4:00 PM', startHour: 14, endHour: 16 },
        { id: 't16', label: '4 PM', rangeText: '4:00 PM - 6:00 PM', startHour: 16, endHour: 18 },
        { id: 't18', label: '6 PM', rangeText: '6:00 PM - 8:00 PM', startHour: 18, endHour: 20 },
        { id: 't20', label: '8 PM', rangeText: '8:00 PM - 10:00 PM', startHour: 20, endHour: 22 },
        { id: 't22', label: '10 PM', rangeText: '10:00 PM - 12:00 AM', startHour: 22, endHour: 24 },
      ];
      return timeSlots.map((slot) => {
        const slotTxs = filteredTransactions.filter((tx) => {
          const h = new Date(tx.created_at).getHours();
          return h >= slot.startHour && h < slot.endHour;
        });
        return {
          id: slot.id,
          label: slot.label,
          fullTitle: slot.rangeText,
          visits: slotTxs.length,
          revenue: slotTxs.reduce((sum, t) => sum + (Number(t.bill_amount) || 0), 0),
        };
      });
    }

    if (dateFilter === 'this_week') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const now = new Date();
      const currentDay = now.getDay(); // 0 is Sun, 1 is Mon
      const monOffset = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + monOffset);
      monday.setHours(0, 0, 0, 0);

      return days.map((dayName, idx) => {
        const targetDate = new Date(monday);
        targetDate.setDate(monday.getDate() + idx);
        const start = targetDate.getTime();
        const end = start + 24 * 60 * 60 * 1000;

        const dayTxs = filteredTransactions.filter((tx) => {
          const t = new Date(tx.created_at).getTime();
          return t >= start && t < end;
        });

        return {
          id: `w-${dayName}`,
          label: dayName,
          fullTitle: `${dayName}, ${targetDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
          visits: dayTxs.length,
          revenue: dayTxs.reduce((sum, t) => sum + (Number(t.bill_amount) || 0), 0),
        };
      });
    }

    if (dateFilter === 'this_month' || dateFilter === 'last_30_days') {
      const intervals = [
        { label: 'Day 1-5', range: [1, 5] },
        { label: 'Day 6-10', range: [6, 10] },
        { label: 'Day 11-15', range: [11, 15] },
        { label: 'Day 16-20', range: [16, 20] },
        { label: 'Day 21-25', range: [21, 25] },
        { label: 'Day 26-31', range: [26, 31] },
      ];
      return intervals.map((intv) => {
        const intvTxs = filteredTransactions.filter((tx) => {
          const d = new Date(tx.created_at).getDate();
          return d >= intv.range[0] && d <= intv.range[1];
        });
        return {
          id: `m-${intv.label}`,
          label: intv.label,
          fullTitle: `Days ${intv.range[0]} - ${intv.range[1]} of month`,
          visits: intvTxs.length,
          revenue: intvTxs.reduce((sum, t) => sum + (Number(t.bill_amount) || 0), 0),
        };
      });
    }

    // Default for 'all' or 'custom'
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const map = new Map<string, { visits: number; revenue: number; title: string }>();
    filteredTransactions.forEach((tx) => {
      const d = new Date(tx.created_at);
      const key = `${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(-2)}`;
      const cur = map.get(key) || { visits: 0, revenue: 0, title: `${monthNames[d.getMonth()]} ${d.getFullYear()}` };
      cur.visits += 1;
      cur.revenue += Number(tx.bill_amount) || 0;
      map.set(key, cur);
    });

    if (map.size === 0) {
      return [{ id: 'all-0', label: 'All Time', fullTitle: 'All Transactions', visits: 0, revenue: 0 }];
    }

    return Array.from(map.entries()).map(([k, v]) => ({
      id: k,
      label: k,
      fullTitle: v.title,
      visits: v.visits,
      revenue: v.revenue,
    }));
  }, [filteredTransactions, dateFilter]);

  const maxVal = useMemo(() => {
    const vals = chartData.map((b) => (chartMetric === 'visits' ? b.visits : b.revenue));
    const m = Math.max(...vals, 0);
    return m === 0 ? 1 : m;
  }, [chartData, chartMetric]);

  const peakBucket = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    const sorted = [...chartData].sort((a, b) =>
      chartMetric === 'visits' ? b.visits - a.visits : b.revenue - a.revenue
    );
    return sorted[0]?.visits > 0 || sorted[0]?.revenue > 0 ? sorted[0] : null;
  }, [chartData, chartMetric]);

  return (
    <div className="space-y-6">
      {/* Header & Date Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div className="min-w-0">
          <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950 truncate tracking-tight">
            {shop.name} Analytics
          </h1>
          <p className="text-espresso-500 text-xs sm:text-sm mt-0.5">
            Monitor real-time sales metrics and customer retention performance.
          </p>
        </div>

        {/* Dropdown Date Filter & Custom Range Picker cleanly aligned to right */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start md:justify-end gap-2.5 shrink-0 self-start md:self-auto">
          <div className="relative inline-flex items-center min-w-[190px]">
            <Calendar className="w-4 h-4 text-brand-700 absolute left-3.5 pointer-events-none" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
              className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white border-2 border-ivory-300 hover:border-brand-400 text-xs font-bold text-espresso-950 focus:outline-none focus:border-brand-500 shadow-2xs appearance-none cursor-pointer transition-colors"
            >
              <option value="today">📅 Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">📊 This Week (Mon - Today)</option>
              <option value="this_month">📈 This Month (1st - Today)</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="custom">🎯 Custom Date Range...</option>
              <option value="all">🌐 All Time</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-espresso-400 absolute right-3.5 pointer-events-none" />
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

      {/* QUICK ACTIONS BANNER: Counter Standee & Fast Billing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/owner/standee"
          className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-brand-500/10 to-amber-50 border border-amber-300/80 flex items-center justify-between hover:border-amber-400 transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-espresso-950 flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-espresso-950 block">Print Counter QR Standee</span>
              <span className="text-[10px] text-espresso-500">A4 / A5 acrylic stand for desk & counter</span>
            </div>
          </div>
          <span className="text-xs font-bold text-brand-800 group-hover:translate-x-0.5 transition-transform">&gt;</span>
        </Link>

        <Link
          href="/owner/billing"
          className="p-3.5 rounded-2xl bg-white border border-ivory-300 flex items-center justify-between hover:border-brand-300 transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="text-xs font-bold text-espresso-950 block">High-Speed Counter Billing</span>
              <span className="text-[10px] text-espresso-500">Record bill & print 58mm slip in &lt;5s</span>
            </div>
          </div>
          <span className="text-xs font-bold text-espresso-600 group-hover:translate-x-0.5 transition-transform">&gt;</span>
        </Link>
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
          <div className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950 tracking-tight">
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
          <div className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950 tracking-tight">
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
          <div className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950 tracking-tight">
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
          <div className="font-sans text-2xl sm:text-3xl font-extrabold text-brand-800 tracking-tight">
            {repeatRate}%
          </div>
          <span className="text-[10px] text-espresso-400 mt-1">{repeatCustomersCount} returning guests</span>
        </div>
      </div>

      {/* INTERACTIVE VISUAL ANALYTICS GRAPH: Customer Visit Timings & Revenue */}
      <div className="bg-white rounded-3xl border border-ivory-200 p-5 sm:p-6 shadow-soft space-y-5">
        {/* Top bar with Title, Subtitle, and Metric Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ivory-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-50 text-[#C27835]">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h3 className="font-sans text-lg sm:text-xl font-extrabold text-espresso-950 tracking-tight">
                {dateFilter === 'today'
                  ? 'Today’s Customer Footfall & Peak Hours'
                  : dateFilter === 'yesterday'
                  ? 'Yesterday’s Customer Footfall Timings'
                  : dateFilter === 'this_week'
                  ? 'This Week’s Daily Customer Flow'
                  : 'Customer Visit Flow & Revenue Trend'}
              </h3>
            </div>
            <p className="text-xs text-espresso-500 mt-1">
              {dateFilter === 'today' || dateFilter === 'yesterday'
                ? 'Hourly distribution of counter transactions across operating hours.'
                : dateFilter === 'this_week'
                ? 'Daily breakdown of customer counts and revenue across 7 days.'
                : 'Customer footfall and spending progression across the selected timeframe.'}
            </p>
          </div>

          {/* Metric Selector Toggle */}
          <div className="inline-flex items-center bg-ivory-100 p-1 rounded-2xl border border-ivory-300 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setChartMetric('visits')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                chartMetric === 'visits'
                  ? 'bg-espresso-950 text-white shadow-xs'
                  : 'text-espresso-700 hover:text-espresso-950'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Visits (Footfall)</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('revenue')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                chartMetric === 'revenue'
                  ? 'bg-[#C27835] text-white shadow-xs'
                  : 'text-espresso-700 hover:text-espresso-950'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Revenue (₹)</span>
            </button>
          </div>
        </div>

        {/* Peak Timing Badge / Callout */}
        {peakBucket && (
          <div className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-300/60 text-xs">
            <div className="flex items-center gap-2 text-espresso-900 font-semibold">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-espresso-950 flex items-center justify-center font-bold text-xs shrink-0">
                <Flame className="w-3.5 h-3.5 fill-current" />
              </span>
              <span>
                <strong>Peak Window:</strong> {peakBucket.fullTitle} with{' '}
                <span className="text-[#C27835] font-bold">
                  {peakBucket.visits} {peakBucket.visits === 1 ? 'customer visit' : 'customer visits'}
                </span>{' '}
                ({formatINR(peakBucket.revenue)})
              </span>
            </div>
            <span className="text-[11px] font-bold text-espresso-500 uppercase tracking-wider">
              {chartMetric === 'visits' ? 'Highest Traffic' : 'Top Sales Slot'}
            </span>
          </div>
        )}

        {/* Responsive Interactive SVG Bar Chart */}
        <div className="relative pt-2 pb-1">
          {filteredTransactions.length === 0 ? (
            <div className="py-14 text-center border-2 border-dashed border-ivory-200 rounded-2xl">
              <Clock className="w-8 h-8 text-espresso-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-espresso-800">No transactions recorded in this period</p>
              <p className="text-xs text-espresso-400 mt-0.5">
                Record your next sale in the Billing Counter to see real-time footfall timings!
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto no-scrollbar">
              <div className="min-w-[500px]">
                <svg
                  viewBox="0 0 640 210"
                  className="w-full h-48 sm:h-56 select-none overflow-visible"
                >
                  <defs>
                    <linearGradient id="barGradVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C27835" />
                      <stop offset="100%" stopColor="#E2924A" />
                    </linearGradient>
                    <linearGradient id="barGradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                    <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#18181B" />
                      <stop offset="100%" stopColor="#27272A" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0.25, 0.5, 0.75, 1.0].map((level, i) => {
                    const y = 160 - level * 125;
                    const val = Math.round(maxVal * level);
                    const formattedVal = chartMetric === 'revenue' ? `₹${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}` : val;
                    return (
                      <g key={i}>
                        <line
                          x1="45"
                          y1={y}
                          x2="630"
                          y2={y}
                          stroke="#EBE5DA"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text
                          x="38"
                          y={y + 3}
                          textAnchor="end"
                          className="text-[9px] fill-espresso-400 font-sans font-medium"
                        >
                          {formattedVal}
                        </text>
                      </g>
                    );
                  })}

                  {/* Baseline Axis */}
                  <line x1="45" y1="160" x2="630" y2="160" stroke="#DDD0C3" strokeWidth="1.5" />

                  {/* Bars & Labels */}
                  {(() => {
                    const N = chartData.length;
                    const plotW = 580;
                    const slotW = plotW / N;
                    const barW = Math.min(slotW * 0.55, 34);

                    return chartData.map((bucket, idx) => {
                      const val = chartMetric === 'visits' ? bucket.visits : bucket.revenue;
                      const ratio = maxVal > 0 ? val / maxVal : 0;
                      const barH = val > 0 ? Math.max(ratio * 125, 6) : 2;
                      const barX = 45 + idx * slotW + (slotW - barW) / 2;
                      const barY = 160 - barH;
                      const isHovered = hoveredIndex === idx;
                      const isPeak = peakBucket?.id === bucket.id && val > 0;

                      return (
                        <g
                          key={bucket.id}
                          className="cursor-pointer transition-all duration-200"
                          onMouseEnter={() => setHoveredIndex(idx)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          onClick={() => setHoveredIndex(hoveredIndex === idx ? null : idx)}
                        >
                          {/* Invisible hover hit-box */}
                          <rect
                            x={45 + idx * slotW}
                            y="15"
                            width={slotW}
                            height="155"
                            fill="transparent"
                          />

                          {/* Hover Column Highlight */}
                          {isHovered && (
                            <rect
                              x={45 + idx * slotW + 2}
                              y="20"
                              width={slotW - 4}
                              height="140"
                              rx="8"
                              fill="#FAF7F2"
                              opacity="0.8"
                            />
                          )}

                          {/* Bar Rect */}
                          <rect
                            x={barX}
                            y={barY}
                            width={barW}
                            height={barH}
                            rx={barW / 3}
                            fill={
                              isHovered
                                ? 'url(#barGradHover)'
                                : chartMetric === 'visits'
                                ? 'url(#barGradVisits)'
                                : 'url(#barGradRevenue)'
                            }
                            filter={isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : ''}
                            className="transition-all duration-300"
                          />

                          {/* Value above bar */}
                          {val > 0 && (
                            <text
                              x={barX + barW / 2}
                              y={barY - 6}
                              textAnchor="middle"
                              className={`text-[10px] font-sans font-bold transition-all ${
                                isHovered ? 'fill-espresso-950 font-black scale-110' : 'fill-espresso-700'
                              }`}
                            >
                              {chartMetric === 'revenue'
                                ? `₹${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`
                                : val}
                            </text>
                          )}

                          {/* Axis label at bottom */}
                          <text
                            x={barX + barW / 2}
                            y="180"
                            textAnchor="middle"
                            className={`text-[10px] font-sans transition-colors ${
                              isHovered
                                ? 'fill-espresso-950 font-bold'
                                : isPeak
                                ? 'fill-[#C27835] font-bold'
                                : 'fill-espresso-500 font-medium'
                            }`}
                          >
                            {bucket.label}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              </div>
            </div>
          )}

          {/* Active Hover / Tap Tooltip Details Box */}
          {hoveredIndex !== null && chartData[hoveredIndex] && (
            <div className="mt-2 p-3 rounded-2xl bg-espresso-950 text-white shadow-xl flex items-center justify-between flex-wrap gap-2 animate-fade-in text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#C27835]" />
                <span className="font-bold">{chartData[hoveredIndex].fullTitle}</span>
              </div>
              <div className="flex items-center gap-4 text-espresso-200">
                <span>
                  Footfall:{' '}
                  <strong className="text-white font-sans font-bold">{chartData[hoveredIndex].visits}</strong>
                </span>
                <span>•</span>
                <span>
                  Sales:{' '}
                  <strong className="text-amber-400 font-sans font-bold">
                    {formatINR(chartData[hoveredIndex].revenue)}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Avg Ticket:{' '}
                  <strong className="text-emerald-400 font-sans font-bold">
                    {formatINR(
                      chartData[hoveredIndex].visits > 0
                        ? Math.round(chartData[hoveredIndex].revenue / chartData[hoveredIndex].visits)
                        : 0
                    )}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 3-Column Micro-Insights Summary Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-ivory-100 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-ivory-50 border border-ivory-200">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#C27835] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-espresso-500 font-semibold block uppercase">
                Busiest Window
              </span>
              <span className="font-sans font-bold text-espresso-950">
                {peakBucket ? peakBucket.label : 'N/A'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-ivory-50 border border-ivory-200">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-espresso-500 font-semibold block uppercase">
                Avg Spend / Bill
              </span>
              <span className="font-sans font-bold text-espresso-950">
                {formatINR(totalBills > 0 ? Math.round(totalRevenue / totalBills) : 0)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-ivory-50 border border-ivory-200">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-espresso-500 font-semibold block uppercase">
                Repeat Patron Ratio
              </span>
              <span className="font-sans font-bold text-espresso-950">
                {repeatRate}% ({repeatCustomersCount} returning)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS LOG */}
      <div className="bg-white rounded-3xl border border-ivory-200 p-5 shadow-soft space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-ivory-100">
          <h3 className="font-sans text-lg font-extrabold text-espresso-950">
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
                    <div className="w-9 h-9 rounded-xl bg-ivory-100 text-brand-800 flex items-center justify-center font-bold font-sans text-sm shrink-0">
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
                    <span className="font-sans font-bold text-sm text-espresso-950 block">
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
