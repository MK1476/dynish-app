'use client';

import React, { useState } from 'react';
import { createShop } from '@/actions/shop';
import { signOut } from '@/actions/auth';
import { useRouter } from 'next/navigation';
import { Store, ArrowRight, Palette, LogOut, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';

interface OnboardingClientProps {
  userPhone: string;
}

export function OnboardingClient({ userPhone }: OnboardingClientProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Boutique');
  const [phone, setPhone] = useState(userPhone || '');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [mapsLink, setMapsLink] = useState('');
  const [tagline, setTagline] = useState('');
  const [theme, setTheme] = useState<'heritage' | 'minimal' | 'artisanal'>('heritage');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');

  const categories = [
    { id: 'Boutique', label: 'Ethnic Wear & Kurti Boutique' },
    { id: 'Restaurant', label: 'Café, Food Outlet & Restaurant' },
    { id: 'Bakery', label: 'Bakery, Cakes & Sweets' },
    { id: 'Footwear', label: 'Footwear, Shoes & Bags' },
    { id: 'Opticals', label: 'Specs & Optical Studio' },
    { id: 'Jewellery', label: 'Jewellery & Accessories' },
    { id: 'Salon', label: 'Beauty Salon & Spa' },
    { id: 'Electronics', label: 'Electronics & Mobile Store' },
    { id: 'Grocery', label: 'Supermarket & Grocery Store' },
    { id: 'Retail', label: 'Small Retail & General Store' },
    { id: '__custom__', label: '+ Add Custom Business Category...' },
  ];

  const handleSignOut = async () => {
    await signOut();
    if (typeof document !== 'undefined') {
      document.cookie = 'dynish_phone=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'dynish_uid=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'dynish_shop_id=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    router.push('/owner/login');
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const finalCategory = isCustomCategory ? (customCategoryText.trim() || 'Custom') : category;

    const res = await createShop({
      name,
      category: finalCategory,
      phone,
      whatsappNumber: whatsapp || phone,
      address,
      mapsLink,
      tagline,
      theme,
    });

    setLoading(false);

    if (res.success && res.shop) {
      router.push('/owner/dashboard');
      router.refresh();
    } else {
      setError(res.error || 'Failed to create shop.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 py-8">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-ivory-200 shadow-2xl space-y-6 animate-scale-in">
        
        {/* Top Session & Signout Bar */}
        <div className="flex items-center justify-between pb-3.5 border-b border-ivory-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-espresso-700 font-semibold">
              Signed in as <strong>+91 {userPhone || phone}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ivory-100 hover:bg-rose-50 text-espresso-700 hover:text-rose-700 text-xs font-bold border border-ivory-300 hover:border-rose-200 transition-colors cursor-pointer"
            title="Sign out of this session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <div>
          <BrandLogo size="md" subtext="Merchant Onboarding" className="mb-4" />
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-brand-100 text-brand-800">
              <Store className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-brand-800 uppercase tracking-wider">
              14-Day Free Trial Included
            </span>
          </div>
          <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950">
            Create Your Digital Storefront
          </h1>
          <p className="text-xs sm:text-sm text-espresso-500 mt-1">
            Get your online catalog and sub-5 second counter billing ready in 60 seconds.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Shop Name */}
          <div>
            <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
              Shop Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mandi House, Aadya Couture"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-ivory-50 border border-ivory-300 text-espresso-950 font-sans font-bold text-base focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>

          {/* Trade Category */}
          <div>
            <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
              Trade Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={isCustomCategory ? '__custom__' : category}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__custom__') {
                  setIsCustomCategory(true);
                } else {
                  setIsCustomCategory(false);
                  setCategory(val);
                }
              }}
              className="w-full px-4 py-3 rounded-xl bg-ivory-50 border border-ivory-300 text-espresso-950 text-xs font-semibold focus:outline-none focus:border-brand-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>

            {isCustomCategory && (
              <div className="mt-2.5 space-y-1 animate-scale-in">
                <label className="block text-[11px] font-bold text-espresso-700 uppercase tracking-wider">
                  Custom Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Handmade Crafts, Sports Equipment, Pet Supplies"
                  value={customCategoryText}
                  onChange={(e) => setCustomCategoryText(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-ivory-50 border-2 border-brand-500 text-espresso-950 font-bold text-xs focus:outline-none focus:bg-white"
                />
              </div>
            )}
          </div>

          {/* Contact Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
                Calling Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full px-4 py-2.5 rounded-xl bg-ivory-50 border border-ivory-300 text-espresso-950 font-sans text-sm font-bold focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
                WhatsApp Number
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="Same as mobile if blank"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full px-4 py-2.5 rounded-xl bg-ivory-50 border border-ivory-300 text-espresso-950 font-sans text-sm font-bold focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Store Location */}
          <div>
            <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
              Physical Address / Market
            </label>
            <input
              type="text"
              placeholder="e.g. Shop 14, Silver Arc Plaza, New Palasia"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-ivory-50 border border-ivory-300 text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Google Maps Link */}
          <div>
            <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
              Google Maps Share Link (Optional)
            </label>
            <input
              type="url"
              placeholder="https://maps.app.goo.gl/..."
              value={mapsLink}
              onChange={(e) => setMapsLink(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-ivory-50 border border-ivory-300 text-xs font-sans focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Theme Palette */}
          <div>
            <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-brand-600" />
              <span>Select Boutique Atmosphere</span>
            </label>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {[
                { id: 'heritage' as const, label: 'Royal Heritage', colors: ['#FAF8F5', '#D97706', '#241E1C'] },
                { id: 'minimal' as const, label: 'Minimal Atelier', colors: ['#FFFFFF', '#0F172A', '#64748B'] },
                { id: 'artisanal' as const, label: 'Warm Artisanal', colors: ['#FFFBEB', '#B45309', '#451A03'] },
              ].map((t) => (
                <div
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                    theme === t.id ? 'border-brand-500 bg-brand-50 font-bold' : 'border-ivory-200 bg-white'
                  }`}
                >
                  <div className="flex justify-center gap-1 mb-1">
                    {t.colors.map((c, i) => (
                      <span key={i} style={{ backgroundColor: c }} className="w-2.5 h-2.5 rounded-full border border-black/10" />
                    ))}
                  </div>
                  <span className="text-[11px] block truncate">{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name || phone.length !== 10}
            className="w-full py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-espresso-950 font-sans font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
          >
            <span>{loading ? 'Setting Up Store...' : 'Launch Store (14 Days Free)'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
