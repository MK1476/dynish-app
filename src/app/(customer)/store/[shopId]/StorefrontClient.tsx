'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Database } from '@/types/database';
import { ShopHero } from '@/components/customer/ShopHero';
import { ProductCard } from '@/components/customer/ProductCard';
import { ProductDetailModal } from '@/components/customer/ProductDetailModal';
import { SavedItemsDrawer } from '@/components/customer/SavedItemsDrawer';
import { Search, X, Sparkles, ArrowDownUp } from 'lucide-react';

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
  const [priceSort, setPriceSort] = useState<'default' | 'asc' | 'desc'>('default');
  const [maxBudget, setMaxBudget] = useState<number | null>(null);

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

  const processItems = (itemList: ItemRow[]) => {
    let result = itemList.filter(i => i.is_available);
    if (maxBudget !== null) {
      result = result.filter(i => i.price <= maxBudget);
    }
    if (priceSort === 'asc') {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (priceSort === 'desc') {
      result = [...result].sort((a, b) => b.price - a.price);
    }
    return result;
  };

  // Group items by category
  const categorySections = useMemo(() => {
    return categories.map((cat) => ({
      category: cat,
      items: processItems(items.filter((p) => p.category_id === cat.id)),
    })).filter((sec) => sec.items.length > 0);
  }, [categories, items, priceSort, maxBudget]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matched = items.filter((p) => 
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
    return processItems(matched);
  }, [items, searchQuery, priceSort, maxBudget]);

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
    <div className="min-h-screen bg-[#FAF7F2] pb-32">
      {/* SHOP HERO */}
      <ShopHero
        shop={shop}
        savedCount={savedItemIds.length}
        onOpenSavedItems={() => setIsSavedDrawerOpen(true)}
      />

      {/* FILTER & SORT TOOLBAR */}
      <div className="bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#EBE5DA] sticky top-0 z-20 px-3.5 sm:px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Sort Toggle */}
            <button
              onClick={() => {
                if (priceSort === 'default') setPriceSort('asc');
                else if (priceSort === 'asc') setPriceSort('desc');
                else setPriceSort('default');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                priceSort !== 'default'
                  ? 'bg-[#241E1C] text-white shadow-xs'
                  : 'bg-white border border-[#E5DDD0] text-espresso-700 hover:bg-[#FAF7F2]'
              }`}
            >
              <ArrowDownUp className="w-3 h-3" />
              <span>
                {priceSort === 'asc' ? 'Price: Low → High' : priceSort === 'desc' ? 'Price: High → Low' : 'Sort Price'}
              </span>
            </button>

            {/* Quick Budget Chips */}
            {[
              { label: 'Under ₹200', max: 200 },
              { label: 'Under ₹500', max: 500 },
              { label: 'Under ₹1,000', max: 1000 },
            ].map((b) => {
              const isSelected = maxBudget === b.max;
              return (
                <button
                  key={b.max}
                  onClick={() => setMaxBudget(isSelected ? null : b.max)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-[#C27835] text-white font-bold shadow-xs'
                      : 'bg-white border border-[#E5DDD0] text-espresso-700 hover:bg-[#FAF7F2]'
                  }`}
                >
                  {b.label}
                </button>
              );
            })}

            {(priceSort !== 'default' || maxBudget !== null) && (
              <button
                onClick={() => {
                  setPriceSort('default');
                  setMaxBudget(null);
                }}
                className="text-xs text-espresso-400 hover:text-rose-600 font-bold px-1.5"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH RESULTS VIEW */}
      {searchQuery.trim() ? (
        <div className="max-w-4xl mx-auto px-3.5 sm:px-4 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-bold text-espresso-950">
              Search results for "{searchQuery}"
            </h2>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#C27835] font-semibold hover:underline"
            >
              Clear Search
            </button>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#EBE5DA]">
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
        <div className="max-w-4xl mx-auto px-3.5 sm:px-4 pt-4 space-y-6">
          {/* Top Category Filter Pills matching Image 2 */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => handleCategoryClick('all')}
              className={`px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all ${
                activeCategoryId === 'all'
                  ? 'bg-[#241E1C] text-white shadow-xs font-bold'
                  : 'bg-white border border-[#E5DDD0] text-espresso-800 hover:bg-[#FAF7F2]'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all ${
                  activeCategoryId === cat.id
                    ? 'bg-[#241E1C] text-white shadow-xs font-bold'
                    : 'bg-white border border-[#E5DDD0] text-espresso-800 hover:bg-[#FAF7F2]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {categorySections.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#EBE5DA]">
              <Sparkles className="w-8 h-8 text-[#C27835] mx-auto mb-2" />
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

      {/* FLOATING BOTTOM DOCK (MATCHING SCREENSHOT) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[94vw] w-auto">
        {isSearchActive ? (
          <div className="bg-white/95 backdrop-blur-md rounded-full border border-[#E5DDD0] shadow-2xl p-1.5 flex items-center gap-2 animate-scale-in">
            <div className="relative flex-1 min-w-[220px] sm:min-w-[320px]">
              <Search className="w-3.5 h-3.5 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search items, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-full bg-[#FAF7F2] border border-[#E5DDD0] text-xs text-espresso-900 focus:outline-none focus:border-[#C27835]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-espresso-400 hover:text-espresso-700"
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
              className="px-3 py-1.5 rounded-full text-espresso-600 hover:text-espresso-950 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-md rounded-full border border-[#E5DDD0] shadow-xl p-1.5 flex items-center gap-1">
            <button
              onClick={() => setIsSearchActive(true)}
              className="p-2.5 rounded-full text-espresso-700 hover:text-espresso-950 hover:bg-black/5 transition-all shrink-0"
              title="Search catalog"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              id="cat-pill-all"
              onClick={() => handleCategoryClick('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                activeCategoryId === 'all'
                  ? 'bg-[#241E1C] text-white shadow-xs'
                  : 'text-espresso-700 hover:text-espresso-950 hover:bg-black/5'
              }`}
            >
              All
            </button>

            {categories.map((cat) => {
              const isActive = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`cat-pill-${cat.id}`}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                    isActive
                      ? 'bg-[#241E1C] text-white shadow-xs font-bold'
                      : 'text-espresso-700 hover:text-espresso-950 hover:bg-black/5'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
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
