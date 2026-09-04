'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Database } from '@/types/database';
import { ShopHero } from '@/components/customer/ShopHero';
import { ProductCard } from '@/components/customer/ProductCard';
import { ProductDetailModal } from '@/components/customer/ProductDetailModal';
import { SavedItemsDrawer } from '@/components/customer/SavedItemsDrawer';
import { Search, X, Sparkles } from 'lucide-react';

type ShopRow = Database['public']['Tables']['shops']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type ItemRow = Database['public']['Tables']['items']['Row'];

interface StorefrontClientProps {
  shop: ShopRow;
  categories: CategoryRow[];
  items: ItemRow[];
}

export const StorefrontClient: React.FC<StorefrontClientProps> = ({
  shop,
  categories,
  items,
}) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<ItemRow | null>(null);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState<boolean>(false);
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);

  const isClickScrollingRef = useRef(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Load bookmarks from localStorage per shopId
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`dynish_saved_${shop.id}`);
      if (stored) {
        setSavedItemIds(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not read localStorage:', e);
    }
  }, [shop.id]);

  const toggleSaveProduct = (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedItemIds((prev) => {
      const next = prev.includes(productId) 
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      try {
        localStorage.setItem(`dynish_saved_${shop.id}`, JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  // Group items by category
  const categorySections = useMemo(() => {
    return categories.map((cat) => ({
      category: cat,
      items: items.filter((p) => p.category_id === cat.id && p.is_available),
    })).filter((sec) => sec.items.length > 0);
  }, [categories, items]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return items.filter((p) => 
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // SCROLLSPY: Auto-select category chip on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isClickScrollingRef.current || searchQuery.trim()) return;

      const scrollPos = window.scrollY + 180;
      const firstSection = document.getElementById(`cat-sec-${categorySections[0]?.category.id}`);
      if (firstSection && window.scrollY < firstSection.offsetTop - 150) {
        setActiveCategoryId('all');
        return;
      }

      for (let i = categorySections.length - 1; i >= 0; i--) {
        const sec = document.getElementById(`cat-sec-${categorySections[i].category.id}`);
        if (sec && sec.offsetTop <= scrollPos) {
          const currentId = categorySections[i].category.id;
          setActiveCategoryId(currentId);

          const activePill = document.getElementById(`cat-pill-${currentId}`);
          if (activePill && categoryScrollRef.current) {
            activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categorySections, searchQuery]);

  const handleCategoryClick = (catId: string) => {
    setActiveCategoryId(catId);
    isClickScrollingRef.current = true;

    if (catId === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const targetElement = document.getElementById(`cat-sec-${catId}`);
      if (targetElement) {
        const headerOffset = 65;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }

    setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 600);
  };

  const savedProducts = useMemo(() => {
    return items.filter((item) => savedItemIds.includes(item.id));
  }, [items, savedItemIds]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32">
      {/* SHOP HERO */}
      <ShopHero
        shop={shop}
        savedCount={savedItemIds.length}
        onOpenSavedItems={() => setIsSavedDrawerOpen(true)}
      />

      {/* SEARCH RESULTS VIEW */}
      {searchQuery.trim() ? (
        <div className="max-w-4xl mx-auto px-3.5 sm:px-4 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-bold text-espresso-950">
              Search results for "{searchQuery}"
            </h2>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-brand-700 font-semibold hover:underline"
            >
              Clear Search
            </button>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-ivory-200">
              <Search className="w-8 h-8 text-espresso-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-espresso-800">No items match your search</p>
              <p className="text-xs text-espresso-500 mt-1">Try another keyword or browse categories</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              {filteredItems.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  isSaved={savedItemIds.includes(prod.id)}
                  onToggleSave={(e) => toggleSaveProduct(prod.id, e)}
                  onOpenDetail={() => setSelectedProduct(prod)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD CATEGORY SECTIONS */
        <div className="max-w-4xl mx-auto px-3.5 sm:px-4 pt-5 space-y-8">
          {categorySections.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-ivory-200">
              <Sparkles className="w-8 h-8 text-brand-500 mx-auto mb-2" />
              <h3 className="font-serif text-base font-bold text-espresso-950">Catalog Updating</h3>
              <p className="text-xs text-espresso-500 mt-1">The store owner is currently curating pieces. Check back soon!</p>
            </div>
          ) : (
            categorySections.map((section) => (
              <section
                key={section.category.id}
                id={`cat-sec-${section.category.id}`}
                className="scroll-mt-20"
              >
                <div className="flex items-center justify-between mb-3 border-b border-ivory-200 pb-1.5">
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-espresso-950 flex items-center gap-2">
                    <span>{section.category.name}</span>
                    <span className="text-xs text-espresso-400 font-sans font-normal">
                      ({section.items.length})
                    </span>
                  </h2>
                </div>

                {/* 2-COLUMN MOBILE GRID */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                  {section.items.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      isSaved={savedItemIds.includes(prod.id)}
                      onToggleSave={(e) => toggleSaveProduct(prod.id, e)}
                      onOpenDetail={() => setSelectedProduct(prod)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {/* STICKY BOTTOM DOCK (Category Menu & Fast Search) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-ivory-300 p-2 sm:p-2.5 shadow-lg">
        <div className="max-w-4xl mx-auto">
          {isSearchActive && (
            <div className="mb-2 flex items-center gap-2 animate-scale-in">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-espresso-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search kurtis, specs, biryani..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-ivory-50 border border-ivory-300 text-xs text-espresso-900 focus:outline-none focus:border-brand-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-espresso-400 hover:text-espresso-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setIsSearchActive(false);
                  setSearchQuery('');
                }}
                className="p-1.5 text-espresso-500 hover:text-espresso-800 rounded-lg hover:bg-ivory-100 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Bottom Category Scrollable Chips */}
          <div 
            ref={categoryScrollRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
          >
            <button
              onClick={() => setIsSearchActive(!isSearchActive)}
              className={`p-2 rounded-xl shrink-0 transition-all ${
                isSearchActive || searchQuery
                  ? 'bg-brand-500 text-espresso-950 font-bold shadow-xs'
                  : 'bg-ivory-100 text-espresso-700 hover:bg-ivory-200 border border-ivory-300'
              }`}
              title="Search catalog"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              id="cat-pill-all"
              onClick={() => handleCategoryClick('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                activeCategoryId === 'all'
                  ? 'bg-espresso-950 text-white shadow-sm scale-105'
                  : 'bg-ivory-100 text-espresso-700 hover:bg-ivory-200 border border-ivory-300'
              }`}
            >
              All Items ({items.length})
            </button>

            {categories.map((cat) => {
              const count = items.filter((p) => p.category_id === cat.id && p.is_available).length;
              const isActive = activeCategoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  id={`cat-pill-${cat.id}`}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                    isActive
                      ? 'bg-espresso-950 text-white shadow-sm font-bold scale-105 ring-2 ring-brand-400'
                      : 'bg-ivory-100 text-espresso-700 hover:bg-ivory-200 border border-ivory-300'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Powered By Dynish Footer */}
      <footer className="mt-8 mb-24 text-center py-6 border-t border-ivory-200">
        <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white border border-ivory-200 shadow-2xs">
          <img src="/dynish-logo.png" alt="Dynish" className="w-5 h-5 object-contain" />
          <span className="text-[11px] font-semibold text-espresso-600">
            Powered by <strong className="font-bold text-espresso-950">Dynish</strong> • Fast Storefront & Instant Counter
          </span>
        </div>
      </footer>

      {/* Modals & Wishlist Drawer */}
      <ProductDetailModal
        product={selectedProduct}
        shop={shop}
        isSaved={selectedProduct ? savedItemIds.includes(selectedProduct.id) : false}
        onToggleSave={() => {
          if (selectedProduct) toggleSaveProduct(selectedProduct.id);
        }}
        onClose={() => setSelectedProduct(null)}
      />

      <SavedItemsDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        shop={shop}
        savedProducts={savedProducts}
        onRemoveItem={(id) => toggleSaveProduct(id)}
        onSelectProduct={(prod) => setSelectedProduct(prod)}
      />
    </div>
  );
};
