'use client';

import React, { useState, useMemo } from 'react';
import type { Database } from '@/types/database';
import { Users, Search, Award, Calendar, CreditCard, ShieldCheck, X } from 'lucide-react';
import { formatINR } from '@/lib/utils';

type ShopRow = Database['public']['Tables']['shops']['Row'];
type CustomerRow = Database['public']['Tables']['customers']['Row'];

interface CustomersClientProps {
  shop: ShopRow;
  initialCustomers: CustomerRow[];
}

export const CustomersClient: React.FC<CustomersClientProps> = ({
  shop,
  initialCustomers,
}) => {
  const [search, setSearch] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return initialCustomers;
    const q = search.toLowerCase();
    return initialCustomers.filter(c =>
      c.phone_number.includes(q) ||
      (c.name && c.name.toLowerCase().includes(q))
    );
  }, [initialCustomers, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950">
            Customer Retention Directory
          </h1>
          <p className="text-espresso-500 text-xs sm:text-sm mt-0.5">
            View loyalty visit history and repeat patron metrics.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search mobile or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white border border-ivory-300 text-xs sm:text-sm font-medium text-espresso-950 placeholder:text-espresso-400 focus:outline-none focus:border-[#C27835] focus:ring-2 focus:ring-[#C27835]/15 shadow-2xs transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-espresso-400 hover:text-espresso-800 hover:bg-black/5 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Customer Cards List */}
      <div className="bg-white rounded-3xl border border-ivory-200 shadow-soft divide-y divide-ivory-100 overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-xs text-espresso-400">
            No customers found matching your search.
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const isVip = cust.visit_count >= 5;
            const isRegular = cust.visit_count >= 2;

            return (
              <div key={cust.id} className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-ivory-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold font-sans text-sm shrink-0 shadow-xs ${
                    isVip 
                      ? 'bg-amber-400 text-espresso-950 font-black ring-2 ring-amber-300' 
                      : isRegular 
                      ? 'bg-brand-500 text-espresso-950' 
                      : 'bg-ivory-200 text-espresso-700'
                  }`}>
                    {cust.name ? cust.name[0] : <Users className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-sans font-bold text-espresso-950 text-sm truncate">
                        {cust.name || 'Valued Guest'}
                      </h4>
                      <span className="font-sans font-semibold text-xs text-espresso-500">
                        +91 {cust.phone_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-espresso-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-espresso-400" />
                        <span>Last Visit: {new Date(cust.last_visit_at).toLocaleDateString('en-IN')}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-espresso-400" />
                        <span>Last: {formatINR(cust.last_bill_amount)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visit Count & LTV */}
                <div className="text-right shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-xs ${
                    isVip 
                      ? 'bg-amber-400 text-espresso-950 ring-1 ring-amber-300' 
                      : isRegular 
                      ? 'bg-brand-100 text-brand-900 border border-brand-200' 
                      : 'bg-ivory-100 text-espresso-700'
                  }`}>
                    <Award className="w-3 h-3" />
                    <span>{cust.visit_count} {cust.visit_count === 1 ? 'Visit' : 'Visits'}</span>
                  </span>
                  <div className="font-sans font-bold text-xs sm:text-sm text-espresso-950 mt-1">
                    LTV: {formatINR(cust.total_spent)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Security Privacy Notice (Positioned beneath customer list) */}
      <div className="bg-brand-50/50 border border-brand-200 rounded-2xl p-3 text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-brand-900">
          <ShieldCheck className="w-4 h-4 text-brand-700 shrink-0" />
          <span className="font-semibold">Privacy Protected: Customer phone numbers are retained within the app for retention WhatsApp messaging. Raw CSV export is disabled.</span>
        </div>
      </div>

    </div>
  );
};
