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

export function getOrdinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) {
    return `${n}st`;
  }
  if (j === 2 && k !== 12) {
    return `${n}nd`;
  }
  if (j === 3 && k !== 13) {
    return `${n}rd`;
  }
  return `${n}th`;
}

/**
 * Resolves clean discount reward text from offer title and current bill amount.
 * e.g., "10% Cashback" on a ₹450 bill becomes "₹45/- off"
 * e.g., "₹50 OFF" becomes "₹50/- off"
 */
export function formatDiscountRewardText(
  offerTitle: string | null | undefined,
  billAmount?: number | null | undefined
): string | null {
  if (!offerTitle || !offerTitle.trim()) return null;
  const raw = offerTitle.trim();

  // If percentage-based, calculate dynamically if billAmount is provided
  const pctMatch = raw.match(/(\d+(\.\d+)?)\s*%/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    if (!isNaN(pct) && pct > 0) {
      if (billAmount && billAmount > 0) {
        const calculatedDiscount = Math.round((billAmount * pct) / 100);
        if (calculatedDiscount > 0) {
          return `₹${calculatedDiscount} off`;
        }
      }
      return `${pct}% off`;
    }
  }

  // If already matches flat rupee format, e.g. "₹50 OFF", "Flat ₹100", "Rs 35"
  const flatMatch = raw.match(/(?:₹|rs\.?|flat\s*)(\d+)(?:\s*(?:off|\/-|\/|discount))?/i);
  if (flatMatch) {
    const rupees = parseInt(flatMatch[1], 10);
    if (!isNaN(rupees) && rupees > 0) {
      return `₹${rupees} off`;
    }
  }

  // Fallback to the raw offer title text if custom (e.g. "Free Dessert")
  return raw;
}

export function generateWhatsAppBillMessage(payload: WhatsAppBillPayload): string {
  const appUrl = getAppBaseUrl();
  const storeUrl = `${appUrl}/store/${payload.shopSlug || payload.shopId}`;
  const hasBillAmount = payload.billAmount !== null && payload.billAmount !== undefined && Number(payload.billAmount) > 0;
  const amountFormatted = hasBillAmount ? formatINR(payload.billAmount) : '';

  const cleanCustomerName = payload.customerName?.trim();
  const greeting = cleanCustomerName && cleanCustomerName.toLowerCase() !== 'guest'
    ? `Hi ${cleanCustomerName}! 👋`
    : `Hi! 👋`;

  // If shop owner customized their template
  if (payload.customTemplate && payload.customTemplate.trim()) {
    let templated = payload.customTemplate
      .replace(/\{customer_name\}/g, cleanCustomerName || 'Valued Guest')
      .replace(/\{shop_name\}/g, payload.shopName)
      .replace(/\{bill_amount\}/g, amountFormatted || 'Paid')
      .replace(/\{visit_number\}/g, String(payload.visitNumber))
      .replace(/\{next_offer\}/g, payload.nextOfferTitle || '')
      .replace(/\{store_link\}/g, storeUrl);

    return templated.trim();
  }

  // Scenario 1: No bill amount entered (acknowledge visit warmly)
  if (!hasBillAmount) {
    return `${greeting}\nThank you for visiting ${payload.shopName} today ✨ It was wonderful having you — hope to see you again soon!\n\n👉 ${storeUrl}`;
  }

  const discountText = formatDiscountRewardText(payload.nextOfferTitle, payload.billAmount);
  const isFirstVisit = payload.visitNumber <= 1;
  const visitOrdinal = getOrdinalSuffix(payload.visitNumber);

  // Scenario 2: First-time visitor (don't say "1st visit")
  if (isFirstVisit) {
    if (discountText) {
      return `${greeting}\nThank you for visiting ${payload.shopName} — it was wonderful having you for the first time ✨\n\n🧾 Your Bill: *${amountFormatted}*\n\n🎁 Here's *${discountText}* your next visit, as a small welcome gift — just show this message at the counter.\n\nWe loved having you today, and we'll be here whenever you're back!\n👉 ${storeUrl}`;
    }
    return `${greeting}\nThank you for visiting ${payload.shopName} — it was wonderful having you for the first time ✨\n\n🧾 Your Bill: *${amountFormatted}*\n\nWe loved having you today, and we'll be here whenever you're back!\n👉 ${storeUrl}`;
  }

  // Scenario 3: Repeat visit with offer
  if (discountText) {
    return `${greeting}\nThank you for visiting ${payload.shopName} — this was your *${visitOrdinal} visit* with us ✨\n\n🧾 Your Bill: *${amountFormatted}*\n\n🎁 As a thank-you, here's *${discountText}* your next visit — just show this message at the counter.\n\nWe loved having you today, and we'll be here whenever you're back!\n👉 ${storeUrl}`;
  }

  // Scenario 4: Repeat visit, no offer selected
  return `${greeting}\nThank you for visiting ${payload.shopName} — this was your *${visitOrdinal} visit* with us ✨\n\n🧾 Your Bill: *${amountFormatted}*\n\nWe loved having you today, and we'll be here whenever you're back!\n👉 ${storeUrl}`;
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


