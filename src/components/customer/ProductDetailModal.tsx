'use client';

import React, { useState } from 'react';
import type { Database } from '@/types/database';
import { 
  X, Bookmark, Share2, MessageCircle, ChevronLeft, 
  ChevronRight, Check, ArrowLeft, Sparkles, Flame 
} from 'lucide-react';
import { formatINR, copyTextToClipboard } from '@/lib/utils';

type ShopRow = Database['public']['Tables']['shops']['Row'];
type ItemRow = Database['public']['Tables']['items']['Row'];

interface ProductDetailModalProps {
  product: ItemRow | null;
  shop: ShopRow;
  isSaved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  shop,
  isSaved,
  onToggleSave,
  onClose,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedShare, setCopiedShare] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  if (!product) return null;

  const images = product.image_urls && product.image_urls.length > 0 
    ? product.image_urls 
    : ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800'];

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleShareProduct = async () => {
    const productUrl = `${window.location.origin}/store/${shop.id}#item-${product.id}`;
    const shareData = {
      title: product.name,
      text: `Check out ${product.name} at ${shop.name} for ${formatINR(product.price)}!`,
      url: productUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share && window.isSecureContext) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    const success = await copyTextToClipboard(productUrl);
    if (success) {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } else {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out ${product.name} at ${shop.name} (${formatINR(product.price)}): ${productUrl}`)}`;
      window.open(waUrl, '_blank');
    }
  };

  const promptText = customPrompt ? ` (${customPrompt})` : '';
  const inquiryMsg = encodeURIComponent(
    `Hello ${shop.name}! I am interested in purchasing "${product.name}" priced at ${formatINR(product.price)}${promptText}. Could you please confirm availability?`
  );

  const quickPrompts = [
    'Is trial available in-store?',
    'What sizes are in stock?',
    'Can you deliver today?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-espresso-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-ivory-200 my-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-4 py-3 border-b border-ivory-100 flex items-center justify-between bg-ivory-50">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-espresso-700 hover:text-espresso-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Catalog</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareProduct}
              className="p-2 text-espresso-600 hover:text-espresso-900 rounded-full hover:bg-ivory-200 transition-colors"
              title="Share item"
            >
              {copiedShare ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onToggleSave}
              className="p-2 text-espresso-600 hover:text-espresso-900 rounded-full hover:bg-ivory-200 transition-colors"
              title={isSaved ? "Saved" : "Save for later"}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-brand-600 text-brand-600' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-espresso-400 hover:text-espresso-800 rounded-full hover:bg-ivory-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Gallery Carousel */}
          <div className="relative bg-espresso-950 flex flex-col justify-center items-center select-none">
            <div className="relative w-full aspect-square overflow-hidden flex items-center justify-center">
              <img
                src={images[activeImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover transition-opacity duration-300"
              />

              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-espresso-950 shadow-md transition-all active:scale-90"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-espresso-950 shadow-md transition-all active:scale-90"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-mono">
                    {activeImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 p-2 overflow-x-auto w-full justify-center bg-espresso-900 border-t border-espresso-800">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      idx === activeImageIndex ? 'border-brand-500 scale-105' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {product.is_available ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ● In Stock
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Unavailable
                  </span>
                )}
                {product.is_featured && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-800 border border-brand-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Featured
                  </span>
                )}
                {product.scarcity_tag && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-espresso-900 text-white flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5 text-brand-400 fill-brand-400" />
                    {product.scarcity_tag}
                  </span>
                )}
              </div>

              <h2 className="font-serif text-xl sm:text-2xl font-bold text-espresso-950 leading-snug mb-1.5">
                {product.name}
              </h2>
              {product.description && (
                <p className="text-espresso-600 text-xs sm:text-sm leading-relaxed mb-4">
                  {product.description}
                </p>
              )}

              {/* Pricing */}
              <div className="flex items-baseline gap-2.5 mb-4 p-3 bg-ivory-50 rounded-2xl border border-ivory-200">
                <span className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950">
                  {formatINR(product.price)}
                </span>
                {product.original_price && product.original_price > product.price && (
                  <>
                    <span className="text-espresso-400 line-through text-xs sm:text-sm">
                      {formatINR(product.original_price)}
                    </span>
                    <span className="text-emerald-700 text-[11px] font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
                      {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                    </span>
                  </>
                )}
                {product.unit && (
                  <span className="text-xs text-espresso-500 font-medium ml-auto">
                    {product.unit}
                  </span>
                )}
              </div>

              {/* 1-Tap Quick Question Chips */}
              <div className="mb-4">
                <span className="text-[11px] font-bold text-espresso-500 uppercase tracking-wider block mb-1.5">
                  Quick Questions (Tap to add):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCustomPrompt(prompt === customPrompt ? '' : prompt)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                        customPrompt === prompt
                          ? 'bg-brand-500 text-espresso-950 font-bold shadow-xs'
                          : 'bg-ivory-100 text-espresso-700 hover:bg-ivory-200 border border-ivory-300'
                      }`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-3 border-t border-ivory-100">
              <a
                href={`https://wa.me/91${shop.whatsapp_number}?text=${inquiryMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-transform active:scale-[0.98]"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>Order / Inquire on WhatsApp</span>
              </a>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onToggleSave}
                  className={`w-full py-2.5 px-3 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 border transition-all ${
                    isSaved
                      ? 'bg-brand-50 text-brand-800 border-brand-300'
                      : 'bg-white text-espresso-800 border-ivory-300 hover:bg-ivory-100'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-brand-600 text-brand-600' : ''}`} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareProduct}
                  className="w-full py-2.5 px-3 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 bg-ivory-100 hover:bg-ivory-200 text-espresso-800 border border-ivory-300 transition-all active:scale-95"
                >
                  {copiedShare ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Share2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>{copiedShare ? 'Copied!' : 'Share Item'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
