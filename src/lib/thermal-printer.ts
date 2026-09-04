/**
 * Thermal Printer Utilities for Dynish 2.0
 * Supports 58mm (32 cols) and 80mm (48 cols) ESC/POS thermal printers
 * and Browser Native Print Dialogs.
 */

export interface ReceiptData {
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  billId: string;
  customerPhone: string;
  amount: number;
  discountApplied?: number;
  finalAmount: number;
  loyaltyOfferText?: string;
  timestamp: string;
}

/**
 * Center aligns text within a given column width
 */
function centerText(text: string, width = 32): string {
  if (text.length >= width) return text.slice(0, width);
  const pad = Math.floor((width - text.length) / 2);
  return ' '.repeat(pad) + text + ' '.repeat(width - text.length - pad);
}

/**
 * Creates two-column left and right aligned row (e.g. "Total        ₹1,200")
 */
function twoColumn(left: string, right: string, width = 32): string {
  const space = width - left.length - right.length;
  if (space <= 0) return left + ' ' + right;
  return left + ' '.repeat(space) + right;
}

/**
 * Generates formatted plain text for 58mm / 80mm thermal receipts
 */
export function formatPlainTextReceipt(data: ReceiptData, width: 32 | 48 = 32): string {
  const divider = '-'.repeat(width);
  const doubleDivider = '='.repeat(width);

  const lines: string[] = [
    centerText(data.shopName.toUpperCase(), width),
    centerText(data.shopAddress, width),
    centerText(`Ph: +91 ${data.shopPhone}`, width),
    divider,
    twoColumn(`Bill #${data.billId.slice(0, 8)}`, data.timestamp, width),
    twoColumn('Customer:', `+91 ${data.customerPhone}`, width),
    divider,
    twoColumn('Gross Total:', `INR ${data.amount.toFixed(2)}`, width),
  ];

  if (data.discountApplied && data.discountApplied > 0) {
    lines.push(twoColumn('Loyalty Discount:', `- INR ${data.discountApplied.toFixed(2)}`, width));
  }

  lines.push(doubleDivider);
  lines.push(twoColumn('NET PAID:', `INR ${data.finalAmount.toFixed(2)}`, width));
  lines.push(doubleDivider);

  if (data.loyaltyOfferText) {
    lines.push(centerText('*** NEXT VISIT REWARD ***', width));
    lines.push(centerText(data.loyaltyOfferText, width));
    lines.push(divider);
  }

  lines.push(centerText('Thank You For Visiting!', width));
  lines.push(centerText('Powered by Dynish (5s Counter)', width));
  lines.push('\n\n\n'); // Paper feed

  return lines.join('\n');
}

/**
 * Generates standard ESC/POS binary buffer for thermal mini printers
 */
export function generateEscPosBuffer(data: ReceiptData): Uint8Array {
  const text = formatPlainTextReceipt(data, 32);
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);

  // ESC @ (Initialize), GS V 65 0 (Partial cut)
  const init = new Uint8Array([0x1B, 0x40]);
  const cut = new Uint8Array([0x1D, 0x56, 0x41, 0x03]);

  const combined = new Uint8Array(init.length + textBytes.length + cut.length);
  combined.set(init, 0);
  combined.set(textBytes, init.length);
  combined.set(cut, init.length + textBytes.length);

  return combined;
}

/**
 * Connect to Bluetooth Thermal Printer using Web Bluetooth API
 */
export async function printViaBluetooth(data: ReceiptData): Promise<{ success: boolean; error?: string }> {
  if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
    return {
      success: false,
      error: 'Web Bluetooth API is not supported in this browser. Please use Chrome/Edge or Print via Browser.',
    };
  }

  try {
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        '0000ae30-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      ],
    });

    const server = await device.gatt.connect();
    // Search primary services
    const services = await server.getPrimaryServices();
    let writeChar: any = null;

    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      return { success: false, error: 'Could not find a writable print characteristic on this device.' };
    }

    const buffer = generateEscPosBuffer(data);
    
    // Send in chunks of 512 bytes
    const chunkSize = 512;
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.slice(i, i + chunkSize);
      if (writeChar.writeValueWithoutResponse) {
        await writeChar.writeValueWithoutResponse(chunk);
      } else {
        await writeChar.writeValue(chunk);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Bluetooth printing failed or was cancelled.' };
  }
}
