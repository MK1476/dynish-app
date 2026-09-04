'use client';

import React, { useState, useEffect } from 'react';
import type { Database } from '@/types/database';
import { updateShop } from '@/actions/shop';
import { signOut } from '@/actions/auth';
import { useRouter } from 'next/navigation';
import { 
  Store, Phone, MapPin, Image as ImageIcon, Save, 
  Check, LogOut, Sparkles, ExternalLink, Palette, 
  UploadCloud, AlertCircle, RefreshCw, Lock 
} from 'lucide-react';
import { compressImage } from '@/lib/image-compressor';
import { createClient } from '@/lib/supabase/client';
import { useStaffMode } from '@/lib/useStaffMode';

type ShopRow = Database['public']['Tables']['shops']['Row'];

interface SettingsClientProps {
  shop: ShopRow;
}

export const SettingsClient: React.FC<SettingsClientProps> = ({ shop }) => {
  const router = useRouter();
  const [name, setName] = useState(shop.name);
  const [tagline, setTagline] = useState(shop.tagline || '');
  const [category, setCategory] = useState(shop.category);
  const [categoryLabel, setCategoryLabel] = useState(shop.category_label || '');
  const [phone, setPhone] = useState(shop.phone);
  const [whatsapp, setWhatsapp] = useState(shop.whatsapp_number);
  const [address, setAddress] = useState(shop.address);
  const [mapsLink, setMapsLink] = useState(shop.maps_link || '');
  const [logoUrl, setLogoUrl] = useState(shop.logo_url || '');
  const [bannerUrl, setBannerUrl] = useState(shop.banner_url || '');
  const [theme, setTheme] = useState<'heritage' | 'minimal' | 'artisanal'>((shop.theme as any) || 'heritage');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const { customPin, updatePin } = useStaffMode();
  const [staffPin, setStaffPin] = useState(customPin || '1234');
  const [pinSavedNotice, setPinSavedNotice] = useState(false);

  useEffect(() => {
    if (customPin) setStaffPin(customPin);
  }, [customPin]);

  // Curated banner presets
  const bannerPresets = [
    { label: 'Ethnic Boutique', url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80' },
    { label: 'Restaurant & Cafe', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80' },
    { label: 'Opticals & Specs', url: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=1200&auto=format&fit=crop&q=80' },
    { label: 'Luxury Fashion', url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&auto=format&fit=crop&q=80' },
  ];

  const themes = [
    { 
      id: 'heritage' as const, 
      name: 'Royal Heritage', 
      desc: 'Champagne Gold, Warm Alabaster & Deep Espresso. Ideal for Boutiques & Sarees.',
      badge: 'bg-amber-500 text-espresso-950'
    },
    { 
      id: 'minimal' as const, 
      name: 'Minimalist Atelier', 
      desc: 'Monochrome, Optic White & Slate. Ideal for Opticals & Luxury Salons.',
      badge: 'bg-slate-900 text-white'
    },
    { 
      id: 'artisanal' as const, 
      name: 'Warm Artisanal', 
      desc: 'Terracotta, Warm Amber & Roasted Espresso. Ideal for Cafes & Restaurants.',
      badge: 'bg-orange-600 text-white'
    },
  ];

  const handleUploadFile = async (file: File, type: 'logo' | 'banner') => {
    try {
      if (type === 'logo') setUploadingLogo(true);
      else setUploadingBanner(true);

      const compressed = await compressImage(file, {
        maxSizeMB: 0.15,
        maxWidthOrHeight: type === 'logo' ? 600 : 1600,
      });

      const supabase = createClient();
      const path = `${shop.id}/${Date.now()}_${compressed.name}`;
      const { data, error: uploadErr } = await supabase.storage
        .from('shop-assets')
        .upload(path, compressed, { upsert: true });

      if (uploadErr) {
        console.warn('Storage upload error, using local data URL:', uploadErr);
        const reader = new FileReader();
        reader.onload = (e) => {
          if (type === 'logo') setLogoUrl(e.target?.result as string);
          else setBannerUrl(e.target?.result as string);
        };
        reader.readAsDataURL(compressed);
      } else {
        const { data: urlData } = supabase.storage.from('shop-assets').getPublicUrl(path);
        if (type === 'logo') setLogoUrl(urlData.publicUrl);
        else setBannerUrl(urlData.publicUrl);
      }
    } catch (err: any) {
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploadingLogo(false);
      setUploadingBanner(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await updateShop(shop.id, {
      name: name.trim(),
      tagline: tagline.trim(),
      category,
      category_label: categoryLabel.trim() || category,
      phone: phone.replace(/\D/g, '').slice(-10),
      whatsapp_number: whatsapp.replace(/\D/g, '').slice(-10),
      address: address.trim(),
      maps_link: mapsLink.trim() || null,
      logo_url: logoUrl || null,
      banner_url: bannerUrl || null,
      theme,
    });

    setSaving(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    } else {
      setError(res.error || 'Failed to update shop settings.');
    }
  };

  const handleSignOut = async () => {
    if (confirm('Sign out of your store manager session?')) {
      await signOut();
      router.push('/owner/login');
      router.refresh();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950">
            Shop Profile & Branding
          </h1>
          <p className="text-espresso-500 text-xs sm:text-sm mt-0.5">
            Manage your store details, logo, hero banner, and physical location.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/store/${shop.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-800 text-xs font-semibold border border-ivory-300 flex items-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-brand-600" />
            <span>View Live Store</span>
          </a>

          <button
            type="button"
            onClick={handleSignOut}
            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 flex items-center gap-1.5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs animate-scale-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Shop settings updated successfully! Changes are live on your storefront.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center gap-2 shadow-xs animate-scale-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* BRAND ASSETS & VISUALS */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-ivory-200 shadow-card space-y-5">
          <div className="flex items-center gap-2 border-b border-ivory-100 pb-3">
            <span className="p-1.5 rounded-lg bg-brand-100 text-brand-800">
              <ImageIcon className="w-4 h-4" />
            </span>
            <h2 className="font-serif font-bold text-lg text-espresso-950">
              Storefront Banner & Logo
            </h2>
          </div>

          {/* Cover Banner Preview & Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider">
              Cover Banner Image
            </label>
            <div className="relative w-full h-36 sm:h-44 rounded-2xl overflow-hidden bg-ivory-100 border border-ivory-300 shadow-inner group">
              <img
                src={bannerUrl || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200'}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <label className="px-4 py-2 rounded-xl bg-white text-espresso-950 text-xs font-bold shadow-md cursor-pointer hover:bg-ivory-100 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" />
                  <span>{uploadingBanner ? 'Uploading...' : 'Change Cover Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingBanner}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleUploadFile(e.target.files[0], 'banner');
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Banner Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-semibold text-espresso-500">Quick Presets:</span>
              {bannerPresets.map((bp) => (
                <button
                  key={bp.label}
                  type="button"
                  onClick={() => setBannerUrl(bp.url)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    bannerUrl === bp.url
                      ? 'bg-brand-500 text-espresso-950 border-brand-500 font-bold'
                      : 'bg-ivory-50 text-espresso-600 border-ivory-200 hover:bg-ivory-100'
                  }`}
                >
                  {bp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logo Upload & Preview */}
          <div className="space-y-2 pt-2 border-t border-ivory-100">
            <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider">
              Store Logo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-ivory-100 border-2 border-ivory-300 overflow-hidden shadow-sm shrink-0">
                <img
                  src={logoUrl || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=300'}
                  alt="Logo preview"
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-900 border border-ivory-300 text-xs font-bold cursor-pointer transition-colors shadow-xs">
                  <UploadCloud className="w-4 h-4 text-brand-600" />
                  <span>{uploadingLogo ? 'Compressing & Uploading...' : 'Upload New Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleUploadFile(e.target.files[0], 'logo');
                    }}
                  />
                </label>
                <p className="text-[11px] text-espresso-400 mt-1">
                  Square image recommended. Automatically converted to ultra-fast WebP (&lt;150KB).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BASIC STORE DETAILS */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-ivory-200 shadow-card space-y-4">
          <div className="flex items-center gap-2 border-b border-ivory-100 pb-3">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Store className="w-4 h-4" />
            </span>
            <h2 className="font-serif font-bold text-lg text-espresso-950">
              Store Identity
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
                Store Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-ivory-50 border border-ivory-300 text-sm font-bold text-espresso-950 focus:outline-none focus:border-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
                Business Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setCategoryLabel(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-ivory-50 border border-ivory-300 text-sm font-bold text-espresso-950 focus:outline-none focus:border-brand-500 focus:bg-white"
              >
                <option value="Boutique">Ethnic Wear & Kurti Boutique</option>
                <option value="Restaurant">Café, Food Outlet & Restaurant</option>
                <option value="Opticals">Specs & Optical Studio</option>
                <option value="Jewellery">Jewellery & Accessories</option>
                <option value="Salon">Beauty Salon & Spa</option>
                <option value="Retail">Small Retail & General Store</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
              Tagline / Subtitle
            </label>
            <input
              type="text"
              placeholder="e.g. Curated Designer Kurtis, Sarees & Ethnic Luxe"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-ivory-50 border border-ivory-300 text-sm text-espresso-950 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>
        </div>

        {/* CONTACT & LOCATION */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-ivory-200 shadow-card space-y-4">
          <div className="flex items-center gap-2 border-b border-ivory-100 pb-3">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
              <Phone className="w-4 h-4" />
            </span>
            <h2 className="font-serif font-bold text-lg text-espresso-950">
              Contact & Store Location
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
                Counter Phone (10 Digits)
              </label>
              <div className="flex items-center rounded-xl bg-ivory-50 border border-ivory-300 focus-within:border-brand-500 focus-within:bg-white overflow-hidden">
                <span className="px-3 py-2.5 text-espresso-500 font-mono text-xs font-bold border-r border-ivory-300 bg-ivory-100 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3 py-2.5 bg-transparent text-sm font-mono font-bold text-espresso-950 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
                WhatsApp Orders Number
              </label>
              <div className="flex items-center rounded-xl bg-ivory-50 border border-ivory-300 focus-within:border-brand-500 focus-within:bg-white overflow-hidden">
                <span className="px-3 py-2.5 text-espresso-500 font-mono text-xs font-bold border-r border-ivory-300 bg-ivory-100 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3 py-2.5 bg-transparent text-sm font-mono font-bold text-espresso-950 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
              Physical Store Address
            </label>
            <input
              type="text"
              placeholder="e.g. Plot 42, Road No. 36, Jubilee Hills, Hyderabad"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-ivory-50 border border-ivory-300 text-sm text-espresso-950 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-espresso-800 uppercase tracking-wider">
                Google Maps Link
              </label>
              {mapsLink && (
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-700 hover:underline font-semibold flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Test Link</span>
                </a>
              )}
            </div>
            <input
              type="url"
              placeholder="https://maps.google.com/?q=..."
              value={mapsLink}
              onChange={(e) => setMapsLink(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-ivory-50 border border-ivory-300 text-sm text-espresso-950 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>
        </div>

        {/* VISUAL THEME SELECTOR */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-ivory-200 shadow-card space-y-4">
          <div className="flex items-center gap-2 border-b border-ivory-100 pb-3">
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-800">
              <Palette className="w-4 h-4" />
            </span>
            <h2 className="font-serif font-bold text-lg text-espresso-950">
              Visual Palette & Theme
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {themes.map((t) => (
              <div
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  theme === t.id
                    ? 'border-brand-500 bg-brand-50/40 shadow-sm ring-2 ring-brand-200'
                    : 'border-ivory-200 bg-ivory-50/50 hover:border-ivory-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${t.badge}`}>
                    {t.name}
                  </span>
                  {theme === t.id && <Check className="w-4 h-4 text-brand-700" />}
                </div>
                <p className="text-xs text-espresso-500 leading-snug">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CASHIER STAFF PIN SETTINGS */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-ivory-200 shadow-card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-ivory-200">
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-800">
              <Lock className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-serif font-bold text-lg text-espresso-950">
                Cashier Staff Security PIN
              </h2>
              <p className="text-xs text-espresso-500">
                Protect sensitive sales revenue, customers list, and billing plans when staff operate the counter.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-espresso-700 block">Current 4-Digit Owner PIN</span>
              <span className="text-xs text-espresso-500">Staff must enter this PIN to exit Billing Counter mode.</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                maxLength={4}
                value={staffPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setStaffPin(val);
                }}
                className="w-24 px-3 py-2 text-center font-mono font-bold text-lg rounded-xl border border-ivory-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-ivory-50"
                placeholder="1234"
              />
              <button
                type="button"
                onClick={() => {
                  if (staffPin.length === 4) {
                    updatePin(staffPin);
                    setPinSavedNotice(true);
                    setTimeout(() => setPinSavedNotice(false), 2500);
                  } else {
                    alert('PIN must be exactly 4 digits');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-espresso-950 text-white text-xs font-bold hover:bg-espresso-900 transition-all active:scale-95"
              >
                {pinSavedNotice ? 'Saved!' : 'Update PIN'}
              </button>
            </div>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || uploadingLogo || uploadingBanner}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-espresso-950 font-serif font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving Changes...' : 'Save Store Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
