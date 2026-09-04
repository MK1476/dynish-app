'use client';

import React, { useState, useEffect } from 'react';
import type { Database } from '@/types/database';
import { 
  MessageCircle, Instagram, Youtube, MapPin, Share2, 
  Bookmark, Sparkles, CheckCircle2 
} from 'lucide-react';

type ShopRow = Database['public']['Tables']['shops']['Row'];

interface ShopHeroProps {
  shop: ShopRow;
  savedCount: number;
  onOpenSavedItems: () => void;
}

import { copyTextToClipboard } from '@/lib/utils';

export const ShopHero: React.FC<ShopHeroProps> = ({ shop, savedCount, onOpenSavedItems }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 130);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: shop.name,
      text: `Visit ${shop.name} on Dynish!`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share && window.isSecureContext) {
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

  const logoUrl = shop.logo_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=300';
  const bannerUrl = shop.banner_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200';

  return (
    <div className="relative bg-white border-b border-ivory-200">
      
      {/* SCROLL-TRIGGERED STICKY TOP BAR */}
      <div 
        className={`fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md px-3.5 sm:px-4 py-2.5 border-b border-ivory-200 shadow-md transition-all duration-300 transform ${
          isScrolled 
            ? 'translate-y-0 opacity-100' 
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img 
              src={logoUrl} 
              alt={shop.name} 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-brand-400 shrink-0"
            />
            <div className="min-w-0">
              <span className="font-serif font-bold text-espresso-950 text-xs sm:text-sm truncate block">
                {shop.name}
              </span>
              <span className="text-[10px] text-espresso-500 font-medium truncate block">
                {shop.category}
              </span>
            </div>
          </div>

          <button
            onClick={onOpenSavedItems}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 hover:bg-brand-100 border border-brand-300 text-espresso-900 text-xs font-bold transition-all shrink-0 active:scale-95 shadow-xs"
          >
            <Bookmark className={`w-3.5 h-3.5 ${savedCount > 0 ? 'fill-brand-600 text-brand-600' : 'text-espresso-700'}`} />
            <span>{savedCount > 0 ? `${savedCount} Saved` : 'Saved'}</span>
          </button>
        </div>
      </div>

      {/* Cover Banner */}
      <div className="relative h-32 sm:h-48 w-full overflow-hidden bg-espresso-950">
        <img
          src={bannerUrl}
          alt={shop.name}
          className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-espresso-950/75 via-espresso-950/20 to-black/20" />
      </div>

      {/* Shop Identity Profile */}
      <div className="px-3.5 sm:px-4 pb-4 max-w-4xl mx-auto">
        
        {/* Logo and Name Row */}
        <div className="flex items-start gap-3 sm:gap-4 -mt-10 sm:-mt-14 mb-3">
          
          <div className="relative shrink-0">
            <img
              src={logoUrl}
              alt={shop.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl object-cover ring-4 ring-white shadow-card bg-white"
            />
            <div className="absolute -bottom-1 -right-1 bg-brand-500 text-espresso-950 p-1 rounded-lg shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="min-w-0 pt-10 sm:pt-14 flex-1 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-serif text-xl sm:text-2xl font-bold text-espresso-950 tracking-tight leading-tight">
                  {shop.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-800 border border-brand-200 shrink-0">
                  {shop.category}
                </span>
              </div>

              {/* Verified Merchant Badge */}
              <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100 shrink-0" />
                <span className="truncate font-semibold">Verified Artisan Store • Genuine Quality</span>
              </div>

              {/* Address */}
              <div className="flex items-center gap-1 text-[11px] text-espresso-500 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span className="truncate">{shop.address}</span>
              </div>
            </div>

            {/* Saved Items Pill */}
            <button
              onClick={onOpenSavedItems}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ivory-100 hover:bg-brand-50 border border-ivory-300 text-espresso-800 text-xs font-bold transition-all shrink-0 active:scale-95"
            >
              <Bookmark className={`w-3.5 h-3.5 ${savedCount > 0 ? 'fill-brand-600 text-brand-600' : 'text-espresso-600'}`} />
              <span className="hidden xs:inline">{savedCount > 0 ? `${savedCount} Saved` : 'Saved'}</span>
              <span className="xs:hidden font-bold">{savedCount}</span>
            </button>
          </div>
        </div>

        {/* Tagline */}
        {shop.tagline && (
          <p className="text-espresso-600 text-xs sm:text-sm leading-relaxed mb-3.5 font-normal">
            {shop.tagline}
          </p>
        )}

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-ivory-100">
          <a
            href={`https://wa.me/91${shop.whatsapp_number}?text=${encodeURIComponent(`Hi ${shop.name}, I am viewing your digital catalog on Dynish!`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold shadow-xs shrink-0 active:scale-95 transition-transform"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span>Chat on WhatsApp</span>
          </a>

          {shop.maps_link && (
            <a
              href={shop.maps_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-800 text-xs font-medium border border-ivory-300 shrink-0"
            >
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              <span>Directions</span>
            </a>
          )}

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-espresso-900 hover:bg-espresso-800 text-white text-xs font-semibold shadow-xs shrink-0 active:scale-95 transition-all"
          >
            {copied ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Share2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{copied ? 'Link Copied!' : 'Share Shop'}</span>
          </button>
        </div>

        {/* Floating Copied Toast */}
        {copied && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-espresso-950/95 backdrop-blur-md text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-brand-500/50 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
            <span>Storefront link copied! Paste anywhere to share.</span>
          </div>
        )}

      </div>
    </div>
  );
};
