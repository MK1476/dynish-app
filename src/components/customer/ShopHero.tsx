'use client';

import React, { useState, useEffect } from 'react';
import type { Database } from '@/types/database';
import { 
  MessageCircle, Instagram, Youtube, MapPin, Share2, 
  Bookmark, Sparkles, CheckCircle2, Phone, Search 
} from 'lucide-react';

type ShopRow = Database['public']['Tables']['shops']['Row'];

interface ShopHeroProps {
  shop: ShopRow & {
    instagram_handle?: string | null;
    youtube_url?: string | null;
    description?: string | null;
  };
  savedCount: number;
  onOpenSavedItems: () => void;
  onSearchClick?: () => void;
}

import { copyTextToClipboard, getAppBaseUrl } from '@/lib/utils';

export const ShopHero: React.FC<ShopHeroProps> = ({ 
  shop, 
  savedCount, 
  onOpenSavedItems, 
  onSearchClick 
}) => {
  const [copied, setCopied] = useState(false);

  const cleanInstagram = shop.instagram_handle
    ? shop.instagram_handle
        .replace(/^@/, '')
        .replace(/https?:\/\/(www\.)?instagram\.com\//, '')
        .replace(/\/$/, '')
        .trim()
    : null;

  const cleanYoutube = shop.youtube_url?.trim()
    ? shop.youtube_url.trim().startsWith('http')
      ? shop.youtube_url.trim()
      : `https://${shop.youtube_url.trim()}`
    : null;

  const directionsUrl = shop.maps_link
    ? shop.maps_link
    : shop.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name} ${shop.address}`)}`
    : null;

  const totalActions = [
    Boolean(shop.whatsapp_number || shop.phone),
    Boolean(directionsUrl),
    Boolean(shop.phone),
    Boolean(cleanInstagram),
    Boolean(cleanYoutube),
    true, // Share is always present
  ].filter(Boolean).length;

  const handleShare = async () => {
    const shareUrl = `${getAppBaseUrl()}/store/${shop.slug || shop.id}`;

    const shareData = {
      title: `${shop.name} — Digital Catalog`,
      text: `Browse products and offers from ${shop.name} on Dynish!`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    const success = await copyTextToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out ${shop.name}'s digital catalog: ${shareUrl}`)}`;
      window.open(waUrl, '_blank');
    }
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

  const logoUrl = shop.logo_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=300';
  const bannerUrl = shop.banner_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200';

  return (
    <div className="relative bg-[#FAF7F2]">
      
      {/* FULL IMMERSION COVER BANNER WITH GLASS FLOATING CONTROLS */}
      <div className="relative h-52 sm:h-64 w-full overflow-hidden bg-espresso-950">
        <img
          src={bannerUrl}
          alt={shop.name}
          className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/30" />

        {/* Floating Glass Top Bar with Back, Search, and Saved Buttons */}
        <div className="absolute top-3 inset-x-3 sm:inset-x-6 flex items-center justify-between z-20">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-all shadow-md active:scale-95"
            title="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>

          <div className="flex items-center gap-2">
            {onSearchClick && (
              <button
                type="button"
                onClick={onSearchClick}
                className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-all shadow-md active:scale-95"
                title="Search catalog"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenSavedItems}
              className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-all shadow-md active:scale-95 relative"
              title="Saved items"
            >
              <Bookmark className={`w-4 h-4 ${savedCount > 0 ? 'fill-[#C27835] text-[#C27835]' : ''}`} />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C27835] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {savedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Bottom-Left Info Overlay inside Banner */}
        <div className="absolute bottom-3.5 left-4 right-4 z-20 max-w-4xl mx-auto">
          {/* Category Pill Badge */}
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C27835] text-white shadow-xs inline-block mb-1.5">
            {shop.category_label || shop.category || 'Boutique'}
          </span>

          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt={shop.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-white/70 shadow-lg object-cover bg-white shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-sans text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight drop-shadow-sm truncate">
                {shop.name}
              </h1>
              <p className="text-white/90 text-xs sm:text-sm font-normal mt-0.5 line-clamp-1 drop-shadow-xs">
                {shop.tagline || 'Curated handcrafted design for every occasion.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SHOP BODY DETAILS & ACTION BUTTONS */}
      <div className="px-4 py-2.5 max-w-4xl mx-auto space-y-2.5">
        
        {/* ULTRA-COMPACT 3-IN-A-ROW ACTION BENTO DOCK */}
        <div className={`grid gap-2 ${
          totalActions === 6 
            ? 'grid-cols-3 sm:grid-cols-6' 
            : totalActions === 5 
            ? 'grid-cols-3 sm:grid-cols-5' 
            : totalActions === 4 
            ? 'grid-cols-2 sm:grid-cols-4' 
            : 'grid-cols-3'
        }`}>
          {/* 1. WhatsApp Button */}
          {(shop.whatsapp_number || shop.phone) && (
            <a
              href={`https://wa.me/91${shop.whatsapp_number || shop.phone}?text=${encodeURIComponent(`Hi ${shop.name}! I came across your shop on Dynish and wanted to know more 😊`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 h-11 px-2.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#075E54] active:scale-95 transition-all shadow-2xs group"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366] shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold truncate">WhatsApp</span>
            </a>
          )}

          {/* 2. Directions / Maps Button */}
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 h-11 px-2.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#E5DDD0] text-espresso-900 active:scale-95 transition-all shadow-2xs group"
              title={shop.address || 'Get Directions'}
            >
              <MapPin className="w-4 h-4 text-[#C27835] shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold truncate">Directions</span>
            </a>
          )}

          {/* 3. Call Store Button */}
          {shop.phone && (
            <a
              href={`tel:+91${shop.phone}`}
              className="flex items-center justify-center gap-1.5 h-11 px-2.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#E5DDD0] text-espresso-900 active:scale-95 transition-all shadow-2xs group"
              title={`Call +91 ${shop.phone}`}
            >
              <Phone className="w-4 h-4 text-emerald-700 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold truncate">Call</span>
            </a>
          )}

          {/* 4. Instagram Button (if configured) */}
          {cleanInstagram && (
            <a
              href={`https://instagram.com/${cleanInstagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 h-11 px-2.5 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 hover:from-pink-500/20 hover:via-purple-500/20 hover:to-amber-500/20 border border-pink-300/40 text-pink-900 active:scale-95 transition-all shadow-2xs group"
              title={`Follow @${cleanInstagram} on Instagram`}
            >
              <div className="w-4 h-4 rounded-md bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#833AB4] text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Instagram className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-xs font-bold text-espresso-950 truncate">Instagram</span>
            </a>
          )}

          {/* 5. YouTube Button (if configured) */}
          {cleanYoutube && (
            <a
              href={cleanYoutube}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 h-11 px-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-200 text-red-900 active:scale-95 transition-all shadow-2xs group"
              title="Watch on YouTube"
            >
              <Youtube className="w-4 h-4 text-[#FF0000] shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-espresso-950 truncate">YouTube</span>
            </a>
          )}

          {/* 6. Share Shop Button */}
          <button
            type="button"
            onClick={handleShare}
            className={`flex items-center justify-center gap-1.5 h-11 px-2.5 rounded-xl bg-[#241E1C] hover:bg-[#342B28] text-white active:scale-95 transition-all shadow-2xs group ${
              totalActions === 5 ? 'col-span-2 sm:col-span-1' : ''
            }`}
            title="Share Store Link"
          >
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Share2 className="w-4 h-4 text-white shrink-0 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-xs font-bold truncate">{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>

        {/* STORE BIO / DESCRIPTION CALLOUT */}
        {(shop.description || shop.tagline || shop.address) && (
          <div className="border-l-2 border-[#C27835] pl-3.5 py-1 text-xs sm:text-sm text-espresso-800 leading-relaxed font-normal line-clamp-2">
            {shop.description || shop.tagline || `${shop.name} is dedicated to providing superior artisan goods and customer satisfaction in ${shop.address || 'our local community'}.`}
          </div>
        )}

        {/* Floating Copied Toast */}
        {copied && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-espresso-950/95 backdrop-blur-md text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-[#C27835]/50 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Storefront link copied to clipboard!</span>
          </div>
        )}

      </div>
    </div>
  );
};
