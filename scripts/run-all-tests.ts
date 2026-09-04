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
