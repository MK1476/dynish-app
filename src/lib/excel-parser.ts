import * as XLSX from 'xlsx';

export interface ExcelCatalogRow {
  category: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  unit?: string;
  scarcityTag?: string;
}

export function parseCatalogExcel(fileBuffer: ArrayBuffer | Uint8Array): ExcelCatalogRow[] {
  const data = fileBuffer instanceof Uint8Array ? fileBuffer : new Uint8Array(fileBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  return rawRows.map((row) => {
    // Normalize keys to lowercase trimmed strings for flexible matching
    const normalized: Record<string, any> = {};
    for (const key of Object.keys(row)) {
      normalized[key.trim().toLowerCase().replace(/\s+/g, ' ')] = row[key];
    }

    const name = String(
      normalized['item name'] ||
      normalized['name'] ||
      normalized['item'] ||
      normalized['product name'] ||
      normalized['product'] ||
      normalized['title'] ||
      ''
    ).trim();

    const category = String(
      normalized['category'] ||
      normalized['group'] ||
      normalized['type'] ||
      normalized['department'] ||
      normalized['section'] ||
      'All Items'
    ).trim() || 'All Items';

    const rawPrice = String(
      normalized['price'] ||
      normalized['rate'] ||
      normalized['mrp'] ||
      normalized['selling price'] ||
      normalized['amount'] ||
      normalized['cost'] ||
      '0'
    ).replace(/[^0-9.]/g, '');
    const price = parseFloat(rawPrice) || 0;

    const rawOrigPrice = String(
      normalized['original price'] ||
      normalized['originalprice'] ||
      normalized['list price'] ||
      normalized['old price'] ||
      ''
    ).replace(/[^0-9.]/g, '');
    const origPriceVal = rawOrigPrice ? parseFloat(rawOrigPrice) : undefined;
    const originalPrice = origPriceVal && origPriceVal > price ? origPriceVal : undefined;

    const rawImage = String(
      normalized['image url'] ||
      normalized['image'] ||
      normalized['imageurl'] ||
      normalized['photo'] ||
      normalized['picture'] ||
      ''
    ).trim();
    // Accept valid http/https image URLs, otherwise leave empty
    const imageUrl = (rawImage.startsWith('http://') || rawImage.startsWith('https://')) 
      ? rawImage 
      : undefined;

    const unit = String(
      normalized['unit'] ||
      normalized['unit of measure'] ||
      normalized['uom'] ||
      'per piece'
    ).trim() || 'per piece';

    const scarcityTag = String(
      normalized['scarcity tag'] ||
      normalized['tag'] ||
      normalized['badge'] ||
      ''
    ).trim() || undefined;

    const description = String(
      normalized['description'] ||
      normalized['desc'] ||
      normalized['details'] ||
      ''
    ).trim() || undefined;

    return {
      category,
      name,
      description,
      price,
      originalPrice,
      imageUrl,
      unit,
      scarcityTag,
    };
  }).filter((item) => item.name.length > 0 && item.price >= 0);
}

export function generateCatalogTemplate(): Uint8Array {
  const templateData = [
    {
      Category: 'Ethnic Kurtis',
      'Item Name': 'Lucknowi Chikankari Chanderi Kurti',
      Description: 'Hand-embroidered pure Chanderi silk kurti with matching slip.',
      Price: 1850,
      'Original Price': 2400,
      'Image URL': 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800',
      Unit: 'per piece',
      'Scarcity Tag': 'Only 2 Left',
    },
    {
      Category: 'Ethnic Kurtis',
      'Item Name': 'Mulmul Anarkali Gown Set (No Photo Needed)',
      Description: 'Breathable summer-ready floral printed cotton ensemble.',
      Price: 2200,
      'Original Price': 2800,
      'Image URL': '', // Images are 100% optional
      Unit: 'per piece',
      'Scarcity Tag': 'Best Seller',
    },
    {
      Category: 'Suits & Sets',
      'Item Name': 'Banarasi Silk Festive Kurta Set',
      Description: 'Rich brocade weave with zari borders, ideal for weddings.',
      Price: 3400,
      'Original Price': 4200,
      'Image URL': '',
      Unit: 'per piece',
      'Scarcity Tag': 'Handcrafted',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CatalogTemplate');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
