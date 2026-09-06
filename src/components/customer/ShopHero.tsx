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

import { copyTextToClipboard } from '@/lib/utils';

export const ShopHero: React.FC<ShopHeroProps> = ({ 
  shop, 
  savedCount, 
  onOpenSavedItems, 
  onSearchClick 
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/store/${shop.slug || shop.id}`
      : `https://dynish.vercel.app/store/${shop.slug || shop.id}`;

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
      <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-espresso-950">
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
        <div className="absolute bottom-4 left-4 right-4 z-20 max-w-4xl mx-auto">
          {/* Category Pill Badge */}
          <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#C27835] text-white shadow-xs inline-block mb-2">
            {shop.category_label || shop.category || 'Boutique'}
          </span>

          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={logoUrl}
              alt={shop.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/70 shadow-lg object-cover bg-white shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight drop-shadow-sm truncate">
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
      <div className="px-4 py-4 max-w-4xl mx-auto space-y-4">
        
        {/* ACTION BUTTONS (ROW 1: WhatsApp + Socials | ROW 2: Directions + Share) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/91${shop.whatsapp_number || shop.phone}?text=${encodeURIComponent(`Hi ${shop.name}, I am viewing your digital catalog on Dynish!`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#128C7E] hover:bg-[#0f7a6e] text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>WhatsApp</span>
            </a>

            <a
              href={shop.instagram_handle ? `https://instagram.com/${shop.instagram_handle.replace('@', '')}` : `https://instagram.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white border border-[#E5DDD0] text-espresso-800 hover:bg-[#FAF7F2] flex items-center justify-center shadow-2xs transition-all shrink-0"
              title="Instagram"
            >
              <Instagram className="w-4 h-4" />
            </a>

            <a
              href={shop.youtube_url || `https://youtube.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white border border-[#E5DDD0] text-espresso-800 hover:bg-[#FAF7F2] flex items-center justify-center shadow-2xs transition-all shrink-0"
              title="YouTube"
            >
              <Youtube className="w-4 h-4" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            {shop.maps_link ? (
              <a
                href={shop.maps_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white border border-[#E5DDD0] text-espresso-950 text-xs font-bold shadow-2xs hover:bg-[#FAF7F2] transition-all"
              >
                <MapPin className="w-3.5 h-3.5 text-espresso-700" />
                <span>Get Directions</span>
              </a>
            ) : shop.address ? (
              <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white border border-[#E5DDD0] text-espresso-950 text-xs font-bold shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-espresso-700 shrink-0" />
                <span className="truncate max-w-[160px]">{shop.address}</span>
              </div>
            ) : null}

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#241E1C] hover:bg-[#342B28] text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Share2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{copied ? 'Link Copied!' : 'Share Shop'}</span>
            </button>
          </div>
        </div>

        {/* STORE BIO / DESCRIPTION CALLOUT */}
        {(shop.description || shop.tagline || shop.address) && (
          <div className="border-l-2 border-[#C27835] pl-3.5 py-1 text-xs sm:text-sm text-espresso-800 leading-relaxed font-normal">
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
