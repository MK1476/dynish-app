'use client';

import React, { useState } from 'react';
import type { Database } from '@/types/database';
import { createOffer, deleteOffer, setDefaultOffer } from '@/actions/offers';
import { Gift, Plus, Trash2, Check, Star, X } from 'lucide-react';

type ShopRow = Database['public']['Tables']['shops']['Row'];
type OfferRow = Database['public']['Tables']['offers']['Row'];

interface OffersClientProps {
  shop: ShopRow;
  initialOffers: OfferRow[];
}

export const OffersClient: React.FC<OffersClientProps> = ({
  shop,
  initialOffers,
}) => {
  const [offers, setOffers] = useState<OfferRow[]>(initialOffers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    const valNum = discountValue ? parseFloat(discountValue) : undefined;
    const res = await createOffer(shop.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      discountType,
      discountValue: valNum,
      isDefault,
    });

    setLoading(false);
    if (res.success && res.offer) {
      if (isDefault) {
        setOffers([...offers.map(o => ({ ...o, is_default: false })), res.offer]);
      } else {
        setOffers([...offers, res.offer]);
      }
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setDiscountValue('');
      setIsDefault(false);
    }
  };

  const handleSetDefault = async (offerId: string) => {
    setOffers(offers.map(o => ({ ...o, is_default: o.id === offerId })));
    await setDefaultOffer(shop.id, offerId);
  };

  const handleDelete = async (offerId: string) => {
    setOffers(offers.filter(o => o.id !== offerId));
    await deleteOffer(offerId, shop.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950">
            Next-Visit Loyalty Offers
          </h1>
          <p className="text-espresso-500 text-xs sm:text-sm mt-0.5">
            Configure coupons that auto-attach to customer WhatsApp billing receipts.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-espresso-950 font-bold text-xs shadow-xs flex items-center gap-1.5 transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Offer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className={`bg-white rounded-2xl p-4 sm:p-5 border-2 transition-all flex flex-col justify-between ${
              offer.is_default 
                ? 'border-brand-500 shadow-card ring-2 ring-brand-200' 
                : 'border-ivory-200 hover:border-ivory-300 shadow-soft'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-brand-100 text-brand-900">
                  <Gift className="w-4 h-4" />
                </span>

                {offer.is_default ? (
                  <span className="text-[10px] font-bold bg-brand-500 text-espresso-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> Default Counter Offer
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetDefault(offer.id)}
                    className="text-[10px] font-semibold text-espresso-500 hover:text-brand-800 border border-ivory-300 hover:border-brand-400 px-2 py-0.5 rounded-full transition-colors"
                  >
                    Set as Default
                  </button>
                )}
              </div>

              <h3 className="font-serif font-bold text-base text-espresso-950 mb-1">
                {offer.title}
              </h3>
              {offer.description && (
                <p className="text-espresso-600 text-xs leading-relaxed">{offer.description}</p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-ivory-100 flex items-center justify-between text-xs">
              <span className="text-espresso-400">
                {offer.discount_value ? `${offer.discount_value}% Discount` : 'Special Promo'}
              </span>

              <button
                onClick={() => handleDelete(offer.id)}
                className="p-1 text-espresso-400 hover:text-rose-600 rounded transition-colors"
                title="Delete offer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE OFFER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-ivory-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-ivory-200 mb-4">
              <h3 className="font-serif text-xl font-bold text-espresso-950">
                New Retention Reward
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-espresso-800 uppercase tracking-wider mb-1">
                  Offer Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 15% OFF on Next Kurti Set"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-ivory-50 border border-ivory-300 text-espresso-950 font-serif font-bold text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-espresso-800 uppercase tracking-wider mb-1">
                  Description / Terms
                </label>
                <textarea
                  rows={2}
                  placeholder="Show this WhatsApp receipt at counter to claim discount."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-ivory-50 border border-ivory-300 text-espresso-950 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-espresso-800 uppercase tracking-wider mb-1">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-ivory-50 border border-ivory-300 text-espresso-950 font-semibold focus:outline-none focus:border-brand-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Cash (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-espresso-800 uppercase tracking-wider mb-1">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    placeholder="10"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-ivory-50 border border-ivory-300 text-espresso-950 font-bold focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="font-semibold text-espresso-800">
                  Set as default offer on billing counter
                </span>
              </label>

              <div className="pt-3 border-t border-ivory-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-ivory-100 text-espresso-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-espresso-950 font-bold shadow-xs"
                >
                  {loading ? 'Creating...' : 'Save Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
