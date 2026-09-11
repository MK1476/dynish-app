'use client';

import React from 'react';
import type { Database } from '@/types/database';
import { X, Trash2, ArrowRight, Bookmark, Send } from 'lucide-react';
import { formatINR, getAppBaseUrl } from '@/lib/utils';

type ShopRow = Database['public']['Tables']['shops']['Row'];
type ItemRow = Database['public']['Tables']['items']['Row'];

interface SavedItemsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shop: ShopRow;
  savedProducts: ItemRow[];
  onRemoveItem: (productId: string) => void;
  onSelectProduct: (product: ItemRow) => void;
}

export const SavedItemsDrawer: React.FC<SavedItemsDrawerProps> = ({
  isOpen,
  onClose,
  shop,
  savedProducts,
  onRemoveItem,
  onSelectProduct,
}) => {
  if (!isOpen) return null;

  const totalEstimate = savedProducts.reduce((sum, p) => sum + Number(p.price), 0);
  const storeUrl = `${getAppBaseUrl()}/store/${shop.slug || shop.id}`;
  const itemsList = savedProducts.map((p, i) => `${i + 1}. *${p.name}* — ${formatINR(p.price)}`).join('\n');
  const wishlistMessage = `Hi ${shop.name}! I'd like to check on a few things I saved from your catalog:\n\n${itemsList}\nTotal: ${formatINR(totalEstimate)}\n${storeUrl}\n\nAre these available?`;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-espresso-950/60 backdrop-blur-sm animate-fade-in flex justify-end">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col relative animate-slide-up sm:animate-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-ivory-200 flex items-center justify-between bg-ivory-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500 text-espresso-950 shadow-xs">
              <Bookmark className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="font-sans text-lg font-extrabold text-espresso-950">Saved Wishlist</h2>
              <p className="text-xs text-espresso-500">
                Shortlisted at <span className="font-semibold text-espresso-900">{shop.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-espresso-400 hover:text-espresso-800 rounded-full hover:bg-ivory-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
              <div className="w-20 h-20 rounded-3xl bg-ivory-100 border border-ivory-300 flex items-center justify-center text-brand-700 mb-4 shadow-inner">
                <Bookmark className="w-9 h-9 stroke-1 text-brand-600" />
              </div>
              <h3 className="font-sans text-xl font-extrabold text-espresso-950 mb-1">
                Your wishlist is empty
              </h3>
              <p className="text-espresso-500 text-xs sm:text-sm max-w-xs mb-6 leading-relaxed">
                Bookmark items to save them for your store visit or WhatsApp inquiry!
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-espresso-950 font-semibold text-xs sm:text-sm shadow-sm transition-transform active:scale-95 flex items-center gap-2"
              >
                <span>Explore Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-espresso-500 pb-1">
                <span>{savedProducts.length} {savedProducts.length === 1 ? 'item' : 'items'} saved</span>
                <span>Tap any item to view photo</span>
              </div>

              {savedProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-ivory-200 bg-white hover:border-brand-300 transition-all shadow-xs group"
                >
                  {product.image_urls && product.image_urls.length > 0 && product.image_urls[0] ? (
                    <img
                      src={product.image_urls[0]}
                      alt={product.name}
                      onClick={() => {
                        onSelectProduct(product);
                        onClose();
                      }}
                      className="w-16 h-16 rounded-xl object-cover cursor-pointer shrink-0 border border-ivory-200"
                    />
                  ) : (
                    <div
                      onClick={() => {
                        onSelectProduct(product);
                        onClose();
                      }}
                      className="w-16 h-16 rounded-xl bg-gradient-to-br from-ivory-100 to-brand-50 border border-ivory-200 shrink-0 flex items-center justify-center cursor-pointer select-none"
                    >
                      <span className="font-sans font-black text-brand-900 text-sm">
                        {product.name.trim().slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      onSelectProduct(product);
                      onClose();
                    }}
                  >
                    <h4 className="font-sans font-bold text-espresso-950 text-sm truncate group-hover:text-brand-700 transition-colors">
                      {product.name}
                    </h4>
                    {product.description && (
                      <p className="text-espresso-500 text-xs truncate mb-1">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="font-sans font-bold text-espresso-950 text-sm">
                        {formatINR(product.price)}
                      </span>
                      {product.original_price && product.original_price > product.price && (
                        <span className="text-espresso-400 line-through text-[11px]">
                          {formatINR(product.original_price)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveItem(product.id)}
                    className="p-2 text-espresso-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer with Total and Batch WhatsApp Order */}
        {savedProducts.length > 0 && (
          <div className="p-4 border-t border-ivory-200 bg-ivory-50 space-y-2.5">
            <div className="flex items-baseline justify-between px-1">
              <span className="text-xs font-semibold text-espresso-600">
                Estimated Total ({savedProducts.length} items):
              </span>
              <span className="font-sans font-bold text-base sm:text-lg text-espresso-950">
                {formatINR(totalEstimate)}
              </span>
            </div>

            <a
              href={`https://wa.me/91${shop.whatsapp_number}?text=${encodeURIComponent(wishlistMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Send Complete Wishlist via WhatsApp</span>
            </a>

            <p className="text-[10px] text-center text-espresso-400">
              The shopkeeper will receive your full shortlisted item list to verify sizes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
