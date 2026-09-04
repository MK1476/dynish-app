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

export interface WhatsAppBillPayload {
  shopName: string;
  ownerName: string;
  customerName?: string;
  customerPhone: string;
  billAmount?: number | null;
  visitNumber: number;
  nextOfferTitle?: string;
  shopAddress?: string;
  shopId: string;
}

export function generateWhatsAppBillMessage(payload: WhatsAppBillPayload): string {
  const greetingName = payload.customerName ? ` ${payload.customerName}` : ' Valued Guest';
  const amountStr = payload.billAmount && payload.billAmount > 0 
    ? `*${formatINR(payload.billAmount)}*` 
    : 'your visit';

  let msg = `Namaste${greetingName} 🙏!\n\nThank you for visiting *${payload.shopName}* today! We truly appreciate your patronage (Visit #${payload.visitNumber}).\n\nYour bill: ${amountStr}`;

  if (payload.nextOfferTitle) {
    msg += `\n\n🎁 *Special Gift for your next visit:* ${payload.nextOfferTitle}.\nJust show this WhatsApp message at our counter on your next purchase!`;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dynish.vercel.app';
  msg += `\n\nBrowse our latest catalog anytime here: ${appUrl}/store/${payload.shopId}`;

  if (payload.shopAddress) {
    msg += `\n\nWarm regards,\n*${payload.shopName}*\n${payload.shopAddress}`;
  }

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
