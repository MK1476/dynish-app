'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Database } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { ShopHero } from '@/components/customer/ShopHero';
import { ProductCard } from '@/components/customer/ProductCard';
import { ProductDetailModal } from '@/components/customer/ProductDetailModal';
import { SavedItemsDrawer } from '@/components/customer/SavedItemsDrawer';
import { Search, X, Sparkles, ArrowDownUp, LayoutGrid, Check, Bookmark } from 'lucide-react';

type ShopRow = Database['public']['Tables']['shops']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type ItemRow = Database['public']['Tables']['items']['Row'];

interface StorefrontClientProps {
  shop: ShopRow;
  categories: CategoryRow[];
  items: ItemRow[];
  initialItemId?: string | null;
}

export const StorefrontClient: React.FC<StorefrontClientProps> = ({
  shop,
  categories: initialCategories,
  items: initialItems,
  initialItemId,
}) => {
  const [currentCategories, setCurrentCategories] = useState<CategoryRow[]>(initialCategories);
  const [currentItems, setCurrentItems] = useState<ItemRow[]>(initialItems);

  // Sync if initial server props change
  useEffect(() => {
    setCurrentCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    setCurrentItems(initialItems);
  }, [initialItems]);

  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<ItemRow | null>(() => {
    if (initialItemId) {
      const match = initialItems.find((i) => i.id === initialItemId);
      if (match) return match;
    }
    return null;
  });

  const openProductDetail = (prod: ItemRow) => {
    setSelectedProduct(prod);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('item', prod.id);
        window.history.replaceState(null, '', url.pathname + url.search);
      } catch (e) {}
    }
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('item');
        if (url.hash.startsWith('#item-')) {
          url.hash = '';
        }
        const cleanUrl = url.pathname + (url.search ? url.search : '');
        window.history.replaceState(null, '', cleanUrl);
      } catch (e) {}
    }
  };

  // Deep-linking URL detector & browser back/forward support
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkUrlForItem = () => {
      const sp = new URLSearchParams(window.location.search);
      const itemParam = sp.get('item');
      const hashMatch = window.location.hash.match(/^#item-(.+)$/);
      const targetId = itemParam || (hashMatch ? hashMatch[1] : null) || initialItemId;

      if (targetId && currentItems.length > 0) {
        const found = currentItems.find((i) => i.id === targetId);
        if (found) {
          setSelectedProduct(found);
        }
      }
    };

    checkUrlForItem();

    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const popItemId = sp.get('item');
      if (popItemId) {
        const found = currentItems.find((i) => i.id === popItemId);
        if (found) setSelectedProduct(found);
      } else {
        setSelectedProduct(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentItems, initialItemId]);

  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState<boolean>(false);
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);
  const [priceSort, setPriceSort] = useState<'default' | 'asc' | 'desc'>('default');
  const [maxBudget, setMaxBudget] = useState<number | null>(null);

  const isClickScrollingRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // REALTIME SYNCHRONIZATION: Sub-second Supabase channel + focus sync + fallback poll
  useEffect(() => {
    const supabase = createClient();

    const fetchLatestCatalog = async () => {
      try {
        const [itemRes, catRes] = await Promise.all([
          supabase
            .from('items')
            .select('*')
            .eq('shop_id', shop.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('categories')
            .select('*')
            .eq('shop_id', shop.id)
            .order('sort_order', { ascending: true }),
        ]);

        if (itemRes.data) {
          setCurrentItems(itemRes.data);
        }
        if (catRes.data) {
          setCurrentCategories(catRes.data);
        }
      } catch (e) {
        console.error('Realtime sync error:', e);
      }
    };

    const channel = supabase
      .channel(`storefront-live-${shop.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `shop_id=eq.${shop.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as ItemRow;
            setCurrentItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as ItemRow;
            setCurrentItems((prev) =>
              prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
            );
            setSelectedProduct((curr) =>
              curr?.id === updatedItem.id ? updatedItem : curr
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setCurrentItems((prev) => prev.filter((i) => i.id !== deletedId));
            setSelectedProduct((curr) =>
              curr?.id === deletedId ? null : curr
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `shop_id=eq.${shop.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCat = payload.new as CategoryRow;
            setCurrentCategories((prev) => [...prev.filter((c) => c.id !== newCat.id), newCat]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedCat = payload.new as CategoryRow;
            setCurrentCategories((prev) =>
              prev.map((c) => (c.id === updatedCat.id ? updatedCat : c))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setCurrentCategories((prev) => prev.filter((c) => c.id !== deletedId));
          }
        }
      )
      .subscribe();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLatestCatalog();
      }
    };

    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', fetchLatestCatalog);

    // Fallback periodic sync every 8 seconds
    const interval = setInterval(fetchLatestCatalog, 8000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', fetchLatestCatalog);
      clearInterval(interval);
    };
  }, [shop.id]);

  const handleSearchFocus = () => {
    const header = document.getElementById('storefront-sticky-header');
    if (header) {
      const topPos = header.getBoundingClientRect().top + window.pageYOffset - 10;
      window.scrollTo({ top: topPos, behavior: 'smooth' });
    }
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 450);
  };

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

  // Category ID -> Name lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    currentCategories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [currentCategories]);

  // Global sorted items across the entire catalog (used when priceSort !== 'default')
  const globalSortedItems = useMemo(() => {
    return processItems(currentItems);
  }, [currentItems, priceSort, maxBudget]);

  // Group items by category (used for default categorized view)
  const categorySections = useMemo(() => {
    return currentCategories.map((cat) => ({
      category: cat,
      items: processItems(currentItems.filter((p) => p.category_id === cat.id)),
    })).filter((sec) => sec.items.length > 0);
  }, [currentCategories, currentItems, priceSort, maxBudget]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matched = currentItems.filter((p) => 
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
    return processItems(matched);
  }, [currentItems, searchQuery, priceSort, maxBudget]);

  // SCROLLSPY: Auto-select category on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isClickScrollingRef.current || searchQuery.trim() || priceSort !== 'default') return;

      const scrollPos = window.scrollY + 140;
      const firstSection = document.getElementById(`cat-sec-${categorySections[0]?.category.id}`);
      if (firstSection && window.scrollY < firstSection.offsetTop - 120) {
        setActiveCategoryId('all');
        return;
      }

      for (let i = categorySections.length - 1; i >= 0; i--) {
        const sec = document.getElementById(`cat-sec-${categorySections[i].category.id}`);
        if (sec && sec.offsetTop <= scrollPos) {
          const currentId = categorySections[i].category.id;
          setActiveCategoryId(currentId);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categorySections, searchQuery, priceSort]);

  const handleCategoryClick = (catId: string) => {
    if (priceSort !== 'default') {
      setPriceSort('default');
    }
    setActiveCategoryId(catId);
    isClickScrollingRef.current = true;

    if (catId === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Delay slightly to allow DOM to re-render category sections if sort was previously active
      setTimeout(() => {
        const targetElement = document.getElementById(`cat-sec-${catId}`);
        if (targetElement) {
          const headerOffset = 115;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      }, 50);
    }

    setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 600);
  };

  const savedProducts = useMemo(() => {
    return currentItems.filter((item) => savedItemIds.includes(item.id));
  }, [currentItems, savedItemIds]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-32">
      {/* SHOP HERO */}
      <ShopHero
        shop={shop}
        savedCount={savedItemIds.length}
        onOpenSavedItems={() => setIsSavedDrawerOpen(true)}
        onSearchClick={handleSearchFocus}
      />

      {/* STICKY TOP HEADER: SEARCH BAR + FILTER ROW (STICKS ON TOP WHILE SCROLLING) */}
      <div 
        id="storefront-sticky-header" 
        className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EBE5DA] shadow-xs"
      >
        {/* ROW 1: SEARCH BAR & QUICK ACCESS */}
        <div className="max-w-4xl mx-auto px-3.5 sm:px-4 pt-2.5 pb-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search in ${shop.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-full bg-white border border-[#E5DDD0] text-xs sm:text-sm text-espresso-950 placeholder:text-espresso-400 focus:outline-none focus:border-[#C27835] focus:ring-2 focus:ring-[#C27835]/15 shadow-2xs transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-espresso-400 hover:text-espresso-800 hover:bg-black/5 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bookmark / Wishlist Quick Button */}
          <button
            type="button"
            onClick={() => setIsSavedDrawerOpen(true)}
            className="p-2.5 rounded-full bg-white border border-[#E5DDD0] text-espresso-700 hover:text-[#C27835] hover:border-[#C27835] shadow-2xs transition-all shrink-0 relative"
            title="Saved items"
          >
            <Bookmark className={`w-4 h-4 ${savedItemIds.length > 0 ? 'fill-[#C27835] text-[#C27835]' : ''}`} />
            {savedItemIds.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#C27835] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-sans shadow-xs">
                {savedItemIds.length}
              </span>
            )}
          </button>
        </div>

        {/* ROW 2: FILTERS & SORT ROW */}
        <div className="max-w-4xl mx-auto px-3.5 sm:px-4 pb-2.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
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
            <h2 className="font-sans text-lg font-extrabold text-espresso-950">
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
                  categoryName={categoryMap.get(prod.category_id)}
                  isSaved={savedItemIds.includes(prod.id)}
                  onToggleSave={(e) => toggleSaveProduct(prod.id, e)}
                  onOpenDetail={() => openProductDetail(prod)}
                />
              ))}
            </div>
          )}
        </div>
      ) : priceSort !== 'default' ? (
        /* GLOBAL WHOLE-CATALOG PRICE SORTED VIEW (ORDERED HIGH TO LOW OR LOW TO HIGH GLOBALLY) */
        <div className="max-w-4xl mx-auto px-3.5 sm:px-4 pt-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-ivory-200">
            <div>
              <h2 className="font-sans text-lg sm:text-xl font-extrabold text-espresso-950 flex items-center gap-2">
                <span>Whole Store Catalog</span>
                <span className="text-[11px] font-bold text-white bg-espresso-950 px-2.5 py-0.5 rounded-full shadow-2xs">
                  {priceSort === 'asc' ? '₹ Low → High' : '₹ High → Low'}
                </span>
              </h2>
              <p className="text-xs text-espresso-500 mt-0.5">
                All {globalSortedItems.length} products sorted by price across all departments
              </p>
            </div>

            <button
              onClick={() => setPriceSort('default')}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#E5DDD0] text-xs font-bold text-espresso-800 hover:bg-[#FAF7F2] shadow-2xs transition-colors"
            >
              Reset to Categories
            </button>
          </div>

          {globalSortedItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#EBE5DA]">
              <Sparkles className="w-8 h-8 text-[#C27835] mx-auto mb-2" />
              <h3 className="font-sans text-base font-extrabold text-espresso-950">No items match this filter</h3>
              <p className="text-xs text-espresso-500 mt-1">Try resetting the budget filter or sort order.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              {globalSortedItems.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  categoryName={categoryMap.get(prod.category_id)}
                  isSaved={savedItemIds.includes(prod.id)}
                  onToggleSave={(e) => toggleSaveProduct(prod.id, e)}
                  onOpenDetail={() => openProductDetail(prod)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD CATEGORY SECTIONS */
        <div className="max-w-4xl mx-auto px-3.5 sm:px-4 pt-4 space-y-6">
          {categorySections.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#EBE5DA]">
              <Sparkles className="w-8 h-8 text-[#C27835] mx-auto mb-2" />
              <h3 className="font-sans text-base font-extrabold text-espresso-950">Catalog Updating</h3>
              <p className="text-xs text-espresso-500 mt-1">The store owner is currently curating pieces. Check back soon!</p>
            </div>
          ) : (
            categorySections.map((section) => (
              <section
                key={section.category.id}
                id={`cat-sec-${section.category.id}`}
                className="scroll-mt-28"
              >
                <div className="flex items-center justify-between mb-3 border-b border-ivory-200 pb-1.5">
                  <h2 className="font-sans text-lg sm:text-xl font-extrabold text-espresso-950 flex items-center gap-2">
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
                      categoryName={categoryMap.get(prod.category_id)}
                      isSaved={savedItemIds.includes(prod.id)}
                      onToggleSave={(e) => toggleSaveProduct(prod.id, e)}
                      onOpenDetail={() => openProductDetail(prod)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {/* FLOATING ACTION DOCK: QUICK SEARCH + MENU / CLOSE FAB */}
      <div className="fixed bottom-5 right-4 sm:right-6 z-50 flex items-center gap-2">
        {/* Quick Search Floating Button (when modal is closed) */}
        {!isCategoryModalOpen && (
          <button
            type="button"
            onClick={handleSearchFocus}
            className="w-10 h-10 rounded-full bg-[#241E1C] hover:bg-[#342D2B] text-white border border-[#EBE5DA]/20 shadow-2xl flex items-center justify-center active:scale-95 transition-all"
            title="Search products"
          >
            <Search className="w-4 h-4 text-[#D99706]" />
          </button>
        )}

        {/* Menu / Close FAB */}
        <button
          type="button"
          onClick={() => setIsCategoryModalOpen(!isCategoryModalOpen)}
          className={`px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold active:scale-95 transition-all ${
            isCategoryModalOpen
              ? 'bg-[#342D2B] hover:bg-[#433B38] text-white border border-[#EBE5DA]/30'
              : 'bg-[#241E1C] hover:bg-[#342D2B] text-white border border-[#EBE5DA]/20'
          }`}
        >
          {isCategoryModalOpen ? (
            <>
              <X className="w-4 h-4" />
              <span>Close</span>
            </>
          ) : (
            <>
              <LayoutGrid className="w-4 h-4 text-[#D99706]" />
              <span>Menu</span>
              <span className="bg-white/15 text-white text-[10px] px-1.5 py-0.2 rounded-full font-sans font-bold">
                {currentCategories.length}
              </span>
            </>
          )}
        </button>
      </div>

      {/* CATEGORY POPUP MODAL (REFINED LUXURY THEME) */}
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-end sm:items-end justify-end p-4 pb-20 sm:pb-20 sm:pr-6 animate-fade-in"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className="w-full max-w-[320px] sm:max-w-[340px] bg-[#1C1816] text-[#FAF7F2] rounded-3xl p-3.5 sm:p-4 shadow-2xl border border-white/15 space-y-1 animate-scale-in max-h-[70vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* All Items Option */}
            <button
              type="button"
              onClick={() => {
                handleCategoryClick('all');
                setIsCategoryModalOpen(false);
              }}
              className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-between text-left transition-colors ${
                activeCategoryId === 'all'
                  ? 'bg-white/10 text-[#D99706] font-bold shadow-2xs'
                  : 'text-[#EDE4DC] hover:text-white hover:bg-white/5 font-medium'
              }`}
            >
              <span className="text-sm tracking-tight pr-3 truncate">All Products</span>
              <span className={`text-xs font-semibold font-sans shrink-0 ${activeCategoryId === 'all' ? 'text-[#D99706]' : 'text-[#A89F91]'}`}>
                {currentItems.length}
              </span>
            </button>

            {/* Each Category */}
            {currentCategories.map((cat) => {
              const catItemCount = currentItems.filter((i) => i.category_id === cat.id).length;
              const isActive = activeCategoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    handleCategoryClick(cat.id);
                    setIsCategoryModalOpen(false);
                  }}
                  className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-between text-left transition-colors ${
                    isActive
                      ? 'bg-white/10 text-[#D99706] font-bold shadow-2xs'
                      : 'text-[#EDE4DC] hover:text-white hover:bg-white/5 font-medium'
                  }`}
                >
                  <span className="text-sm tracking-tight pr-3 truncate">{cat.name}</span>
                  <span className={`text-xs font-semibold font-sans shrink-0 ${isActive ? 'text-[#D99706]' : 'text-[#A89F91]'}`}>
                    {catItemCount}
                  </span>
                </button>
              );
            })}

            {/* Bottom Special Section matching screenshot */}
            <div className="pt-2 mt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsSavedDrawerOpen(true);
                  setIsCategoryModalOpen(false);
                }}
                className="w-full py-2 px-3 rounded-2xl flex items-center justify-between text-left text-[#DDD0C3] hover:text-white hover:bg-white/5 transition-colors"
              >
                <span className="text-xs font-bold uppercase tracking-wider">SAVED WISHLIST</span>
                <span className="text-xs font-sans font-bold text-[#A89F91]">{savedItemIds.length}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
        onClose={closeProductDetail}
      />

      <SavedItemsDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        shop={shop}
        savedProducts={savedProducts}
        onRemoveItem={(id) => toggleSaveProduct(id)}
        onSelectProduct={(prod) => openProductDetail(prod)}
      />
    </div>
  );
};
