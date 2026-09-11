'use client';

import React, { useState, useEffect } from 'react';
import type { Database } from '@/types/database';
import { updateShop, checkSlugAvailability, updateShopSlug, uploadShopAsset } from '@/actions/shop';
import { signOut } from '@/actions/auth';
import { useRouter } from 'next/navigation';
import { 
  Store, Phone, MapPin, Image as ImageIcon, Save, 
  Check, LogOut, Sparkles, ExternalLink, Palette, 
  UploadCloud, AlertCircle, RefreshCw, Lock, Link as LinkIcon, ShieldCheck, Copy, MessageCircle 
} from 'lucide-react';
import { compressImage } from '@/lib/image-compressor';
import { copyTextToClipboard } from '@/lib/utils';
import { useStaffMode } from '@/lib/useStaffMode';

type ShopRow = Database['public']['Tables']['shops']['Row'];

interface SettingsClientProps {
  shop: ShopRow;
}

const PRESET_BUSINESS_CATEGORIES = [
  { id: 'Boutique', label: 'Ethnic Wear & Kurti Boutique' },
  { id: 'Restaurant', label: 'Café, Food Outlet & Restaurant' },
  { id: 'Bakery', label: 'Bakery, Cakes & Confectionery' },
  { id: 'Footwear', label: 'Footwear, Shoes & Bags' },
  { id: 'Opticals', label: 'Specs & Optical Studio' },
  { id: 'Jewellery', label: 'Jewellery & Accessories' },
  { id: 'Salon', label: 'Beauty Salon & Spa' },
  { id: 'Electronics', label: 'Electronics & Mobile Store' },
  { id: 'Grocery', label: 'Supermarket & Grocery' },
  { id: 'Retail', label: 'Small Retail & General Store' },
];

export const SettingsClient: React.FC<SettingsClientProps> = ({ shop }) => {
  const router = useRouter();

  const isInitialPreset = PRESET_BUSINESS_CATEGORIES.some(p => p.id === shop.category);
  const [selectedCategoryPreset, setSelectedCategoryPreset] = useState(isInitialPreset ? shop.category : '__custom__');
  const [isCustomCategory, setIsCustomCategory] = useState(!isInitialPreset);
  const [customCategoryText, setCustomCategoryText] = useState(!isInitialPreset ? (shop.category_label || shop.category || '') : '');

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

  // Vanity URL Slug
  const [slug, setSlug] = useState(shop.slug || '');
  const [slugInput, setSlugInput] = useState(shop.slug || '');
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugMigrationError, setSlugMigrationError] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [slugSaving, setSlugSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Custom WhatsApp Template
  const [whatsappTemplate, setWhatsappTemplate] = useState(shop.whatsapp_template || '');

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

  // Debounced live check for custom slug availability
  useEffect(() => {
    if (slug) return; // Already locked
    if (!slugInput.trim()) {
      setSlugAvailable(null);
      setSlugError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSlugChecking(true);
      const res = await checkSlugAvailability(slugInput, shop.id);
      setSlugChecking(false);
      setSlugAvailable(res.available);
      setSlugError(res.error || null);
      if (res.error?.includes('Database setup required') || res.error?.includes('migration') || res.error?.includes('schema cache')) {
        setSlugMigrationError(res.error);
      } else {
        setSlugMigrationError(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slugInput, slug, shop.id]);

  const handleLockSlug = async () => {
    if (slug) return;
    if (!slugAvailable || !slugInput.trim()) return;

    if (!confirm(`Confirm permanent store URL: https://dynish.com/store/${slugInput.toLowerCase().trim()}\n\nNote: Once confirmed, this URL handle CANNOT be changed.`)) {
      return;
    }

    setSlugSaving(true);
    const res = await updateShopSlug(shop.id, slugInput);
    setSlugSaving(false);

    if (res.success && res.slug) {
      setSlug(res.slug);
      setSlugInput(res.slug);
      setSlugMigrationError(null);
      alert('Congratulations! Your store URL handle has been permanently registered.');
      router.refresh();
    } else {
      if (res.error?.includes('migration') || res.error?.includes('slug') || res.error?.includes('schema cache') || res.error?.includes('Database setup')) {
        setSlugMigrationError(res.error);
      } else {
        alert(res.error || 'Failed to register store handle.');
      }
    }
  };

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
        maxSizeMB: 0.2,
        maxWidthOrHeight: type === 'logo' ? 600 : 1600,
      });

      const formData = new FormData();
      formData.append('file', compressed);

      const res = await uploadShopAsset(shop.id, formData, type);
      if (res.success && res.url) {
        if (type === 'logo') setLogoUrl(res.url);
        else setBannerUrl(res.url);
      } else {
        alert(res.error || 'Failed to upload image.');
      }
    } catch (err: any) {
      alert('Failed to upload image: ' + (err?.message || 'Upload failed'));
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
      whatsapp_template: whatsappTemplate.trim() || null,
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
          <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-espresso-950">
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
        
        {/* CUSTOM STORE VANITY URL CARD */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-ivory-200 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-ivory-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <LinkIcon className="w-4 h-4" />
              </span>
              <div>
                <h2 className="font-sans font-bold text-lg text-espresso-950">
                  Custom Store URL Handle
                </h2>
                <p className="text-xs text-espresso-500">
                  A clean, memorable vanity link for your customers and social media bio.
                </p>
              </div>
            </div>

            {slug && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified & Locked</span>
              </span>
            )}
          </div>

          {slug ? (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div className="text-xs text-emerald-800 font-semibold">
                Your permanent public storefront link is live:
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-sans text-sm sm:text-base font-bold text-emerald-950 truncate">
                  https://dynish.com/store/{slug}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await copyTextToClipboard(`https://dynish.com/store/${slug}`);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1 shadow-xs"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  <a
                    href={`/store/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Store</span>
                  </a>
                </div>
              </div>
              <p className="text-[11px] text-espresso-400">
                🔒 Handle is permanently fixed so your printed standees and customer bookmarks never break.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative flex items-center rounded-2xl bg-ivory-50 border-2 border-ivory-300 focus-within:border-brand-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100 overflow-hidden transition-all">
                <span className="px-3.5 py-3 text-espresso-500 font-sans text-xs sm:text-sm font-semibold border-r border-ivory-300 bg-ivory-100/70 select-none">
                  dynish.com/store/
                </span>
                <input
                  type="text"
                  placeholder="e.g. royal-boutique"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  className="w-full px-3.5 py-3 bg-transparent text-sm sm:text-base font-sans font-bold text-espresso-950 focus:outline-none placeholder:text-espresso-300"
                />
              </div>

              {/* Live Availability Status */}
              {slugInput.trim() && (
                <div className="flex items-center justify-between text-xs px-1">
                  <div>
                    {slugChecking ? (
                      <span className="text-espresso-500 flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking availability...
                      </span>
                    ) : slugAvailable ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> ✓ Handle "{slugInput}" is available!
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {slugError || 'Handle is unavailable'}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleLockSlug}
                    disabled={!slugAvailable || slugChecking || slugSaving}
                    className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-espresso-950 font-bold text-xs shadow-xs transition-all active:scale-95"
                  >
                    {slugSaving ? 'Locking...' : 'Claim & Lock Store URL'}
                  </button>
                </div>
              )}

              {/* Database Migration / Schema Cache Banner */}
              {slugMigrationError && (
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-2.5 animate-scale-in">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>One-Time Supabase Database Setup Required</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    The <code>slug</code> column is not yet enabled in your Supabase database table. Copy and run this 1-line command in your <strong>Supabase Dashboard → SQL Editor</strong>:
                  </p>
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-amber-200 font-sans text-xs overflow-x-auto">
                    <code className="text-espresso-950 font-bold whitespace-nowrap">
                      ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE; NOTIFY pgrst, 'reload schema';
                    </code>
                    <button
                      type="button"
                      onClick={async () => {
                        await copyTextToClipboard("ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;\nNOTIFY pgrst, 'reload schema';");
                        setCopiedSql(true);
                        setTimeout(() => setCopiedSql(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 flex items-center gap-1 shadow-xs"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    After running it in Supabase, click <strong>"Claim & Lock Store URL"</strong> above to register your handle!
                  </p>
                </div>
              )}

              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
                ⚠️ <strong>Important:</strong> You can only set your store URL handle <strong>once</strong>. Once locked, it cannot be changed.
              </p>
            </div>
          )}
        </div>

        {/* BRAND ASSETS & VISUALS */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-ivory-200 shadow-card space-y-5">
          <div className="flex items-center gap-2 border-b border-ivory-100 pb-3">
            <span className="p-1.5 rounded-lg bg-brand-100 text-brand-800">
              <ImageIcon className="w-4 h-4" />
            </span>
            <h2 className="font-sans font-bold text-lg text-espresso-950">
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
            <h2 className="font-sans font-bold text-lg text-espresso-950">
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
                value={selectedCategoryPreset}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCategoryPreset(val);
                  if (val === '__custom__') {
                    setIsCustomCategory(true);
                    setCategory(customCategoryText || 'Custom');
                    setCategoryLabel(customCategoryText || 'Custom Business');
                  } else {
                    setIsCustomCategory(false);
                    const preset = PRESET_BUSINESS_CATEGORIES.find(p => p.id === val);
                    setCategory(val);
                    setCategoryLabel(preset?.label || val);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-ivory-50 border border-ivory-300 text-sm font-bold text-espresso-950 focus:outline-none focus:border-brand-500 focus:bg-white"
              >
                {PRESET_BUSINESS_CATEGORIES.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
                <option value="__custom__" className="font-bold text-brand-600">
                  + Add Custom Business Category...
                </option>
              </select>

              {isCustomCategory && (
                <div className="mt-2.5 space-y-1 animate-scale-in">
                  <label className="block text-[11px] font-bold text-espresso-700 uppercase tracking-wider">
                    Custom Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Footwear & Sneakers, Pet Care, Home Decor"
                    value={customCategoryText}
                    onChange={(e) => {
                      const text = e.target.value;
                      setCustomCategoryText(text);
                      setCategory(text.trim() || 'Custom');
                      setCategoryLabel(text.trim() || 'Custom Business');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-ivory-50 border-2 border-brand-500 text-sm font-bold text-espresso-950 focus:outline-none focus:bg-white"
                  />
                  <p className="text-[11px] text-espresso-500">
                    This custom category will be displayed on your store profile and customer bills.
                  </p>
                </div>
              )}
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
            <h2 className="font-sans font-bold text-lg text-espresso-950">
              Contact & Store Location
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
                Counter Phone (10 Digits)
              </label>
              <div className="flex items-center rounded-xl bg-ivory-50 border border-ivory-300 focus-within:border-brand-500 focus-within:bg-white overflow-hidden">
                <span className="px-3 py-2.5 text-espresso-500 font-sans text-xs font-bold border-r border-ivory-300 bg-ivory-100 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3 py-2.5 bg-transparent text-sm font-sans font-bold text-espresso-950 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
                WhatsApp Orders Number
              </label>
              <div className="flex items-center rounded-xl bg-ivory-50 border border-ivory-300 focus-within:border-brand-500 focus-within:bg-white overflow-hidden">
                <span className="px-3 py-2.5 text-espresso-500 font-sans text-xs font-bold border-r border-ivory-300 bg-ivory-100 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3 py-2.5 bg-transparent text-sm font-sans font-bold text-espresso-950 focus:outline-none"
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

        {/* CUSTOM WHATSAPP RECEIPT TEMPLATE */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-ivory-200 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-ivory-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <MessageCircle className="w-4 h-4 fill-current" />
              </span>
              <div>
                <h2 className="font-sans font-bold text-lg text-espresso-950">
                  Custom WhatsApp Receipt Message
                </h2>
                <p className="text-xs text-espresso-500">
                  Design the automated thank-you note sent with the bill and next-visit reward.
                </p>
              </div>
            </div>

            {whatsappTemplate && (
              <button
                type="button"
                onClick={() => setWhatsappTemplate('')}
                className="text-xs text-espresso-500 hover:text-rose-600 font-semibold transition-colors"
              >
                Reset to Standard Copy
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-espresso-800 uppercase tracking-wider">
                Message Copy
              </label>
              <span className="text-[11px] text-espresso-400">Tap chips below to insert dynamic tags</span>
            </div>

            <textarea
              rows={4}
              placeholder={`Hi {customer_name}! Thank you for visiting *{shop_name}* (Visit #{visit_count}).\n\nYour bill: *{bill_amount}*\n\n🎁 *Special offer for your next visit:* {next_offer}\n\nCheck out our catalog & new arrivals here: {store_link}\n\nSee you again soon! ✨`}
              value={whatsappTemplate}
              onChange={(e) => setWhatsappTemplate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-ivory-50 border border-ivory-300 text-xs sm:text-sm text-espresso-950 focus:outline-none focus:border-brand-500 focus:bg-white font-sans leading-relaxed"
            />

            {/* Variable Tag Insertion Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { tag: '{customer_name}', label: '+ Customer Name' },
                { tag: '{shop_name}', label: '+ Store Name' },
                { tag: '{bill_amount}', label: '+ Bill Amount' },
                { tag: '{visit_count}', label: '+ Visit Count' },
                { tag: '{next_offer}', label: '+ Next Offer' },
                { tag: '{store_link}', label: '+ Store Link' },
              ].map((chip) => (
                <button
                  key={chip.tag}
                  type="button"
                  onClick={() => setWhatsappTemplate((prev) => (prev ? prev + ' ' + chip.tag : chip.tag))}
                  className="px-2.5 py-1 rounded-lg bg-ivory-100 hover:bg-brand-100 text-espresso-800 hover:text-brand-900 border border-ivory-300 text-[11px] font-bold transition-all active:scale-95"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Message Preview */}
          <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-[#D1C7BA] text-xs text-espresso-900 whitespace-pre-line leading-relaxed">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>Preview (How Customer Sees It on WhatsApp)</span>
            </div>
            {whatsappTemplate.trim()
              ? whatsappTemplate
                  .replace(/\{customer_name\}/g, 'Priya Sharma')
                  .replace(/\{shop_name\}/g, name || 'Your Store')
                  .replace(/\{bill_amount\}/g, '₹1,450')
                  .replace(/\{visit_count\}/g, '3')
                  .replace(/\{next_offer\}/g, 'Flat 10% OFF on Next Visit')
                  .replace(/\{store_link\}/g, `https://dynish.com/store/${slug || shop.id}`)
              : `Hi Priya Sharma! Thank you for visiting *${name || 'Your Store'}* (Visit #3).\n\nYour bill: *₹1,450*\n\n🎁 *Special offer for your next visit:* Flat 10% OFF on Next Visit\nJust show this message at our counter on your next visit!\n\nCheck out our catalog & new arrivals here: https://dynish.com/store/${slug || shop.id}\n\nSee you again soon! ✨`}
          </div>
        </div>

        {/* VISUAL THEME SELECTOR */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-ivory-200 shadow-card space-y-4">
          <div className="flex items-center gap-2 border-b border-ivory-100 pb-3">
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-800">
              <Palette className="w-4 h-4" />
            </span>
            <h2 className="font-sans font-bold text-lg text-espresso-950">
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
              <h2 className="font-sans font-bold text-lg text-espresso-950">
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
                className="w-24 px-3 py-2 text-center font-sans font-bold text-lg rounded-xl border border-ivory-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-ivory-50"
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
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-espresso-950 font-sans font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
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

      {/* 24/7 DEDICATED MERCHANT SUPPORT */}
      <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 p-6 sm:p-7 rounded-3xl border border-emerald-200 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageCircle className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-bold text-base sm:text-lg text-emerald-950">
                  Direct Founder &amp; Merchant Support
                </h3>
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                  Live on WhatsApp
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Have a question about billing, catalog setup, or your subscription? We are always here to help you grow your business.
              </p>
            </div>
          </div>

          <a
            href={`https://wa.me/919704100544?text=${encodeURIComponent(`Hi Dynish Team! I need some help with my store — ${shop.name} (+91${shop.phone}).`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Contact Us on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};
