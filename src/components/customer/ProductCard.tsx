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
      className="group relative bg-white rounded-3xl overflow-hidden border border-[#EBE5DA] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer select-none"
    >
      {/* 2-Column Square Image Container */}
      <div className="relative w-full aspect-square overflow-hidden bg-[#FAF7F2]">
        <img
          src={images[imageIdx] || images[0]}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-all duration-500 ease-out"
          loading="lazy"
        />

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
          <div className="absolute top-2.5 left-2.5 bg-[#C27835] text-white px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase shadow-xs flex items-center gap-1 backdrop-blur-xs">
            <Sparkles className="w-2.5 h-2.5 fill-current" />
            <span>Featured</span>
          </div>
        )}

        {/* Scarcity Tag */}
        {product.scarcity_tag && (
          <div className="absolute top-2.5 left-2.5 bg-espresso-950/80 text-white px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide flex items-center gap-1 backdrop-blur-xs">
            <Flame className="w-2.5 h-2.5 text-brand-400 fill-brand-400" />
            <span>{product.scarcity_tag}</span>
          </div>
        )}

        {/* Out of Stock Overlay */}
        {!product.is_available && (
          <div className="absolute inset-0 bg-espresso-950/70 backdrop-blur-xs flex items-center justify-center p-2 text-center">
            <span className="bg-rose-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-rose-400 shadow-sm">
              Sold Out
            </span>
          </div>
        )}

        {/* Bookmark Heart / Bookmark Ribbon */}
        <button
          onClick={onToggleSave}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full transition-all duration-300 shadow-xs active:scale-125 ${
            isSaved
              ? 'bg-[#C27835] text-white scale-105'
              : 'bg-white/90 backdrop-blur-sm text-espresso-700 hover:bg-white hover:text-[#C27835]'
          }`}
          title={isSaved ? "Saved" : "Save"}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-white stroke-white' : 'stroke-[2.2]'}`} />
        </button>

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute bottom-2 left-2 bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
            {discountPercent}% OFF
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between bg-white">
        <div>
          <h3 className="font-serif font-bold text-espresso-950 text-sm leading-snug truncate group-hover:text-[#C27835] transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-espresso-500 text-[11px] mt-0.5 line-clamp-1">
              {product.description}
            </p>
          )}
        </div>

        {/* Price Row */}
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-serif font-bold text-base text-espresso-950 tracking-tight">
            ₹{product.price.toLocaleString('en-IN')}
          </span>

          {product.original_price && product.original_price > product.price && (
            <span className="text-[11px] text-espresso-400 line-through">
              ₹{product.original_price.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
