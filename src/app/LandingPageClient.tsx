'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Zap, ShoppingBag, ShieldCheck, ArrowRight, Sparkles, 
  CheckCircle2, MessageCircle, ChevronDown, ChevronUp, 
  Smartphone, BarChart3, QrCode, Store, Lock, Printer, 
  Clock, HeartHandshake, Check, HelpCircle
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { formatINR } from '@/lib/utils';
import type { Database } from '@/types/database';

type ShopRow = Database['public']['Tables']['shops']['Row'];

interface LandingPageClientProps {
  showcaseShops: Pick<ShopRow, 'id' | 'name' | 'category' | 'logo_url' | 'address' | 'slug'>[];
}

export const LandingPageClient: React.FC<LandingPageClientProps> = ({ showcaseShops }) => {
  const router = useRouter();

  // Instant redirect if running inside standalone PWA
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (isStandalone) {
        router.replace('/owner/billing');
      }
    }
  }, [router]);

  // Interactive 5s Simulator state
  const [simAmount, setSimAmount] = useState('1450');
  const [simPhone, setSimPhone] = useState('9876543210');
  const [simState, setSimState] = useState<'idle' | 'logging' | 'done'>('idle');
  const [simSpeed, setSimSpeed] = useState<number | null>(null);

  // FAQ open/close states
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Billing interval toggle for pricing
  const [isAnnual, setIsAnnual] = useState(false);

  const handleRunSim = () => {
    if (!simAmount || !simPhone) return;
    setSimState('logging');
    const start = performance.now();
    setTimeout(() => {
      const elapsed = ((performance.now() - start) / 1000).toFixed(1);
      setSimSpeed(Number(elapsed));
      setSimState('done');
    }, 850);
  };

  const faqs = [
    {
      q: 'Does my customer need to download any application?',
      a: 'No! Zero downloads needed. The digital catalog opens instantly in any mobile browser via QR code or link, and bills & loyalty gifts are delivered straight to their WhatsApp.'
    },
    {
      q: 'Do I need to buy expensive POS hardware or thermal printers?',
      a: 'None at all. Dynish runs smoothly on any smartphone, tablet, iPad, or computer you already own. If you do wish to use a thermal printer, Dynish supports standard 58mm and 80mm wireless Bluetooth/USB printers with 1-click receipts.'
    },
    {
      q: 'How fast is counter billing during peak rush hours?',
      a: 'Billing takes under 5 seconds! Just type the bill amount and the customer’s phone number. No searching through endless inventory dropdowns while queues build up.'
    },
    {
      q: 'How does the WhatsApp loyalty gift voucher work?',
      a: 'Every time you log a bill, Dynish generates an instant branded WhatsApp receipt containing a 10% OFF (or your custom reward) next-visit retention offer, encouraging customers to return.'
    },
    {
      q: 'Can my counter staff or cashier use Dynish safely?',
      a: 'Yes. With built-in Staff Mode, cashiers only have access to the sub-5s billing counter. Your catalog editing, analytics, and store settings remain securely locked behind your 4-digit PIN.'
    },
    {
      q: 'How does the 14-day free trial work?',
      a: 'You get full, unrestricted access to every Dynish feature for 14 days. No credit card is required to start. After 14 days, continue for just ₹199 / month.'
    },
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-espresso-950 font-sans selection:bg-brand-200">
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      <div className="bg-espresso-950 text-white px-4 py-2 text-center text-xs font-medium flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Sub-5-second counter billing &amp; WhatsApp loyalty for Indian local retail.</span>
        <Link href="/owner/onboarding" className="text-brand-400 font-bold hover:underline ml-1">
          Launch in 60 seconds →
        </Link>
      </div>

      {/* 2. STICKY LUXURY NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#EBE5DA] px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <BrandLogo size="md" subtext="Retail Operating System" />

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-espresso-700">
            <a href="#features" className="hover:text-espresso-950 transition-colors">Features</a>
            <a href="#simulator" className="hover:text-espresso-950 transition-colors">5s Simulator</a>
            <a href="#pricing" className="hover:text-espresso-950 transition-colors">Pricing</a>
            <a href="#faqs" className="hover:text-espresso-950 transition-colors">FAQs</a>
            <a 
              href="https://wa.me/919704100544" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-emerald-700 hover:text-emerald-900 transition-colors flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Support</span>
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/owner/login"
              className="px-3.5 py-2 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-900 text-xs font-bold border border-ivory-300 transition-colors"
            >
              Sign In
            </Link>

            <Link
              href="/owner/onboarding"
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-espresso-950 font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION (APPLE-GRADE LUXURY MINIMALISM) */}
      <section className="relative pt-12 sm:pt-20 pb-16 px-4 sm:px-8 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100/70 border border-brand-300/80 text-brand-950 text-xs font-extrabold tracking-wide shadow-xs animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-brand-800 fill-brand-700" />
          <span>The Modern POS &amp; Retention System for Local Retailers</span>
        </div>

        <h1 className="font-sans text-4xl sm:text-6xl font-black text-espresso-950 tracking-tight leading-[1.12] max-w-4xl mx-auto">
          Turn Walk-In Customers into <span className="text-[#C27835]">Lifelong Regulars.</span>
        </h1>

        <p className="text-espresso-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
          Record counter bills in under 5 seconds, deliver instant branded WhatsApp loyalty gifts, and launch a digital catalogue with zero hardware.
        </p>

        {/* Hero CTAs */}
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/owner/onboarding"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 text-espresso-950 font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <span>Start 14-Day Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href="#simulator"
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white hover:bg-ivory-100 text-espresso-800 font-bold text-base border border-ivory-300 shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <span>Try 5s Counter Demo</span>
            <Zap className="w-4 h-4 text-brand-600" />
          </a>
        </div>

        {/* Value Bullet Strips */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs font-bold text-espresso-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No POS hardware needed
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% WhatsApp-native
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ₹0 commission per transaction
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Ready in 60 seconds
          </span>
        </div>
      </section>

      {/* 4. INTERACTIVE 5-SECOND COUNTER BILLING SIMULATOR */}
      <section id="simulator" className="py-12 px-4 sm:px-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E8E2D8] shadow-card relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-brand-500 text-espresso-950 px-4 py-1 rounded-bl-2xl text-[10px] font-extrabold uppercase tracking-wider">
            Live Interactive Simulator
          </div>

          <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-800 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Feel The Speed</span>
            </div>
            <h2 className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950">
              Experience Sub-5s Counter Billing
            </h2>
            <p className="text-xs sm:text-sm text-espresso-500">
              Try entering an amount and customer phone. Watch how fast your counter operates during a festival rush.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Cashier input mock */}
            <div className="space-y-4 bg-ivory-50/70 p-5 rounded-2xl border border-ivory-200">
              <div>
                <label className="block text-[11px] font-bold text-espresso-700 uppercase tracking-wider mb-1">
                  Bill Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-sans font-bold text-base text-espresso-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={simAmount}
                    onChange={(e) => {
                      setSimAmount(e.target.value);
                      if (simState === 'done') setSimState('idle');
                    }}
                    placeholder="1450"
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-white border border-ivory-300 font-sans font-extrabold text-xl text-espresso-950 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-espresso-700 uppercase tracking-wider mb-1">
                  Customer Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-espresso-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={simPhone}
                    onChange={(e) => {
                      setSimPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                      if (simState === 'done') setSimState('idle');
                    }}
                    placeholder="9876543210"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-ivory-300 font-sans font-bold text-sm text-espresso-950 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <button
                onClick={handleRunSim}
                disabled={simState === 'logging' || !simAmount || simPhone.length !== 10}
                className="w-full py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-sans font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {simState === 'logging' ? (
                  <>
                    <Zap className="w-4 h-4 animate-bounce" />
                    <span>Logging Bill (sub-1s)...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>Record Bill &amp; Send WhatsApp</span>
                  </>
                )}
              </button>

              <div className="text-[10px] text-center text-espresso-400 font-medium">
                No inventory barcode scanning • Fast one-handed touch
              </div>
            </div>

            {/* WhatsApp receipt preview mock */}
            <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-ivory-300 shadow-inner relative space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-black/10 text-xs">
                <span className="font-bold text-espresso-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#25D366]" />
                  Customer WhatsApp View
                </span>
                <span className="text-[10px] text-espresso-500 font-mono">Instant Delivery</span>
              </div>

              {simState === 'done' ? (
                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm text-xs space-y-2 border border-black/5 animate-scale-in">
                  <div className="flex items-center justify-between font-bold text-emerald-800 text-[11px]">
                    <span>⚡ LOGGED IN {simSpeed || '0.8'} SECONDS!</span>
                    <span className="text-espresso-400 font-normal">Just now</span>
                  </div>
                  <p className="text-espresso-950 font-sans font-semibold leading-relaxed">
                    ✨ Thank you for visiting <strong>Aadya Couture Boutique</strong>!
                  </p>
                  <div className="bg-ivory-50 p-2.5 rounded-xl border border-ivory-200 font-mono text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-espresso-500">Bill Total:</span>
                      <span className="font-bold text-espresso-950">₹{simAmount || '1,450'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-espresso-500">Loyalty Reward:</span>
                      <span className="font-bold text-brand-800">Flat 10% OFF Next Visit</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-espresso-600">
                    Show this message at the counter on your next visit to claim your discount.
                  </p>
                  <div className="pt-1 text-[10px] text-brand-800 font-bold">
                    🔗 View digital catalog: dynish.com/store/aadya-couture
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-espresso-400 flex flex-col items-center justify-center min-h-[160px]">
                  <MessageCircle className="w-8 h-8 text-espresso-300 mb-2" />
                  <span>Tap "Record Bill &amp; Send WhatsApp" to simulate the customer receipt flow.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOUR CORE VALUE PILLARS */}
      <section id="features" className="py-16 px-4 sm:px-8 max-w-6xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-brand-800 uppercase tracking-widest">
            Complete Retail Operating System
          </span>
          <h2 className="font-sans text-3xl sm:text-4xl font-extrabold text-espresso-950">
            Engineered for Modern Indian Merchants
          </h2>
          <p className="text-espresso-500 text-sm">
            Everything your retail store needs to operate faster, retain patrons, and showcase collections.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pillar 1 */}
          <div className="bg-white p-6 rounded-3xl border border-ivory-200 shadow-soft hover:-translate-y-1 transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-espresso-950 flex items-center justify-center font-bold shadow-xs">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <h3 className="font-sans font-bold text-lg text-espresso-950">
              Sub-5s Counter POS
            </h3>
            <p className="text-xs text-espresso-600 leading-relaxed">
              No barcode scanners or item picking. Just enter amount and mobile number. Faster than a calculator during peak rush hours.
            </p>
            <div className="text-[11px] font-bold text-brand-800 pt-1">
              Supports 58mm &amp; 80mm thermal receipts
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white p-6 rounded-3xl border border-ivory-200 shadow-soft hover:-translate-y-1 transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
              <MessageCircle className="w-6 h-6 fill-current" />
            </div>
            <h3 className="font-sans font-bold text-lg text-espresso-950">
              WhatsApp Loyalty Engine
            </h3>
            <p className="text-xs text-espresso-600 leading-relaxed">
              Every bill automatically sends a WhatsApp receipt with a personalized next-visit reward voucher, pulling walk-ins back to your store.
            </p>
            <div className="text-[11px] font-bold text-emerald-800 pt-1">
              Boosts repeat footfall by up to 34%
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white p-6 rounded-3xl border border-ivory-200 shadow-soft hover:-translate-y-1 transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-500 text-espresso-950 flex items-center justify-center font-bold shadow-xs">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-sans font-bold text-lg text-espresso-950">
              Bespoke Digital Catalog
            </h3>
            <p className="text-xs text-espresso-600 leading-relaxed">
              Ultra-fast mobile 2-column storefront with photo swipe, live price filters, category floating navigator, and instant WhatsApp inquiry.
            </p>
            <div className="text-[11px] font-bold text-brand-800 pt-1">
              1-click bulk Excel catalog import
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white p-6 rounded-3xl border border-ivory-200 shadow-soft hover:-translate-y-1 transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-espresso-950 text-brand-400 flex items-center justify-center font-bold shadow-xs">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="font-sans font-bold text-lg text-espresso-950">
              Rush Timings &amp; CRM
            </h3>
            <p className="text-xs text-espresso-600 leading-relaxed">
              Know your peak customer footfall hours (e.g., 6–8 PM), track top 10% high-spending patrons, and monitor total offline revenue.
            </p>
            <div className="text-[11px] font-bold text-espresso-800 pt-1">
              Visual hourly visit graphs
            </div>
          </div>
        </div>
      </section>

      {/* 6. COMPARISON: DYNISH VS TRADITIONAL POS */}
      <section className="py-12 px-4 sm:px-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-ivory-200 shadow-soft space-y-6">
          <div className="text-center max-w-lg mx-auto space-y-1">
            <h3 className="font-sans text-xl sm:text-2xl font-extrabold text-espresso-950">
              Why Retailers Are Replacing Bulky POS Hardware
            </h3>
            <p className="text-xs text-espresso-500">
              Comparison between traditional bank POS machines and Dynish 2.0.0
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-ivory-200 text-espresso-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Feature</th>
                  <th className="py-3 px-3 text-brand-800 font-black bg-brand-50/70 rounded-t-xl">
                    Dynish Platform
                  </th>
                  <th className="py-3 px-3 text-espresso-500">Traditional Bank POS / Machine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                <tr>
                  <td className="py-3 px-3 font-semibold text-espresso-900">Billing Speed</td>
                  <td className="py-3 px-3 font-bold text-emerald-800 bg-brand-50/40">⚡ Under 5 seconds</td>
                  <td className="py-3 px-3 text-espresso-500">45–90 seconds per bill</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-espresso-900">Hardware Investment</td>
                  <td className="py-3 px-3 font-bold text-emerald-800 bg-brand-50/40">₹0 (Runs on your phone/tablet)</td>
                  <td className="py-3 px-3 text-rose-600">₹8,000–₹25,000 machine purchase</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-espresso-900">Monthly Machine Rental</td>
                  <td className="py-3 px-3 font-bold text-emerald-800 bg-brand-50/40">₹0 machine rental</td>
                  <td className="py-3 px-3 text-rose-600">₹400–₹1,200/month rental fee</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-espresso-900">Paper Roll Expense</td>
                  <td className="py-3 px-3 font-bold text-emerald-800 bg-brand-50/40">100% digital WhatsApp receipts</td>
                  <td className="py-3 px-3 text-espresso-500">₹500+ every month on paper rolls</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-espresso-900">Customer Retention Voucher</td>
                  <td className="py-3 px-3 font-bold text-emerald-800 bg-brand-50/40">Automatic WhatsApp gift voucher</td>
                  <td className="py-3 px-3 text-espresso-400">None (Paper is tossed in trash)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-espresso-900">Online Showcase Catalog</td>
                  <td className="py-3 px-3 font-bold text-emerald-800 bg-brand-50/40">Included with QR standee</td>
                  <td className="py-3 px-3 text-espresso-400">Not available</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 7. TRANSPARENT PRICING */}
      <section id="pricing" className="py-16 px-4 sm:px-8 max-w-4xl mx-auto space-y-8 text-center">
        <div className="space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1 text-xs font-bold text-brand-800 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Honest, Transparent Pricing</span>
          </div>
          <h2 className="font-sans text-3xl sm:text-4xl font-extrabold text-espresso-950">
            One Simple Plan. Everything Included.
          </h2>
          <p className="text-espresso-500 text-xs sm:text-sm">
            Start with our 14-day free trial. No credit card or contract required.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-md mx-auto bg-white rounded-3xl border-2 border-brand-500 p-6 sm:p-8 shadow-card relative text-left">
          <div className="absolute -top-3.5 right-6 bg-brand-500 text-espresso-950 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-xs">
            14 Days Free
          </div>

          <div className="space-y-1 pb-4 border-b border-ivory-200">
            <h3 className="font-sans font-extrabold text-xl text-espresso-950">
              Dynish Merchant Pro
            </h3>
            <p className="text-xs text-espresso-500">
              Unlimited counter billing, digital catalogue &amp; WhatsApp loyalty for your store.
            </p>
          </div>

          <div className="py-6 flex items-baseline gap-2">
            <span className="font-sans font-black text-4xl sm:text-5xl text-espresso-950">
              ₹199
            </span>
            <span className="text-xs text-espresso-500 font-semibold">/ month</span>
            <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              14-Day Free Trial
            </span>
          </div>

          <ul className="space-y-2.5 text-xs text-espresso-700 pb-6 border-b border-ivory-200 font-medium">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Unlimited sub-5s counter bills</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Unlimited catalog products &amp; categories</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Branded WhatsApp receipts with loyalty gifts</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Thermal receipt printing (58mm / 80mm)</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Print-ready QR standee generator</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Footfall visit timings &amp; customer CRM</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Staff Mode PIN counter security</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>24/7 WhatsApp merchant support</span>
            </li>
          </ul>

          <div className="pt-6 space-y-2">
            <Link
              href="/owner/onboarding"
              className="w-full py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 text-espresso-950 font-sans font-bold text-sm text-center block shadow-md transition-all active:scale-98"
            >
              Start 14-Day Free Trial Now
            </Link>
            <div className="text-[11px] text-center text-espresso-400">
              No credit card required • Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* 8. INTERACTIVE FAQ ACCORDION */}
      <section id="faqs" className="py-16 px-4 sm:px-8 max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-brand-800 uppercase tracking-widest">
            Got Questions?
          </span>
          <h2 className="font-sans text-3xl font-extrabold text-espresso-950">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-ivory-200 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-sans font-bold text-sm text-espresso-950 hover:bg-ivory-50/50"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-espresso-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-espresso-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs text-espresso-600 leading-relaxed border-t border-ivory-100 pt-3 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. BOTTOM FINAL CTA BANNER */}
      <section className="py-16 px-4 sm:px-8 max-w-5xl mx-auto">
        <div className="bg-espresso-950 text-white rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl space-y-6">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D97706_1px,transparent_1px)] [background-size:24px_24px]" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-3">
            <h2 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready to Upgrade Your Storefront &amp; Checkout?
            </h2>
            <p className="text-xs sm:text-sm text-ivory-300">
              Join hundreds of boutique owners, restaurateurs, and retailers. Setup your catalog and start sub-5s counter billing today.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/owner/onboarding"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 text-espresso-950 font-sans font-bold text-sm shadow-md transition-all active:scale-98"
            >
              Launch Your Store (14 Days Free)
            </Link>
            <a
              href="https://wa.me/919704100544"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-sans font-bold text-sm border border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Talk to Founder on WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="border-t border-[#E8E2D8] bg-white py-12 px-4 sm:px-8 text-xs text-espresso-500">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3 md:col-span-2">
            <BrandLogo size="md" subtext="Retail Operating System" />
            <p className="text-xs text-espresso-500 max-w-sm leading-relaxed">
              Dynish is the sub-5-second counter billing &amp; digital catalogue platform tailored for Indian boutiques, cafés, supermarkets, and local retail stores.
            </p>
            <div className="text-[11px] text-espresso-400 font-medium">
              🇮🇳 Proudly built for local Indian merchants.
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-espresso-900 uppercase tracking-wider text-[11px] block mb-1">
              Quick Links
            </span>
            <div><Link href="/owner/onboarding" className="hover:text-espresso-950 transition-colors">Start Free Trial</Link></div>
            <div><Link href="/owner/login" className="hover:text-espresso-950 transition-colors">Merchant Login</Link></div>
            <div>
              <a 
                href="https://wa.me/919704100544" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-emerald-700 font-bold hover:underline"
              >
                Contact Us (WhatsApp Support)
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-espresso-900 uppercase tracking-wider text-[11px] block mb-1">
              Legal &amp; Trust
            </span>
            <div><Link href="/privacy" className="hover:text-espresso-950 transition-colors">Privacy Policy</Link></div>
            <div><Link href="/terms" className="hover:text-espresso-950 transition-colors">Terms of Service</Link></div>
            <div className="text-[11px] text-espresso-400 pt-2">
              Payment processing powered by Razorpay. 256-bit encrypted data.
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 border-t border-ivory-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-espresso-400">
          <span>© {new Date().getFullYear()} Dynish Technologies. All rights reserved.</span>
          <span>dynish.com • Designed for Speed</span>
        </div>
      </footer>
    </div>
  );
};
