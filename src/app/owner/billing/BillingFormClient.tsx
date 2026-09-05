'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Database } from '@/types/database';
import { searchCustomers, getCustomerByPhone, recordBill } from '@/actions/billing';
import confetti from 'canvas-confetti';
import { 
  Phone, User, Calendar, CreditCard, Gift, Check, ArrowRight, 
  MessageCircle, Copy, CheckCircle2, Zap, X, Award, Sparkles, Printer, Bluetooth 
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { formatPlainTextReceipt, printViaBluetooth, type ReceiptData } from '@/lib/thermal-printer';

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
  const [isThermalModalOpen, setIsThermalModalOpen] = useState(false);
  const [isBtPrinting, setIsBtPrinting] = useState(false);
  const [btError, setBtError] = useState<string | null>(null);

  const getReceiptData = (): ReceiptData | null => {
    if (!completedDetails) return null;
    return {
      shopName: shop.name,
      shopAddress: shop.address,
      shopPhone: shop.phone,
      billId: `INV-${Date.now().toString().slice(-6)}`,
      customerPhone: completedDetails.phone,
      amount: completedDetails.amount || 0,
      discountApplied: 0,
      finalAmount: completedDetails.amount || 0,
      loyaltyOfferText: completedDetails.nextOffer || undefined,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
    };
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleBluetoothPrint = async () => {
    const data = getReceiptData();
    if (!data) return;
    setIsBtPrinting(true);
    setBtError(null);
    const res = await printViaBluetooth(data);
    setIsBtPrinting(false);
    if (!res.success) {
      setBtError(res.error || 'Bluetooth printer connection failed.');
    } else {
      alert('Receipt sent to Bluetooth thermal printer successfully!');
    }
  };

  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const latestPhoneQuery = useRef('');
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const customerCacheRef = useRef<Map<string, CustomerRow & { lastOfferAwarded?: string | null }>>(new Map());
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    phoneInputRef.current?.focus();
    // Warm client cache with recent customers for zero-latency lookups
    searchCustomers(shop.id, '').then((custs) => {
      if (custs && custs.length > 0) {
        custs.forEach((c) => {
          const digits = c.phone_number.replace(/\D/g, '').slice(-10);
          customerCacheRef.current.set(digits, c);
        });
      }
    }).catch(() => {});

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [shop.id]);

  const calculateDiscountBreakdown = (offerText: string | null | undefined, amount: number | null) => {
    if (!offerText || !amount || amount <= 0) return null;

    const percentMatch = offerText.match(/(\d+(\.\d+)?)\s*%/);
    if (percentMatch) {
      const percent = parseFloat(percentMatch[1]);
      if (!isNaN(percent) && percent > 0) {
        const discount = Math.round((amount * percent) / 100);
        const finalAmount = Math.max(0, amount - discount);
        return {
          type: 'percentage' as const,
          percent,
          discountRupees: discount,
          originalAmount: amount,
          finalAmount,
          summary: `${percent}% on ₹${amount} is ₹${discount}/- discount`,
        };
      }
    }

    const flatMatch = offerText.match(/(?:₹|rs\.?|flat\s*)(\d+)/i);
    if (flatMatch) {
      const flatDiscount = parseFloat(flatMatch[1]);
      if (!isNaN(flatDiscount) && flatDiscount > 0) {
        const discount = Math.min(amount, flatDiscount);
        const finalAmount = Math.max(0, amount - discount);
        return {
          type: 'flat' as const,
          percent: Math.round((discount / amount) * 100),
          discountRupees: discount,
          originalAmount: amount,
          finalAmount,
          summary: `Flat ₹${discount}/- discount on ₹${amount}`,
        };
      }
    }

    return null;
  };

  const billNum = billAmount ? parseFloat(billAmount) : 0;
  const discountInfo = calculateDiscountBreakdown(
    !isOfferDismissed && appliedOfferText ? appliedOfferText : null, 
    billNum
  );

  const handlePhoneChange = (val: string) => {
    const numeric = val.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(numeric);
    setIsOfferDismissed(false);
    latestPhoneQuery.current = numeric;

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (numeric.length === 10) {
      setShowSuggestions(false);

      // Instant 0ms cache check
      const cached = customerCacheRef.current.get(numeric);
      if (cached) {
        setMatchedCustomer(cached);
        if (cached.name) setCustomerName(cached.name);
        if (cached.lastOfferAwarded) setAppliedOfferText(cached.lastOfferAwarded);
      }

      setLoadingCustomer(!cached);
      getCustomerByPhone(shop.id, numeric).then((existing) => {
        if (latestPhoneQuery.current === numeric) {
          setLoadingCustomer(false);
          if (existing) {
            customerCacheRef.current.set(numeric, existing);
            setMatchedCustomer(existing);
            if (existing.name) setCustomerName(existing.name);
            if (existing.lastOfferAwarded) setAppliedOfferText(existing.lastOfferAwarded);
          } else if (!cached) {
            setMatchedCustomer(null);
            setAppliedOfferText('');
          }
        }
      }).catch(() => {
        if (latestPhoneQuery.current === numeric) setLoadingCustomer(false);
      });
      return;
    }

    // Under 10 digits
    setLoadingCustomer(false);
    setMatchedCustomer(null);
    setAppliedOfferText('');

    if (numeric.length >= 3) {
      // Check local cache first (instant!)
      const localMatches: CustomerRow[] = [];
      customerCacheRef.current.forEach((cust, digits) => {
        if (localMatches.length < 4 && digits.includes(numeric)) {
          localMatches.push(cust);
        }
      });
      if (localMatches.length > 0) {
        setSuggestions(localMatches);
        setShowSuggestions(true);
      }

      searchDebounceRef.current = setTimeout(async () => {
        if (latestPhoneQuery.current === numeric) {
          const matches = await searchCustomers(shop.id, numeric);
          if (latestPhoneQuery.current === numeric) {
            matches.forEach((c) => {
              const digits = c.phone_number.replace(/\D/g, '').slice(-10);
              customerCacheRef.current.set(digits, c);
            });
            setSuggestions(matches);
            setShowSuggestions(matches.length > 0);
          }
        }
      }, 250);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (cust: CustomerRow) => {
    const cleanDigits = cust.phone_number.replace(/\D/g, '').slice(-10);
    setPhoneNumber(cleanDigits);
    setCustomerName(cust.name || '');
    setShowSuggestions(false);
    amountInputRef.current?.focus();

    const cached = customerCacheRef.current.get(cleanDigits);
    if (cached) {
      setMatchedCustomer(cached);
      if (cached.lastOfferAwarded) setAppliedOfferText(cached.lastOfferAwarded);
    } else {
      setMatchedCustomer(cust);
    }

    getCustomerByPhone(shop.id, cleanDigits).then((existing) => {
      if (existing) {
        customerCacheRef.current.set(cleanDigits, existing);
        setMatchedCustomer(existing);
        if (existing.lastOfferAwarded) setAppliedOfferText(existing.lastOfferAwarded);
      }
    }).catch(() => {});
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
      // 1-Click direct WhatsApp launch
      window.open(result.whatsAppUrl, '_blank');

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
    <div className="max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950 tracking-tight">
            Billing
          </h1>
          <p className="text-espresso-500 text-xs sm:text-sm mt-0.5 font-normal">
            Number first, then amount — that's it
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold text-espresso-400 uppercase tracking-wider block">Shop</span>
          <span className="font-sans font-bold text-espresso-900 text-xs sm:text-sm truncate max-w-[140px] inline-block">{shop.name}</span>
        </div>
      </div>

      {/* Main Billing Form Cards Stack */}
      <form onSubmit={handleSubmit} className="space-y-4 pb-28">
        
        {/* CARD 1: Customer Mobile Number */}
        <div className="rounded-3xl bg-white border border-[#EBE5DA] p-5 sm:p-6 shadow-sm relative">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[11px] font-bold text-[#8C827A] uppercase tracking-wider">
              CUSTOMER MOBILE NUMBER
            </label>
            {phoneNumber.length === 10 && (
              <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                <Check className="w-3.5 h-3.5 stroke-[3]" /> Verified
              </span>
            )}
          </div>

          <div className="relative flex items-center rounded-2xl bg-[#FAF7F2] border border-[#E8E2D8] px-4 py-3 focus-within:border-[#C27835] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#C27835]/20 transition-all">
            <Phone className="w-5 h-5 text-[#8C827A] mr-3 shrink-0" />
            <input
              ref={phoneInputRef}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="98542 29199"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full bg-transparent font-sans font-bold text-2xl sm:text-3xl text-espresso-950 tracking-wider focus:outline-none placeholder:text-espresso-300 placeholder:font-normal"
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
                className="text-espresso-400 hover:text-espresso-700 p-1 shrink-0 ml-2"
                title="Clear number"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Auto-suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && phoneNumber.length < 10 && (
            <div className="absolute top-full left-0 right-0 z-30 mt-2 bg-white rounded-2xl border border-ivory-300 shadow-xl overflow-hidden divide-y divide-ivory-100 animate-scale-in">
              <div className="p-2.5 bg-ivory-50 text-[11px] font-bold text-espresso-500 uppercase tracking-wider flex items-center justify-between">
                <span>Matching Customers ({suggestions.length})</span>
                <span>Tap to fill</span>
              </div>
              {suggestions.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => handleSelectSuggestion(cust)}
                  className="p-3 hover:bg-brand-50/50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-xs ring-1 ring-brand-300/40">
                      {cust.name ? cust.name[0].toUpperCase() : <User className="w-3.5 h-3.5 shrink-0" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-espresso-950">{cust.name || 'Valued Guest'}</div>
                      <div className="text-xs font-mono text-espresso-500">+91 {cust.phone_number}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C27835]/10 text-[#C27835]">
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

        {/* CARD 2: Returning Customer Loyalty Snapshot */}
        {phoneNumber.length === 10 && (
          <div className="rounded-3xl bg-white border border-[#EBE5DA] p-5 sm:p-6 shadow-sm animate-slide-up space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Customer Name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-transparent font-sans font-bold text-xl sm:text-2xl text-espresso-950 border-b border-dashed border-espresso-300 focus:border-[#C27835] focus:outline-none placeholder:text-espresso-400 placeholder:font-normal placeholder:text-base"
                />
                <div className="text-xs text-espresso-500 mt-1 font-medium">
                  {matchedCustomer ? (
                    <>
                      Last visit {new Date(matchedCustomer.last_visit_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {matchedCustomer.last_bill_amount ? ` · last bill ${formatINR(matchedCustomer.last_bill_amount)}` : ''}
                    </>
                  ) : (
                    'New First-Time Guest'
                  )}
                </div>
                {matchedCustomer && (
                  <div className="text-xs text-espresso-500 font-medium mt-0.5">
                    Lifetime spend {formatINR(matchedCustomer.total_spent)}
                  </div>
                )}
              </div>

              {/* Visit Pill Badge (Bronze) */}
              <span className="shrink-0 px-3.5 py-1 rounded-full text-xs font-bold bg-[#C27835] text-white shadow-xs">
                {matchedCustomer ? `${matchedCustomer.visit_count + 1}th Visit` : '1st Visit'}
              </span>
            </div>

            {/* Offer To Apply Now Banner */}
            {matchedCustomer?.lastOfferAwarded && !isOfferDismissed && (
              <div className="mt-3 rounded-2xl bg-[#FDF8F3] border border-[#F0E4D5] p-4 flex items-center justify-between gap-3 animate-scale-in">
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#C27835] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 fill-[#C27835]" />
                    <span>OFFER TO APPLY NOW</span>
                  </div>
                  <div className="font-sans font-bold text-sm sm:text-base text-espresso-950 truncate mt-0.5">
                    {matchedCustomer.lastOfferAwarded}
                  </div>
                  {discountInfo && (
                    <div className="text-xs text-espresso-500 mt-0.5">
                      {discountInfo.summary}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (appliedOfferText === matchedCustomer.lastOfferAwarded) {
                        setAppliedOfferText('');
                      } else {
                        setAppliedOfferText(matchedCustomer.lastOfferAwarded || '');
                      }
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                      appliedOfferText === matchedCustomer.lastOfferAwarded
                        ? 'bg-[#C27835] text-white'
                        : 'bg-white border border-[#E5DDD0] text-espresso-800 hover:border-[#C27835]'
                    }`}
                  >
                    {appliedOfferText === matchedCustomer.lastOfferAwarded ? 'Applied' : 'Apply'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOfferDismissed(true);
                      setAppliedOfferText('');
                    }}
                    className="text-espresso-400 hover:text-espresso-700 p-1"
                    title="Dismiss offer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CARD 3: Bill Amount */}
        <div className="rounded-3xl bg-white border border-[#EBE5DA] p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[11px] font-bold text-[#8C827A] uppercase tracking-wider">
              BILL AMOUNT (optional)
            </label>
            {discountInfo && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Offer Discount: ₹{discountInfo.discountRupees}
              </span>
            )}
          </div>

          <div className="relative flex items-center rounded-2xl bg-[#FAF7F2] border-2 border-[#C27835]/60 focus-within:border-[#C27835] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#C27835]/20 px-4 py-3 transition-all">
            <span className="font-sans text-2xl sm:text-3xl text-espresso-400 select-none mr-2 font-bold">
              ₹
            </span>
            <input
              ref={amountInputRef}
              type="number"
              placeholder="0"
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (phoneNumber.length === 10) {
                    handleSubmit(e);
                  }
                }
              }}
              className="w-full bg-transparent font-sans font-bold text-3xl sm:text-4xl text-espresso-950 focus:outline-none placeholder:text-espresso-300"
            />
          </div>
        </div>

        {/* CARD 4: Offer For Next Visit */}
        <div className="rounded-3xl bg-white border border-[#EBE5DA] p-5 sm:p-6 shadow-sm">
          <label className="block text-[11px] font-bold text-[#8C827A] uppercase tracking-wider mb-3">
            OFFER FOR NEXT VISIT
          </label>
          <div className="flex flex-wrap gap-2">
            {initialOffers.map((off) => {
              const isSelected = selectedOffer === off.title;
              return (
                <button
                  key={off.id}
                  type="button"
                  onClick={() => setSelectedOffer(off.title)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[#241E1C] text-white shadow-xs'
                      : 'bg-white border border-[#E8E2D8] text-espresso-800 hover:border-[#C27835] hover:bg-[#FAF7F2]'
                  }`}
                >
                  {off.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* In-Form Primary Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || phoneNumber.length !== 10}
            className="w-full py-4 rounded-full bg-[#241E1C] hover:bg-[#342B28] text-white font-sans font-bold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Zap className="w-5 h-5 text-amber-400 fill-current" />
            <span>
              {submitting 
                ? 'Recording...' 
                : billNum > 0 
                ? `Confirm Bill (₹${billNum.toLocaleString('en-IN')}) & Open WhatsApp` 
                : 'Record Bill & Open WhatsApp'}
            </span>
            <ArrowRight className="w-5 h-5 ml-1" />
          </button>
        </div>

      </form>

      {/* STICKY BOTTOM ACTION BAR (CASHIER ULTRA-FAST COUNTER UX) */}
      <div className="fixed bottom-14 sm:bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E8E2D8] p-3 sm:p-4 shadow-2xl">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || phoneNumber.length !== 10}
            className={`w-full py-3.5 sm:py-4 px-6 rounded-full font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] shadow-lg ${
              phoneNumber.length === 10
                ? 'bg-[#241E1C] hover:bg-[#342B28] text-white shadow-amber-500/10 cursor-pointer'
                : 'bg-ivory-200 text-espresso-400 cursor-not-allowed border border-ivory-300'
            }`}
          >
            <Zap className={`w-5 h-5 ${phoneNumber.length === 10 ? 'text-amber-400 fill-current' : 'text-espresso-400'}`} />
            <span>
              {submitting
                ? 'Recording Bill & Launching...'
                : phoneNumber.length === 10
                ? billNum > 0
                  ? `Confirm Bill (₹${billNum.toLocaleString('en-IN')}) & Open WhatsApp 💬`
                  : 'Record Bill & Open WhatsApp 💬'
                : 'Enter 10-Digit Mobile Number to Bill'}
            </span>
            {phoneNumber.length === 10 && <ArrowRight className="w-4 h-4 text-white shrink-0 ml-1" />}
          </button>
        </div>
      </div>

      {/* WHATSAPP CONFIRMATION MODAL */}
      {completedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-espresso-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-7 shadow-2xl border border-ivory-200 relative animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-700 mb-3 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="font-sans text-2xl font-extrabold text-center text-espresso-950 mb-1">
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
                <span className="font-bold font-sans text-sm text-espresso-950">{formatINR(completedDetails.amount)}</span>
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

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsThermalModalOpen(true)}
                  className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-espresso-950 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(completedDetails.rawText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="py-2.5 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-800 text-xs font-semibold border border-ivory-300 flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 rounded-xl bg-espresso-950 hover:bg-espresso-900 text-white text-xs font-semibold"
              >
                Next Customer &gt;
              </button>
            </div>

          </div>
        </div>
      )}

      {/* THERMAL RECEIPT MODAL */}
      {isThermalModalOpen && completedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-espresso-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl border border-ivory-300 relative animate-scale-in max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-ivory-200">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-brand-600" />
                <h3 className="font-sans font-bold text-lg text-espresso-950">Thermal Slip</h3>
              </div>
              <button 
                onClick={() => setIsThermalModalOpen(false)}
                className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner if bluetooth fails */}
            {btError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {btError}
              </div>
            )}

            {/* Live Monospace Slip Preview */}
            <div 
              id="thermal-slip-print"
              className="bg-ivory-50 p-4 rounded-xl border border-dashed border-ivory-400 font-mono text-[11px] leading-tight text-espresso-950 whitespace-pre shadow-inner mb-4 overflow-x-auto"
            >
              {getReceiptData() ? formatPlainTextReceipt(getReceiptData()!, 32) : ''}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleBrowserPrint}
                className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-espresso-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print via Browser (58mm / 80mm)</span>
              </button>

              <button
                type="button"
                onClick={handleBluetoothPrint}
                disabled={isBtPrinting}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-ivory-50 text-indigo-700 border border-indigo-300 font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
              >
                <Bluetooth className={`w-4 h-4 ${isBtPrinting ? 'animate-pulse' : ''}`} />
                <span>{isBtPrinting ? 'Connecting Bluetooth...' : 'Pair & Print via Bluetooth'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsThermalModalOpen(false)}
                className="w-full py-2 text-center text-xs text-espresso-500 hover:text-espresso-800 font-medium"
              >
                Back to Counter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THERMAL PRINT STYLES */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-slip-print, #thermal-slip-print * {
            visibility: visible;
          }
          #thermal-slip-print {
            position: fixed;
            left: 0;
            top: 0;
            width: 58mm;
            margin: 0;
            padding: 2mm;
            background: white !important;
            border: none !important;
            font-family: monospace !important;
            font-size: 11px !important;
            color: black !important;
          }
        }
      `}</style>

    </div>
  );
};
