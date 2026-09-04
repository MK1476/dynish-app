# Dynish Architecture & Technical Reference

> **Living Documentation**: This document tracks the tech stack, folder structure, database schema, environment configuration, server actions, and operational notes for the production-grade MVP build of **Dynish**.

---

## 1. Tech Stack & Rationale

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14 (App Router)** | SSR/ISR for fast storefront catalog caching, Server Actions for mutations, unified frontend + backend. |
| **Language** | **TypeScript 5.6** | End-to-end type safety across database tables, forms, and server actions. |
| **Styling** | **Tailwind CSS 3.4** | Exact boutique design tokens ported from UI Prototype: warm alabaster (`ivory`), deep bespoke ink (`espresso`), champagne gold (`brand`). |
| **Backend & DB** | **Supabase (PostgreSQL)** | Managed relational DB with Row Level Security (RLS), multi-tenant isolation, native auth, and storage buckets. |
| **Authentication**| **Supabase Phone OTP** | Twilio-backed phone OTP verification for shop owners; zero password fatigue. Includes dev test bypass (`123456`) for local testing. |
| **Subscriptions** | **Razorpay Subscriptions (Test Mode)** | ₹120/month and ₹1,099/year plans for Indian vendors via UPI/Cards/Netbanking with webhook signature verification. |
| **Storage** | **Supabase Storage** | Public buckets for product images and shop brand logos with client-side image compression down to `<150KB`. |
| **Deployment** | **Vercel** | Edge-optimized deployment with automatic revalidation and zero config. |

---

## 2. Directory & Route Structure

```
Dynish/
├── ARCHITECTURE.md                 # This living documentation
├── .env.local                      # Gitignored environment secrets
├── supabase/
│   └── migrations/                 # Postgres migrations with RLS & storage policies
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root HTML layout with Playfair Display & Plus Jakarta fonts
│   │   ├── globals.css             # Tailwind base styles, custom scrollbars, and selection
│   │   ├── page.tsx                # Landing gateway: Vendor Login / Portal switcher
│   │   ├── (customer)/             # Public Customer Storefront
│   │   │   └── store/[shopId]/
│   │   │       ├── page.tsx        # Responsive 2-column mobile catalog with scrollspy
│   │   │       └── saved/page.tsx  # Shortlisted wishlist & WhatsApp batch inquiry
│   │   ├── (owner)/                # Shop Owner Operations (Auth-Protected)
│   │   │   ├── layout.tsx          # Desktop sidebar / Mobile bottom nav + 3-day warning banner
│   │   │   ├── login/page.tsx      # Phone OTP login
│   │   │   ├── onboarding/page.tsx # Create store in 3 fields
│   │   │   ├── dashboard/page.tsx  # Sales & customer metrics with date filters
│   │   │   ├── catalog/page.tsx    # Drag-and-drop categories, items CRUD, live image preview, Excel upload
│   │   │   ├── billing/page.tsx    # ⚡ Sub-5 second counter billing, customer auto-suggest, VIP badge, WhatsApp receipt
│   │   │   ├── offers/page.tsx     # Next-visit retention offers management
│   │   │   ├── customers/page.tsx  # Customer retention directory (no raw export)
│   │   │   └── subscription/page.tsx # ₹120/mo and ₹1099/yr Razorpay checkout & locked state
│   │   ├── (admin)/                # Application Ops Dashboard
│   │   │   └── admin/page.tsx      # Multi-store overview, active/expired shop metrics
│   │   └── api/
│   │       └── webhooks/
│   │           └── razorpay/route.ts # Webhook signature verification & subscription renewal
│   ├── actions/                    # Server Actions (DB mutations)
│   │   ├── auth.ts                 # Phone OTP dispatch & verification
│   │   ├── shop.ts                 # Shop onboarding & settings updates
│   │   ├── catalog.ts              # Categories, items, and Excel bulk inserts
│   │   ├── billing.ts              # Atomic bill recording & customer stats updates
│   │   └── subscription.ts         # Razorpay order generation & verification
│   ├── components/
│   │   ├── customer/               # Storefront components (ShopHero, ProductCard, DetailModal, SavedDrawer)
│   │   ├── owner/                  # Owner portal components (BillingForm, CatalogEditor, SubscriptionStatus)
│   │   └── ui/                     # Reusable design system primitives
│   └── lib/
│       ├── supabase/               # Browser, Server, and Admin Supabase clients
│       ├── razorpay.ts             # Razorpay SDK initialization
│       ├── image-compressor.ts     # Client-side image resize (<150KB)
│       └── utils.ts                # Formatting, WhatsApp link generator, dates
```

---

## 3. Database Schema (Postgres + RLS)

### Tables
1. **`shops`**:
   - `id uuid primary key default gen_random_uuid()`
   - `owner_id uuid references auth.users(id)`
   - `owner_phone text not null`
   - `name text not null`
   - `tagline text`
   - `category text not null`
   - `category_label text`
   - `phone text not null`
   - `whatsapp_number text`
   - `address text`
   - `maps_link text`
   - `logo_url text`
   - `banner_url text`
   - `theme text default 'heritage'` ('heritage' | 'minimal' | 'artisanal')
   - `plan_type text default 'trial'` ('trial' | 'monthly' | 'yearly')
   - `trial_ends_at timestamptz not null default (now() + interval '14 days')`
   - `expires_at timestamptz not null default (now() + interval '14 days')`
   - `razorpay_subscription_id text`
   - `is_active boolean default true`
   - `created_at timestamptz default now()`

2. **`categories`**:
   - `id uuid primary key default gen_random_uuid()`
   - `shop_id uuid references shops(id) on delete cascade not null`
   - `name text not null`
   - `sort_order integer default 0`
   - `created_at timestamptz default now()`

3. **`items`**:
   - `id uuid primary key default gen_random_uuid()`
   - `shop_id uuid references shops(id) on delete cascade not null`
   - `category_id uuid references categories(id) on delete cascade not null`
   - `name text not null`
   - `description text`
   - `price numeric not null check (price >= 0)`
   - `original_price numeric check (original_price >= 0)`
   - `image_urls text[] default '{}'`
   - `is_available boolean default true`
   - `is_featured boolean default false`
   - `unit text`
   - `scarcity_tag text`
   - `created_at timestamptz default now()`

4. **`customers`**:
   - `id uuid primary key default gen_random_uuid()`
   - `shop_id uuid references shops(id) on delete cascade not null`
   - `phone_number text not null`
   - `name text`
   - `first_seen_at timestamptz default now()`
   - `visit_count integer default 1`
   - `last_visit_at timestamptz default now()`
   - `last_bill_amount numeric`
   - `total_spent numeric default 0`
   - **Constraint**: `unique(shop_id, phone_number)`

5. **`offers`**:
   - `id uuid primary key default gen_random_uuid()`
   - `shop_id uuid references shops(id) on delete cascade not null`
   - `title text not null`
   - `description text`
   - `discount_type text default 'percentage'`
   - `discount_value numeric`
   - `is_default boolean default false`
   - `created_at timestamptz default now()`

6. **`transactions`**:
   - `id uuid primary key default gen_random_uuid()`
   - `shop_id uuid references shops(id) on delete cascade not null`
   - `customer_id uuid references customers(id) on delete cascade not null`
   - `bill_amount numeric check (bill_amount is null or bill_amount >= 0)`
   - `applied_offer text`
   - `next_visit_offer text`
   - `visit_number integer not null`
   - `created_at timestamptz default now()`

7. **`subscriptions`**:
   - `id uuid primary key default gen_random_uuid()`
   - `shop_id uuid references shops(id) on delete cascade not null`
   - `plan_type text not null` ('monthly' | 'yearly')
   - `amount numeric not null` (120 or 1099)
   - `razorpay_order_id text`
   - `razorpay_payment_id text`
   - `razorpay_signature text`
   - `status text default 'paid'`
   - `starts_at timestamptz default now()`
   - `expires_at timestamptz not null`
   - `created_at timestamptz default now()`

---

## 4. Environment Variables Required

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client + Server) | Supabase project API endpoint URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client + Server) | Anonymous public key subject to RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Private (Server only) | Admin key bypassing RLS for schema setup & webhooks |
| `TWILIO_ACCOUNT_SID` | Private (Server reference) | Twilio account identifier for phone OTP |
| `TWILIO_AUTH_TOKEN` | Private (Server reference) | Twilio auth secret |
| `TWILIO_PHONE_NUMBER` | Private (Server reference) | Twilio outbound phone number |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public (Client) | Razorpay public key ID for checkout popup |
| `RAZORPAY_KEY_ID` | Private (Server only) | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | Private (Server only) | Razorpay API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Private (Server only) | Secret used to verify HMAC SHA256 webhook signatures |
| `PAYMENT_MODE` | Server / Client | `'test'` or `'live'` |
| `NEXT_PUBLIC_APP_URL` | Public | Base application URL for WhatsApp links |

---

## 5. Server Actions & Route Handlers

- **Auth**:
  - `sendOtp(phone)`: Requests SMS OTP via Supabase Auth.
  - `verifyOtp(phone, token)`: Validates code and establishes secure session cookie.
  - `signOut()`: Terminates session.
- **Catalog**:
  - `createCategory(shopId, name)`: Adds new category.
  - `reorderCategories(shopId, orderedIds)`: Updates sort_order for category tabs.
  - `createItem(itemData)`: Inserts product with compressed image URLs.
  - `updateItem(itemId, itemData)`: Edits item details or toggle availability.
  - `deleteItem(itemId)`: Removes product.
  - `bulkUploadCatalog(shopId, rows)`: Parses and inserts multiple items from Excel.
- **Billing**:
  - `searchCustomer(shopId, query)`: Real-time search for auto-suggesting matching customers.
  - `recordBill(shopId, data)`: Atomically logs transaction, increments visit count, updates LTV, returns WhatsApp message payload.
- **Subscriptions & Webhooks**:
  - `createRazorpayOrder(shopId, plan)`: Generates server-side order with amount (₹120 or ₹1,099).
  - `verifyPayment(shopId, paymentData)`: Validates signature and extends `expires_at`.
  - `POST /api/webhooks/razorpay`: Verifies signature from Razorpay and updates store subscription state.

---

## 6. Open Questions / TODOs

- [ ] `// TODO: confirm with MK`: Confirm if SMS delivery fallback to WhatsApp OTP is preferred once Twilio international route limitations arise in production.
- [ ] `// TODO: confirm with MK`: Confirm whether Indian GST (18%) needs to be added onto the ₹120 and ₹1,099 subscription rates or if rates are GST-inclusive.
