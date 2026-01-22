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
  device_id: string | null;
  is_suspicious: boolean;
  device_account_count: number;
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
  id: number;
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
  legacy_id: number | null;
  legacy_ids: string | null;
  legacy_item_ids: string | null;
  legacy_user_ids: string | null;
  quantity: number | null;
  description: string | null;
  auto_renew: boolean | null;
  used_up: boolean | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionInsert = Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
export type SubscriptionUpdate = Partial<SubscriptionInsert>;

// ===========================================
// PROJECTS
// ===========================================

export interface Project {
  id: string;
  user_id: string;
  legacy_id: number | null;
  title: string;
  text_content: string | null;
  audio_url: string | null;
  engine: string | null;
  voice_id: string | null;
  voice_name: string | null;
  language_code: string | null;
  config: Json | null;
  characters_count: number | null;
  is_legacy: boolean;
  created_at: string;
  updated_at: string;
}

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'>;
export type ProjectUpdate = Partial<ProjectInsert>;

// ===========================================
// VOICES
// ===========================================

export type TTSProvider = 'azure' | 'elevenlabs';
export type VoiceGender = 'Male' | 'Female' | 'Neutral';

export interface Voice {
  id: string;
  legacy_id: number | null;
  legacy_ids: string | null;
  provider: TTSProvider;
  engine: string | null;
  voice_id: string;
  name: string;
  gender: VoiceGender | null;
  language_code: string;
  language_name: string;
  description: string | null;
  sample_url: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type VoiceInsert = Omit<Voice, 'id' | 'created_at' | 'updated_at'>;
export type VoiceUpdate = Partial<VoiceInsert>;

// ===========================================
// USAGE TRACKING
// ===========================================

export interface UsageTracking {
  id: number;
  user_id: string;
  period_start: string;
  period_end: string;
  characters_used: number;
  projects_created: number;
  audio_files_generated: number;
  created_at: string;
  updated_at: string;
}

export type UsageTrackingInsert = Omit<UsageTracking, 'id' | 'created_at' | 'updated_at'>;
export type UsageTrackingUpdate = Partial<UsageTrackingInsert>;

// ===========================================
// PAYMENT HISTORY
// ===========================================

export interface PaymentHistory {
  id: string;
  user_id: string | null;
  legacy_id: number | null;
  legacy_ids: string | null;
  legacy_user_ids: string | null;
  legacy_payment_ids: string | null;
  transaction_type: string;
  gateway: string;
  gateway_identifier: string | null;
  gateway_event_id: string | null;
  currency: string;
  price: number | null;
  quantity: number;
  amount: number;
  item_ids: string | null;
  item_name: string | null;
  redirect_status: string | null;
  callback_status: string | null;
  visible_for_user: boolean;
  generate_invoice: boolean;
  coupon: string | null;
  coupon_discount: number;
  tax: number;
  description: string | null;
  metadata: Json | null;
  created_at: string;
  callback_at: string | null;
  is_legacy: boolean;
}

export type PaymentHistoryInsert = Omit<PaymentHistory, 'id' | 'created_at'>;
export type PaymentHistoryUpdate = Partial<PaymentHistoryInsert>;

// ===========================================
// USER PURCHASES
// ===========================================

export interface UserPurchase {
  id: string;
  user_id: string | null;
  legacy_id: number | null;
  legacy_ids: string | null;
  legacy_user_ids: string | null;
  legacy_payment_ids: string | null;
  item_type: string;
  item_ids: string | null;
  item_name: string | null;
  characters_limit: number | null;
  characters_used: number;
  used_up: boolean;
  auto_renew: boolean;
  voicelab_data: Json | null;
  description: string | null;
  metadata: Json | null;
  created_at: string;
  is_legacy: boolean;
}

export type UserPurchaseInsert = Omit<UserPurchase, 'id' | 'created_at'>;
export type UserPurchaseUpdate = Partial<UserPurchaseInsert>;

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
      projects: {
        Row: Project;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
        Relationships: [];
      };
      voices: {
        Row: Voice;
        Insert: VoiceInsert;
        Update: VoiceUpdate;
        Relationships: [];
      };
      usage_tracking: {
        Row: UsageTracking;
        Insert: UsageTrackingInsert;
        Update: UsageTrackingUpdate;
        Relationships: [];
      };
      payment_history: {
        Row: PaymentHistory;
        Insert: PaymentHistoryInsert;
        Update: PaymentHistoryUpdate;
        Relationships: [];
      };
      user_purchases: {
        Row: UserPurchase;
        Insert: UserPurchaseInsert;
        Update: UserPurchaseUpdate;
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
      tts_provider: TTSProvider;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
