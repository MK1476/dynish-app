import React from 'react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { Store, Zap, ShoppingBag, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default async function HomePage() {
  const admin = createAdminClient();
  const { data: shops } = await admin
    .from('shops')
    .select('id, name, category, logo_url, address')
    .order('created_at', { ascending: false })
    .limit(3);

  const firstShop = shops && shops.length > 0 ? shops[0] : null;

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-between p-4 sm:p-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between py-4 border-b border-ivory-200">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-brand-500 text-espresso-950 font-serif font-black text-xl flex items-center justify-center shadow-md">
            D
          </div>
          <div>
            <span className="font-serif font-bold text-xl text-espresso-950 block leading-none">Dynish</span>
            <span className="text-[10px] text-espresso-500 font-semibold tracking-wider uppercase">Boutique Retention MVP</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="px-3 py-1.5 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-700 text-xs font-semibold border border-ivory-300"
          >
            Admin Ops
          </Link>
          <Link
            href="/owner/login"
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-espresso-950 font-bold text-xs shadow-xs"
          >
            Vendor Login
          </Link>
        </div>
      </header>

      {/* Hero Body */}
      <main className="py-12 sm:py-16 text-center max-w-2xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-900 border border-brand-200 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Full-Stack Next.js 14 + Supabase + Razorpay</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-espresso-950 tracking-tight leading-tight">
          The 5-Second Catalog & Smart Retention Platform
        </h1>

        <p className="text-espresso-600 text-sm sm:text-base leading-relaxed">
          Tailored for Indian boutiques, specs shops, salons, and food outlets. Create your digital catalog, record counter bills in under 5 seconds, and send instant WhatsApp loyalty gifts.
        </p>

        {/* Action Gateway Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-left">
          {/* Shop Owner Card */}
          <Link
            href="/owner/login"
            className="p-5 rounded-3xl bg-white border-2 border-brand-500 shadow-card hover:-translate-y-1 transition-all group"
          >
            <div className="w-10 h-10 rounded-2xl bg-brand-500 text-espresso-950 flex items-center justify-center mb-3 shadow-xs">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <h3 className="font-serif font-bold text-lg text-espresso-950 group-hover:text-brand-800 transition-colors">
              Vendor Counter & Dashboard
            </h3>
            <p className="text-xs text-espresso-500 mt-1">
              Sign in via phone OTP to access counter billing, catalog editor, and analytics.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-brand-800">
              <span>Enter Vendor Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Customer Storefront Card */}
          {firstShop ? (
            <Link
              href={`/store/${firstShop.id}`}
              className="p-5 rounded-3xl bg-white border border-ivory-300 shadow-soft hover:-translate-y-1 transition-all group"
            >
              <div className="w-10 h-10 rounded-2xl bg-ivory-100 text-espresso-800 flex items-center justify-center mb-3">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-espresso-950 group-hover:text-brand-800 transition-colors">
                Public Customer Storefront
              </h3>
              <p className="text-xs text-espresso-500 mt-1">
                Explore {firstShop.name}'s responsive 2-column catalog with 2nd-photo peek.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-espresso-800">
                <span>Browse Storefront</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ) : (
            <Link
              href="/owner/onboarding"
              className="p-5 rounded-3xl bg-white border border-ivory-300 shadow-soft hover:-translate-y-1 transition-all group"
            >
              <div className="w-10 h-10 rounded-2xl bg-ivory-100 text-espresso-800 flex items-center justify-center mb-3">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-espresso-950 group-hover:text-brand-800 transition-colors">
                Create First Store
              </h3>
              <p className="text-xs text-espresso-500 mt-1">
                Launch a new digital shop in 60 seconds with 14-day free trial.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-espresso-800">
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-ivory-200 text-xs text-espresso-400">
        Dynish 2.0.0 Full-Stack MVP • Built with Next.js 14, Supabase & Razorpay
      </footer>
    </div>
  );
}
