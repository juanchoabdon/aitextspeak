export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      legacy_users: {
        Row: {
          affiliate_id: string | null
          country: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          first_name: string | null
          last_name: string | null
          legacy_created_time: string | null
          legacy_id: number
          legacy_ids: string | null
          legacy_updated_time: string | null
          migrated: boolean | null
          migrated_at: string | null
          password_hash: string
          phone: string | null
          referred_by: string | null
          role_ids: string | null
          status: number | null
          supabase_user_id: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          affiliate_id?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          first_name?: string | null
          last_name?: string | null
          legacy_created_time?: string | null
          legacy_id: number
          legacy_ids?: string | null
          legacy_updated_time?: string | null
          migrated?: boolean | null
          migrated_at?: string | null
          password_hash: string
          phone?: string | null
          referred_by?: string | null
          role_ids?: string | null
          status?: number | null
          supabase_user_id?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          affiliate_id?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          first_name?: string | null
          last_name?: string | null
          legacy_created_time?: string | null
          legacy_id?: number
          legacy_ids?: string | null
          legacy_updated_time?: string | null
          migrated?: boolean | null
          migrated_at?: string | null
          password_hash?: string
          phone?: string | null
          referred_by?: string | null
          role_ids?: string | null
          status?: number | null
          supabase_user_id?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          first_name: string | null
          id: string
          is_active: boolean | null
          is_legacy_user: boolean | null
          last_name: string | null
          legacy_user_id: number | null
          phone: string | null
          role: string | null
          timezone: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          first_name?: string | null
          id: string
          is_active?: boolean | null
          is_legacy_user?: boolean | null
          last_name?: string | null
          legacy_user_id?: number | null
          phone?: string | null
          role?: string | null
          timezone?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          is_legacy_user?: boolean | null
          last_name?: string | null
          legacy_user_id?: number | null
          phone?: string | null
          role?: string | null
          timezone?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_legacy_user_id_fkey"
            columns: ["legacy_user_id"]
            isOneToOne: false
            referencedRelation: "legacy_users"
            referencedColumns: ["legacy_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at: string | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_legacy: boolean | null
          legacy_data: Json | null
          plan_id: string | null
          plan_name: string | null
          price_amount: number | null
          price_currency: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_customer_id: string | null
          provider_subscription_id: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_legacy?: boolean | null
          legacy_data?: Json | null
          plan_id?: string | null
          plan_name?: string | null
          price_amount?: number | null
          price_currency?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_customer_id?: string | null
          provider_subscription_id: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_legacy?: boolean | null
          legacy_data?: Json | null
          plan_id?: string | null
          plan_name?: string | null
          price_amount?: number | null
          price_currency?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_customer_id?: string | null
          provider_subscription_id?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at: string | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          email: string | null
          first_name: string | null
          id: string | null
          is_legacy: boolean | null
          last_name: string | null
          legacy_data: Json | null
          plan_id: string | null
          plan_name: string | null
          price_amount: number | null
          price_currency: string | null
          provider: Database["public"]["Enums"]["payment_provider"] | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      payment_provider: "stripe" | "paypal" | "paypal_legacy"
      subscription_status:
        | "active"
        | "canceled"
        | "past_due"
        | "unpaid"
        | "trialing"
        | "paused"
        | "incomplete"
        | "incomplete_expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      payment_provider: ["stripe", "paypal", "paypal_legacy"],
      subscription_status: [
        "active",
        "canceled",
        "past_due",
        "unpaid",
        "trialing",
        "paused",
        "incomplete",
        "incomplete_expired",
      ],
    },
  },
} as const
