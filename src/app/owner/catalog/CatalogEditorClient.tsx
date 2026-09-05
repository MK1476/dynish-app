'use client';

import React, { useState } from 'react';
import type { Database } from '@/types/database';
import { 
  createCategory, reorderCategories, deleteCategory,
  createItem, updateItem, deleteItem, toggleItemAvailability, bulkUploadCatalog, uploadProductImage 
} from '@/actions/catalog';
import { compressImage } from '@/lib/image-compressor';
import { parseCatalogExcel, generateCatalogTemplate } from '@/lib/excel-parser';
import { 
  Plus, Edit, Trash2, Check, X, Upload, FileSpreadsheet, 
  Sparkles, Eye, Download, Image as ImageIcon, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { formatINR } from '@/lib/utils';

type ShopRow = Database['public']['Tables']['shops']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type ItemRow = Database['public']['Tables']['items']['Row'];

interface CatalogEditorProps {
  shop: ShopRow;
  initialCategories: CategoryRow[];
  initialItems: ItemRow[];
}

export const CatalogEditorClient: React.FC<CatalogEditorProps> = ({
  shop,
  initialCategories,
  initialItems,
}) => {
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories);
  const [items, setItems] = useState<ItemRow[]>(initialItems);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Inline Category Creator
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategoryInModal, setIsAddingCategoryInModal] = useState(false);
  const [newModalCategoryName, setNewModalCategoryName] = useState('');

  // 1-Click Inline Price Edit
  const [inlinePriceId, setInlinePriceId] = useState<string | null>(null);
  const [inlinePriceVal, setInlinePriceVal] = useState('');

  // Add / Edit Item Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRow | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemOriginalPrice, setItemOriginalPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImages, setItemImages] = useState<string[]>([]);
  const [itemUnit, setItemUnit] = useState('per piece');
  const [itemTag, setItemTag] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  // Delete Confirmation
  const [deletingItem, setDeletingItem] = useState<ItemRow | null>(null);

  // Excel Bulk Upload Modal
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelUploading, setExcelUploading] = useState(false);
  const [excelCount, setExcelCount] = useState<number | null>(null);

  // Create Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const res = await createCategory(shop.id, newCategoryName);
    if (res.success && res.category) {
      setCategories([...categories, res.category]);
      setNewCategoryName('');
      setIsAddingCategory(false);
      setActiveTab(res.category.id);
    }
  };

  // Reorder Categories
  const handleMoveCategory = async (index: number, direction: 'left' | 'right') => {
    const newIdx = direction === 'left' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= categories.length) return;

    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[newIdx];
    newCats[newIdx] = temp;

    setCategories(newCats);
    await reorderCategories(shop.id, newCats.map(c => c.id));
  };

  // Save Inline Price
  const handleSaveInlinePrice = async (itemId: string) => {
    const num = parseFloat(inlinePriceVal);
    if (!isNaN(num) && num >= 0) {
      await updateItem(itemId, shop.id, { price: num });
      setItems(items.map(i => i.id === itemId ? { ...i, price: num } : i));
    }
    setInlinePriceId(null);
  };

  // Open Add Item
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemName('');
    setItemPrice('');
    setItemOriginalPrice('');
    const defaultCat = activeTab !== 'all' && activeTab ? activeTab : (categories[0]?.id || '');
    setItemCategory(defaultCat);
    setItemDescription('');
    setItemImages([]);
    setItemUnit('per piece');
    setItemTag('');
    setIsFeatured(false);
    setIsAddingCategoryInModal(false);
    setIsItemModalOpen(true);
  };

  // Open Edit Item
  const handleOpenEditItem = (item: ItemRow) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(item.price.toString());
    setItemOriginalPrice(item.original_price ? item.original_price.toString() : '');
    setItemCategory(item.category_id);
    setItemDescription(item.description || '');
    setItemImages(item.image_urls.length > 0 ? item.image_urls : []);
    setItemUnit(item.unit || 'per piece');
    setItemTag(item.scarcity_tag || '');
    setIsFeatured(item.scarcity_tag === 'Featured');
    setIsAddingCategoryInModal(false);
    setIsItemModalOpen(true);
  };

  // Handle Image Upload with Client Compression and Server Action
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append('file', compressed);

        const res = await uploadProductImage(shop.id, formData);
        if (res.success && res.url) {
          uploadedUrls.push(res.url);
        } else {
          console.error('Image upload failed:', res.error);
        }
      } catch (err) {
        console.error('Image processing error:', err);
      }
    }

    if (uploadedUrls.length > 0) {
      setItemImages((prev) => [...prev, ...uploadedUrls]);
    }
    setUploadingImage(false);
  };

  // Save Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemPrice) return;

    setSavingItem(true);
    const priceNum = parseFloat(itemPrice);
    const origPriceNum = itemOriginalPrice ? parseFloat(itemOriginalPrice) : undefined;
    const computedTag = isFeatured ? 'Featured' : (itemTag.trim() || null);

    if (editingItem) {
      await updateItem(editingItem.id, shop.id, {
        name: itemName.trim(),
        price: priceNum,
        original_price: origPriceNum || null,
        category_id: itemCategory,
        description: itemDescription.trim() || null,
        image_urls: itemImages,
        unit: itemUnit,
        scarcity_tag: computedTag,
      });
      setItems(items.map(i => i.id === editingItem.id ? {
        ...i,
        name: itemName.trim(),
        price: priceNum,
        original_price: origPriceNum || null,
        category_id: itemCategory,
        description: itemDescription.trim() || null,
        image_urls: itemImages,
        unit: itemUnit,
        scarcity_tag: computedTag,
      } : i));
    } else {
      const res = await createItem({
        shopId: shop.id,
        categoryId: itemCategory,
        name: itemName.trim(),
        price: priceNum,
        originalPrice: origPriceNum,
        imageUrls: itemImages,
        unit: itemUnit,
        scarcityTag: computedTag || undefined,
        description: itemDescription.trim() || undefined,
      });
      if (res.success && res.item) {
        setItems([res.item, ...items]);
      }
    }

    setSavingItem(false);
    setIsItemModalOpen(false);
  };

  // Toggle Availability
  const handleToggleAvail = async (item: ItemRow) => {
    const nextStatus = !item.is_available;
    setItems(items.map(i => i.id === item.id ? { ...i, is_available: nextStatus } : i));
    await toggleItemAvailability(item.id, shop.id, item.is_available);
  };

  // Delete Item
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    await deleteItem(deletingItem.id, shop.id);
    setItems(items.filter(i => i.id !== deletingItem.id));
    setDeletingItem(null);
  };

  // Excel Bulk Upload
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelUploading(true);
    const buffer = await file.arrayBuffer();
    const parsedRows = parseCatalogExcel(buffer);

    if (parsedRows.length === 0) {
      alert('No valid products found in Excel file. Please use the template.');
      setExcelUploading(false);
      return;
    }

    const res = await bulkUploadCatalog(shop.id, parsedRows);
    setExcelUploading(false);

    if (res.success) {
      setExcelCount(res.count);
      window.location.reload();
    } else {
      alert(res.error || 'Failed to bulk upload items.');
    }
  };

  const handleDownloadTemplate = () => {
    const bytes = generateCatalogTemplate();
    const blob = new Blob([bytes as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Dynish_Catalog_Template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredItems = items.filter(i => {
    if (activeTab === 'all') return true;
    return i.category_id === activeTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950">
            Catalog Management
          </h1>
          <p className="text-espresso-500 text-xs sm:text-sm mt-0.5">
            Organize categories, upload compressed images, edit prices in 1 click, or bulk import via Excel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExcelModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-800 text-xs font-semibold border border-ivory-300 flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Bulk Excel</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddItem}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-espresso-950 font-bold text-xs shadow-xs flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* CATEGORY BAR (+ Add Category First, All Items Tab, Reorderable Chips) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {/* Add Category as FIRST element */}
        {isAddingCategory ? (
          <form onSubmit={handleAddCategory} className="flex items-center gap-1 shrink-0 animate-scale-in">
            <input
              type="text"
              autoFocus
              placeholder="Category Name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="px-3 py-1.5 rounded-xl border-2 border-brand-500 text-xs font-bold text-espresso-950 bg-white focus:outline-none w-36 shadow-xs"
            />
            <button
              type="submit"
              className="p-1.5 rounded-xl bg-brand-500 text-espresso-950 hover:bg-brand-600 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsAddingCategory(false)}
              className="p-1.5 rounded-xl text-espresso-400 hover:text-espresso-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingCategory(true)}
            className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 border border-brand-300 text-brand-900 text-xs font-bold shrink-0 flex items-center gap-1 transition-all active:scale-95 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        )}

        {/* All Items Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
            activeTab === 'all'
              ? 'bg-espresso-950 text-white shadow-xs font-bold'
              : 'bg-white text-espresso-700 border border-ivory-200 hover:bg-ivory-50'
          }`}
        >
          All Items ({items.length})
        </button>

        {/* Reorderable Categories */}
        {categories.map((cat, idx) => {
          const count = items.filter(i => i.category_id === cat.id).length;
          const isActive = activeTab === cat.id;

          return (
            <div key={cat.id} className="relative group shrink-0 flex items-center">
              <button
                onClick={() => setActiveTab(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-espresso-950 text-white shadow-xs font-bold'
                    : 'bg-white text-espresso-700 border border-ivory-200 hover:bg-ivory-50'
                }`}
              >
                {cat.name} ({count})
              </button>

              {/* Nudge buttons on hover */}
              <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                {idx > 0 && (
                  <button
                    onClick={() => handleMoveCategory(idx, 'left')}
                    className="p-1 text-espresso-400 hover:text-espresso-800 rounded hover:bg-ivory-200"
                    title="Move left"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                )}
                {idx < categories.length - 1 && (
                  <button
                    onClick={() => handleMoveCategory(idx, 'right')}
                    className="p-1 text-espresso-400 hover:text-espresso-800 rounded hover:bg-ivory-200"
                    title="Move right"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ITEMS GRID */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-ivory-200 p-6">
          <ImageIcon className="w-10 h-10 text-espresso-300 mx-auto mb-2" />
          <h3 className="font-serif text-base font-bold text-espresso-950">
            {activeTab === 'all' ? 'No items in your catalog yet' : 'No items in this category'}
          </h3>
          <p className="text-xs text-espresso-500 mt-1 mb-4">Add your first product to display on your digital storefront.</p>
          <button
            onClick={handleOpenAddItem}
            className="px-4 py-2 rounded-xl bg-brand-500 text-espresso-950 font-bold text-xs shadow-xs"
          >
            + Add Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map((prod) => (
            <div
              key={prod.id}
              className="bg-white rounded-2xl border border-ivory-200 p-3 shadow-xs hover:border-brand-300 transition-all flex flex-col justify-between"
            >
              <div className="flex gap-3">
                <img
                  src={prod.image_urls[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300'}
                  alt={prod.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 border border-ivory-200"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-brand-800 uppercase bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                    {categories.find(c => c.id === prod.category_id)?.name || 'General'}
                  </span>
                  <h4 className="font-serif font-bold text-espresso-950 text-sm truncate mt-1">
                    {prod.name}
                  </h4>
                  {prod.description && (
                    <p className="text-espresso-500 text-xs truncate mt-0.5">{prod.description}</p>
                  )}
                </div>
              </div>

              {/* 1-Click Inline Price Edit & Availability Row */}
              <div className="mt-3 pt-2 border-t border-ivory-100 flex items-center justify-between">
                {/* 1-Click Price Quick Edit */}
                <div>
                  {inlinePriceId === prod.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-espresso-400 font-bold">₹</span>
                      <input
                        type="number"
                        autoFocus
                        value={inlinePriceVal}
                        onChange={(e) => setInlinePriceVal(e.target.value)}
                        className="w-20 px-1.5 py-0.5 rounded-lg border-2 border-brand-500 font-serif font-bold text-sm text-espresso-950 focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveInlinePrice(prod.id)}
                        className="p-1 rounded bg-brand-500 text-espresso-950 hover:bg-brand-600"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </button>
                      <button
                        onClick={() => setInlinePriceId(null)}
                        className="p-1 rounded text-espresso-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setInlinePriceId(prod.id);
                        setInlinePriceVal(prod.price.toString());
                      }}
                      className="cursor-pointer hover:bg-ivory-100 px-1.5 py-0.5 rounded-lg flex items-baseline gap-1"
                      title="Click to quickly edit price"
                    >
                      <span className="font-serif font-bold text-base text-espresso-950">
                        {formatINR(prod.price)}
                      </span>
                      <span className="text-[9px] text-brand-700 font-sans font-semibold">edit</span>
                    </div>
                  )}
                </div>

                {/* Status Toggle & Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleAvail(prod)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      prod.is_available
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {prod.is_available ? 'In Stock' : 'Out of Stock'}
                  </button>

                  <button
                    onClick={() => handleOpenEditItem(prod)}
                    className="p-1 text-espresso-500 hover:text-espresso-900 rounded"
                    title="Edit Item"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeletingItem(prod)}
                    className="p-1 text-espresso-400 hover:text-rose-600 rounded"
                    title="Delete Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT ITEM MODAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-espresso-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl border border-ivory-200 my-auto animate-scale-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-ivory-200 mb-4">
              <h3 className="font-sans text-xl font-bold text-espresso-950">
                {editingItem ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-espresso-800 uppercase tracking-wider mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bagru Hand Block Indigo Daily Kurti"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-ivory-50 border border-ivory-300 text-espresso-950 font-sans font-bold text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-espresso-800 uppercase tracking-wider mb-1">
                    Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="950"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-ivory-50 border border-ivory-300 text-espresso-950 font-sans font-bold text-base focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-espresso-800 uppercase tracking-wider mb-1">
                    Original Price (₹ MRP)
                  </label>
                  <input
                    type="number"
                    placeholder="1200"
                    value={itemOriginalPrice}
                    onChange={(e) => setItemOriginalPrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-ivory-50 border border-ivory-300 text-espresso-950 font-sans focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-espresso-800 uppercase tracking-wider mb-1">
                  Category
                </label>
                {isAddingCategoryInModal ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="New Category Name"
                      value={newModalCategoryName}
                      onChange={(e) => setNewModalCategoryName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-ivory-50 border-2 border-brand-500 text-espresso-950 font-bold text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newModalCategoryName.trim()) return;
                        const res = await createCategory(shop.id, newModalCategoryName.trim());
                        if (res.success && res.category) {
                          const created = res.category;
                          setCategories(prev => [...prev, created]);
                          setItemCategory(created.id);
                          setNewModalCategoryName('');
                          setIsAddingCategoryInModal(false);
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-brand-500 text-espresso-950 font-bold text-xs hover:bg-brand-600 shadow-xs"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategoryInModal(false)}
                      className="p-2 text-espresso-400 hover:text-espresso-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <select
                    value={itemCategory}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setIsAddingCategoryInModal(true);
                      } else {
                        setItemCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-ivory-50 border border-ivory-300 text-espresso-950 font-semibold focus:outline-none focus:border-brand-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="__add_new__" className="text-brand-600 font-bold">+ Add New Category...</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-espresso-800 uppercase tracking-wider mb-1">
                  DESCRIPTION
                </label>
                <textarea
                  rows={2}
                  placeholder="Natural indigo vegetable dyed 100% cambric cotton straight fit daily kurti. Pocket included."
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-ivory-50 border border-ivory-300 text-espresso-950 focus:outline-none focus:border-brand-500 leading-relaxed"
                />
              </div>

              {/* Upload image */}
              <div>
                <label className="block font-bold text-espresso-800 uppercase tracking-wider mb-1.5">
                  Product Images (Auto-compressed)
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {itemImages.map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-ivory-300 shrink-0 group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-brand-500 text-espresso-950 font-bold text-[8px] text-center">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setItemImages(itemImages.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-espresso-950/80 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-sm transition-colors"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <label className="w-16 h-16 rounded-xl border-2 border-dashed border-ivory-300 hover:border-brand-500 flex flex-col items-center justify-center cursor-pointer text-espresso-400 hover:text-brand-700 transition-colors shrink-0">
                    <Upload className="w-4 h-4" />
                    <span className="text-[9px] mt-0.5 font-bold">{uploadingImage ? '...' : '+ Photo'}</span>
                    <input type="file" accept="image/*" multiple onChange={handleImageFileChange} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Show with Featured badge checkbox (Matching Screenshot) */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-ivory-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <span className="text-xs text-espresso-800 font-medium">
                  Show with "Featured" badge on storefront
                </span>
              </label>

              {/* Primary Golden Save Button (Matching Screenshot) */}
              <button
                type="submit"
                disabled={savingItem}
                className="w-full py-3.5 rounded-xl bg-[#F5B722] hover:bg-[#E5A712] text-espresso-950 font-sans font-bold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <span>{savingItem ? 'Updating...' : editingItem ? 'Update & Save Changes' : 'Update & Save Changes'}</span>
              </button>

              {/* CUSTOMER STOREFRONT LIVE PREVIEW (MATCHING SCREENSHOT) */}
              <div className="pt-4 border-t border-ivory-200">
                <div className="text-center font-bold text-[11px] uppercase tracking-wider text-amber-700 flex items-center justify-center gap-1.5 mb-3">
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  <span>CUSTOMER STOREFRONT LIVE PREVIEW</span>
                </div>

                {/* Live Preview Card */}
                <div className="rounded-3xl bg-white border border-[#EBE5DA] overflow-hidden shadow-sm max-w-xs sm:max-w-sm mx-auto">
                  <div className="relative aspect-[4/5] w-full bg-ivory-100 overflow-hidden">
                    <img
                      src={itemImages[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    {isFeatured && (
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C27835] text-white shadow-xs">
                        Featured
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-1">
                    <h4 className="font-sans font-bold text-base text-espresso-950 truncate">
                      {itemName.trim() || 'Bagru Hand Block Indigo Daily Kurti'}
                    </h4>
                    <p className="text-xs text-espresso-500 line-clamp-1 leading-relaxed">
                      {itemDescription.trim() || 'Natural indigo vegetable dyed 100% cambric cotton straight fit daily kurti. Pocket included.'}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-sans font-bold text-lg text-espresso-950">
                          ₹{itemPrice || '950'}
                        </span>
                        {itemOriginalPrice && (
                          <span className="text-xs text-espresso-400 line-through">
                            ₹{itemOriginalPrice}
                          </span>
                        )}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Available
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-center text-[10px] sm:text-[11px] text-espresso-400 max-w-xs mx-auto mt-3 leading-relaxed">
                  Items update in real-time. Customers can immediately view and save them on WhatsApp catalog.
                </p>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-ivory-200 animate-scale-in">
            <h3 className="font-serif text-lg font-bold text-espresso-950 mb-2">
              Delete "{deletingItem.name}"?
            </h3>
            <p className="text-xs text-espresso-500 mb-6">
              This item will be permanently removed from your catalog and public storefront.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="w-1/2 py-2.5 rounded-xl bg-ivory-100 text-espresso-800 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL BULK UPLOAD MODAL */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-ivory-200 animate-scale-in space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-serif text-lg font-bold text-espresso-950">Bulk Import Catalog</h3>
              </div>
              <button onClick={() => setIsExcelModalOpen(false)} className="p-1 text-espresso-400 hover:text-espresso-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-espresso-600 leading-relaxed">
              Upload an Excel (.xlsx) file with columns: <strong>Category</strong>, <strong>Item Name</strong>, <strong>Price</strong>, <strong>Original Price</strong>, <strong>Description</strong>.
            </p>

            <button
              onClick={handleDownloadTemplate}
              className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel Template (.xlsx)</span>
            </button>

            <div className="border-2 border-dashed border-ivory-300 rounded-2xl p-6 text-center hover:border-brand-500 transition-colors">
              <Upload className="w-8 h-8 text-espresso-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-espresso-900 mb-1">
                {excelUploading ? 'Parsing & Uploading...' : 'Click to select Excel file'}
              </p>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelUpload}
                disabled={excelUploading}
                className="w-full text-xs text-espresso-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-brand-50 file:text-brand-800 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
