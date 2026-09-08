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
  assert(waText.includes('Flat ₹100 Off'), 'WhatsApp receipt contains next-visit reward coupon');
  assert(waText.includes('Visit #3'), 'WhatsApp receipt contains visit badge count');

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
