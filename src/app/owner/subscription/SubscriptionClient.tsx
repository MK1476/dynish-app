'use client';

import React, { useState } from 'react';
import type { Database } from '@/types/database';
import { createSubscriptionOrder, verifyPaymentAndRenew, simulateSubscriptionDays } from '@/actions/subscription';
import confetti from 'canvas-confetti';
import { 
  CreditCard, Check, AlertTriangle, ShieldCheck, 
  Sparkles, Zap, Lock, RefreshCw, Calendar, Clock, ArrowRight
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
}

export const SubscriptionClient: React.FC<SubscriptionClientProps> = ({
  shop,
  status,
}) => {
  const [loadingPlan, setLoadingPlan] = useState<'monthly' | 'yearly' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);

  const isLowDays = status.daysRemaining <= 3 || status.isExpired;

  const handleCheckout = async (planType: 'monthly' | 'yearly') => {
    setLoadingPlan(planType);

    const orderRes = await createSubscriptionOrder(shop.id, planType);
    if (!orderRes.success || !orderRes.orderId) {
      alert(orderRes.error || 'Failed to initialize Razorpay order.');
      setLoadingPlan(null);
      return;
    }

    // Razorpay standard client modal
    const options = {
      key: orderRes.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: orderRes.amount,
      currency: 'INR',
      name: 'Dynish Subscriptions',
      description: planType === 'monthly' ? '₹120 / Month Plan (30 Days)' : '₹1,099 / Year Plan (365 Days)',
      order_id: orderRes.orderId,
      prefill: {
        contact: `+91${shop.phone}`,
      },
      theme: {
        color: '#D97706',
      },
      handler: async function (response: any) {
        const verifyRes = await verifyPaymentAndRenew(shop.id, {
          orderId: response.razorpay_order_id,
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
            window.location.reload();
          }, 2200);
        } else {
          alert('Payment verification failed. Please check with your bank.');
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
      rzp.open();
    } else {
      // Direct instant simulation fallback for test/dev environments
      if (confirm(`Test Environment: Simulate successful Razorpay payment of ${planType === 'monthly' ? '₹120' : '₹1,099'}?`)) {
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
          setSuccessMessage(`Test payment confirmed! Valid until ${new Date(verifyRes.newExpiryDate!).toLocaleDateString('en-IN')}`);
          setTimeout(() => window.location.reload(), 1500);
        }
      }
      setLoadingPlan(null);
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
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950 tracking-tight">
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

            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950 mt-2">
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
            <span className="font-serif font-bold text-2xl text-espresso-950">₹199 / mo</span>
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
            className="font-semibold text-espresso-800 hover:text-espresso-950 flex items-center gap-1"
          >
            <span>SMS/WhatsApp:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${autoRenew ? 'bg-emerald-100 text-emerald-800' : 'bg-ivory-200 text-espresso-600'}`}>
              {autoRenew ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>

      {/* PLAN COMPARISON CARDS (MATCHING IMAGE 3) */}
      <div className="space-y-4">
        
        {/* Card 1: Monthly Plan */}
        <div className="bg-white rounded-3xl p-6 border border-[#EBE5DA] shadow-sm space-y-5">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-4xl font-bold text-espresso-950">₹199</span>
            </div>
            <span className="text-espresso-500 text-xs font-medium block mt-0.5">per month</span>
          </div>

          <ul className="space-y-3 text-xs text-espresso-700">
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Unlimited catalog items</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Fast counter billing</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Next-visit offers on WhatsApp</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Customer & revenue dashboard</span>
            </li>
          </ul>

          <button
            onClick={() => handleCheckout('monthly')}
            disabled={loadingPlan === 'monthly'}
            className="w-full py-3.5 rounded-full bg-white hover:bg-[#FAF7F2] text-espresso-950 font-bold text-xs sm:text-sm border border-[#E5DDD0] shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4 text-espresso-700" />
            <span>{loadingPlan === 'monthly' ? 'Preparing Gateway...' : 'Recharge Now'}</span>
          </button>
        </div>

        {/* Card 2: 6 Months Plan (Save 16%) */}
        <div className="bg-white rounded-3xl p-6 border-2 border-[#C27835] shadow-sm space-y-5 relative">
          {/* Top-left Save 16% Badge */}
          <div className="absolute -top-3.5 left-6 bg-[#C27835] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
            <Sparkles className="w-3 h-3 fill-white" />
            <span>Save 16%</span>
          </div>

          <div>
            <h3 className="font-serif text-xl font-bold text-espresso-950 mt-1">
              6 Months
            </h3>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-serif text-4xl font-bold text-espresso-950">₹999</span>
            </div>
            <span className="text-espresso-500 text-xs font-medium block mt-0.5">for 6 months</span>
          </div>

          <ul className="space-y-3 text-xs text-espresso-700">
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Unlimited catalog items</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Fast counter billing</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Next-visit offers on WhatsApp</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Customer & revenue dashboard</span>
            </li>
          </ul>

          <button
            onClick={() => handleCheckout('yearly')}
            disabled={loadingPlan === 'yearly'}
            className="w-full py-3.5 rounded-full bg-[#C27835] hover:bg-[#b06a2c] text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            <span>{loadingPlan === 'yearly' ? 'Preparing Gateway...' : 'Recharge Now'}</span>
          </button>
        </div>

        {/* Free trial footer notice */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-espresso-500 pt-2">
          <ShieldCheck className="w-4 h-4 text-espresso-400 shrink-0" />
          <span>First-time shops get a 14-day free trial</span>
        </div>

      </div>

      {/* Demo Controls Section */}
      <div className="bg-ivory-100 rounded-3xl p-5 border border-ivory-200">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className={`w-4 h-4 text-brand-800 ${simulating ? 'animate-spin' : ''}`} />
          <h4 className="font-serif text-sm font-bold text-espresso-900">
            Demo & Presentation State Controls
          </h4>
        </div>
        <p className="text-xs text-espresso-500 mb-4">
          Quickly simulate subscription edge cases live in front of merchants or during testing:
        </p>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => handleSimulate(2)}
            disabled={simulating}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 shadow-2xs transition-all active:scale-95"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Simulate 2 Days Left (Warning State)</span>
          </button>

          <button
            onClick={() => handleSimulate(0)}
            disabled={simulating}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-rose-400 bg-rose-950 text-white hover:bg-rose-900 shadow-2xs transition-all active:scale-95"
          >
            <Lock className="w-3.5 h-3.5 text-rose-300" />
            <span>Simulate 0 Days Left (Expired Storefront)</span>
          </button>

          <button
            onClick={() => handleSimulate(14)}
            disabled={simulating}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-ivory-300 bg-white text-espresso-800 hover:bg-ivory-50 shadow-2xs transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5 text-espresso-500" />
            <span>Reset to 14 Days (Active Free Trial)</span>
          </button>
        </div>
      </div>

    </div>
  );
};
