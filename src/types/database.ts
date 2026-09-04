export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      shops: {
        Row: {
          id: string
          owner_id: string | null
          owner_phone: string
          name: string
          tagline: string | null
          category: string
          category_label: string | null
          phone: string
          whatsapp_number: string
          address: string
          maps_link: string | null
          logo_url: string | null
          banner_url: string | null
          theme: 'heritage' | 'minimal' | 'artisanal'
          plan_type: 'trial' | 'monthly' | 'yearly'
          trial_ends_at: string
          expires_at: string
          razorpay_subscription_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          owner_phone: string
          name: string
          tagline?: string | null
          category?: string
          category_label?: string | null
          phone: string
          whatsapp_number: string
          address: string
          maps_link?: string | null
          logo_url?: string | null
          banner_url?: string | null
          theme?: 'heritage' | 'minimal' | 'artisanal'
          plan_type?: 'trial' | 'monthly' | 'yearly'
          trial_ends_at?: string
          expires_at?: string
          razorpay_subscription_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string | null
          owner_phone?: string
          name?: string
          tagline?: string | null
          category?: string
          category_label?: string | null
          phone?: string
          whatsapp_number?: string
          address?: string
          maps_link?: string | null
          logo_url?: string | null
          banner_url?: string | null
          theme?: 'heritage' | 'minimal' | 'artisanal'
          plan_type?: 'trial' | 'monthly' | 'yearly'
          trial_ends_at?: string
          expires_at?: string
          razorpay_subscription_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          shop_id: string
          name: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          name?: string
          sort_order?: number
          created_at?: string
        }
      }
      items: {
        Row: {
          id: string
          shop_id: string
          category_id: string
          name: string
          description: string | null
          price: number
          original_price: number | null
          image_urls: string[]
          is_available: boolean
          is_featured: boolean
          unit: string | null
          scarcity_tag: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          category_id: string
          name: string
          description?: string | null
          price: number
          original_price?: number | null
          image_urls?: string[]
          is_available?: boolean
          is_featured?: boolean
          unit?: string | null
          scarcity_tag?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          category_id?: string
          name?: string
          description?: string | null
          price?: number
          original_price?: number | null
          image_urls?: string[]
          is_available?: boolean
          is_featured?: boolean
          unit?: string | null
          scarcity_tag?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          shop_id: string
          phone_number: string
          name: string | null
          first_seen_at: string
          visit_count: number
          last_visit_at: string
          last_bill_amount: number | null
          total_spent: number
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          phone_number: string
          name?: string | null
          first_seen_at?: string
          visit_count?: number
          last_visit_at?: string
          last_bill_amount?: number | null
          total_spent?: number
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          phone_number?: string
          name?: string | null
          first_seen_at?: string
          visit_count?: number
          last_visit_at?: string
          last_bill_amount?: number | null
          total_spent?: number
          created_at?: string
        }
      }
      offers: {
        Row: {
          id: string
          shop_id: string
          title: string
          description: string | null
          discount_type: 'percentage' | 'flat'
          discount_value: number | null
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          title: string
          description?: string | null
          discount_type?: 'percentage' | 'flat'
          discount_value?: number | null
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          title?: string
          description?: string | null
          discount_type?: 'percentage' | 'flat'
          discount_value?: number | null
          is_default?: boolean
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          shop_id: string
          customer_id: string
          bill_amount: number | null
          applied_offer: string | null
          next_visit_offer: string | null
          visit_number: number
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          customer_id: string
          bill_amount?: number | null
          applied_offer?: string | null
          next_visit_offer?: string | null
          visit_number: number
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          customer_id?: string
          bill_amount?: number | null
          applied_offer?: string | null
          next_visit_offer?: string | null
          visit_number?: number
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          shop_id: string
          plan_type: 'monthly' | 'yearly'
          amount: number
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          starts_at: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          plan_type: 'monthly' | 'yearly'
          amount: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          starts_at?: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          plan_type?: 'monthly' | 'yearly'
          amount?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          starts_at?: string
          expires_at?: string
          created_at?: string
        }
      }
    }
  }
}
