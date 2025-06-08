export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_applications: {
        Row: {
          agency_id: string | null
          company_name: string
          contact_person: string
          contact_phone: string
          created_at: string | null
          id: string
          license_image: string
          review_reason: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          company_name: string
          contact_person: string
          contact_phone: string
          created_at?: string | null
          id?: string
          license_image: string
          review_reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          company_name?: string
          contact_person?: string
          contact_phone?: string
          created_at?: string | null
          id?: string
          license_image?: string
          review_reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_models: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          parameters: Json | null
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          parameters?: Json | null
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parameters?: Json | null
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          service: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          service: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          service?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          banner_type: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          banner_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          banner_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          content_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          content_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          content_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          avatar_url: string | null
          company_info: Json | null
          contact_methods: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_info?: Json | null
          contact_methods?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_info?: Json | null
          contact_methods?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      content_items: {
        Row: {
          content_url: string
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string
          metadata: Json | null
          recommendation_reason: string | null
          recommendation_score: number | null
          recommended: boolean | null
          title: string
          type: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          content_url: string
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          recommendation_reason?: string | null
          recommendation_score?: number | null
          recommended?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          content_url?: string
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          recommendation_reason?: string | null
          recommendation_score?: number | null
          recommended?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          title: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_purchases: {
        Row: {
          created_at: string | null
          credits: number
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits: number
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits?: number
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          remark: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          remark?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          remark?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_identities: {
        Row: {
          base_id: string | null
          created_at: string | null
          creation_progress: number | null
          id: string
          metadata: Json | null
          name: string
          status: string | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          base_id?: string | null
          created_at?: string | null
          creation_progress?: number | null
          id?: string
          metadata?: Json | null
          name: string
          status?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          base_id?: string | null
          created_at?: string | null
          creation_progress?: number | null
          id?: string
          metadata?: Json | null
          name?: string
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_identities_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "digital_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_order_applications: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          license_image: string
          note: string | null
          order_id: string | null
          qualification_image: string
          review_reason: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          license_image: string
          note?: string | null
          order_id?: string | null
          qualification_image: string
          review_reason?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          license_image?: string
          note?: string | null
          order_id?: string | null
          qualification_image?: string
          review_reason?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_order_applications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_order_applications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "enterprise_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_orders: {
        Row: {
          contact_name: string
          contact_phone: string
          created_at: string | null
          departure_location: string
          destination_location: string
          has_paid_info_fee: boolean | null
          id: string
          people_count: number | null
          requirements: string | null
          status: string
          travel_date: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contact_name: string
          contact_phone: string
          created_at?: string | null
          departure_location: string
          destination_location: string
          has_paid_info_fee?: boolean | null
          id?: string
          people_count?: number | null
          requirements?: string | null
          status?: string
          travel_date: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contact_name?: string
          contact_phone?: string
          created_at?: string | null
          departure_location?: string
          destination_location?: string
          has_paid_info_fee?: boolean | null
          id?: string
          people_count?: number | null
          requirements?: string | null
          status?: string
          travel_date?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          plan_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "travel_plan_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      generation_prompts: {
        Row: {
          created_at: string | null
          id: string
          model_id: string | null
          negative_prompt: string | null
          parameters: Json | null
          prompt: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          model_id?: string | null
          negative_prompt?: string | null
          parameters?: Json | null
          prompt: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          model_id?: string | null
          negative_prompt?: string | null
          parameters?: Json | null
          prompt?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_prompts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_results: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          metadata: Json | null
          prompt_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          metadata?: Json | null
          prompt_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          metadata?: Json | null
          prompt_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_results_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "generation_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_genes: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          identity_id: string | null
          metadata: Json | null
          name: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          identity_id?: string | null
          metadata?: Json | null
          name: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          identity_id?: string | null
          metadata?: Json | null
          name?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_genes_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "digital_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_mutations: {
        Row: {
          applied_at: string | null
          effect: Json
          expires_at: string | null
          id: string
          identity_id: string | null
          metadata: Json | null
          type: string
        }
        Insert: {
          applied_at?: string | null
          effect: Json
          expires_at?: string | null
          id?: string
          identity_id?: string | null
          metadata?: Json | null
          type: string
        }
        Update: {
          applied_at?: string | null
          effect?: Json
          expires_at?: string | null
          id?: string
          identity_id?: string | null
          metadata?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_mutations_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "digital_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_versions: {
        Row: {
          changes: Json
          created_at: string | null
          created_by: string | null
          id: string
          identity_id: string | null
          version_number: number
        }
        Insert: {
          changes: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          identity_id?: string | null
          version_number: number
        }
        Update: {
          changes?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          identity_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "identity_versions_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "digital_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      info_fee_logs: {
        Row: {
          agent_id: string | null
          amount: number
          created_at: string | null
          id: string
          order_id: string | null
          remark: string | null
        }
        Insert: {
          agent_id?: string | null
          amount: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          remark?: string | null
        }
        Update: {
          agent_id?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          remark?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "info_fee_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "info_fee_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          content_id: string
          created_at: string | null
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          action_items: Json | null
          content: string | null
          conversation_id: string | null
          created_at: string | null
          end_time: string | null
          id: string
          participants: Json | null
          start_time: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          participants?: Json | null
          start_time?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          participants?: Json | null
          start_time?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          created_at: string | null
          from_role: string
          id: string
          message: string
          order_id: string | null
          read: boolean | null
        }
        Insert: {
          created_at?: string | null
          from_role: string
          id?: string
          message: string
          order_id?: string | null
          read?: boolean | null
        }
        Update: {
          created_at?: string | null
          from_role?: string
          id?: string
          message?: string
          order_id?: string | null
          read?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      message_status: {
        Row: {
          message_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          message_id: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          message_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      message_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          message_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          message_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          message_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          ai_analysis: Json | null
          category: Database["public"]["Enums"]["message_category"] | null
          content: string
          context_data: Json | null
          conversation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          parent_message_id: string | null
          priority: Database["public"]["Enums"]["message_priority"] | null
          read: boolean | null
          receiver_id: string | null
          sender_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          category?: Database["public"]["Enums"]["message_category"] | null
          content: string
          context_data?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parent_message_id?: string | null
          priority?: Database["public"]["Enums"]["message_priority"] | null
          read?: boolean | null
          receiver_id?: string | null
          sender_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          category?: Database["public"]["Enums"]["message_category"] | null
          content?: string
          context_data?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parent_message_id?: string | null
          priority?: Database["public"]["Enums"]["message_priority"] | null
          read?: boolean | null
          receiver_id?: string | null
          sender_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_messages: {
        Row: {
          created_at: string | null
          from_role: string
          id: string
          message: string
          order_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_role: string
          id?: string
          message: string
          order_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_role?: string
          id?: string
          message?: string
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          contact_name: string
          contact_phone: string
          contract_status: string | null
          created_at: string | null
          has_paid_info_fee: boolean | null
          id: string
          id_card: string
          order_number: string | null
          package_id: string | null
          status: string | null
          travel_date: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contact_name: string
          contact_phone: string
          contract_status?: string | null
          created_at?: string | null
          has_paid_info_fee?: boolean | null
          id?: string
          id_card: string
          order_number?: string | null
          package_id?: string | null
          status?: string | null
          travel_date: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contact_name?: string
          contact_phone?: string
          contract_status?: string | null
          created_at?: string | null
          has_paid_info_fee?: boolean | null
          id?: string
          id_card?: string
          order_number?: string | null
          package_id?: string | null
          status?: string | null
          travel_date?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "travel_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      package_favorites: {
        Row: {
          created_at: string | null
          id: string
          package_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          package_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          package_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_favorites_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "travel_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      package_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          package_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          package_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          package_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_reviews_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "travel_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      popular_destinations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agency_id: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          nickname_changes: Json[] | null
          phone: string | null
          role_type: string | null
          status: string | null
          updated_at: string | null
          user_role: string | null
          username: string | null
          wechat_open_id: string | null
        }
        Insert: {
          agency_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          nickname_changes?: Json[] | null
          phone?: string | null
          role_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_role?: string | null
          username?: string | null
          wechat_open_id?: string | null
        }
        Update: {
          agency_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          nickname_changes?: Json[] | null
          phone?: string | null
          role_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_role?: string | null
          username?: string | null
          wechat_open_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          commission_rate: number | null
          email_registration_enabled: boolean | null
          email_verification_required: boolean | null
          id: number
          is_publish_package_charged: boolean | null
          maintenance_mode: boolean | null
          max_travel_packages_per_agent: number | null
          notification_settings: Json | null
          package_publish_cost: number | null
          registration_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          commission_rate?: number | null
          email_registration_enabled?: boolean | null
          email_verification_required?: boolean | null
          id?: number
          is_publish_package_charged?: boolean | null
          maintenance_mode?: boolean | null
          max_travel_packages_per_agent?: number | null
          notification_settings?: Json | null
          package_publish_cost?: number | null
          registration_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          commission_rate?: number | null
          email_registration_enabled?: boolean | null
          email_verification_required?: boolean | null
          id?: number
          is_publish_package_charged?: boolean | null
          maintenance_mode?: boolean | null
          max_travel_packages_per_agent?: number | null
          notification_settings?: Json | null
          package_publish_cost?: number | null
          registration_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      travel_packages: {
        Row: {
          agent_id: string | null
          average_rating: number | null
          content: string | null
          content_draft: string | null
          created_at: string | null
          departure: string | null
          description: string | null
          destination: string
          discount_expires_at: string | null
          discount_price: number | null
          duration: number
          expire_at: string | null
          favorites: number | null
          hot_score: number | null
          id: string
          image: string | null
          is_discounted: boolean | null
          is_international: boolean | null
          orders: number | null
          original_price: number | null
          price: number
          review_note: string | null
          status: string
          title: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          agent_id?: string | null
          average_rating?: number | null
          content?: string | null
          content_draft?: string | null
          created_at?: string | null
          departure?: string | null
          description?: string | null
          destination: string
          discount_expires_at?: string | null
          discount_price?: number | null
          duration: number
          expire_at?: string | null
          favorites?: number | null
          hot_score?: number | null
          id?: string
          image?: string | null
          is_discounted?: boolean | null
          is_international?: boolean | null
          orders?: number | null
          original_price?: number | null
          price: number
          review_note?: string | null
          status?: string
          title: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          agent_id?: string | null
          average_rating?: number | null
          content?: string | null
          content_draft?: string | null
          created_at?: string | null
          departure?: string | null
          description?: string | null
          destination?: string
          discount_expires_at?: string | null
          discount_price?: number | null
          duration?: number
          expire_at?: string | null
          favorites?: number | null
          hot_score?: number | null
          id?: string
          image?: string | null
          is_discounted?: boolean | null
          is_international?: boolean | null
          orders?: number | null
          original_price?: number | null
          price?: number
          review_note?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_packages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_plan_logs: {
        Row: {
          created_at: string | null
          days: number
          from_location: string
          id: string
          plan_text: string
          poi_list: Json
          preferences: Json | null
          to_location: string
          travel_date: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          days: number
          from_location: string
          id?: string
          plan_text: string
          poi_list?: Json
          preferences?: Json | null
          to_location: string
          travel_date: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          days?: number
          from_location?: string
          id?: string
          plan_text?: string
          poi_list?: Json
          preferences?: Json | null
          to_location?: string
          travel_date?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_plan_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string | null
          total: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          total?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          total?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          notification_preferences: Json | null
          privacy_settings: Json | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          notification_preferences?: Json | null
          privacy_settings?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          notification_preferences?: Json | null
          privacy_settings?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_credits: {
        Args: { p_user_id: string; p_amount: number; p_remark: string }
        Returns: undefined
      }
      approve_agent_application: {
        Args: { application_id: string; user_id: string; review_note: string }
        Returns: undefined
      }
      confirm_contract: {
        Args: { p_order_id: string; p_admin_id: string }
        Returns: boolean
      }
      consume_credits: {
        Args: { p_user_id: string; p_amount: number; p_remark: string }
        Returns: boolean
      }
      generate_agency_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      increment_package_views: {
        Args: { package_id: string }
        Returns: undefined
      }
      purchase_credits: {
        Args: { p_user_id: string; p_credits: number; p_description: string }
        Returns: undefined
      }
    }
    Enums: {
      message_category: "chat" | "meeting" | "task" | "file" | "code"
      message_priority: "urgent" | "high" | "normal" | "low"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      message_category: ["chat", "meeting", "task", "file", "code"],
      message_priority: ["urgent", "high", "normal", "low"],
    },
  },
} as const
