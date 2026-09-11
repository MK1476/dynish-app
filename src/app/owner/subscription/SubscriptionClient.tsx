'use client';

import React, { useState, useEffect } from 'react';
import type { Database } from '@/types/database';
import { 
  createSubscriptionOrder, 
  verifyPaymentAndRenew, 
  verifyPaymentByPaymentId, 
  simulateSubscriptionDays, 
  type SubscriptionRecord 
} from '@/actions/subscription';
import { type PlanType } from '@/lib/plans';
import confetti from 'canvas-confetti';
import { isPreviewOrDev } from '@/lib/env';
import { 
  CreditCard, Check, AlertTriangle, ShieldCheck, 
  Sparkles, Zap, Lock, RefreshCw, Calendar, Clock, 
  History, HelpCircle, Copy, MessageSquare, CheckCircle2, Receipt,
  Star, TrendingUp, ArrowRight
} from 'lucide-react';

type ShopRow = Database['public']['Tables']['shops']['Row'];

interface SubscriptionClientProps {
  shop: ShopRow;
  status: {
    isExpired: boolean;
    isWarning: boolean;
    daysRemaining: number;
    expiryDateFormatted: string;
  };
  subscriptionHistory?: SubscriptionRecord[];
}

export const SubscriptionClient: React.FC<SubscriptionClientProps> = ({
  shop,
  status,
  subscriptionHistory = [],
}) => {
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);

  // Self-serve payment recovery state
  const [manualPaymentId, setManualPaymentId] = useState('');
  const [verifyingManual, setVerifyingManual] = useState(false);
  const [manualStatus, setManualStatus] = useState<{ success: boolean; text: string } | null>(null);

  // Check if owner is authorized tester (9440001449 or 9876543210)
  const isTester = 
    (shop as any)?.phone === '9440001449' || (shop as any)?.owner_phone === '9440001449' ||
    (shop as any)?.phone === '9876543210' || (shop as any)?.owner_phone === '9876543210';
  const isLowDays = status.daysRemaining <= 3 || status.isExpired;

  // Handle URL callback redirect parameters on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const paymentId = params.get('id') || params.get('payment_id');

    if (paymentStatus === 'success') {
      confetti({
        particleCount: 90,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#D97706', '#F59E0B', '#10B981', '#241E1C'],
      });
      setSuccessMessage('Payment successful! Your store subscription is activated.');
    } else if (paymentId) {
      setManualPaymentId(paymentId);
    }
  }, []);

  // Dynamically load Razorpay checkout script if not present
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (planType: PlanType) => {
    setLoadingPlan(planType);

    await loadRazorpayScript();

    const orderRes = await createSubscriptionOrder(shop.id, planType);
    if (!orderRes.success || !orderRes.orderId) {
      alert(orderRes.error || 'Failed to initialize Razorpay order.');
      setLoadingPlan(null);
      return;
    }

    const planDescription = 
      planType === 'test_7days'
        ? '₹10 Tester Pack (7 Days)'
        : planType === 'quarterly'
        ? '₹498 - 3 Months Plan (90 Days, ₹166/mo)'
        : planType === 'semi_annual' || planType === 'yearly'
        ? '₹900 - 6 Months Plan (180 Days, ₹150/mo)'
        : '₹199 - 1 Month Plan (30 Days)';

    // Razorpay client modal options
    const options = {
      key: orderRes.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: orderRes.amount,
      currency: 'INR',
      name: 'Dynish Subscriptions',
      description: planDescription,
      order_id: orderRes.orderId,
      callback_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/razorpay/callback`,
      redirect: false,
      prefill: {
        contact: `+91${shop.phone}`,
      },
      theme: {
        color: '#D97706',
      },
      handler: async function (response: any) {
        try {
          const verifyRes = await verifyPaymentAndRenew(shop.id, {
            orderId: response.razorpay_order_id || orderRes.orderId,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            planType,
          });

          setLoadingPlan(null);

          if (verifyRes.success) {
            confetti({
              particleCount: 90,
              spread: 90,
              origin: { y: 0.6 },
              colors: ['#D97706', '#F59E0B', '#10B981', '#241E1C'],
            });
            setSuccessMessage(`Subscription activated! Your shop is valid until ${new Date(verifyRes.newExpiryDate!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
            setTimeout(() => {
              window.location.href = '/owner/subscription';
            }, 2000);
          } else {
            setManualPaymentId(response.razorpay_payment_id || '');
            alert(verifyRes.error || 'Payment completed on gateway. If not reflected immediately, enter your Payment ID in the verification box below.');
          }
        } catch (e: any) {
          console.error('Payment handler verification error:', e);
          setManualPaymentId(response?.razorpay_payment_id || '');
          setLoadingPlan(null);
        }
      },
      modal: {
        ondismiss: function () {
          setLoadingPlan(null);
        },
      },
    };

    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setLoadingPlan(null);
        console.error('Razorpay Payment Failed:', response.error);
        const errDesc = response.error?.description || response.error?.reason || 'Payment could not be completed';
        alert(`Payment notice: ${errDesc}`);
      });
      rzp.open();
    } else {
      if (isPreviewOrDev()) {
        if (confirm(`Preview/Dev Environment: Simulate successful payment for ${planDescription}?`)) {
          const verifyRes = await verifyPaymentAndRenew(shop.id, {
            orderId: orderRes.orderId,
            paymentId: `pay_test_${Date.now()}`,
            signature: 'test_signature',
            planType,
          });
          if (verifyRes.success) {
            confetti({
              particleCount: 90,
              spread: 90,
              origin: { y: 0.6 },
            });
            setSuccessMessage(`Payment confirmed! Valid until ${new Date(verifyRes.newExpiryDate!).toLocaleDateString('en-IN')}`);
            setTimeout(() => window.location.reload(), 1500);
          }
        }
      } else {
        alert('Payment gateway could not be loaded. Please check your network connection and try again.');
      }
      setLoadingPlan(null);
    }
  };

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPaymentId.trim()) return;

    setVerifyingManual(true);
    setManualStatus(null);

    const res = await verifyPaymentByPaymentId(shop.id, manualPaymentId.trim());
    setVerifyingManual(false);

    if (res.success) {
      setManualStatus({ success: true, text: res.message || 'Payment successfully verified and store credited!' });
      confetti({
        particleCount: 90,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#D97706', '#F59E0B', '#10B981', '#241E1C'],
      });
      setTimeout(() => {
        window.location.href = '/owner/subscription';
      }, 1800);
    } else {
      setManualStatus({ success: false, text: res.error || 'Failed to verify this payment ID with Razorpay.' });
    }
  };

  const handleSimulate = async (days: number) => {
    setSimulating(true);
    await simulateSubscriptionDays(shop.id, days);
    setSimulating(false);
    window.location.reload();
  };

  const progressPercent = Math.min(100, Math.max(0, (status.daysRemaining / 30) * 100));

  return (
    <div className="max-w-xl mx-auto space-y-5">
      
      {/* Header */}
      <div>
        <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950 tracking-tight">
          Subscription
        </h1>
        <p className="text-espresso-500 text-xs sm:text-sm mt-0.5 font-normal">
          Keep your shop page and billing live
        </p>
      </div>

      {/* Success alert notification if recharged */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-3xl text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-scale-in">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Current Subscription Status Card */}
      <div className={`rounded-3xl p-5 sm:p-6 border shadow-sm transition-all ${
        status.isExpired
          ? 'bg-rose-50/80 border-rose-300'
          : isLowDays 
          ? 'bg-amber-50/80 border-amber-300' 
          : 'bg-white border-[#EBE5DA]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                status.isExpired
                  ? 'bg-rose-600 text-white'
                  : isLowDays 
                  ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {status.isExpired ? 'Subscription Expired' : isLowDays ? 'Expiring Very Soon' : 'Subscription Active'}
              </span>
              <span className="text-xs text-espresso-500">Plan: Standard Merchant</span>
            </div>

            <h2 className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950 mt-2">
              {status.isExpired ? '0 Days Remaining' : `${status.daysRemaining} Days Remaining`}
            </h2>
            <p className="text-xs text-espresso-500 mt-0.5">
              {status.isExpired ? (
                <span className="text-rose-600 font-bold">Store catalog paused. Expired on {status.expiryDateFormatted}</span>
              ) : (
                <>Next renewal deadline: <strong className="text-espresso-800">{status.expiryDateFormatted}</strong></>
              )}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold text-espresso-400 uppercase tracking-wider block">Base Rate</span>
            <span className="font-sans font-bold text-2xl text-espresso-950">₹199 / mo</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#FAF7F2] rounded-full h-2.5 overflow-hidden mb-3 border border-[#E8E2D8]">
          <div
            style={{ width: `${status.isExpired ? 0 : progressPercent}%` }}
            className={`h-full rounded-full transition-all duration-500 ${
              status.isExpired ? 'bg-rose-600' : isLowDays ? 'bg-amber-500' : 'bg-[#C27835]'
            }`}
          />
        </div>

        {isLowDays && !status.isExpired && (
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 mt-2 bg-amber-100/70 p-3 rounded-2xl border border-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Warning: Your shop will pause when timer reaches 0. Recharge now to avoid customer checkout interruption!</span>
          </div>
        )}

        {status.isExpired && (
          <div className="flex items-center gap-2 text-xs font-bold text-rose-800 mt-2 bg-rose-100/70 p-3 rounded-2xl border border-rose-300">
            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Notice: Your customer storefront is paused. Existing product links won't display prices until recharged.</span>
          </div>
        )}

        {/* Info footer */}
        <div className="mt-3 pt-3 border-t border-[#EBE5DA] flex items-center justify-between text-xs text-espresso-500">
          <span>Auto-renew reminder is active</span>
          <button
            onClick={() => setAutoRenew(!autoRenew)}
            className="font-semibold text-espresso-800 hover:text-espresso-950 flex items-center gap-1 cursor-pointer"
          >
            <span>SMS/WhatsApp:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${autoRenew ? 'bg-emerald-100 text-emerald-800' : 'bg-ivory-200 text-espresso-600'}`}>
              {autoRenew ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>

      {/* VIP TESTER PACK (EXCLUSIVE TO AUTHORIZED TESTERS) */}
      {isTester && (
        <div className="bg-amber-50/70 rounded-3xl p-5 sm:p-6 border-2 border-dashed border-amber-500/70 shadow-xs space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-espresso-950 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-current" /> Tester Pack
              </span>
              <span className="text-xs font-bold text-amber-900">Authorized Tester (9440001449 / 9876543210)</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">LIVE RAZORPAY</span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-sans text-3xl font-extrabold text-espresso-950">₹10</span>
              <span className="text-espresso-600 text-xs font-medium">for 7 days access</span>
            </div>
            <p className="text-xs text-espresso-600 mt-1">
              Sample micro-transaction plan for testing full live payment flows multiple times on real accounts.
            </p>
          </div>

          <button
            onClick={() => handleCheckout('test_7days')}
            disabled={loadingPlan === 'test_7days'}
            className="w-full py-3.5 rounded-2xl bg-espresso-950 hover:bg-espresso-900 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>{loadingPlan === 'test_7days' ? 'Opening Payment Gateway...' : 'Recharge ₹10 Tester Pack (7 Days)'}</span>
          </button>
        </div>
      )}

      {/* HIGH-CONVERTING ROI / VALUE PROPOSITION BANNER */}
      <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-emerald-500/15 rounded-3xl p-5 border border-amber-300/60 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="w-5 h-5 text-amber-700" />
          </div>
          <div className="space-y-1">
            <h3 className="font-sans text-sm font-extrabold text-espresso-950 flex items-center gap-2">
              <span>Why Dynish Pays For Itself Instantly</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                100% ROI
              </span>
            </h3>
            <p className="text-xs text-espresso-700 leading-relaxed">
              At just <strong className="text-espresso-950 font-bold">₹150 to ₹166/month</strong>, bringing back 
              <strong className="text-emerald-800 font-bold"> just 1 repeat customer</strong> using automated WhatsApp offers 
              covers your subscription for the entire month. Every extra order is pure profit.
            </p>
          </div>
        </div>
      </div>

      {/* PLAN COMPARISON CARDS - SALES FUNNEL */}
      <div className="space-y-4">
        
        {/* Tier 1: 1 Month Starter (FLEXIBLE - AT TOP) */}
        <div className="bg-white rounded-3xl p-6 border-2 border-[#EBE5DA] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-espresso-500">Flexible Monthly</span>
              <h3 className="font-sans text-xl font-extrabold text-espresso-950">
                1 Month Starter
              </h3>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1 justify-end">
                <span className="font-sans text-4xl font-black text-espresso-950">₹199</span>
                <span className="text-espresso-500 text-xs font-semibold">/ mo</span>
              </div>
              <span className="text-[11px] text-espresso-400">Billed monthly (30 days access)</span>
            </div>
          </div>

          <ul className="space-y-2.5 text-xs text-espresso-700 pt-1">
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Full storefront, fast counter billing & unlimited items</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>WhatsApp offer generator & customer loyalty rewards</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Zero transaction commission on any orders</span>
            </li>
          </ul>

          <button
            onClick={() => handleCheckout('monthly')}
            disabled={loadingPlan === 'monthly'}
            className="w-full py-3.5 rounded-2xl bg-espresso-950 hover:bg-espresso-900 text-white font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>{loadingPlan === 'monthly' ? 'Opening Gateway...' : 'Recharge 1 Month for ₹199'}</span>
          </button>
        </div>

        {/* Tier 2: 3 Months Pro Plan (MOST POPULAR / RECOMMENDED ANCHOR) */}
        <div className="bg-white rounded-3xl p-6 border-2 border-[#C27835] shadow-md space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0">
            <div className="bg-[#C27835] text-white text-[10px] font-extrabold px-4 py-1 rounded-bl-2xl shadow-xs flex items-center gap-1 tracking-wider uppercase">
              <Star className="w-3 h-3 fill-white" />
              <span>Recommended</span>
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-[#C27835] text-[11px] font-bold mb-2">
              <Sparkles className="w-3 h-3" />
              <span>MOST POPULAR • SAVE 17%</span>
            </div>
            <h3 className="font-sans text-xl font-extrabold text-espresso-950">
              3 Months Value Pack
            </h3>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="font-sans text-4xl font-black text-espresso-950">₹166</span>
              <span className="text-espresso-600 text-sm font-semibold">/ month</span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-espresso-500 font-medium">
                Total ₹498 for 90 days
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Save ₹99 vs monthly
              </span>
            </div>
          </div>

          <ul className="space-y-2.5 text-xs text-espresso-700">
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span><strong>90 days</strong> full access to live catalog & counter billing</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Unlimited catalog items, categories & images</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Direct WhatsApp repeat-visit offers & customer list</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Zero transaction commission on any orders</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Fast counter billing & instant digital bills</span>
            </li>
          </ul>

          <button
            onClick={() => handleCheckout('quarterly')}
            disabled={loadingPlan === 'quarterly'}
            className="w-full py-4 rounded-2xl bg-[#C27835] hover:bg-[#ad6729] active:scale-[0.98] text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>{loadingPlan === 'quarterly' ? 'Opening Payment Gateway...' : 'Recharge 3 Months for ₹498'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Tier 3: 6 Months Super Saver (BEST VALUE / MAXIMUM SAVINGS) */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-300 shadow-sm space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0">
            <div className="bg-emerald-700 text-white text-[10px] font-extrabold px-4 py-1 rounded-bl-2xl shadow-xs flex items-center gap-1 tracking-wider uppercase">
              <Sparkles className="w-3 h-3 fill-white" />
              <span>Best Value</span>
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold mb-2">
              <span>LOWEST MONTHLY RATE • SAVE 25%</span>
            </div>
            <h3 className="font-sans text-xl font-extrabold text-espresso-950">
              6 Months Super Saver
            </h3>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="font-sans text-4xl font-black text-espresso-950">₹150</span>
              <span className="text-espresso-600 text-sm font-semibold">/ month</span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-espresso-500 font-medium">
                Total ₹900 for 180 days
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Save ₹294 vs monthly
              </span>
            </div>
          </div>

          <ul className="space-y-2.5 text-xs text-espresso-700">
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span><strong>180 days (6 months)</strong> continuous live store access</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Lowest rate: only ₹150/month (save ₹294)</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Unlimited catalog items, WhatsApp offers & fast billing</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Dedicated WhatsApp merchant support</span>
            </li>
          </ul>

          <button
            onClick={() => handleCheckout('semi_annual')}
            disabled={loadingPlan === 'semi_annual'}
            className="w-full py-3.5 rounded-2xl bg-espresso-950 hover:bg-espresso-900 active:scale-[0.98] text-white font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>{loadingPlan === 'semi_annual' ? 'Opening Payment Gateway...' : 'Recharge 6 Months for ₹900'}</span>
          </button>
        </div>

        {/* TRUST & ASSURANCE SIGNALS */}
        <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center">
          <div className="bg-[#FAF7F2] rounded-2xl p-2.5 border border-[#EBE5DA] flex flex-col items-center justify-center text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
            <span className="text-[11px] font-bold text-espresso-900">Razorpay Verified</span>
            <span className="text-[10px] text-espresso-500">UPI, Cards & NetBanking</span>
          </div>
          <div className="bg-[#FAF7F2] rounded-2xl p-2.5 border border-[#EBE5DA] flex flex-col items-center justify-center text-center">
            <Zap className="w-4 h-4 text-amber-600 mb-1" />
            <span className="text-[11px] font-bold text-espresso-900">Instant Activation</span>
            <span className="text-[10px] text-espresso-500">Active in under 5 seconds</span>
          </div>
          <div className="bg-[#FAF7F2] rounded-2xl p-2.5 border border-[#EBE5DA] col-span-2 sm:col-span-1 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-4 h-4 text-[#C27835] mb-1" />
            <span className="text-[11px] font-bold text-espresso-900">No Auto-Deductions</span>
            <span className="text-[10px] text-espresso-500">You control renewals</span>
          </div>
        </div>

        {/* Free trial footer notice */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-espresso-500 pt-1">
          <ShieldCheck className="w-4 h-4 text-espresso-400 shrink-0" />
          <span>First-time shops get an automatic 14-day free trial on signup</span>
        </div>

      </div>

      {/* SELF-SERVE PAYMENT VERIFICATION & HELP */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EBE5DA] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-sans text-sm font-bold text-espresso-950">
              Payment Help &amp; Missing Verification
            </h3>
            <p className="text-[11px] text-espresso-500">
              If your money was debited but the plan hasn't updated, enter your Razorpay Payment ID.
            </p>
          </div>
        </div>

        <form onSubmit={handleManualVerify} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={manualPaymentId}
            onChange={(e) => setManualPaymentId(e.target.value)}
            placeholder="e.g. pay_P2Kxxxxxxxxxxx"
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8E2D8] bg-[#FAF7F2] text-xs font-mono text-espresso-950 focus:outline-none focus:ring-2 focus:ring-[#C27835]"
          />
          <button
            type="submit"
            disabled={verifyingManual || !manualPaymentId.trim()}
            className="px-4 py-2.5 rounded-xl bg-espresso-950 hover:bg-espresso-900 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifyingManual ? 'animate-spin' : ''}`} />
            <span>{verifyingManual ? 'Verifying...' : 'Verify & Activate'}</span>
          </button>
        </form>

        {manualStatus && (
          <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in ${
            manualStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {manualStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{manualStatus.text}</span>
          </div>
        )}

        {/* WhatsApp concierge support */}
        <div className="pt-2 border-t border-[#F0EBE1] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-espresso-500">Need direct assistance from our team?</span>
          <a
            href={`https://wa.me/919704100544?text=${encodeURIComponent(
              `Hi Dynish Support, I need help with payment verification for my store: ${shop.name} (+91${shop.phone}).`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat with Support on WhatsApp</span>
          </a>
        </div>
      </div>

      {/* SUBSCRIPTION TRANSACTION & PAYMENT HISTORY */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EBE5DA] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-espresso-700" />
            <h3 className="font-sans text-sm font-bold text-espresso-950">
              Transaction History &amp; Receipts
            </h3>
          </div>
          <span className="text-[11px] text-espresso-400">
            {subscriptionHistory.length} {subscriptionHistory.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {subscriptionHistory.length === 0 ? (
          <div className="text-center py-6 px-4 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E8E2D8]">
            <Receipt className="w-7 h-7 text-espresso-300 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-espresso-700">No payment transactions yet</p>
            <p className="text-[11px] text-espresso-400 mt-0.5">
              When you recharge or renew, your payment records and Razorpay IDs will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0EBE1] -mx-2 sm:mx-0">
            {subscriptionHistory.map((item) => (
              <div key={item.id} className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#FAF7F2]/60 rounded-xl transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-espresso-950">
                      {item.plan_type === 'test_7days' 
                        ? '⚡ Tester Pack (7 Days)' 
                        : item.plan_type === 'quarterly'
                        ? '3 Months Value Pack (₹166/mo)'
                        : item.plan_type === 'semi_annual'
                        ? '6 Months Super Saver (₹150/mo)'
                        : item.plan_type === 'yearly' 
                        ? 'Yearly Plan' 
                        : '1 Month Starter (₹199/mo)'}
                    </span>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 uppercase">
                      {item.status || 'PAID'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-espresso-400 mt-0.5">
                    <span>{new Date(item.created_at || item.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {item.razorpay_payment_id && (
                      <span className="font-mono text-espresso-600 flex items-center gap-1">
                        ID: {item.razorpay_payment_id}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.razorpay_payment_id || '');
                            alert('Payment ID copied!');
                          }}
                          className="text-espresso-400 hover:text-espresso-800 cursor-pointer"
                          title="Copy ID"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="font-sans font-extrabold text-sm text-espresso-950 block">
                    ₹{item.amount}
                  </span>
                  <span className="text-[10px] text-espresso-400">
                    Valid till {new Date(item.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demo Controls Section (Visible only in preview and development environments) */}
      {isPreviewOrDev() && (
        <div className="bg-ivory-100 rounded-3xl p-5 border border-ivory-200">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className={`w-4 h-4 text-brand-800 ${simulating ? 'animate-spin' : ''}`} />
            <h4 className="font-sans text-sm font-bold text-espresso-900">
              Demo &amp; Presentation State Controls
            </h4>
          </div>
          <p className="text-xs text-espresso-500 mb-4">
            Quickly simulate subscription edge cases live in front of merchants or during testing:
          </p>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => handleSimulate(2)}
              disabled={simulating}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Simulate 2 Days Left (Warning State)</span>
            </button>

            <button
              onClick={() => handleSimulate(0)}
              disabled={simulating}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-rose-400 bg-rose-950 text-white hover:bg-rose-900 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-rose-300" />
              <span>Simulate 0 Days Left (Expired Storefront)</span>
            </button>

            <button
              onClick={() => handleSimulate(14)}
              disabled={simulating}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-ivory-300 bg-white text-espresso-800 hover:bg-ivory-50 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-espresso-500" />
              <span>Reset to 14 Days (Active Free Trial)</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

