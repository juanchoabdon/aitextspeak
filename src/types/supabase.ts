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
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          content: string
          created_at: string | null
          description: string
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          content: string
          created_at?: string | null
          description: string
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          content?: string
          created_at?: string | null
          description?: string
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
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
      previews: {
        Row: {
          audio_url: string
          created_at: string | null
          expires_at: string | null
          id: string
          language_code: string | null
          provider: string
          session_key: string
          text_preview: string
          user_id: string
          voice_id: string
          voice_name: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          language_code?: string | null
          provider: string
          session_key: string
          text_preview: string
          user_id: string
          voice_id: string
          voice_name?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          language_code?: string | null
          provider?: string
          session_key?: string
          text_preview?: string
          user_id?: string
          voice_id?: string
          voice_name?: string | null
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
      project_audio: {
        Row: {
          audio_url: string
          characters_count: number | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          language_code: string | null
          project_id: string
          provider: string
          sort_order: number | null
          text_content: string
          title: string | null
          voice_id: string
          voice_name: string | null
        }
        Insert: {
          audio_url: string
          characters_count?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          language_code?: string | null
          project_id: string
          provider: string
          sort_order?: number | null
          text_content: string
          title?: string | null
          voice_id: string
          voice_name?: string | null
        }
        Update: {
          audio_url?: string
          characters_count?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          language_code?: string | null
          project_id?: string
          provider?: string
          sort_order?: number | null
          text_content?: string
          title?: string | null
          voice_id?: string
          voice_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_audio_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          audio_url: string | null
          campaign: string | null
          characters_count: number | null
          config: Json | null
          created_at: string | null
          engine: string | null
          id: string
          is_legacy: boolean | null
          language_code: string | null
          language_name: string | null
          legacy_id: number | null
          legacy_ids: string | null
          legacy_user_ids: string | null
          project_type: Database["public"]["Enums"]["project_type"] | null
          scheme: string | null
          status: string | null
          storage: string | null
          text_content: string | null
          title: string
          updated_at: string | null
          user_id: string
          voice_id: string | null
          voice_name: string | null
        }
        Insert: {
          audio_url?: string | null
          campaign?: string | null
          characters_count?: number | null
          config?: Json | null
          created_at?: string | null
          engine?: string | null
          id?: string
          is_legacy?: boolean | null
          language_code?: string | null
          language_name?: string | null
          legacy_id?: number | null
          legacy_ids?: string | null
          legacy_user_ids?: string | null
          project_type?: Database["public"]["Enums"]["project_type"] | null
          scheme?: string | null
          status?: string | null
          storage?: string | null
          text_content?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          voice_id?: string | null
          voice_name?: string | null
        }
        Update: {
          audio_url?: string | null
          campaign?: string | null
          characters_count?: number | null
          config?: Json | null
          created_at?: string | null
          engine?: string | null
          id?: string
          is_legacy?: boolean | null
          language_code?: string | null
          language_name?: string | null
          legacy_id?: number | null
          legacy_ids?: string | null
          legacy_user_ids?: string | null
          project_type?: Database["public"]["Enums"]["project_type"] | null
          scheme?: string | null
          status?: string | null
          storage?: string | null
          text_content?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          voice_id?: string | null
          voice_name?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_renew: boolean | null
          billing_interval: string | null
          cancel_at: string | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          description: string | null
          id: string
          is_legacy: boolean | null
          legacy_data: Json | null
          legacy_id: number | null
          legacy_ids: string | null
          legacy_item_ids: string | null
          legacy_user_ids: string | null
          plan_id: string | null
          plan_name: string | null
          price_amount: number | null
          price_currency: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_customer_id: string | null
          provider_subscription_id: string
          quantity: number | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          used_up: boolean | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          billing_interval?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          description?: string | null
          id?: string
          is_legacy?: boolean | null
          legacy_data?: Json | null
          legacy_id?: number | null
          legacy_ids?: string | null
          legacy_item_ids?: string | null
          legacy_user_ids?: string | null
          plan_id?: string | null
          plan_name?: string | null
          price_amount?: number | null
          price_currency?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_customer_id?: string | null
          provider_subscription_id: string
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          used_up?: boolean | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          billing_interval?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          description?: string | null
          id?: string
          is_legacy?: boolean | null
          legacy_data?: Json | null
          legacy_id?: number | null
          legacy_ids?: string | null
          legacy_item_ids?: string | null
          legacy_user_ids?: string | null
          plan_id?: string | null
          plan_name?: string | null
          price_amount?: number | null
          price_currency?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_customer_id?: string | null
          provider_subscription_id?: string
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          used_up?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      voices: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          engine: string | null
          gender: string | null
          id: string
          language_code: string
          language_name: string
          legacy_id: number | null
          legacy_ids: string | null
          name: string
          provider: string
          sample_url: string | null
          updated_at: string | null
          voice_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          engine?: string | null
          gender?: string | null
          id?: string
          language_code: string
          language_name: string
          legacy_id?: number | null
          legacy_ids?: string | null
          name: string
          provider: string
          sample_url?: string | null
          updated_at?: string | null
          voice_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          engine?: string | null
          gender?: string | null
          id?: string
          language_code?: string
          language_name?: string
          legacy_id?: number | null
          legacy_ids?: string | null
          name?: string
          provider?: string
          sample_url?: string | null
          updated_at?: string | null
          voice_id?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          id: number
          user_id: string
          period_start: string
          period_end: string
          characters_used: number
          projects_created: number
          audio_files_generated: number
          payg_balance: number
          payg_purchased: number
          characters_preview_used: number
          characters_production_used: number
          is_legacy_data: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          period_start: string
          period_end: string
          characters_used?: number
          projects_created?: number
          audio_files_generated?: number
          payg_balance?: number
          payg_purchased?: number
          characters_preview_used?: number
          characters_production_used?: number
          is_legacy_data?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          period_start?: string
          period_end?: string
          characters_used?: number
          projects_created?: number
          audio_files_generated?: number
          payg_balance?: number
          payg_purchased?: number
          characters_preview_used?: number
          characters_production_used?: number
          is_legacy_data?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          id: string
          user_id: string | null
          legacy_id: number | null
          legacy_ids: string | null
          legacy_user_ids: string | null
          legacy_payment_ids: string | null
          transaction_type: string
          gateway: string
          gateway_identifier: string | null
          gateway_event_id: string | null
          currency: string
          price: number | null
          quantity: number
          amount: number
          item_ids: string | null
          item_name: string | null
          redirect_status: string | null
          callback_status: string | null
          visible_for_user: boolean
          generate_invoice: boolean
          coupon: string | null
          coupon_discount: number
          tax: number
          description: string | null
          metadata: Json | null
          created_at: string
          callback_at: string | null
          is_legacy: boolean
        }
        Insert: {
          id?: string
          user_id?: string | null
          legacy_id?: number | null
          legacy_ids?: string | null
          legacy_user_ids?: string | null
          legacy_payment_ids?: string | null
          transaction_type: string
          gateway: string
          gateway_identifier?: string | null
          gateway_event_id?: string | null
          currency?: string
          price?: number | null
          quantity?: number
          amount: number
          item_ids?: string | null
          item_name?: string | null
          redirect_status?: string | null
          callback_status?: string | null
          visible_for_user?: boolean
          generate_invoice?: boolean
          coupon?: string | null
          coupon_discount?: number
          tax?: number
          description?: string | null
          metadata?: Json | null
          created_at?: string
          callback_at?: string | null
          is_legacy?: boolean
        }
        Update: {
          id?: string
          user_id?: string | null
          legacy_id?: number | null
          legacy_ids?: string | null
          legacy_user_ids?: string | null
          legacy_payment_ids?: string | null
          transaction_type?: string
          gateway?: string
          gateway_identifier?: string | null
          gateway_event_id?: string | null
          currency?: string
          price?: number | null
          quantity?: number
          amount?: number
          item_ids?: string | null
          item_name?: string | null
          redirect_status?: string | null
          callback_status?: string | null
          visible_for_user?: boolean
          generate_invoice?: boolean
          coupon?: string | null
          coupon_discount?: number
          tax?: number
          description?: string | null
          metadata?: Json | null
          created_at?: string
          callback_at?: string | null
          is_legacy?: boolean
        }
        Relationships: []
      }
      user_purchases: {
        Row: {
          id: string
          user_id: string | null
          legacy_id: number | null
          legacy_ids: string | null
          legacy_user_ids: string | null
          legacy_payment_ids: string | null
          item_type: string
          item_ids: string | null
          item_name: string | null
          characters_limit: number | null
          characters_used: number
          used_up: boolean
          auto_renew: boolean
          voicelab_data: Json | null
          description: string | null
          metadata: Json | null
          created_at: string
          is_legacy: boolean
        }
        Insert: {
          id?: string
          user_id?: string | null
          legacy_id?: number | null
          legacy_ids?: string | null
          legacy_user_ids?: string | null
          legacy_payment_ids?: string | null
          item_type?: string
          item_ids?: string | null
          item_name?: string | null
          characters_limit?: number | null
          characters_used?: number
          used_up?: boolean
          auto_renew?: boolean
          voicelab_data?: Json | null
          description?: string | null
          metadata?: Json | null
          created_at?: string
          is_legacy?: boolean
        }
        Update: {
          id?: string
          user_id?: string | null
          legacy_id?: number | null
          legacy_ids?: string | null
          legacy_user_ids?: string | null
          legacy_payment_ids?: string | null
          item_type?: string
          item_ids?: string | null
          item_name?: string | null
          characters_limit?: number | null
          characters_used?: number
          used_up?: boolean
          auto_renew?: boolean
          voicelab_data?: Json | null
          description?: string | null
          metadata?: Json | null
          created_at?: string
          is_legacy?: boolean
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
      cleanup_expired_previews: { Args: never; Returns: undefined }
    }
    Enums: {
      payment_provider: "stripe" | "paypal" | "paypal_legacy"
      project_type: "youtube" | "audiobook" | "podcast" | "other"
      subscription_status:
        | "active"
        | "canceled"
        | "past_due"
        | "unpaid"
        | "trialing"
        | "paused"
        | "incomplete"
        | "incomplete_expired"
        | "lifetime"
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
      project_type: ["youtube", "audiobook", "podcast", "other"],
      subscription_status: [
        "active",
        "canceled",
        "past_due",
        "unpaid",
        "trialing",
        "paused",
        "incomplete",
        "incomplete_expired",
        "lifetime",
      ],
    },
  },
} as const
