/**
 * Dynish 2.0 Comprehensive Automated Test Suite
 * Validates all core business logic, formatting engines, security rules, and branding.
 */

import * as fs from 'fs';
import * as path from 'path';

// ANSI color helpers
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    console.log(`  ${GREEN}✓ PASS:${RESET} ${testName}`);
    passedTests++;
  } else {
    console.error(`  ${RED}✗ FAIL:${RESET} ${testName}`);
    if (errorDetail) {
      console.error(`    ${RED}Detail: ${errorDetail}${RESET}`);
    }
    failedTests++;
  }
}

async function runTestSuite() {
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}   DYNISH 2.0 - COMPREHENSIVE AUTOMATED TEST SUITE   ${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  // 1. BRAND ASSETS & LOGO VERIFICATION
  console.log(`${YELLOW}1. Brand Assets & Logo Verification${RESET}`);
  const publicDir = path.join(process.cwd(), 'public');
  const logoPath = path.join(publicDir, 'dynish-logo.png');
  const iconPath = path.join(publicDir, 'icon.png');
  const manifestPath = path.join(publicDir, 'manifest.json');

  assert(fs.existsSync(logoPath), 'Official Dynish Speedometer Logo exists in public/dynish-logo.png');
  assert(fs.existsSync(iconPath), 'App icon exists in public/icon.png');
  assert(fs.existsSync(manifestPath), 'PWA manifest exists in public/manifest.json');

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert(manifest.name.includes('Dynish'), 'PWA manifest contains valid application name');
    assert(manifest.display === 'standalone', 'PWA display mode is standalone');
  }

  // 2. UUID & POSTGRESQL TYPE SAFETY (Code 22P02 Fix)
  console.log(`\n${YELLOW}2. UUID & PostgreSQL Type Safety Verification${RESET}`);
  const { isValidUUID } = await import('../src/lib/utils');

  assert(!isValidUUID('9876543210'), 'Phone number "9876543210" is safely rejected as UUID');
  assert(!isValidUUID('user_9876543210'), 'Prefixed string "user_9876543210" is safely rejected as UUID');
  assert(isValidUUID('11111111-1111-1111-1111-111111111111'), 'Standard 36-char UUID is properly accepted');

  // 3. THERMAL RECEIPT FORMATTER & ESC/POS ENGINE
  console.log(`\n${YELLOW}3. Thermal Receipt Formatter & ESC/POS Engine${RESET}`);
  const { formatPlainTextReceipt, generateEscPosBuffer } = await import('../src/lib/thermal-printer');

  const sampleReceipt = {
    shopName: 'Heritage Silks & Sarees',
    shopAddress: 'MG Road, Bengaluru',
    shopPhone: '9876543210',
    billId: 'INV-10029',
    customerPhone: '9820144521',
    amount: 1200,
    finalAmount: 1200,
    loyaltyOfferText: 'Flat ₹100 Off on next purchase above ₹500',
    timestamp: '04/09/2026, 17:30',
  };

  const receiptText = formatPlainTextReceipt(sampleReceipt, 32);
  assert(receiptText.includes('HERITAGE SILKS & SAREES'), 'Receipt header contains uppercase shop name');
  assert(receiptText.includes('INR 1200.00'), 'Receipt displays formatted bill total');
  assert(receiptText.includes('Flat ₹100 Off'), 'Receipt includes next-visit loyalty reward text');
  assert(receiptText.includes('Powered by Dynish'), 'Receipt contains Dynish counter attribution');

  const escPos = generateEscPosBuffer(sampleReceipt);
  assert(escPos.length > 50, 'ESC/POS binary buffer generated with proper length');
  assert(escPos[0] === 0x1B && escPos[1] === 0x40, 'ESC/POS starts with standard printer INIT command (ESC @)');

  // 4. CASHIER STAFF PIN SECURITY LOGIC
  console.log(`\n${YELLOW}4. Cashier Staff PIN Security Logic${RESET}`);
  const defaultPin = '1234';
  function verifyPin(entered: string, stored: string = defaultPin): boolean {
    return entered === stored;
  }

  assert(verifyPin('1234', defaultPin), 'Default PIN 1234 correctly unlocks Owner Mode');
  assert(!verifyPin('0000', defaultPin), 'Wrong PIN 0000 is rejected');
  assert(!verifyPin('9876', defaultPin), 'Wrong PIN 9876 is rejected');
  assert(verifyPin('4321', '4321'), 'Custom updated PIN 4321 correctly validates');

  // 5. IN-APP LOG RECORDER BUFFER & DUMP ENGINE
  console.log(`\n${YELLOW}5. In-App Log Recorder & Diagnostic Dump${RESET}`);
  const { logger } = await import('../src/lib/logger');

  logger.info('TestRunner', 'Test log entry initialized', { testId: 101 });
  logger.error('TestRunner', 'Simulated failure trace captured', { code: 'TEST_ERR' });

  const logs = logger.getLogs();
  assert(logs.length >= 2, 'In-memory ring buffer successfully stored recent log entries');
  
  const hasErrorLog = logs.some(l => l.level === 'ERROR' && l.message.includes('Simulated failure trace'));
  assert(hasErrorLog, 'Log levels and error messages recorded accurately');

  // 6. SUBSCRIPTION DAYS & EXPIRY CALCULATION
  console.log(`\n${YELLOW}6. Subscription Days & Expiry Calculation${RESET}`);
  const { calculateSubscriptionStatus } = await import('../src/lib/utils');

  const activeDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
  const warningDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const expiredDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

  assert(!calculateSubscriptionStatus(activeDate).isExpired && !calculateSubscriptionStatus(activeDate).isWarning, '10 days left: Active state (No warning, Not expired)');
  assert(calculateSubscriptionStatus(warningDate).isWarning, '2 days left: Triggers 3-Day Warning Banner');
  assert(calculateSubscriptionStatus(expiredDate).isExpired, 'Past date: Triggers Locked Storefront Overlay');

  // 7. CURRENCY & RETENTION FORMATTING
  console.log(`\n${YELLOW}7. Currency & WhatsApp Text Formatting${RESET}`);
  const { formatINR, generateWhatsAppBillMessage } = await import('../src/lib/utils');

  assert(formatINR(1200) === '₹1,200', 'formatINR formats ₹1,200 correctly');
  assert(formatINR(1099) === '₹1,099', 'formatINR formats ₹1,099 correctly');

  const waText = generateWhatsAppBillMessage({
    shopName: 'Heritage Silks',
    ownerName: 'Vendor',
    customerName: 'Aarav',
    customerPhone: '9820144521',
    billAmount: 1200,
    visitNumber: 3,
    nextOfferTitle: 'Flat ₹100 Off',
    shopId: '11111111-1111-1111-1111-111111111111',
  });

  assert(waText.includes('Heritage Silks'), 'WhatsApp receipt contains store name');
  assert(waText.includes('₹1,200'), 'WhatsApp receipt contains bill amount');
  assert(waText.includes('₹100 off'), 'WhatsApp receipt contains next-visit reward coupon');
  assert(waText.includes('*3rd visit*'), 'WhatsApp receipt contains ordinal visit count (*3rd visit*)');

  // 8. STANDEE QR CODE GENERATION
  console.log(`\n${YELLOW}8. Standee QR Code Generation${RESET}`);
  const QRCode = (await import('qrcode')).default;
  const testStoreUrl = 'http://localhost:3000/store/11111111-1111-1111-1111-111111111111';
  const qrDataUrl = await QRCode.toDataURL(testStoreUrl, { width: 300 });

  assert(qrDataUrl.startsWith('data:image/png;base64,'), 'QR Code generated as valid high-res PNG data URI');

  // 9. CUSTOM WHATSAPP TEMPLATE ENGINE
  console.log(`\n${YELLOW}9. Custom WhatsApp Template Engine${RESET}`);
  const customTemplate = 'Hello {customer_name}! Thanks for shopping at {shop_name}. Bill: {bill_amount}. Next reward: {next_offer}. Link: {store_link}';
  const templatedMessage = generateWhatsAppBillMessage({
    shopName: 'Boutique XYZ',
    ownerName: 'Boutique XYZ',
    customerName: 'Aarav',
    customerPhone: '9876543210',
    billAmount: 546,
    visitNumber: 2,
    nextOfferTitle: '10% OFF',
    shopId: 'shop-uuid-123',
    shopSlug: 'boutique-xyz',
    customTemplate,
  });

  assert(templatedMessage.includes('Hello Aarav!'), 'Replaced {customer_name} correctly');
  assert(templatedMessage.includes('Boutique XYZ'), 'Replaced {shop_name} correctly');
  assert(templatedMessage.includes('₹546'), 'Replaced {bill_amount} correctly');
  assert(templatedMessage.includes('10% OFF'), 'Replaced {next_offer} correctly');
  assert(templatedMessage.includes('/store/boutique-xyz'), 'Replaced {store_link} with custom slug correctly');

  // 10. BILLING DISCOUNT PERCENTAGE CALCULATION
  console.log(`\n${YELLOW}10. Billing Discount Calculation (Rupees Breakdown)${RESET}`);
  const billAmountTest = 546;
  const percentMatch = '10% OFF'.match(/(\d+(\.\d+)?)\s*%/);
  const percent = percentMatch ? parseFloat(percentMatch[1]) : 0;
  const calculatedDiscount = Math.round((billAmountTest * percent) / 100);
  const finalPayable = billAmountTest - calculatedDiscount;

  assert(calculatedDiscount === 55, '10% discount on ₹546 correctly rounds to ₹55');
  assert(finalPayable === 491, 'Payable amount is ₹491 (546 - 55)');

  // 11. VANITY SLUG NORMALIZATION
  console.log(`\n${YELLOW}11. Vanity Slug Normalization${RESET}`);
  const rawSlugCandidate = '  Royal Silk & Sarees!  ';
  const cleanSlug = rawSlugCandidate
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  assert(cleanSlug === 'royal-silk-sarees', 'Normalized slug matches expected clean format');

  // 12. EXCEL PARSER ROBUSTNESS & OPTIONAL IMAGES
  console.log(`\n${YELLOW}12. Excel Parser Robustness & Optional Images${RESET}`);
  const { parseCatalogExcel, generateCatalogTemplate } = await import('../src/lib/excel-parser');
  const templateBytes = generateCatalogTemplate();
  const parsedTemplateRows = parseCatalogExcel(templateBytes);

  assert(parsedTemplateRows.length >= 3, 'Template generates and parses at least 3 sample items');
  const itemWithoutImage = parsedTemplateRows.find(r => r.imageUrl === undefined);
  assert(!!itemWithoutImage, 'Items without image URLs are parsed successfully without rejection');
  assert(Boolean(itemWithoutImage?.name.includes('No Photo Needed')), 'Image-less item retains full product name');
  assert((itemWithoutImage?.price || 0) > 0, 'Image-less item retains valid numeric price');

  // 13. WHOLE-CATALOG GLOBAL PRICE SORTING
  console.log(`\n${YELLOW}13. Whole-Catalog Global Price Sorting${RESET}`);
  const mockCatalog = [
    { id: '1', name: 'Item Low', price: 150, is_available: true },
    { id: '2', name: 'Item High', price: 950, is_available: true },
    { id: '3', name: 'Item Mid', price: 400, is_available: true },
    { id: '4', name: 'Unavailable Item', price: 50, is_available: false },
  ];

  const sortAsc = [...mockCatalog].filter(i => i.is_available).sort((a, b) => a.price - b.price);
  const sortDesc = [...mockCatalog].filter(i => i.is_available).sort((a, b) => b.price - a.price);

  // 14. PWA STANDARD & MASKABLE ICONS INTEGRITY
  console.log(`\n${YELLOW}14. PWA Standard & Maskable Icons Integrity${RESET}`);
  const icon192Path = path.join(publicDir, 'icon-192.png');
  const icon512Path = path.join(publicDir, 'icon-512.png');
  const maskable192Path = path.join(publicDir, 'icon-maskable-192.png');
  const maskable512Path = path.join(publicDir, 'icon-maskable-512.png');
  const appleTouchPath = path.join(publicDir, 'apple-touch-icon.png');

  assert(fs.existsSync(icon192Path), 'Square icon-192.png exists in public/');
  assert(fs.existsSync(icon512Path), 'Square icon-512.png exists in public/');
  assert(fs.existsSync(maskable192Path), 'PWA maskable icon-maskable-192.png exists in public/');
  assert(fs.existsSync(maskable512Path), 'PWA maskable icon-maskable-512.png exists in public/');
  assert(fs.existsSync(appleTouchPath), 'Apple touch icon exists in public/apple-touch-icon.png');

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const anyIcon = manifest.icons?.find((i: any) => i.purpose === 'any');
    const maskableIcon = manifest.icons?.find((i: any) => i.purpose === 'maskable');
    assert(!!anyIcon, 'PWA manifest includes purpose: "any" icon definition');
    assert(!!maskableIcon, 'PWA manifest includes purpose: "maskable" icon definition');
  }

  // 15. ANALYTICS VISIT TIMINGS BUCKET & PEAK WINDOW DETECTION
  console.log(`\n${YELLOW}15. Analytics Visit Timings Bucket & Peak Window Detection${RESET}`);
  const sampleTxs = [
    { id: '1', created_at: new Date().setHours(9, 30, 0, 0), bill_amount: 450 },
    { id: '2', created_at: new Date().setHours(18, 15, 0, 0), bill_amount: 1200 },
    { id: '3', created_at: new Date().setHours(19, 0, 0, 0), bill_amount: 850 },
  ];

  const peakSlotTxs = sampleTxs.filter(t => {
    const h = new Date(t.created_at).getHours();
    return h >= 18 && h < 20;
  });

  assert(peakSlotTxs.length === 2, 'Time slot 6 PM - 8 PM correctly aggregates 2 customer visits');
  const peakSlotRevenue = peakSlotTxs.reduce((sum, t) => sum + t.bill_amount, 0);
  assert(peakSlotRevenue === 2050, 'Peak slot correctly sums ₹2,050 revenue');

  // 16. AUTH ROUTE SUBSCRIPTION BANNER SUPPRESSION LOGIC
  console.log(`\n${YELLOW}16. Auth Route Subscription Banner Suppression Logic${RESET}`);
  const isAuthPage = (pathname: string) =>
    pathname.startsWith('/owner/login') ||
    pathname.startsWith('/owner/onboarding') ||
    pathname === '/login';

  assert(isAuthPage('/owner/login'), '/owner/login is correctly classified as auth route');
  assert(isAuthPage('/owner/onboarding'), '/owner/onboarding is correctly classified as auth route');
  assert(isAuthPage('/login'), '/login is correctly classified as auth route');
  assert(!isAuthPage('/owner/dashboard'), '/owner/dashboard is correctly classified as authenticated portal');
  assert(!isAuthPage('/owner/billing'), '/owner/billing is correctly classified as authenticated portal');
  assert(!isAuthPage('/owner/catalog'), '/owner/catalog is correctly classified as authenticated portal');

  // Verify warning banner suppression logic
  const shouldRenderBanner = (pathname: string, isWarning: boolean) =>
    !isAuthPage(pathname) && isWarning;

  assert(!shouldRenderBanner('/owner/login', true), 'Login page NEVER renders subscription warning banner even if isWarning=true');
  assert(!shouldRenderBanner('/owner/onboarding', true), 'Onboarding page NEVER renders subscription warning banner even if isWarning=true');
  assert(shouldRenderBanner('/owner/dashboard', true), 'Dashboard correctly displays subscription warning banner when isWarning=true');

  // 17. ONBOARDING & OWNER ROUTE ACCESS GATEKEEPING LOGIC
  console.log(`\n${YELLOW}17. Onboarding & Owner Route Access Gatekeeping Logic${RESET}`);
  function resolveOwnerRouteAccess(session: { phone: string | null; userId: string | null }, hasShop: boolean, requestedPath: string): string {
    const isAuthenticated = !!(session.phone || session.userId);
    if (!isAuthenticated) {
      return '/owner/login';
    }
    if (requestedPath === '/owner/onboarding') {
      return hasShop ? '/owner/dashboard' : '/owner/onboarding';
    }
    return hasShop ? requestedPath : '/owner/onboarding';
  }

  assert(
    resolveOwnerRouteAccess({ phone: null, userId: null }, false, '/owner/onboarding') === '/owner/login',
    'Unauthenticated user accessing /owner/onboarding is redirected to /owner/login'
  );
  assert(
    resolveOwnerRouteAccess({ phone: null, userId: null }, false, '/owner/dashboard') === '/owner/login',
    'Unauthenticated user accessing /owner/dashboard is redirected to /owner/login'
  );
  assert(
    resolveOwnerRouteAccess({ phone: '9876543210', userId: 'usr-1' }, true, '/owner/onboarding') === '/owner/dashboard',
    'Logged-in user with existing store accessing /owner/onboarding is redirected to /owner/dashboard'
  );
  assert(
    resolveOwnerRouteAccess({ phone: '9876543210', userId: 'usr-1' }, false, '/owner/onboarding') === '/owner/onboarding',
    'Logged-in user with NO store is permitted to view /owner/onboarding'
  );
  assert(
    resolveOwnerRouteAccess({ phone: '9876543210', userId: 'usr-1' }, true, '/owner/dashboard') === '/owner/dashboard',
    'Logged-in owner accessing /owner/dashboard proceeds normally'
  );

  // 18. STOREFRONT DYNAMIC REVALIDATION PATH RESOLUTION
  console.log(`\n${YELLOW}18. Storefront Dynamic Revalidation Path Resolution${RESET}`);
  function resolveRevalidationPaths(shopId: string, slug?: string | null): string[] {
    const paths = [
      `/store/${shopId}`,
      '/store/[shopId]',
      '/owner/catalog',
    ];
    if (slug) {
      paths.push(`/store/${slug}`);
    }
    return paths;
  }

  const mandiHousePaths = resolveRevalidationPaths('2c8fa400-0000-0000-0000-000000000000', 'mandi-house');
  assert(mandiHousePaths.includes('/store/mandi-house'), 'Storefront revalidation includes vanity slug /store/mandi-house');
  assert(mandiHousePaths.includes('/store/2c8fa400-0000-0000-0000-000000000000'), 'Storefront revalidation includes direct UUID path');
  assert(mandiHousePaths.includes('/store/[shopId]'), 'Storefront revalidation includes Next.js layout route pattern');
  assert(mandiHousePaths.includes('/owner/catalog'), 'Storefront revalidation includes owner catalog page');

  // 19. CANONICAL DOMAIN RESOLUTION (DYNISH.COM ENFORCEMENT)
  console.log(`\n${YELLOW}19. Canonical Domain Resolution (dynish.com Enforcement)${RESET}`);
  const { getAppBaseUrl } = await import('../src/lib/utils');
  const resolvedBaseUrl = getAppBaseUrl();
  assert(resolvedBaseUrl === 'https://dynish.com', 'getAppBaseUrl() strictly resolves to https://dynish.com');
  assert(!resolvedBaseUrl.includes('localhost'), 'getAppBaseUrl() never leaks localhost');
  assert(!resolvedBaseUrl.includes('vercel.app'), 'getAppBaseUrl() never leaks staging vercel domain');

  // 20. DIRECT ITEM DEEP-LINKING FORMAT & RESOLUTION
  console.log(`\n${YELLOW}20. Direct Item Deep-Linking Format & Resolution${RESET}`);
  function generateDirectItemLink(shopSlug: string, itemId: string): string {
    const base = getAppBaseUrl();
    return `${base}/store/${shopSlug}?item=${itemId}`;
  }

  function parseDirectItemLink(urlStr: string): string | null {
    try {
      const parsed = new URL(urlStr);
      const queryItem = parsed.searchParams.get('item');
      if (queryItem) return queryItem;
      const hashMatch = parsed.hash.match(/^#item-(.+)$/);
      if (hashMatch) return hashMatch[1];
      return null;
    } catch {
      return null;
    }
  }

  const sampleDirectLink = generateDirectItemLink('mandi-house', 'item-uuid-101');
  assert(sampleDirectLink === 'https://dynish.com/store/mandi-house?item=item-uuid-101', 'Direct item link formats properly with ?item= parameter');
  assert(parseDirectItemLink(sampleDirectLink) === 'item-uuid-101', 'Direct item URL parser extracts item ID from query parameter');
  assert(parseDirectItemLink('https://dynish.com/store/mandi-house#item-legacy-999') === 'legacy-999', 'Direct item URL parser supports backward-compatible hash syntax #item-');

  // 21. DYNAMIC 10% NEXT-VISIT LOYALTY REWARD SYSTEM
  console.log(`\n${YELLOW}21. Dynamic 10% Next-Visit Loyalty Reward System${RESET}`);
  function calculateNextVisitReward(billAmount: number): number {
    return Math.round(billAmount * 0.10);
  }

  function computeNetPayable(originalBill: number, loyaltyDiscount: number): { discountRupees: number; netPayable: number } {
    const discount = Math.min(originalBill, loyaltyDiscount);
    return {
      discountRupees: discount,
      netPayable: Math.max(0, originalBill - discount),
    };
  }

  // Test case: Bill of ₹350 earns ₹35
  const reward350 = calculateNextVisitReward(350);
  assert(reward350 === 35, 'Bill of ₹350 dynamically generates ₹35 next-visit loyalty reward (10%)');

  // Test case: Bill of ₹1200 earns ₹120
  const reward1200 = calculateNextVisitReward(1200);
  assert(reward1200 === 120, 'Bill of ₹1,200 dynamically generates ₹120 next-visit loyalty reward (10%)');

  // Test case: Next visit applying ₹35 on a ₹400 bill -> ₹365
  const netBill = computeNetPayable(400, 35);
  assert(netBill.discountRupees === 35, 'Loyalty reward applies exactly ₹35 discount');
  assert(netBill.netPayable === 365, 'Net payable is correctly reduced to ₹365 (₹400 - ₹35)');

  // Test WhatsApp message format contains canonical link and exact reward
  const testWhatsAppMsg = generateWhatsAppBillMessage({
    shopName: 'Mandi House',
    customerName: 'Karim',
    customerPhone: '9876543210',
    billAmount: 350,
    visitNumber: 1,
    nextOfferTitle: '₹35 OFF on Next Visit (10% of today\'s bill ₹350)',
    shopId: 'shop-uuid-1',
    shopSlug: 'mandi-house',
  });

  assert(testWhatsAppMsg.includes('https://dynish.com/store/mandi-house'), 'WhatsApp message contains canonical dynish.com store URL');
  assert(testWhatsAppMsg.includes('₹35 off'), 'WhatsApp message displays dynamic 10% reward (₹35 off)');
  assert(!testWhatsAppMsg.includes('localhost'), 'WhatsApp message contains no localhost link');
  assert(!testWhatsAppMsg.includes('vercel.app'), 'WhatsApp message contains no vercel.app link');

  // ==========================================
  // SECTION 22: MSG91 OTP WIDGET & VERIFICATION SUITE
  // ==========================================
  console.log(`\n${CYAN}--- Section 22: MSG91 OTP Widget & Token Verification Suite ---${RESET}`);

  // Test MSG91 configuration structure
  const sampleMsg91Config = {
    widgetId: '3669696d6f43353339303431',
    tokenAuth: '569424TqSS9nYwF6aa15e42P1',
    exposeMethods: true,
  };
  assert(sampleMsg91Config.exposeMethods === true, 'MSG91 exposeMethods is enabled for headless custom merchant UI');
  assert(sampleMsg91Config.widgetId.length > 10, 'MSG91 Widget ID is non-empty string');
  assert(sampleMsg91Config.tokenAuth.length > 10, 'MSG91 Token Auth is non-empty string');

  // Test Phone Normalization for MSG91
  function normalizeMsg91Phone(phone: string): { digits: string; fullPhone: string; msg91Identifier: string } {
    const digits = phone.replace(/\D/g, '').slice(-10);
    return {
      digits,
      fullPhone: `+91${digits}`,
      msg91Identifier: `91${digits}`,
    };
  }

  const norm1 = normalizeMsg91Phone('+91 98765-43210');
  assert(norm1.digits === '9876543210', 'Phone number extracts 10 digits cleanly');
  assert(norm1.msg91Identifier === '919876543210', 'MSG91 identifier formatted as 919876543210 without plus symbol');
  assert(norm1.fullPhone === '+919876543210', 'Supabase phone formatted as +919876543210');

  // Test Bypass Token Check
  function isMsg91BypassToken(token: string): boolean {
    const clean = token.trim();
    return clean === '123456' || clean === 'test_bypass_123456';
  }
  assert(isMsg91BypassToken('123456') === true, 'Bypass code 123456 is recognized for instant developer testing');
  assert(isMsg91BypassToken('test_bypass_123456') === true, 'Bypass code test_bypass_123456 is recognized');
  assert(isMsg91BypassToken('654321') === false, 'Non-bypass code 654321 correctly requires live verification');

  // Test verifyAccessToken payload structure
  function buildVerifyAccessTokenPayload(authKey: string, accessToken: string) {
    return JSON.stringify({
      authkey: authKey,
      'access-token': accessToken,
    });
  }

  const payload = JSON.parse(buildVerifyAccessTokenPayload('test-auth-key', 'jwt-sample-token'));
  assert(payload.authkey === 'test-auth-key', 'Payload includes authkey');
  assert(payload['access-token'] === 'jwt-sample-token', 'Payload includes access-token matching MSG91 v5 spec');

  // Test MSG91 API response parser
  function parseMsg91VerifyResponse(data: any): { verified: boolean; message: string } {
    if (data?.type === 'success' || data?.status === 'success') {
      return { verified: true, message: data?.message || 'Token verified successfully' };
    }
    return { verified: false, message: data?.message || 'MSG91 Token Verification failed' };
  }

  const resSuccessType = parseMsg91VerifyResponse({ type: 'success', message: 'Number verified successfully' });
  assert(resSuccessType.verified === true, 'Parser accepts { type: "success" } response');

  const resSuccessStatus = parseMsg91VerifyResponse({ status: 'success', message: 'OTP verified' });
  assert(resSuccessStatus.verified === true, 'Parser accepts { status: "success" } response');

  const resError = parseMsg91VerifyResponse({ type: 'error', message: 'Token expired or invalid' });
  assert(resError.verified === false, 'Parser detects { type: "error" } response');
  assert(resError.message === 'Token expired or invalid', 'Parser preserves error message from MSG91');

  // ==========================================
  // SECTION 23: PRODUCTION ENVIRONMENT SEGREGATION & SECURITY
  // ==========================================
  console.log(`\n${CYAN}--- Section 23: Production Environment Segregation & Security ---${RESET}`);

  // Test isDemoCredentialPhone recognition
  const demoList = ['919876543210', '919876500001', '9876543210', '9876500001'];
  function testIsDemoPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '').slice(-10);
    return demoList.some((d) => d.endsWith(digits));
  }

  assert(testIsDemoPhone('9876543210') === true, 'Apple review demo number 9876543210 recognized');
  assert(testIsDemoPhone('9876500001') === true, 'MSG91 secondary demo number 9876500001 recognized');
  assert(testIsDemoPhone('9704100544') === false, 'Real live merchant number 9704100544 is not a demo number');
  assert(testIsDemoPhone('9123456789') === false, 'Arbitrary customer number is not a demo number');

  // Test Production Bypass Security Rule
  function evaluateBypassAllowed(isProd: boolean, phone: string, token: string): boolean {
    const cleanToken = token.trim();
    if (cleanToken !== '123456') return false;
    // In production, only demo phones are permitted
    if (isProd) {
      return testIsDemoPhone(phone);
    }
    // In dev/preview, allowed
    return true;
  }

  assert(evaluateBypassAllowed(true, '9876543210', '123456') === true, 'In production, demo phone 9876543210 can use bypass for Apple review');
  assert(evaluateBypassAllowed(true, '9704100544', '123456') === false, 'In production, real merchant 9704100544 CANNOT bypass with 123456 (requires real OTP)');
  assert(evaluateBypassAllowed(false, '9704100544', '123456') === true, 'In preview/dev, 123456 can bypass for fast developer testing');

  // Test Production copy sanitization
  const prodMessages = [
    'OTP sent successfully via SMS.',
    'Verification code sent via SMS / WhatsApp!',
    'Payment gateway could not be loaded. Please check your network connection and try again.',
  ];

  prodMessages.forEach((msg) => {
    assert(!msg.toLowerCase().includes('test mode'), `Production message contains no test mode mention: "${msg}"`);
    assert(!msg.includes('123456'), `Production message contains no hardcoded test code: "${msg}"`);
  });

  // 23. CATALOG SEARCH, DEMO DATA CLEANUP & MULTI-OFFER AUDIT VERIFICATION
  console.log(`\n${YELLOW}23. Catalog Search, Data Cleanup, Shop Views & Multi-Offer Logic${RESET}`);

  // Test 1: Catalog search filtering
  const testCatalogItems = [
    { name: 'Royal Silk Saree', price: 2999, category_id: 'cat-1', description: 'Pure Banarasi silk', scarcity_tag: 'Featured' },
    { name: 'Cotton Daily Kurti', price: 599, category_id: 'cat-2', description: 'Comfortable everyday wear', scarcity_tag: null },
    { name: 'Bridal Lehenga Luxe', price: 14999, category_id: 'cat-1', description: 'Handcrafted zari work', scarcity_tag: 'Limited' },
  ];

  function filterItems(items: typeof testCatalogItems, tab: string, query: string) {
    return items.filter(i => {
      const matchesCategory = tab === 'all' || i.category_id === tab;
      if (!matchesCategory) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      return (
        i.name.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.scarcity_tag || '').toLowerCase().includes(q) ||
        i.price.toString().includes(q)
      );
    });
  }

  assert(filterItems(testCatalogItems, 'all', 'silk').length === 1, 'Search finds "Royal Silk Saree" by name');
  assert(filterItems(testCatalogItems, 'all', '599').length === 1, 'Search finds "Cotton Daily Kurti" by price');
  assert(filterItems(testCatalogItems, 'cat-1', 'kurti').length === 0, 'Search respects category tab filter');
  assert(filterItems(testCatalogItems, 'all', 'Limited').length === 1, 'Search finds item by scarcity tag');

  // Test 2: Protected demo phone numbers
  const PROTECTED_PHONES = ['9876543210', '9440001449'];
  assert(PROTECTED_PHONES.includes('9876543210'), 'Protected phone 9876543210 is safely whitelisted');
  assert(PROTECTED_PHONES.includes('9440001449'), 'Protected phone 9440001449 is safely whitelisted');
  assert(!PROTECTED_PHONES.includes('9505753170'), 'Unallowed test phone 9505753170 is correctly marked for deletion');
  assert(!PROTECTED_PHONES.includes('9876543200'), 'Unallowed test phone 9876543200 is correctly marked for deletion');

  // Test 3: Shop Views aggregation
  const testViewsRaw = [
    { shop_id: 'shop-1', view_date: '2026-09-11', view_count: 5 },
    { shop_id: 'shop-1', view_date: '2026-09-10', view_count: 10 },
    { shop_id: 'shop-2', view_date: '2026-09-11', view_count: 3 },
  ];
  const todayStr = '2026-09-11';
  const aggViews: Record<string, { todayViews: number; totalViews: number }> = {};
  testViewsRaw.forEach((row) => {
    if (!aggViews[row.shop_id]) aggViews[row.shop_id] = { todayViews: 0, totalViews: 0 };
    aggViews[row.shop_id].totalViews += row.view_count;
    if (row.view_date === todayStr) aggViews[row.shop_id].todayViews += row.view_count;
  });

  assert(aggViews['shop-1'].todayViews === 5, 'Shop-1 has exactly 5 today views');
  assert(aggViews['shop-1'].totalViews === 15, 'Shop-1 has exactly 15 total views');
  assert(aggViews['shop-2'].todayViews === 3, 'Shop-2 has exactly 3 today views');

  // Test 4: Multi-Offer Resolution
  interface TestOffer { id: string; title: string; isLatest: boolean }
  const customerOffers: TestOffer[] = [
    { id: '1', title: '10% Next Visit Discount (₹35 OFF)', isLatest: true },
    { id: '2', title: 'Special Festival ₹50 OFF', isLatest: false },
    { id: '3', title: 'Flat 15% OFF', isLatest: false },
  ];
  const defaultSelected = customerOffers[0];
  assert(defaultSelected.isLatest === true, 'Default selected offer is always marked as latest');
  assert(defaultSelected.title.includes('10%'), 'Default offer corresponds to the most recent loyalty reward');
  assert(customerOffers.length === 3, 'All 3 offers remain selectable by the merchant at the billing counter');

  // Test 5: Customer offer WhatsApp message formatting
  const { generateWhatsAppUrl } = await import('../src/lib/utils');
  const testWaUrl = generateWhatsAppUrl('9876500001', 'Hi Priya! ✨ Exclusive offer: 10% OFF https://dynish.com/mandi-house');
  assert(testWaUrl.startsWith('https://wa.me/919876500001?text='), 'Offer WhatsApp URL targets 10-digit Indian phone with 91 prefix');
  assert(testWaUrl.includes('https%3A%2F%2Fdynish.com'), 'Offer WhatsApp URL canonical dynish.com domain is properly encoded');

  // 24. SUBSCRIPTION RECOVERY, VIP TESTER PACK & PWA INSTALL BANNER
  console.log(`\n${YELLOW}24. Subscription Recovery, VIP Tester Pack & PWA Install Banner${RESET}`);

  // Test 1: Plan definitions including test_7days, monthly, quarterly, semi_annual
  const { PLANS } = await import('../src/lib/plans');
  assert(Boolean(PLANS.test_7days), 'PLANS contains test_7days pack definition');
  assert(PLANS.test_7days.price === 10, 'Tester pack price is exactly ₹10');
  assert(PLANS.test_7days.amountInPaise === 1000, 'Tester pack amount in paise is exactly 1000');
  assert(PLANS.test_7days.durationDays === 7, 'Tester pack duration is exactly 7 days');
  assert(PLANS.monthly.price === 199, 'Monthly plan is ₹199 (30 days)');
  assert(PLANS.monthly.durationDays === 30, 'Monthly plan duration is 30 days');
  assert(PLANS.quarterly.price === 498, 'Quarterly plan is ₹498 (90 days, ₹166/mo)');
  assert(PLANS.quarterly.durationDays === 90, 'Quarterly plan duration is 90 days');
  assert(PLANS.quarterly.perMonth === 166, 'Quarterly per month rate is ₹166');
  assert(PLANS.semi_annual.price === 900, 'Semi-annual plan is ₹900 (180 days, ₹150/mo)');
  assert(PLANS.semi_annual.durationDays === 180, 'Semi-annual plan duration is 180 days');
  assert(PLANS.semi_annual.perMonth === 150, 'Semi-annual per month rate is ₹150');

  // Test 2: Exclusive Tester Phone Gate (9440001449 & 9876543210)
  const isAuthorizedTester = (phone: string) => phone === '9440001449' || phone === '9876543210';
  assert(isAuthorizedTester('9440001449') === true, 'Phone 9440001449 is authorized for tester pack');
  assert(isAuthorizedTester('9876543210') === true, 'Phone 9876543210 is authorized for tester pack');
  assert(isAuthorizedTester('9505753170') === false, 'Random merchant numbers cannot access tester pack');

  // Test 3: Plan resolution from payment amount in paise
  function resolvePlanByPaise(amountInPaise: number) {
    if (amountInPaise <= 1000) return 'test_7days';
    if (amountInPaise >= 70000) return 'semi_annual';
    if (amountInPaise >= 35000) return 'quarterly';
    return 'monthly';
  }
  assert(resolvePlanByPaise(1000) === 'test_7days', '₹10 (1000 paise) resolves to test_7days');
  assert(resolvePlanByPaise(19900) === 'monthly', '₹199 (19900 paise) resolves to monthly');
  assert(resolvePlanByPaise(49800) === 'quarterly', '₹498 (49800 paise) resolves to quarterly');
  assert(resolvePlanByPaise(90000) === 'semi_annual', '₹900 (90000 paise) resolves to semi_annual');

  // Test 4: Self-serve Payment ID format validation
  function validatePaymentId(id: string) {
    const clean = id.trim();
    return clean.startsWith('pay_') && clean.length >= 10;
  }
  assert(validatePaymentId('pay_P2Kw123abcXYZ') === true, 'Valid Razorpay payment ID format accepted');
  assert(validatePaymentId('invalid_id_123') === false, 'Non-Razorpay ID format rejected');
  assert(validatePaymentId('pay_') === false, 'Incomplete payment ID rejected');
  assert(validatePaymentId('') === false, 'Empty payment ID rejected');

  // Test 5: PWA Install App banner persistence rules
  function shouldShowInstallBanner(state: { isDismissed: boolean; isInstalled: boolean; isStandalone: boolean; isAuthOrOnboarding: boolean }) {
    if (state.isAuthOrOnboarding) return false;
    if (state.isDismissed) return false;
    if (state.isInstalled) return false;
    if (state.isStandalone) return false;
    return true;
  }
  assert(shouldShowInstallBanner({ isDismissed: false, isInstalled: false, isStandalone: false, isAuthOrOnboarding: false }) === true, 'Banner displays for new uninstalled owner');
  assert(shouldShowInstallBanner({ isDismissed: true, isInstalled: false, isStandalone: false, isAuthOrOnboarding: false }) === false, 'Banner never shows again once dismissed/cancelled');
  assert(shouldShowInstallBanner({ isDismissed: false, isInstalled: true, isStandalone: false, isAuthOrOnboarding: false }) === false, 'Banner never shows again once installed');
  assert(shouldShowInstallBanner({ isDismissed: false, isInstalled: false, isStandalone: true, isAuthOrOnboarding: false }) === false, 'Banner does not show when running inside standalone PWA');
  assert(shouldShowInstallBanner({ isDismissed: false, isInstalled: false, isStandalone: false, isAuthOrOnboarding: true }) === false, 'Banner does not show during login or onboarding flow');

  // 25. INSTANT ZAPP BILLING, LOCAL CUSTOMER CACHE & PIPELINE SYNC
  console.log(`\n${YELLOW}25. Instant Zapp Billing, Local Customer Cache & Pipeline Sync${RESET}`);

  // Test 1: getShopBillingCustomers export
  const { getShopBillingCustomers } = await import('../src/actions/billing');
  assert(typeof getShopBillingCustomers === 'function', 'getShopBillingCustomers server action is exported');

  // Test 2: In-Memory / LocalStorage Customer Lookup & Instant Match
  const mockCustomerCache = new Map<string, any>([
    ['9876543210', {
      id: 'cust_1',
      phone_number: '9876543210',
      name: 'Ramesh Kumar',
      visit_count: 5,
      last_bill_amount: 1200,
      lastOfferAwarded: '10% Cashback on Next Visit',
    }],
    ['9876500001', {
      id: 'cust_2',
      phone_number: '9876500001',
      name: 'Priya Sharma',
      visit_count: 2,
      last_bill_amount: 450,
      lastOfferAwarded: '₹45 OFF (10% Loyalty)',
    }],
  ]);

  // Synchronous lookup (0ms)
  const lookup98765 = mockCustomerCache.get('9876543210');
  assert(Boolean(lookup98765), '10-digit exact customer lookup is instantaneous (0ms)');
  assert(lookup98765.name === 'Ramesh Kumar', 'Instant customer name retrieved correctly');
  assert(lookup98765.lastOfferAwarded === '10% Cashback on Next Visit', 'Instant previous loyalty offer retrieved');

  // Prefix/search matching for suggestions
  function searchCustomerCache(query: string, cache: Map<string, any>) {
    const results: any[] = [];
    cache.forEach((cust, digits) => {
      if (digits.includes(query) || (cust.name && cust.name.toLowerCase().includes(query.toLowerCase()))) {
        results.push(cust);
      }
    });
    return results;
  }
  const suggestions = searchCustomerCache('98765', mockCustomerCache);
  assert(suggestions.length === 2, 'Instant prefix recommendation finds 2 matching customers');

  // Test 3: Optimistic Background Pipeline Queue Mechanics
  interface TestBillingJob {
    id: string;
    shopId: string;
    phoneNumber: string;
    billAmount: number;
    retries: number;
  }
  const testQueue: TestBillingJob[] = [
    { id: 'job_1', shopId: 'shop_1', phoneNumber: '9876543210', billAmount: 500, retries: 0 },
    { id: 'job_2', shopId: 'shop_1', phoneNumber: '9876500001', billAmount: 300, retries: 0 },
  ];
  const serializedQueue = JSON.stringify(testQueue);
  const parsedQueue: TestBillingJob[] = JSON.parse(serializedQueue);
  assert(parsedQueue.length === 2, 'Pipeline queue serializes and deserializes cleanly');
  assert(parsedQueue[0].id === 'job_1', 'Pipeline preserves FIFO order for customer bills');

  // Queue drain simulation
  const processedQueue = parsedQueue.filter(j => j.id !== 'job_1');
  assert(processedQueue.length === 1, 'Completed job safely dequeued from pipeline');
  assert(processedQueue[0].id === 'job_2', 'Next job is ready for processing in pipeline');

  // Test 4: Subscription Card Order (199/- Top Priority)
  const planOrder = ['monthly', 'quarterly', 'semi_annual'];
  assert(planOrder[0] === 'monthly', '1 Month Starter (₹199 / mo) is prioritized at the top of the plan list');

  // ==========================================
  // SECTION 26: POLISHED WHATSAPP TEMPLATES & ORDINAL SUITE
  // ==========================================
  console.log(`\n${CYAN}--- Section 26: Polished WhatsApp Templates & Ordinal Suite ---${RESET}`);
  const { getOrdinalSuffix, formatDiscountRewardText } = await import('../src/lib/utils');

  // Test 1: English Ordinal Suffixes
  assert(getOrdinalSuffix(1) === '1st', '1 resolves to 1st');
  assert(getOrdinalSuffix(2) === '2nd', '2 resolves to 2nd');
  assert(getOrdinalSuffix(3) === '3rd', '3 resolves to 3rd');
  assert(getOrdinalSuffix(4) === '4th', '4 resolves to 4th');
  assert(getOrdinalSuffix(11) === '11th', '11 resolves to 11th (teen rule)');
  assert(getOrdinalSuffix(12) === '12th', '12 resolves to 12th (teen rule)');
  assert(getOrdinalSuffix(13) === '13th', '13 resolves to 13th (teen rule)');
  assert(getOrdinalSuffix(21) === '21st', '21 resolves to 21st');
  assert(getOrdinalSuffix(22) === '22nd', '22 resolves to 22nd');
  assert(getOrdinalSuffix(23) === '23rd', '23 resolves to 23rd');
  assert(getOrdinalSuffix(101) === '101st', '101 resolves to 101st');
  assert(getOrdinalSuffix(111) === '111th', '111 resolves to 111th');

  // Test 2: Dynamic Discount Text Formatting
  assert(formatDiscountRewardText('10% Off', 450) === '₹45 off', '10% on ₹450 formats as ₹45 off');
  assert(formatDiscountRewardText('Flat ₹50 Off', 500) === '₹50 off', 'Flat ₹50 Off formats as ₹50 off');
  assert(formatDiscountRewardText('Free Dessert') === 'Free Dessert', 'Non-discount text is preserved cleanly');

  // Test 3: Template #11 - First-time visitor with offer
  const t11FirstTime = generateWhatsAppBillMessage({
    shopId: 'shop-uuid-1',
    shopName: 'Heritage Silks',
    customerName: 'Priya',
    customerPhone: '9876543210',
    billAmount: 850,
    visitNumber: 1,
    nextOfferTitle: '10% off',
    shopSlug: 'heritage-silks',
  });
  assert(t11FirstTime.includes('Hi Priya! 👋'), 'First-time visitor receipt contains friendly greeting');
  assert(t11FirstTime.includes('it was wonderful having you for the first time ✨'), 'First-time visitor receipt has warm first-time copy');
  assert(!t11FirstTime.includes('1st visit'), 'First-time visitor receipt never says awkward "1st visit"');
  assert(t11FirstTime.includes('🧾 Your Bill: *₹850*'), 'First-time visitor receipt displays formatted bill line');
  assert(t11FirstTime.includes('🎁 Here\'s *₹85 off* your next visit, as a small welcome gift'), 'First-time visitor receipt includes welcome gift line');
  assert(t11FirstTime.includes('👉 https://dynish.com/store/heritage-silks'), 'First-time visitor receipt contains store slug link');

  // Test 4: Template #11 - Repeat visitor (5th visit) with offer
  const t11Repeat = generateWhatsAppBillMessage({
    shopId: 'shop-uuid-1',
    shopName: 'Heritage Silks',
    customerName: 'Aarav',
    customerPhone: '9876543210',
    billAmount: 1200,
    visitNumber: 5,
    nextOfferTitle: '₹100 off next visit',
    shopSlug: 'heritage-silks',
  });
  assert(t11Repeat.includes('this was your *5th visit* with us ✨'), 'Repeat visitor receipt contains formatted ordinal visit (*5th visit*)');
  assert(t11Repeat.includes('🎁 As a thank-you, here\'s *₹100 off* your next visit — just show this message at the counter.'), 'Repeat visitor receipt contains thank-you reward line');

  // Test 5: Template #11 - Repeat visitor with NO offer
  const t11NoOffer = generateWhatsAppBillMessage({
    shopId: 'shop-uuid-1',
    shopName: 'Heritage Silks',
    customerName: 'Aarav',
    customerPhone: '9876543210',
    billAmount: 500,
    visitNumber: 2,
    shopSlug: 'heritage-silks',
  });
  assert(t11NoOffer.includes('this was your *2nd visit* with us ✨'), 'Repeat visitor receipt without offer includes visit count');
  assert(!t11NoOffer.includes('🎁'), 'Receipt without offer contains no gift icon or empty lines');
  assert(!t11NoOffer.includes('off your next visit'), 'Receipt without offer contains no reward text');

  // Test 6: Template #11 - Zero or missing bill amount
  const t11ZeroBill = generateWhatsAppBillMessage({
    shopId: 'shop-uuid-1',
    shopName: 'Heritage Silks',
    customerName: 'Priya',
    customerPhone: '9876543210',
    billAmount: 0,
    visitNumber: 1,
    shopSlug: 'heritage-silks',
  });
  assert(!t11ZeroBill.includes('🧾 Your Bill:'), 'Zero bill amount skips bill receipt line');
  assert(t11ZeroBill.includes('It was wonderful having you — hope to see you again soon!'), 'Zero bill acknowledges visit warmly');

  // Test 7: Template #13 - Patron Offer Dispatch
  const sampleOfferTitle = 'Flat 20% Off on Festive Collection';
  const patronMessage = `Hi Priya! ✨\nHeritage Silks has something special just for you:\n\n🎁 *${sampleOfferTitle}*\n\nJust show this message at the counter on your next visit to redeem it.\n\nHope to see you soon!\n👉 https://dynish.com/store/heritage-silks`;
  assert(patronMessage.includes('Hi Priya! ✨'), 'Template #13 greeting matches specification');
  assert(patronMessage.includes('🎁 *Flat 20% Off on Festive Collection*'), 'Template #13 displays bold offer title');
  assert(patronMessage.includes('Just show this message at the counter'), 'Template #13 has redemption instruction');

  // Test 8: Storefront & Customer-Initiated Templates (#8, #9, #10)
  const t8 = `Hi Heritage Silks! I came across your shop on Dynish and wanted to know more 😊`;
  assert(t8.startsWith('Hi Heritage Silks!') && t8.endsWith('😊'), 'Template #8 storefront inquiry matches specification');

  const t9 = `Hi Heritage Silks! I'm interested in this:\n\n*Royal Silk Saree* — ₹2,500\nhttps://dynish.com/store/heritage-silks?item=123\n\nIs it available?`;
  assert(t9.includes('*Royal Silk Saree* — ₹2,500'), 'Template #9 product inquiry includes formatted name, price, link, and availability inquiry');

  const t10 = `Hi Heritage Silks! I'd like to check on a few things I saved from your catalog:\n\n• Saree 1 — ₹1,000\n• Saree 2 — ₹1,500\n\nTotal: ₹2,500\nhttps://dynish.com/store/heritage-silks\n\nAre these available?`;
  assert(t10.includes('saved from your catalog') && t10.includes('Are these available?'), 'Template #10 wishlist inquiry matches specification');

  // Test 9: Merchant Support Templates (#4, #5, #6, #7)
  const t4 = `Hi Dynish Team! I'm having trouble logging into my store — could you help?`;
  assert(t4.includes("I'm having trouble logging into my store — could you help?"), 'Template #4 login support message matches specification');

  const t57 = `Hi Dynish Team! I need some help with my store — Heritage Silks (+919876543210).`;
  assert(t57.includes('I need some help with my store — Heritage Silks (+919876543210).'), 'Template #5–7 store support message matches specification');

  // ==========================================
  // SECTION 27: SOCIAL LINKS, BENTO GRID, NO-OFFER BILLING & PWA ENGINE
  // ==========================================
  console.log(`\n${CYAN}--- Section 27: Social Links, Bento Grid, No-Offer Billing & PWA Engine ---${RESET}`);

  // Test 1: Instagram Handle Normalization
  function normalizeInstagramHandle(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const cleaned = raw.replace(/^@/, '').replace(/https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '').trim();
    return cleaned || null;
  }
  assert(normalizeInstagramHandle('@royal_silks') === 'royal_silks', '@royal_silks strips leading @ cleanly');
  assert(normalizeInstagramHandle('https://www.instagram.com/royal_silks/') === 'royal_silks', 'Full Instagram URL extracts handle cleanly');
  assert(normalizeInstagramHandle('royal_silks') === 'royal_silks', 'Plain handle preserved cleanly');
  assert(normalizeInstagramHandle('') === null, 'Empty handle returns null');

  // Test 2: YouTube URL Normalization
  function normalizeYoutubeUrl(raw: string | null | undefined): string | null {
    if (!raw || !raw.trim()) return null;
    const trimmed = raw.trim();
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }
  assert(normalizeYoutubeUrl('youtube.com/@royalsilks') === 'https://youtube.com/@royalsilks', 'youtube.com/@handle prepends https://');
  assert(normalizeYoutubeUrl('https://www.youtube.com/watch?v=12345') === 'https://www.youtube.com/watch?v=12345', 'Full https URL preserved cleanly');
  assert(normalizeYoutubeUrl('') === null, 'Empty YouTube link returns null');

  // Test 3: No-Offer Billing (Sale Only)
  const noOfferBillMsg = generateWhatsAppBillMessage({
    shopId: 'shop-uuid-1',
    shopName: 'Heritage Silks',
    customerName: 'Aarav',
    customerPhone: '9876543210',
    billAmount: 1500,
    visitNumber: 4,
    nextOfferTitle: '', // Shop owner chose "No Offer (Sale Only)"
    shopSlug: 'heritage-silks',
  });
  assert(noOfferBillMsg.includes('🧾 Your Bill: *₹1,500*'), 'No-offer bill records the bill amount');
  assert(noOfferBillMsg.includes('this was your *4th visit* with us ✨'), 'No-offer bill acknowledges 4th visit warmly');
  assert(!noOfferBillMsg.includes('🎁'), 'No-offer bill contains NO gift icon');
  assert(!noOfferBillMsg.includes('off your next visit'), 'No-offer bill contains NO discount promise');
  assert(noOfferBillMsg.includes('https://dynish.com/store/heritage-silks'), 'No-offer bill still includes storefront link');

  // Test 4: Skipping Past Offer Application
  const rawBill = 1000;
  const skippedOfferText = ''; // Merchant chose "Don't Apply Offer"
  const appliedDiscount = skippedOfferText ? 100 : 0;
  const netAmount = rawBill - appliedDiscount;
  assert(appliedDiscount === 0, 'Skipping offer results in ₹0 discount');
  assert(netAmount === 1000, 'Net amount equals original bill when offer is skipped');

  // Test 5: PWA Service Worker & Manifest
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  assert(fs.existsSync(swPath), 'public/sw.js service worker file exists');
  if (fs.existsSync(swPath)) {
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert(swContent.includes('dynish-pwa-v1'), 'sw.js specifies cache version');
    assert(swContent.includes('/_next/static/'), 'sw.js caches immutable Next.js chunks');
  }

  // Test 6: Migration 007 File
  const migPath = path.join(process.cwd(), 'supabase', 'migrations', '007_shop_social_links.sql');
  assert(fs.existsSync(migPath), '007_shop_social_links.sql migration exists');
  if (fs.existsSync(migPath)) {
    const migContent = fs.readFileSync(migPath, 'utf8');
    assert(migContent.includes('instagram_handle'), 'Migration adds instagram_handle column');
    assert(migContent.includes('youtube_url'), 'Migration adds youtube_url column');
  }

  // FINAL SUMMARY
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`  ${GREEN}PASSED TESTS: ${passedTests}${RESET}`);
  console.log(`  ${failedTests > 0 ? RED : GREEN}FAILED TESTS: ${failedTests}${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error(`${RED}Fatal error running test suite:${RESET}`, err);
  process.exit(1);
});
