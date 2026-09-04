'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Database } from '@/types/database';
import { searchCustomers, getCustomerByPhone, recordBill } from '@/actions/billing';
import confetti from 'canvas-confetti';
import { 
  Phone, User, Calendar, CreditCard, Gift, Check, ArrowRight, 
  MessageCircle, Copy, CheckCircle2, Zap, X, Award, Sparkles 
} from 'lucide-react';
import { formatINR } from '@/lib/utils';

type ShopRow = Database['public']['Tables']['shops']['Row'];
type OfferRow = Database['public']['Tables']['offers']['Row'];
type CustomerRow = Database['public']['Tables']['customers']['Row'];

interface BillingFormProps {
  shop: ShopRow;
  initialOffers: OfferRow[];
}

export const BillingFormClient: React.FC<BillingFormProps> = ({ shop, initialOffers }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<string>(
    initialOffers.find(o => o.is_default)?.title || 'Flat 10% OFF on Next Visit'
  );

  const [matchedCustomer, setMatchedCustomer] = useState<(CustomerRow & { lastOfferAwarded?: string | null }) | null>(null);
  const [suggestions, setSuggestions] = useState<CustomerRow[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [appliedOfferText, setAppliedOfferText] = useState<string>('');
  const [isOfferDismissed, setIsOfferDismissed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Success / WhatsApp Modal
  const [completedDetails, setCompletedDetails] = useState<{
    phone: string;
    name: string;
    amount: number | null;
    nextOffer: string;
    visitNumber: number;
    rawText: string;
    waUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    phoneInputRef.current?.focus();
  }, []);

  const handlePhoneChange = async (val: string) => {
    const numeric = val.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(numeric);
    setIsOfferDismissed(false);

    if (numeric.length >= 2) {
      const matches = await searchCustomers(shop.id, numeric);
      setSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }

    if (numeric.length === 10) {
      const existing = await getCustomerByPhone(shop.id, numeric);
      if (existing) {
        setMatchedCustomer(existing);
        setCustomerName(existing.name || '');
        if (existing.lastOfferAwarded) {
          setAppliedOfferText(existing.lastOfferAwarded);
        }
      } else {
        setMatchedCustomer(null);
        setAppliedOfferText('');
      }
      setShowSuggestions(false);
    } else {
      setMatchedCustomer(null);
      setAppliedOfferText('');
    }
  };

  const handleSelectSuggestion = async (cust: CustomerRow) => {
    setPhoneNumber(cust.phone_number);
    setCustomerName(cust.name || '');
    setShowSuggestions(false);
    amountInputRef.current?.focus();

    const existing = await getCustomerByPhone(shop.id, cust.phone_number);
    if (existing) {
      setMatchedCustomer(existing);
      if (existing.lastOfferAwarded) {
        setAppliedOfferText(existing.lastOfferAwarded);
      }
    } else {
      setMatchedCustomer(cust);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length !== 10) return;

    setSubmitting(true);
    const amountVal = billAmount ? parseFloat(billAmount) : null;

    const result = await recordBill({
      shopId: shop.id,
      phoneNumber,
      customerName: customerName.trim() || undefined,
      billAmount: amountVal,
      appliedOffer: isOfferDismissed ? undefined : (appliedOfferText || undefined),
      nextVisitOffer: selectedOffer,
    });

    setSubmitting(false);

    if (result.success && result.customer && result.whatsAppUrl) {
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D97706', '#F59E0B', '#10B981', '#241E1C'],
      });

      setCompletedDetails({
        phone: phoneNumber,
        name: result.customer.name || 'Guest',
        amount: amountVal,
        nextOffer: selectedOffer,
        visitNumber: result.customer.visit_count,
        rawText: result.whatsAppText || '',
        waUrl: result.whatsAppUrl,
      });
    } else {
      alert(result.error || 'Failed to record bill.');
    }
  };

  const handleReset = () => {
    setPhoneNumber('');
    setBillAmount('');
    setCustomerName('');
    setMatchedCustomer(null);
    setCompletedDetails(null);
    setShowSuggestions(false);
    setCopied(false);
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Zap className="w-4 h-4 fill-current" />
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950">
              Billing Counter
            </h1>
          </div>
          <p className="text-espresso-500 text-xs sm:text-sm mt-0.5">
            Record bill in &lt;5 seconds. Instant customer retention on WhatsApp.
          </p>
        </div>

        <div className="hidden sm:block text-right">
          <span className="text-[11px] font-semibold text-espresso-500 uppercase tracking-wider block">Store</span>
          <span className="font-serif font-bold text-espresso-900 text-sm">{shop.name}</span>
        </div>
      </div>

      {/* Main Billing Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 sm:p-7 border border-ivory-200 shadow-card space-y-5">
        
        {/* Customer Mobile Number */}
        <div className="relative">
          <label className="flex items-center justify-between text-xs font-bold text-espresso-800 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-brand-600" />
              Customer Mobile Number <span className="text-rose-500">*</span>
            </span>
            {phoneNumber.length === 10 && (
              <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1 lowercase">
                <Check className="w-3.5 h-3.5" /> 10-digits verified
              </span>
            )}
          </label>

          <div className="relative flex items-center rounded-2xl bg-ivory-50 border-2 border-ivory-300 focus-within:border-brand-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100 transition-all shadow-inner overflow-hidden">
            <div className="flex items-center gap-1 pl-4 pr-3 py-4 text-espresso-600 font-mono font-bold text-lg sm:text-xl border-r border-ivory-300 bg-ivory-100/60 select-none shrink-0">
              <span>+91</span>
            </div>
            <input
              ref={phoneInputRef}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="98201 44521"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full px-4 py-4 bg-transparent text-espresso-950 font-mono text-xl sm:text-2xl font-bold tracking-wider focus:outline-none placeholder:text-espresso-300 placeholder:font-normal"
              required
            />
            {phoneNumber && (
              <button
                type="button"
                onClick={() => {
                  setPhoneNumber('');
                  setMatchedCustomer(null);
                  phoneInputRef.current?.focus();
                }}
                className="pr-4 text-espresso-400 hover:text-espresso-700 p-1 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Auto-suggestions */}
          {showSuggestions && suggestions.length > 0 && phoneNumber.length < 10 && (
            <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white rounded-2xl border border-ivory-300 shadow-xl overflow-hidden divide-y divide-ivory-100 animate-scale-in">
              <div className="p-2 bg-ivory-50 text-[11px] font-bold text-espresso-500 uppercase tracking-wider flex items-center justify-between">
                <span>Matching Customers ({suggestions.length})</span>
                <span>Tap to auto-fill</span>
              </div>
              {suggestions.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => handleSelectSuggestion(cust)}
                  className="p-3 hover:bg-brand-50/50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 shrink-0 aspect-square rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-xs ring-1 ring-brand-300/40">
                      {cust.name ? cust.name[0].toUpperCase() : <User className="w-3.5 h-3.5 shrink-0" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-espresso-950">{cust.name || 'Valued Guest'}</div>
                      <div className="text-xs font-mono text-espresso-500">+91 {cust.phone_number}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-100 text-brand-800">
                      {cust.visit_count} Visits
                    </span>
                    <div className="text-[11px] text-espresso-400 mt-0.5">
                      Last: {formatINR(cust.last_bill_amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Intelligence Snapshot */}
        {phoneNumber.length === 10 && (
          <div className="bg-gradient-to-br from-ivory-50 via-brand-50/40 to-amber-50/50 rounded-2xl p-4 border border-brand-200/90 space-y-3 animate-slide-up shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 aspect-square rounded-2xl bg-brand-500 text-espresso-950 font-bold flex items-center justify-center text-base shadow-sm ring-2 ring-brand-200">
                  {matchedCustomer?.name ? (
                    matchedCustomer.name[0].toUpperCase()
                  ) : (
                    <User className="w-5 h-5 shrink-0" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    placeholder="Customer Name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-transparent font-serif font-bold text-base sm:text-lg text-espresso-950 border-b border-dashed border-espresso-300 focus:border-brand-600 focus:outline-none placeholder:text-espresso-400 placeholder:font-normal placeholder:text-sm"
                  />
                  <span className="text-[11px] font-medium text-espresso-500 block mt-0.5">
                    {matchedCustomer ? 'Registered Regular Customer' : 'New First-Time Guest'}
                  </span>
                </div>
              </div>

              {/* VIP Tier Badge */}
              <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-brand-100">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs shrink-0 whitespace-nowrap ${
                  (matchedCustomer?.visit_count || 0) >= 5
                    ? 'bg-amber-400 text-espresso-950 font-black ring-1 ring-amber-500/50'
                    : (matchedCustomer?.visit_count || 0) >= 2
                    ? 'bg-brand-500 text-espresso-950 ring-1 ring-brand-600/30'
                    : 'bg-emerald-600 text-white'
                }`}>
                  <Award className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {matchedCustomer 
                      ? matchedCustomer.visit_count >= 5 
                        ? `VIP Client (${matchedCustomer.visit_count + 1}th Visit)` 
                        : `Regular (${matchedCustomer.visit_count + 1}th Visit)`
                      : '1st Time Guest'}
                  </span>
                </span>
                {matchedCustomer && (
                  <span className="text-[11px] font-semibold text-espresso-600">
                    LTV: {formatINR(matchedCustomer.total_spent)}
                  </span>
                )}
              </div>
            </div>

            {matchedCustomer && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-brand-100/70 text-xs">
                <div className="flex items-center gap-1.5 text-espresso-600">
                  <Calendar className="w-3.5 h-3.5 text-espresso-400" />
                  <span>Last Visit: <strong className="text-espresso-900">{new Date(matchedCustomer.last_visit_at).toLocaleDateString('en-IN')}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-espresso-600 justify-end">
                  <CreditCard className="w-3.5 h-3.5 text-espresso-400" />
                  <span>Last Bill: <strong className="text-espresso-900">{formatINR(matchedCustomer.last_bill_amount)}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Returning Customer Available Reward from Previous Visit */}
        {matchedCustomer?.lastOfferAwarded && !isOfferDismissed && (
          <div className="bg-gradient-to-r from-amber-50 to-brand-50/70 border-2 border-amber-300 rounded-2xl p-4 shadow-sm animate-scale-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="p-2.5 rounded-xl bg-amber-300 text-amber-950 shrink-0 shadow-xs ring-2 ring-amber-400/50">
                  <Gift className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
                    🎁 Reward from Previous Visit
                  </span>
                  <span className="text-sm sm:text-base font-bold text-espresso-950 block truncate">
                    {matchedCustomer.lastOfferAwarded}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAppliedOfferText(matchedCustomer.lastOfferAwarded || '');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    appliedOfferText === matchedCustomer.lastOfferAwarded
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                      : 'bg-amber-400 hover:bg-amber-500 text-espresso-950 active:scale-95'
                  }`}
                >
                  {appliedOfferText === matchedCustomer.lastOfferAwarded ? '✓ Offer Applied' : 'Apply to This Bill'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOfferDismissed(true);
                    setAppliedOfferText('');
                  }}
                  className="p-1.5 rounded-xl hover:bg-amber-200/60 text-espresso-400 hover:text-espresso-700 transition-colors"
                  title="Dismiss reward"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bill Amount */}
        <div>
          <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-2">
            Bill Amount (₹ INR)
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-500 font-serif font-bold text-2xl select-none">
              ₹
            </div>
            <input
              ref={amountInputRef}
              type="number"
              placeholder="0 (or leave blank if free inquiry)"
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-ivory-50 border-2 border-ivory-300 text-espresso-950 font-serif font-bold text-xl sm:text-2xl focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100 transition-all"
            />
          </div>
        </div>

        {/* Next Visit Retention Offer */}
        <div>
          <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-2">
            Select Next-Visit Loyalty Reward
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {initialOffers.map((off) => {
              const isSelected = selectedOffer === off.title;
              return (
                <div
                  key={off.id}
                  onClick={() => setSelectedOffer(off.title)}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/50 shadow-xs'
                      : 'border-ivory-200 hover:border-ivory-300 bg-white'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-brand-600 bg-brand-600' : 'border-espresso-300'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-espresso-950 truncate">{off.title}</div>
                    {off.description && (
                      <div className="text-[11px] text-espresso-500 line-clamp-1">{off.description}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={submitting || phoneNumber.length !== 10}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-500 via-amber-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-espresso-950 font-serif font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Zap className="w-5 h-5 fill-current" />
            <span>{submitting ? 'Recording...' : 'Confirm & Send WhatsApp Receipt'}</span>
            <ArrowRight className="w-5 h-5 ml-1" />
          </button>
        </div>

      </form>

      {/* WHATSAPP CONFIRMATION MODAL */}
      {completedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-espresso-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-7 shadow-2xl border border-ivory-200 relative animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-700 mb-3 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="font-serif text-2xl font-bold text-center text-espresso-950 mb-1">
              Bill Recorded Successfully!
            </h3>
            <p className="text-center text-xs text-espresso-500 mb-4">
              Customer visit #{completedDetails.visitNumber} logged. Open WhatsApp to send receipt.
            </p>

            {/* Receipt Summary Box */}
            <div className="bg-ivory-50 rounded-2xl p-4 border border-ivory-200 mb-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-espresso-500">Customer:</span>
                <span className="font-bold text-espresso-950">+91 {completedDetails.phone} ({completedDetails.name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-espresso-500">Bill Amount:</span>
                <span className="font-bold font-serif text-sm text-espresso-950">{formatINR(completedDetails.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-espresso-500">Next-Visit Gift:</span>
                <span className="font-bold text-brand-800">{completedDetails.nextOffer}</span>
              </div>
            </div>

            {/* WhatsApp Message Preview */}
            <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-[#D1C7BA] mb-5 font-sans text-xs text-espresso-900 whitespace-pre-line leading-relaxed relative">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                <span>Simulated WhatsApp Receipt:</span>
              </div>
              {completedDetails.rawText}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <a
                href={completedDetails.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleReset}
                className="w-full py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>Open WhatsApp & Send Receipt</span>
              </a>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(completedDetails.rawText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="w-1/2 py-2.5 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-800 text-xs font-semibold border border-ivory-300 flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-1/2 py-2.5 rounded-xl bg-espresso-950 hover:bg-espresso-900 text-white text-xs font-semibold"
                >
                  Next Customer &gt;
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
