import React from 'react';
import { getShopBySlugOrId } from '@/actions/shop';
import { getShopCatalog } from '@/actions/catalog';
import { notFound } from 'next/navigation';
import { StorefrontClient } from './StorefrontClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface StorePageProps {
  params: {
    shopId: string;
  };
  searchParams?: {
    item?: string;
  };
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const shop = await getShopBySlugOrId(params.shopId);
  if (!shop) return { title: 'Store Not Found — Dynish' };

  return {
    title: `${shop.name} — Digital Catalog on Dynish`,
    description: shop.tagline || `Browse latest catalog from ${shop.name} on Dynish.`,
    openGraph: {
      title: shop.name,
      description: shop.tagline || undefined,
      images: shop.logo_url ? [shop.logo_url] : undefined,
    },
  };
}

export default async function StorePage({ params, searchParams }: StorePageProps) {
  const shop = await getShopBySlugOrId(params.shopId);

  if (!shop) {
    notFound();
  }

  const catalog = await getShopCatalog(shop.id);

  return (
    <StorefrontClient 
      shop={shop} 
      categories={catalog.categories} 
      items={catalog.items} 
      initialItemId={searchParams?.item || null}
    />
  );
}
