import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return '₹' + amount.toLocaleString('en-IN');
}

export function formatIndianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

export function getAppBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'https://dynish.com';
}

export interface WhatsAppBillPayload {
  shopName: string;
  ownerName?: string;
  customerName?: string;
  customerPhone: string;
  billAmount?: number | null;
  visitNumber: number;
  nextOfferTitle?: string;
  shopAddress?: string;
  shopId: string;
  shopSlug?: string | null;
  customTemplate?: string | null;
}

export function generateWhatsAppBillMessage(payload: WhatsAppBillPayload): string {
  const appUrl = getAppBaseUrl();
  const storeUrl = `${appUrl}/store/${payload.shopSlug || payload.shopId}`;
  const amountFormatted = payload.billAmount && payload.billAmount > 0 
    ? formatINR(payload.billAmount) 
    : 'Paid';

  // If shop owner customized their template
  if (payload.customTemplate && payload.customTemplate.trim()) {
    let templated = payload.customTemplate
      .replace(/\{customer_name\}/g, payload.customerName || 'Valued Guest')
      .replace(/\{shop_name\}/g, payload.shopName)
      .replace(/\{bill_amount\}/g, amountFormatted)
      .replace(/\{visit_count\}/g, String(payload.visitNumber))
      .replace(/\{next_offer\}/g, payload.nextOfferTitle || '')
      .replace(/\{store_link\}/g, storeUrl);

    return templated.trim();
  }

  // Friendly, clean standard default copy (without dramatic words or lengthy address)
  const greetingName = payload.customerName ? ` ${payload.customerName}` : '';
  let msg = `Hi${greetingName}! Thank you for visiting *${payload.shopName}* (Visit #${payload.visitNumber}).\n\nYour bill: *${amountFormatted}*`;

  if (payload.nextOfferTitle) {
    msg += `\n\n🎁 *Special offer for your next visit:* ${payload.nextOfferTitle}\nJust show this message at our counter on your next visit!`;
  }

  msg += `\n\nCheck out our catalog & new arrivals here: ${storeUrl}\n\nSee you again soon! ✨`;
  return msg;
}

export function generateWhatsAppUrl(phoneNumber: string, message: string): string {
  const digits = phoneNumber.replace(/\D/g, '').slice(-10);
  const fullNumber = `91${digits}`;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}

export function calculateSubscriptionStatus(expiresAtStr: string) {
  const expiryDate = new Date(expiresAtStr);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    isExpired: daysRemaining <= 0,
    isWarning: daysRemaining > 0 && daysRemaining <= 3,
    daysRemaining: Math.max(0, daysRemaining),
    expiryDateFormatted: expiryDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  };
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('Clipboard API error, falling back:', e);
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback execCommand copy error:', err);
    return false;
  }
}

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}


