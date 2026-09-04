'use client';

import React, { useState } from 'react';
import type { Database } from '@/types/database';
import { Bookmark, Sparkles, Eye, Flame } from 'lucide-react';
import { formatINR } from '@/lib/utils';

type ItemRow = Database['public']['Tables']['items']['Row'];

interface ProductCardProps {
  product: ItemRow;
  isSaved: boolean;
  onToggleSave: (e: React.MouseEvent) => void;
  onOpenDetail: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSaved,
  onToggleSave,
  onOpenDetail,
}) => {
  const [imageIdx, setImageIdx] = useState(0);

  const images = product.image_urls && product.image_urls.length > 0 
    ? product.image_urls 
    : ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800'];

  const discountPercent = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <div
      onClick={onOpenDetail}
      onMouseEnter={() => {
        if (images.length > 1) setImageIdx(1);
      }}
      onMouseLeave={() => {
        setImageIdx(0);
      }}
      className="group relative bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-ivory-200/90 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer select-none"
    >
      {/* 2-Column Mobile Image Container with 2nd Photo Peek */}
      <div className="relative w-full aspect-[4/4.8] overflow-hidden bg-ivory-100">
        <img
          src={images[imageIdx] || images[0]}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-all duration-500 ease-out"
          loading="lazy"
        />

        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/35 via-black/10 to-transparent pointer-events-none" />

        {/* Multi-Photo Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
            {images.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  imageIdx === i ? 'bg-white scale-125 shadow-xs' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Featured Tag */}
        {product.is_featured && (
          <div className="absolute top-2 left-2 bg-brand-500 text-espresso-950 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wider uppercase shadow-xs flex items-center gap-1 backdrop-blur-xs">
            <Sparkles className="w-2.5 h-2.5 fill-current" />
            <span>Featured</span>
          </div>
        )}

        {/* Scarcity Tag */}
        {product.scarcity_tag && (
          <div className="absolute top-2 left-2 bg-espresso-950/80 text-white px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide flex items-center gap-1 backdrop-blur-xs">
            <Flame className="w-2.5 h-2.5 text-brand-400 fill-brand-400" />
            <span>{product.scarcity_tag}</span>
          </div>
        )}

        {/* Out of Stock Overlay */}
        {!product.is_available && (
          <div className="absolute inset-0 bg-espresso-950/70 backdrop-blur-xs flex items-center justify-center p-2 text-center">
            <span className="bg-rose-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-rose-400 shadow-sm">
              Sold Out / Unavailable
            </span>
          </div>
        )}

        {/* Bookmark Heart */}
        <button
          onClick={onToggleSave}
          className={`absolute top-2 right-2 p-2 rounded-full transition-all duration-300 shadow-md active:scale-125 ${
            isSaved
              ? 'bg-brand-500 text-espresso-950 scale-110 ring-2 ring-brand-300'
              : 'bg-white/90 text-espresso-700 hover:bg-white hover:text-brand-600 hover:scale-105'
          }`}
          title={isSaved ? "Saved" : "Save"}
        >
          <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSaved ? 'fill-espresso-950 stroke-espresso-950' : 'stroke-[2.5]'}`} />
        </button>

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
            {discountPercent}% OFF
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between bg-white">
        <div>
          <h3 className="font-serif font-bold text-espresso-950 text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-espresso-500 text-[11px] mt-0.5 line-clamp-1">
              {product.description}
            </p>
          )}
        </div>

        {/* Price Tag with lightweight currency symbol */}
        <div className="mt-2.5 pt-2 border-t border-ivory-100 flex items-baseline justify-between gap-1">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <div className="flex items-baseline">
              <span className="font-sans text-xs font-semibold text-espresso-600 mr-0.5">₹</span>
              <span className="font-serif font-bold text-base sm:text-lg text-espresso-950 tracking-tight">
                {product.price.toLocaleString('en-IN')}
              </span>
            </div>

            {product.original_price && product.original_price > product.price && (
              <span className="text-[10px] sm:text-xs text-espresso-400 line-through truncate">
                {formatINR(product.original_price)}
              </span>
            )}
          </div>

          <span className="text-[10px] sm:text-[11px] font-bold text-brand-700 flex items-center gap-0.5 shrink-0 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200 group-hover:bg-brand-500 group-hover:text-espresso-950 transition-colors">
            <Eye className="w-3 h-3" />
            <span className="hidden xs:inline">Details</span>
          </span>
        </div>
      </div>
    </div>
  );
};
