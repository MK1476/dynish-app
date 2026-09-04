'use client';

import React, { useState } from 'react';
import type { Database } from '@/types/database';
import { createSubscriptionOrder, verifyPaymentAndRenew, simulateSubscriptionDays } from '@/actions/subscription';
import confetti from 'canvas-confetti';
import { 
  CreditCard, CheckCircle2, AlertTriangle, ShieldCheck, 
  Sparkles, Zap, Lock, RefreshCw 
} from 'lucide-react';
import { formatINR } from '@/lib/utils';

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
      description: planType === 'monthly' ? '₹120 / Month Plan' : '₹1,099 / Year Plan',
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
            particleCount: 80,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#D97706', '#F59E0B', '#10B981', '#241E1C'],
          });
          setSuccessMessage(`Subscription activated! Your shop is valid until ${new Date(verifyRes.newExpiryDate!).toLocaleDateString('en-IN')}`);
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          alert('Payment verification failed.');
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
      // Fallback in test mode if Razorpay script is blocked or offline
      if (confirm('Test mode: Simulate successful payment without opening modal?')) {
        await verifyPaymentAndRenew(shop.id, {
          orderId: orderRes.orderId,
          paymentId: `pay_test_${Date.now()}`,
          signature: 'test_signature',
          planType,
        });
        window.location.reload();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950">
          Store Subscription & Plans
        </h1>
        <p className="text-espresso-500 text-xs sm:text-sm mt-0.5">
          Simple, transparent pricing. ₹120 per month to keep your digital storefront active.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-scale-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* CURRENT SUBSCRIPTION STATUS CARD */}
      <div className={`p-5 sm:p-6 rounded-3xl border-2 transition-all ${
        status.isExpired
          ? 'bg-rose-50 border-rose-400 text-rose-950'
          : status.isWarning
          ? 'bg-amber-50 border-amber-400 text-amber-950'
          : 'bg-white border-ivory-200 shadow-soft'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                status.isExpired
                  ? 'bg-rose-600 text-white'
                  : status.isWarning
                  ? 'bg-amber-500 text-espresso-950'
                  : 'bg-brand-500 text-espresso-950'
              }`}>
                {shop.plan_type.toUpperCase()} PLAN
              </span>
              <span className="text-xs text-espresso-500">
                Expires on: <strong>{status.expiryDateFormatted}</strong>
              </span>
            </div>

            <h3 className="font-serif text-xl sm:text-2xl font-bold text-espresso-950">
              {status.isExpired
                ? 'Your subscription has expired'
                : `${status.daysRemaining} Days Remaining`}
            </h3>
            <p className="text-xs text-espresso-500 mt-0.5">
              {status.isExpired
                ? 'Your public storefront is currently paused. Recharge below to restore access.'
                : 'All catalog views and WhatsApp billing features are active.'}
            </p>
          </div>

          {status.isWarning && (
            <div className="p-3 bg-amber-100 rounded-2xl border border-amber-300 flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Only {status.daysRemaining} days left! Recharge early to prevent disruption.</span>
            </div>
          )}
        </div>
      </div>

      {/* PRICING PLANS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Monthly Plan */}
        <div className="bg-white rounded-3xl p-6 border-2 border-ivory-200 shadow-soft hover:border-brand-300 transition-all flex flex-col justify-between">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-ivory-100 text-espresso-800 text-[10px] font-bold uppercase tracking-wider">
              Standard Plan
            </span>
            <h3 className="font-serif text-xl font-bold text-espresso-950 mt-2">
              Monthly Subscription
            </h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-serif text-3xl font-bold text-espresso-950">₹120</span>
              <span className="text-xs text-espresso-500">/ month</span>
            </div>
            <p className="text-xs text-espresso-500 mt-2 leading-relaxed">
              Ideal for testing out local customer retention. Includes unlimited catalog items, sub-5s counter billing, and WhatsApp coupons.
            </p>
          </div>

          <button
            onClick={() => handleCheckout('monthly')}
            disabled={loadingPlan === 'monthly'}
            className="w-full mt-6 py-3.5 rounded-2xl bg-espresso-950 hover:bg-espresso-900 text-white font-serif font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {loadingPlan === 'monthly' ? 'Opening Gateway...' : 'Recharge ₹120 (Monthly)'}
          </button>
        </div>

        {/* Yearly Plan */}
        <div className="bg-white rounded-3xl p-6 border-2 border-brand-500 shadow-card ring-2 ring-brand-200 transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-3 right-3 bg-brand-500 text-espresso-950 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase shadow-xs">
            Save ₹341
          </div>

          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-900 text-[10px] font-bold uppercase tracking-wider">
              Best Value Retailer Plan
            </span>
            <h3 className="font-serif text-xl font-bold text-espresso-950 mt-2">
              Yearly Super Saver
            </h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-serif text-3xl font-bold text-espresso-950">₹1,099</span>
              <span className="text-xs text-espresso-500">/ year</span>
              <span className="text-xs text-espresso-400 line-through ml-1">₹1,440</span>
            </div>
            <p className="text-xs text-espresso-500 mt-2 leading-relaxed">
              Full peace of mind for 365 days. Never worry about catalog pauses or monthly manual renewals.
            </p>
          </div>

          <button
            onClick={() => handleCheckout('yearly')}
            disabled={loadingPlan === 'yearly'}
            className="w-full mt-6 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-espresso-950 font-serif font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {loadingPlan === 'yearly' ? 'Opening Gateway...' : 'Recharge ₹1,099 (1 Year)'}
          </button>
        </div>
      </div>

      {/* DEMO / SIMULATION SWITCHES */}
      <div className="bg-ivory-100 rounded-3xl p-5 border border-ivory-300 space-y-2">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-brand-800" />
          <h4 className="font-serif text-sm font-bold text-espresso-900">
            Developer / Demo Edge State Triggers
          </h4>
        </div>
        <p className="text-xs text-espresso-600">
          Instantly test the visual warning alerts and greyed-out expired states without waiting 14 days:
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => handleSimulate(2)}
            disabled={simulating}
            className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-50"
          >
            ⚠️ Simulate 2 Days Left (Warning State)
          </button>

          <button
            onClick={() => handleSimulate(0)}
            disabled={simulating}
            className="px-3 py-1.5 rounded-xl bg-rose-900 text-white text-xs font-bold hover:bg-rose-800"
          >
            🔒 Simulate 0 Days Left (Locked State)
          </button>

          <button
            onClick={() => handleSimulate(14)}
            disabled={simulating}
            className="px-3 py-1.5 rounded-xl bg-white border border-ivory-300 text-espresso-800 text-xs font-bold hover:bg-ivory-50"
          >
            ↺ Reset 14 Days (Active State)
          </button>
        </div>
      </div>

    </div>
  );
};
