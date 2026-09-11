/**
 * Environment detection and runtime mode utilities for Dynish 2.0.
 * Segregates production deployment (dynish.com) from preview and development.
 */

export const isProductionEnvironment = (): boolean => {
  // 1. Check explicit test override if present
  if (process.env.NEXT_PUBLIC_ENABLE_TEST_TOOLS === 'true') {
    return false;
  }

  // 2. Server-side Vercel check
  if (process.env.VERCEL_ENV === 'production') return true;
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') return true;

  // 3. Client-side hostname check
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'dynish.com' || host === 'www.dynish.com') {
      return true;
    }
    if (host === 'localhost' || host === '127.0.0.1' || host.includes('vercel.app')) {
      return false;
    }
  }

  // 4. Standard NODE_ENV
  return process.env.NODE_ENV === 'production';
};

export const isPreviewOrDev = (): boolean => {
  return !isProductionEnvironment();
};

export { getAppBaseUrl } from './utils';

/**
 * Designated Demo / Apple App Store Review credentials configured in MSG91.
 * These specific test numbers are allowed bypass OTP verification for automated review and CI.
 */
export const MSG91_DEMO_PHONES = ['919876543210', '919876500001', '9876543210', '9876500001'];

export const isDemoCredentialPhone = (phone: string): boolean => {
  const cleanDigits = phone.replace(/\D/g, '').slice(-10);
  return MSG91_DEMO_PHONES.some((d) => d.endsWith(cleanDigits));
};
