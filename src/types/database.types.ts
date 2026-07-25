export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      automations: {
        Row: {
          active: boolean
          cancel_reminder_after_click: boolean
          click_tracking_enabled: boolean
          created_at: string
          id: string
          instagram_account_id: string
          keywords: string[]
          link_button_label: string | null
          link_message: string | null
          link_url: string | null
          match_type: string
          name: string
          public_reply_enabled: boolean
          public_reply_variations: string[]
          quick_reply_text: string | null
          reminder_delay_seconds: number
          reminder_enabled: boolean
          reminder_text: string | null
          remove_accents: boolean
          specific_media_id: string | null
          trigger_comment: boolean
          trigger_direct_message: boolean
          trigger_story_reply: boolean
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          active?: boolean
          cancel_reminder_after_click?: boolean
          click_tracking_enabled?: boolean
          created_at?: string
          id?: string
          instagram_account_id: string
          keywords?: string[]
          link_button_label?: string | null
          link_message?: string | null
          link_url?: string | null
          match_type?: string
          name: string
          public_reply_enabled?: boolean
          public_reply_variations?: string[]
          quick_reply_text?: string | null
          reminder_delay_seconds?: number
          reminder_enabled?: boolean
          reminder_text?: string | null
          remove_accents?: boolean
          specific_media_id?: string | null
          trigger_comment?: boolean
          trigger_direct_message?: boolean
          trigger_story_reply?: boolean
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          active?: boolean
          cancel_reminder_after_click?: boolean
          click_tracking_enabled?: boolean
          created_at?: string
          id?: string
          instagram_account_id?: string
          keywords?: string[]
          link_button_label?: string | null
          link_message?: string | null
          link_url?: string | null
          match_type?: string
          name?: string
          public_reply_enabled?: boolean
          public_reply_variations?: string[]
          quick_reply_text?: string | null
          reminder_delay_seconds?: number
          reminder_enabled?: boolean
          reminder_text?: string | null
          remove_accents?: boolean
          specific_media_id?: string | null
          trigger_comment?: boolean
          trigger_direct_message?: boolean
          trigger_story_reply?: boolean
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automations_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      click_events: {
        Row: {
          automation_id: string | null
          clicked_at: string
          contact_id: string | null
          created_at: string
          destination_url: string | null
          id: string
          ip_hash: string | null
          queue_id: string | null
          tracking_code: string | null
          user_agent: string | null
        }
        Insert: {
          automation_id?: string | null
          clicked_at?: string
          contact_id?: string | null
          created_at?: string
          destination_url?: string | null
          id?: string
          ip_hash?: string | null
          queue_id?: string | null
          tracking_code?: string | null
          user_agent?: string | null
        }
        Update: {
          automation_id?: string | null
          clicked_at?: string
          contact_id?: string | null
          created_at?: string
          destination_url?: string | null
          id?: string
          ip_hash?: string | null
          queue_id?: string | null
          tracking_code?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          first_contact_at: string | null
          first_name: string | null
          follows_business: boolean | null
          id: string
          instagram_account_id: string
          instagram_scoped_id: string
          last_automation_id: string | null
          last_inbound_message_at: string | null
          messaging_window_expires_at: string | null
          profile_consent_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          first_contact_at?: string | null
          first_name?: string | null
          follows_business?: boolean | null
          id?: string
          instagram_account_id: string
          instagram_scoped_id: string
          last_automation_id?: string | null
          last_inbound_message_at?: string | null
          messaging_window_expires_at?: string | null
          profile_consent_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          first_contact_at?: string | null
          first_name?: string | null
          follows_business?: boolean | null
          id?: string
          instagram_account_id?: string
          instagram_scoped_id?: string
          last_automation_id?: string | null
          last_inbound_message_at?: string | null
          messaging_window_expires_at?: string | null
          profile_consent_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          comment_id: string | null
          contact_id: string | null
          deduplication_hash: string
          event_type: string
          id: string
          instagram_account_id: string | null
          media_id: string | null
          payload: Json | null
          processed_at: string | null
          processing_error: string | null
          processing_status: string
          provider: string
          provider_event_id: string | null
          received_at: string
        }
        Insert: {
          comment_id?: string | null
          contact_id?: string | null
          deduplication_hash: string
          event_type?: string
          id?: string
          instagram_account_id?: string | null
          media_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          provider?: string
          provider_event_id?: string | null
          received_at?: string
        }
        Update: {
          comment_id?: string | null
          contact_id?: string | null
          deduplication_hash?: string
          event_type?: string
          id?: string
          instagram_account_id?: string | null
          media_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          provider?: string
          provider_event_id?: string | null
          received_at?: string
        }
        Relationships: []
      }
      followups: {
        Row: {
          active: boolean
          automation_id: string
          button_label: string | null
          button_url: string | null
          created_at: string
          delay_seconds: number
          id: string
          message_type: string
          position: number
          text: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          automation_id: string
          button_label?: string | null
          button_url?: string | null
          created_at?: string
          delay_seconds?: number
          id?: string
          message_type?: string
          position?: number
          text?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          automation_id?: string
          button_label?: string | null
          button_url?: string | null
          created_at?: string
          delay_seconds?: number
          id?: string
          message_type?: string
          position?: number
          text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      instagram_accounts: {
        Row: {
          access_token_enc: string | null
          connection_status: string
          created_at: string
          id: string
          instagram_name: string | null
          instagram_user_id: string
          instagram_username: string | null
          last_token_refresh_at: string | null
          last_webhook_at: string | null
          profile_picture_url: string | null
          scopes: string[]
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_enc?: string | null
          connection_status?: string
          created_at?: string
          id?: string
          instagram_name?: string | null
          instagram_user_id: string
          instagram_username?: string | null
          last_token_refresh_at?: string | null
          last_webhook_at?: string | null
          profile_picture_url?: string | null
          scopes?: string[]
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_enc?: string | null
          connection_status?: string
          created_at?: string
          id?: string
          instagram_name?: string | null
          instagram_user_id?: string
          instagram_username?: string | null
          last_token_refresh_at?: string | null
          last_webhook_at?: string | null
          profile_picture_url?: string | null
          scopes?: string[]
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          context: Json
          created_at: string
          expires_at: string
          state: string
          used_at: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          expires_at: string
          state: string
          used_at?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          expires_at?: string
          state?: string
          used_at?: string | null
        }
        Relationships: []
      }
      queue: {
        Row: {
          attempts: number
          automation_id: string | null
          claimed_at: string | null
          claimed_by: string | null
          contact_id: string | null
          created_at: string
          deduplication_key: string
          event_id: string | null
          id: string
          instagram_account_id: string | null
          job_type: string
          last_error: string | null
          max_attempts: number
          next_attempt_at: string | null
          payload: Json
          provider_message_id: string | null
          scheduled_at: string
          sent_at: string | null
          skip_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          automation_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          contact_id?: string | null
          created_at?: string
          deduplication_key: string
          event_id?: string | null
          id?: string
          instagram_account_id?: string | null
          job_type: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          payload?: Json
          provider_message_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          skip_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          automation_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          contact_id?: string | null
          created_at?: string
          deduplication_key?: string
          event_id?: string | null
          id?: string
          instagram_account_id?: string | null
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          payload?: Json
          provider_message_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          skip_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      tracking_links: {
        Row: {
          automation_id: string | null
          code: string
          contact_id: string | null
          created_at: string
          destination_url: string
          expires_at: string | null
          id: string
          queue_id: string | null
        }
        Insert: {
          automation_id?: string | null
          code: string
          contact_id?: string | null
          created_at?: string
          destination_url: string
          expires_at?: string | null
          id?: string
          queue_id?: string | null
        }
        Update: {
          automation_id?: string | null
          code?: string
          contact_id?: string | null
          created_at?: string
          destination_url?: string
          expires_at?: string | null
          id?: string
          queue_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_queue_jobs: {
        Args: {
          p_batch_size?: number
          p_stuck_after_seconds?: number
          p_worker_id?: string
        }
        Returns: Database["public"]["Tables"]["queue"]["Row"][]
      }
      cleanup_oauth_states: {
        Args: Record<string, never>
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
