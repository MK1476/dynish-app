import React from 'react';
import { getOwnerShop } from '@/actions/shop';
import { getShopCatalog } from '@/actions/catalog';
import { CatalogEditorClient } from './CatalogEditorClient';
import { redirect } from 'next/navigation';

export default async function CatalogPage() {
  const shop = await getOwnerShop();
  if (!shop) {
    redirect('/owner/onboarding');
  }

  const catalog = await getShopCatalog(shop.id);

  return (
    <div className="max-w-4xl mx-auto p-3.5 sm:p-6 pb-32 md:pb-24">
      <CatalogEditorClient shop={shop} initialCategories={catalog.categories} initialItems={catalog.items} />
    </div>
  );
}
