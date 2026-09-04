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

export function parseCatalogExcel(fileBuffer: ArrayBuffer): ExcelCatalogRow[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  return rawRows.map((row) => ({
    category: String(row.Category || row.category || 'General').trim(),
    name: String(row.Name || row.name || row['Item Name'] || '').trim(),
    description: String(row.Description || row.description || '').trim() || undefined,
    price: parseFloat(row.Price || row.price || '0') || 0,
    originalPrice: row['Original Price'] || row.originalPrice ? parseFloat(row['Original Price'] || row.originalPrice) : undefined,
    imageUrl: String(row.Image || row.image || row['Image URL'] || '').trim() || undefined,
    unit: String(row.Unit || row.unit || 'per piece').trim(),
    scarcityTag: String(row.Tag || row.tag || row['Scarcity Tag'] || '').trim() || undefined,
  })).filter((item) => item.name.length > 0 && item.price >= 0);
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
      'Item Name': 'Mulmul Anarkali Gown Set',
      Description: 'Breathable summer-ready floral printed cotton ensemble with organza dupatta.',
      Price: 2200,
      'Original Price': 2800,
      'Image URL': 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800',
      Unit: 'per piece',
      'Scarcity Tag': 'Best Seller',
    },
    {
      Category: 'Suits & Sets',
      'Item Name': 'Banarasi Silk Festive Kurta Set',
      Description: 'Rich brocade weave with zari borders, ideal for weddings.',
      Price: 3400,
      'Original Price': 4200,
      'Image URL': 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800',
      Unit: 'per piece',
      'Scarcity Tag': 'Handcrafted',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CatalogTemplate');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
