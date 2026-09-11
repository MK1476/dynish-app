'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Database } from '@/types/database';
import { 
  Users, Search, Award, Calendar, CreditCard, ShieldCheck, 
  X, Gift, MessageCircle, Check, Clock, Sparkles, ChevronRight, RefreshCw, ExternalLink 
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { 
  getCustomerVisitHistory, 
  getCustomerActiveOffers, 
  assignAndSendCustomerOffer,
  type CustomerVisitRecord,
  type CustomerActiveOffer
} from '@/actions/customers';

type ShopRow = Database['public']['Tables']['shops']['Row'];
type CustomerRow = Database['public']['Tables']['customers']['Row'];
type OfferRow = Database['public']['Tables']['offers']['Row'];

interface CustomersClientProps {
  shop: ShopRow;
  initialCustomers: CustomerRow[];
  initialOffers?: OfferRow[];
}

export const CustomersClient: React.FC<CustomersClientProps> = ({
  shop,
  initialCustomers,
  initialOffers = [],
}) => {
  const [search, setSearch] = useState('');

  // Selected customer for modal
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [visits, setVisits] = useState<CustomerVisitRecord[]>([]);
  const [activeOffers, setActiveOffers] = useState<CustomerActiveOffer[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  // Offer dispatch states
  const [chosenOfferTitle, setChosenOfferTitle] = useState<string>('');
  const [customOfferTitle, setCustomOfferTitle] = useState<string>('');
  const [isCustomOffer, setIsCustomOffer] = useState(false);
  const [dispatchingOffer, setDispatchingOffer] = useState(false);
  const [offerSuccessToast, setOfferSuccessToast] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return initialCustomers;
    const q = search.toLowerCase();
    return initialCustomers.filter(c =>
      c.phone_number.includes(q) ||
      (c.name && c.name.toLowerCase().includes(q))
    );
  }, [initialCustomers, search]);

  // Open customer detail popup
  const handleOpenCustomer = async (cust: CustomerRow) => {
    setSelectedCustomer(cust);
    setVisits([]);
    setActiveOffers([]);
    setLoadingVisits(true);
    setOfferSuccessToast(null);

    // Initialize chosen offer
    if (initialOffers.length > 0) {
      setChosenOfferTitle(initialOffers[0].title);
      setIsCustomOffer(false);
    } else {
      setIsCustomOffer(true);
      setCustomOfferTitle('10% OFF on next visit');
    }

    try {
      const [visitData, offerData] = await Promise.all([
        getCustomerVisitHistory(shop.id, cust.id),
        getCustomerActiveOffers(shop.id, cust.id),
      ]);
      setVisits(visitData);
      setActiveOffers(offerData);
    } catch (err) {
      console.error('Failed to load customer details:', err);
    } finally {
      setLoadingVisits(false);
    }
  };

  const handleCloseCustomerModal = () => {
    setSelectedCustomer(null);
    setVisits([]);
    setActiveOffers([]);
    setOfferSuccessToast(null);
  };

  // Handle Add & Send Offer via WhatsApp
  const handleAddAndSendOffer = async () => {
    if (!selectedCustomer) return;

    const offerTitleToSend = isCustomOffer ? customOfferTitle.trim() : chosenOfferTitle.trim();
    if (!offerTitleToSend) {
      alert('Please enter or select an offer title.');
      return;
    }

    setDispatchingOffer(true);
    const res = await assignAndSendCustomerOffer({
      shopId: shop.id,
      customerId: selectedCustomer.id,
      offerTitle: offerTitleToSend,
    });
    setDispatchingOffer(false);

    if (res.success && res.whatsappUrl) {
      // 1. Open WhatsApp link in a new tab
      window.open(res.whatsappUrl, '_blank');

      // 2. Add to active offers locally
      setActiveOffers((prev) => [
        {
          id: `new-${Date.now()}`,
          title: offerTitleToSend,
          discountType: 'percentage',
          discountValue: null,
          source: 'custom_assigned',
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);

      setOfferSuccessToast(`Offer "${offerTitleToSend}" added and WhatsApp opened!`);
      setTimeout(() => setOfferSuccessToast(null), 5000);
    } else {
      alert(res.error || 'Failed to dispatch offer.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950">
            Customer Retention Directory
          </h1>
          <p className="text-espresso-500 text-xs sm:text-sm mt-0.5">
            Click on any patron to view visit history, active offers, or dispatch custom WhatsApp rewards.
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
              <div
                key={cust.id}
                onClick={() => handleOpenCustomer(cust)}
                className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-amber-50/40 cursor-pointer transition-colors group"
                title="Click to view visit history and send offer"
              >
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
                      <h4 className="font-sans font-bold text-espresso-950 text-sm truncate group-hover:text-[#C27835] transition-colors">
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

                {/* Visit Count & LTV + Arrow */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
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
                  <ChevronRight className="w-4 h-4 text-espresso-300 group-hover:text-espresso-700 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Security Privacy Notice */}
      <div className="bg-brand-50/50 border border-brand-200 rounded-2xl p-3 text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-brand-900">
          <ShieldCheck className="w-4 h-4 text-brand-700 shrink-0" />
          <span className="font-semibold">Privacy Protected: Customer phone numbers are retained within the app for retention WhatsApp messaging. Raw CSV export is disabled.</span>
        </div>
      </div>

      {/* CUSTOMER DETAIL MODAL */}
      {selectedCustomer && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
          onClick={handleCloseCustomerModal}
        >
          <div 
            className="bg-[#FDFBF7] w-full max-w-xl rounded-3xl border border-ivory-300 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 bg-white border-b border-ivory-200 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-brand-500 text-espresso-950 flex items-center justify-center font-bold text-lg font-sans shrink-0 shadow-xs ring-2 ring-brand-300">
                  {selectedCustomer.name ? selectedCustomer.name[0].toUpperCase() : <Users className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-sans text-lg font-extrabold text-espresso-950 truncate">
                      {selectedCustomer.name || 'Valued Patron'}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      {selectedCustomer.visit_count} {selectedCustomer.visit_count === 1 ? 'Visit' : 'Visits'}
                    </span>
                  </div>
                  <div className="text-xs text-espresso-600 font-semibold mt-0.5">
                    📱 +91 {selectedCustomer.phone_number}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseCustomerModal}
                className="p-2 rounded-xl text-espresso-400 hover:text-espresso-800 hover:bg-ivory-100 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="p-5 space-y-5 overflow-y-auto">
              {/* Toast inside modal */}
              {offerSuccessToast && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-scale-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{offerSuccessToast}</span>
                </div>
              )}

              {/* Patron Metrics Snapshot */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white p-3 rounded-2xl border border-ivory-200 text-center">
                  <span className="text-[10px] font-bold text-espresso-400 uppercase tracking-wider block">Total Spent</span>
                  <span className="font-sans text-sm sm:text-base font-extrabold text-espresso-950 mt-0.5 block">
                    {formatINR(selectedCustomer.total_spent)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-ivory-200 text-center">
                  <span className="text-[10px] font-bold text-espresso-400 uppercase tracking-wider block">First Visit</span>
                  <span className="font-sans text-xs sm:text-sm font-bold text-espresso-950 mt-0.5 block">
                    {new Date(selectedCustomer.first_seen_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-ivory-200 text-center">
                  <span className="text-[10px] font-bold text-espresso-400 uppercase tracking-wider block">Last Visit</span>
                  <span className="font-sans text-xs sm:text-sm font-bold text-espresso-950 mt-0.5 block">
                    {new Date(selectedCustomer.last_visit_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>

              {/* SECTION 1: VISIT HISTORY TIMELINE */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-sans text-xs font-bold text-espresso-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-espresso-500" />
                    <span>Visit Breakdown &amp; Amounts</span>
                  </h4>
                  <span className="text-[11px] text-espresso-400 font-semibold">
                    {visits.length} {visits.length === 1 ? 'record' : 'records'}
                  </span>
                </div>

                {loadingVisits ? (
                  <div className="bg-white rounded-2xl border border-ivory-200 p-6 text-center text-xs text-espresso-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
                    <span>Loading visit history...</span>
                  </div>
                ) : visits.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-ivory-200 p-4 text-center text-xs text-espresso-400">
                    No individual visit receipts logged yet.
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-ivory-200 divide-y divide-ivory-100 overflow-hidden shadow-2xs">
                    {visits.map((v) => (
                      <div key={v.id} className="p-3 text-xs flex items-center justify-between gap-2 hover:bg-ivory-50/50">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-ivory-100 text-espresso-800 font-bold font-sans text-[11px] flex items-center justify-center shrink-0">
                            #{v.visitNumber}
                          </span>
                          <div>
                            <div className="font-bold text-espresso-950">
                              Visit #{v.visitNumber} — {new Date(v.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            {v.appliedOffer && (
                              <div className="text-[10px] text-emerald-700 font-semibold">
                                Applied: {v.appliedOffer}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-sans font-extrabold text-espresso-950 text-sm">
                            {formatINR(v.billAmount)}
                          </div>
                          {v.nextVisitOffer && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                              Earned: {v.nextVisitOffer}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: ACTIVE OFFERS CURRENTLY HELD */}
              <div>
                <h4 className="font-sans text-xs font-bold text-espresso-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-amber-600" />
                  <span>Current Active Offers</span>
                </h4>

                {activeOffers.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-ivory-200 p-3.5 text-xs text-espresso-500 text-center">
                    No active offers attached to this customer yet. Choose one below to send!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeOffers.map((off) => (
                      <div
                        key={off.id}
                        className="bg-white rounded-2xl border border-amber-200 p-3 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-sans font-bold text-xs text-espresso-950 block truncate">
                              {off.title}
                            </span>
                            <span className="text-[10px] text-espresso-400">
                              {off.source === 'loyalty_reward' ? 'Earned from last visit' : 'Assigned special promo'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                          Active ✓
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 3: CHOOSE & SEND OFFER VIA WHATSAPP */}
              <div className="bg-white rounded-2xl border-2 border-brand-300 p-4 space-y-3 shadow-soft">
                <div className="flex items-center justify-between">
                  <h4 className="font-sans text-xs font-bold text-espresso-950 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>Choose &amp; Send WhatsApp Offer</span>
                  </h4>
                  <span className="text-[10px] text-espresso-500 font-semibold">Instant wa.me link</span>
                </div>

                {/* Offer Selection radio options */}
                <div className="space-y-2">
                  {initialOffers.map((shopOffer) => (
                    <label
                      key={shopOffer.id}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                        !isCustomOffer && chosenOfferTitle === shopOffer.title
                          ? 'border-[#C27835] bg-amber-50 text-espresso-950 ring-1 ring-[#C27835]/30'
                          : 'border-ivory-200 bg-ivory-50/50 text-espresso-700 hover:bg-ivory-100/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name="offerPicker"
                        checked={!isCustomOffer && chosenOfferTitle === shopOffer.title}
                        onChange={() => {
                          setIsCustomOffer(false);
                          setChosenOfferTitle(shopOffer.title);
                        }}
                        className="accent-[#C27835] w-3.5 h-3.5"
                      />
                      <span className="flex-1 truncate">{shopOffer.title}</span>
                      {shopOffer.is_default && (
                        <span className="text-[9px] bg-brand-200 text-brand-900 px-1.5 py-0.2 rounded font-bold">
                          Default
                        </span>
                      )}
                    </label>
                  ))}

                  {/* Custom Offer Option */}
                  <label
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                      isCustomOffer
                        ? 'border-[#C27835] bg-amber-50 text-espresso-950 ring-1 ring-[#C27835]/30'
                        : 'border-ivory-200 bg-ivory-50/50 text-espresso-700 hover:bg-ivory-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="offerPicker"
                      checked={isCustomOffer}
                      onChange={() => setIsCustomOffer(true)}
                      className="accent-[#C27835] w-3.5 h-3.5"
                    />
                    <span>Custom Offer Text</span>
                  </label>

                  {isCustomOffer && (
                    <input
                      type="text"
                      placeholder="e.g. ₹50 OFF on bill above ₹300 or Flat 15% OFF"
                      value={customOfferTitle}
                      onChange={(e) => setCustomOfferTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border-2 border-brand-500 text-xs font-bold text-espresso-950 focus:outline-none placeholder:text-espresso-300 shadow-2xs"
                      autoFocus
                    />
                  )}
                </div>

                {/* Send Button */}
                <button
                  type="button"
                  onClick={handleAddAndSendOffer}
                  disabled={dispatchingOffer}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-sans font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {dispatchingOffer ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  <span>Add &amp; Send Offer on WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-ivory-50 border-t border-ivory-200 flex items-center justify-between text-xs text-espresso-500">
              <span>Customer ID: {selectedCustomer.id.slice(0, 8)}...</span>
              <button
                type="button"
                onClick={handleCloseCustomerModal}
                className="px-3 py-1.5 rounded-xl bg-white border border-ivory-300 text-espresso-700 font-bold hover:bg-ivory-100 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
