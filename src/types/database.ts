// ===========================================
// DATABASE TYPES
// 
// These are placeholder types. Generate proper types by running:
// supabase gen types typescript --linked > src/types/supabase.ts
// ===========================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ===========================================
// LEGACY USERS
// ===========================================

export interface LegacyUser {
  legacy_id: number;
  legacy_ids: string | null;
  username: string;
  email: string;
  password_hash: string;
  email_verified: boolean;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  phone: string | null;
  role_ids: string | null;
  status: number;
  affiliate_id: string | null;
  referred_by: string | null;
  migrated: boolean;
  migrated_at: string | null;
  supabase_user_id: string | null;
  created_at: string;
  updated_at: string;
  legacy_created_time: string | null;
  legacy_updated_time: string | null;
}

export type LegacyUserInsert = Omit<LegacyUser, 'created_at' | 'updated_at'>;
export type LegacyUserUpdate = Partial<LegacyUserInsert>;

// ===========================================
// PROFILES
// ===========================================

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  country: string | null;
  phone: string | null;
  timezone: string | null;
  is_active: boolean;
  email_verified: boolean;
  is_legacy_user: boolean;
  legacy_user_id: number | null;
  role: 'user' | 'pro' | 'admin';
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>;
export type ProfileUpdate = Partial<ProfileInsert>;

// ===========================================
// SUBSCRIPTIONS
// ===========================================

// Stripe: single account for all users (old and new)
// PayPal: separate accounts - 'paypal' for new, 'paypal_legacy' for old users
export type PaymentProvider = 
  | 'stripe' 
  | 'paypal' 
  | 'paypal_legacy';

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'unpaid'
  | 'trialing'
  | 'paused'
  | 'incomplete'
  | 'incomplete_expired';

export interface Subscription {
  id: string;
  user_id: string;
  provider: PaymentProvider;
  provider_subscription_id: string;
  provider_customer_id: string | null;
  status: SubscriptionStatus;
  plan_id: string | null;
  plan_name: string | null;
  price_amount: number | null;
  price_currency: string;
  billing_interval: 'month' | 'year' | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  is_legacy: boolean;
  legacy_data: Json | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionInsert = Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
export type SubscriptionUpdate = Partial<SubscriptionInsert>;

// ===========================================
// DATABASE SCHEMA
// Simplified schema for Supabase client
// ===========================================

export interface Database {
  public: {
    Tables: {
      legacy_users: {
        Row: LegacyUser;
        Insert: LegacyUserInsert;
        Update: LegacyUserUpdate;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription;
        Insert: SubscriptionInsert;
        Update: SubscriptionUpdate;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      payment_provider: PaymentProvider;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
