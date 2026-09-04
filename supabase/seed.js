const { createClient } = require('@supabase/supabase-js');

async function seed() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Seeding Dynish 2.0 demo data...');

  const SHOP_ID = '11111111-1111-1111-1111-111111111111';
  const OWNER_PHONE = '9876543210';

  // 1. Clean existing demo shop if any
  await supabase.from('shops').delete().eq('id', SHOP_ID);

  // 2. Insert Demo Shop (Aadya Couture)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 25); // 25 days active

  const { data: shop, error: shopError } = await supabase.from('shops').insert({
    id: SHOP_ID,
    owner_phone: OWNER_PHONE,
    name: 'Aadya Couture',
    tagline: 'Curated Designer Kurtis, Sarees & Ethnic Luxe',
    category: 'Boutique',
    category_label: 'Designer Boutiques & Ethnic Wear',
    phone: OWNER_PHONE,
    whatsapp_number: OWNER_PHONE,
    address: 'Plot 42, Road No. 36, Jubilee Hills, Hyderabad',
    maps_link: 'https://maps.google.com',
    logo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    banner_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    theme: 'heritage',
    plan_type: 'monthly',
    expires_at: expiryDate.toISOString(),
    is_active: true,
  }).select().single();

  if (shopError) {
    console.error('Error inserting shop:', shopError);
    return;
  }
  console.log('Created Shop:', shop.name, `(${shop.id})`);

  // 3. Insert Categories
  const categoriesData = [
    { name: 'Bestsellers', sort_order: 0 },
    { name: 'Designer Sarees', sort_order: 1 },
    { name: 'Festive Kurtis', sort_order: 2 },
    { name: 'Bridal Lehengas', sort_order: 3 },
    { name: 'Jewellery & Accessories', sort_order: 4 },
  ];

  const categoryMap = {};
  for (const cat of categoriesData) {
    const { data: catData, error: catError } = await supabase.from('categories').insert({
      shop_id: SHOP_ID,
      name: cat.name,
      sort_order: cat.sort_order,
    }).select().single();

    if (catError) console.error('Error inserting category:', catError);
    else categoryMap[cat.name] = catData.id;
  }
  console.log('Created 5 Categories.');

  // 4. Insert Catalog Items
  const items = [
    {
      category: 'Festive Kurtis',
      name: 'Crimson Silk Anarkali Suit',
      price: 2499,
      original_price: 3999,
      image_urls: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Pure chanderi silk with intricate zardozi handwork and organza dupatta.',
      scarcity_tag: 'Only 2 Left',
      is_featured: true,
      unit: 'per piece',
    },
    {
      category: 'Festive Kurtis',
      name: 'Blush Pink Embroidered Kurti',
      price: 1299,
      original_price: 1899,
      image_urls: [
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Lightweight cotton silk featuring delicate thread embroidery and comfortable side slits.',
      scarcity_tag: 'Trending',
      is_featured: true,
      unit: 'per piece',
    },
    {
      category: 'Festive Kurtis',
      name: 'Ivory Chikankari Long Kurti',
      price: 1599,
      original_price: 2200,
      image_urls: [
        'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Authentic Lucknowi handcrafted Chikankari on soft modal fabric with inner cotton slip.',
      scarcity_tag: null,
      is_featured: false,
      unit: 'per piece',
    },
    {
      category: 'Designer Sarees',
      name: 'Royal Emerald Organza Saree',
      price: 4850,
      original_price: 6500,
      image_urls: [
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Glass organza saree embellished with cut-dana work and unstitched raw silk blouse.',
      scarcity_tag: 'Only 3 Left',
      is_featured: true,
      unit: 'with blouse',
    },
    {
      category: 'Designer Sarees',
      name: 'Pastel Floral Georgette Saree',
      price: 2999,
      original_price: 4200,
      image_urls: [
        'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Featherlight digital printed georgette with scalloped embroidered zari border.',
      scarcity_tag: null,
      is_featured: false,
      unit: 'with blouse',
    },
    {
      category: 'Bridal Lehengas',
      name: 'Midnight Velvet Bridal Lehenga',
      price: 18500,
      original_price: 24000,
      image_urls: [
        'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Micro-velvet lehenga with 5-meter flare, handcrafted dabka and antique gold sequins work.',
      scarcity_tag: 'Exclusive',
      is_featured: true,
      unit: 'full set',
    },
    {
      category: 'Jewellery & Accessories',
      name: 'Heritage Kundan Choker Set',
      price: 3200,
      original_price: 4500,
      image_urls: [
        'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Semi-precious stone Kundan necklace with matching jhumkas and maang tikka.',
      scarcity_tag: 'Bestseller',
      is_featured: true,
      unit: 'necklace + earrings',
    },
    {
      category: 'Jewellery & Accessories',
      name: 'Gold Plated Temple Earrings',
      price: 850,
      original_price: 1200,
      image_urls: [
        'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Traditional matte gold finished jhumkas with ruby accents and pearl drops.',
      scarcity_tag: null,
      is_featured: false,
      unit: 'pair',
    },
  ];

  for (const item of items) {
    const category_id = categoryMap[item.category] || Object.values(categoryMap)[0];
    await supabase.from('items').insert({
      shop_id: SHOP_ID,
      category_id,
      name: item.name,
      description: item.description,
      price: item.price,
      original_price: item.original_price,
      image_urls: item.image_urls,
      is_available: true,
      is_featured: item.is_featured,
      unit: item.unit,
      scarcity_tag: item.scarcity_tag,
    });
  }
  console.log('Created 8 Catalog Items with high-res photos.');

  // 5. Insert Offers
  const offers = [
    { title: '₹200 OFF on next visit above ₹1,500', discount_type: 'flat', discount_value: 200, is_default: true },
    { title: 'Flat 10% OFF on next visit', discount_type: 'percentage', discount_value: 10, is_default: false },
    { title: 'Free Jewellery Care Kit on bill > ₹3,000', discount_type: 'flat', discount_value: 0, is_default: false },
  ];

  for (const offer of offers) {
    await supabase.from('offers').insert({
      shop_id: SHOP_ID,
      title: offer.title,
      discount_type: offer.discount_type,
      discount_value: offer.discount_value,
      is_default: offer.is_default,
    });
  }
  console.log('Created 3 Retention Loyalty Offers.');

  // 6. Insert Customers
  const customers = [
    { phone_number: '9876500001', name: 'Priya Sharma', visit_count: 8, total_spent: 24500, last_bill_amount: 4850 },
    { phone_number: '9876500002', name: 'Ananya Verma', visit_count: 4, total_spent: 9800, last_bill_amount: 2499 },
    { phone_number: '9876500003', name: 'Neha Reddy', visit_count: 2, total_spent: 3898, last_bill_amount: 1299 },
    { phone_number: '9876500004', name: 'Kavita Patel', visit_count: 1, total_spent: 1599, last_bill_amount: 1599 },
    { phone_number: '9876500005', name: 'Rohan Mehta', visit_count: 6, total_spent: 14200, last_bill_amount: 3200 },
  ];

  const customerMap = {};
  for (const cust of customers) {
    const { data: custData } = await supabase.from('customers').insert({
      shop_id: SHOP_ID,
      phone_number: cust.phone_number,
      name: cust.name,
      visit_count: cust.visit_count,
      total_spent: cust.total_spent,
      last_bill_amount: cust.last_bill_amount,
    }).select().single();
    if (custData) customerMap[cust.phone_number] = custData.id;
  }
  console.log('Created 5 Test Customers.');

  // 7. Insert Historical Transactions for Analytics
  const transactions = [
    { phone: '9876500001', amount: 4850, daysAgo: 1, offer: '₹200 OFF on next visit' },
    { phone: '9876500005', amount: 3200, daysAgo: 2, offer: 'Flat 10% OFF' },
    { phone: '9876500002', amount: 2499, daysAgo: 3, offer: '₹200 OFF on next visit' },
    { phone: '9876500003', amount: 1299, daysAgo: 4, offer: 'None' },
    { phone: '9876500004', amount: 1599, daysAgo: 5, offer: '₹200 OFF on next visit' },
    { phone: '9876500001', amount: 2499, daysAgo: 6, offer: 'None' },
  ];

  for (const tx of transactions) {
    const custId = customerMap[tx.phone];
    if (custId) {
      const txDate = new Date();
      txDate.setDate(txDate.getDate() - tx.daysAgo);

      await supabase.from('transactions').insert({
        shop_id: SHOP_ID,
        customer_id: custId,
        bill_amount: tx.amount,
        applied_offer: tx.offer,
        next_visit_offer: '₹200 OFF on next visit above ₹1,500',
        visit_number: 2,
        created_at: txDate.toISOString(),
      });
    }
  }
  console.log('Created 6 Historical Transactions.');

  console.log('✅ SEEDING COMPLETE!');
  console.log('----------------------------------------------------');
  console.log('Test Shop ID:     ', SHOP_ID);
  console.log('Vendor Phone:     ', OWNER_PHONE);
  console.log('Test OTP:         ', '123456');
  console.log('Customer Store:   ', `/store/${SHOP_ID}`);
  console.log('Owner Portal:     ', '/dashboard');
  console.log('----------------------------------------------------');
}

seed().catch(console.error);
