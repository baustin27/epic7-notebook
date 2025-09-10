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
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          website_url: string | null
          industry: string | null
          size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | null
          status: 'active' | 'suspended' | 'pending' | 'inactive'
          settings: Json
          billing_settings: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          website_url?: string | null
          industry?: string | null
          size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | null
          status?: 'active' | 'suspended' | 'pending' | 'inactive'
          settings?: Json
          billing_settings?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          website_url?: string | null
          industry?: string | null
          size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | null
          status?: 'active' | 'suspended' | 'pending' | 'inactive'
          settings?: Json
          billing_settings?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          permissions: Json
          invited_by: string | null
          invited_at: string
          joined_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          permissions?: Json
          invited_by?: string | null
          invited_at?: string
          joined_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          permissions?: Json
          invited_by?: string | null
          invited_at?: string
          joined_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          invited_by: string
          invited_at: string
          expires_at: string
          accepted_at: string | null
          token: string
          status: 'pending' | 'accepted' | 'expired' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          invited_by: string
          invited_at?: string
          expires_at?: string
          accepted_at?: string | null
          token: string
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          invited_by?: string
          invited_at?: string
          expires_at?: string
          accepted_at?: string | null
          token?: string
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      conversations: {
        Row: {
          id: string
          title: string
          user_id: string
          model: string
          is_active: boolean
          organization_id: string | null
          created_at: string
          updated_at: string
          embedding: any | null // pgvector type
          embedding_updated_at: string | null
          category: string | null
          tags: string[] | null
          search_score: number | null
          priority: 'low' | 'medium' | 'high' | 'urgent' | null
          archived: boolean | null
          archived_at: string | null
        }
        Insert: {
          id?: string
          title?: string
          user_id: string
          model?: string
          is_active?: boolean
          organization_id?: string | null
          created_at?: string
          updated_at?: string
          embedding?: any | null
          embedding_updated_at?: string | null
          category?: string | null
          tags?: string[] | null
          search_score?: number | null
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null
          archived?: boolean | null
          archived_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          user_id?: string
          model?: string
          is_active?: boolean
          organization_id?: string | null
          created_at?: string
          updated_at?: string
          embedding?: any | null
          embedding_updated_at?: string | null
          category?: string | null
          tags?: string[] | null
          search_score?: number | null
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null
          archived?: boolean | null
          archived_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata: Json | null
          organization_id: string | null
          created_at: string
          updated_at: string
          embedding: any | null // pgvector type
          embedding_updated_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: Json | null
          organization_id?: string | null
          created_at?: string
          updated_at?: string
          embedding?: any | null
          embedding_updated_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: Json | null
          organization_id?: string | null
          created_at?: string
          updated_at?: string
          embedding?: any | null
          embedding_updated_at?: string | null
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
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          theme: 'system' | 'light' | 'dark'
          default_model: string
          preferences: Json
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: 'system' | 'light' | 'dark'
          default_model?: string
          preferences?: Json
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          theme?: 'system' | 'light' | 'dark'
          default_model?: string
          preferences?: Json
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      prompts: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          category: string
          description: string | null
          tags: string[] | null
          is_custom: boolean
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          category?: string
          description?: string | null
          tags?: string[] | null
          is_custom?: boolean
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          category?: string
          description?: string | null
          tags?: string[] | null
          is_custom?: boolean
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          api_keys: Json | null
          role: 'user' | 'admin'
          organization_id: string | null
          default_organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          api_keys?: Json | null
          role?: 'user' | 'admin'
          organization_id?: string | null
          default_organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          api_keys?: Json | null
          role?: 'user' | 'admin'
          organization_id?: string | null
          default_organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_default_organization_id_fkey"
            columns: ["default_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          event_data: Json
          session_id: string | null
          ip_address: string | null
          user_agent: string | null
          organization_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          event_data?: Json
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          organization_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: string
          event_data?: Json
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          organization_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      analytics_metrics: {
        Row: {
          id: string
          date: string
          metric_type: string
          metric_value: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          metric_type: string
          metric_value: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          metric_type?: string
          metric_value?: number
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      model_performance: {
        Row: {
          id: string
          user_id: string
          conversation_id: string
          model: string
          prompt_tokens: number | null
          completion_tokens: number | null
          total_tokens: number | null
          response_time_ms: number | null
          cost_cents: number | null
          success: boolean
          error_message: string | null
          organization_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id: string
          model: string
          prompt_tokens?: number | null
          completion_tokens?: number | null
          total_tokens?: number | null
          response_time_ms?: number | null
          cost_cents?: number | null
          success?: boolean
          error_message?: string | null
          organization_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string
          model?: string
          prompt_tokens?: number | null
          completion_tokens?: number | null
          total_tokens?: number | null
          response_time_ms?: number | null
          cost_cents?: number | null
          success?: boolean
          error_message?: string | null
          organization_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_performance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_performance_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_performance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      user_engagement: {
        Row: {
          id: string
          user_id: string
          date: string
          messages_sent: number
          conversations_created: number
          session_duration_minutes: number
          models_used: string[] | null
          features_used: string[] | null
          last_activity: string | null
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          messages_sent?: number
          conversations_created?: number
          session_duration_minutes?: number
          models_used?: string[] | null
          features_used?: string[] | null
          last_activity?: string | null
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          messages_sent?: number
          conversations_created?: number
          session_duration_minutes?: number
          models_used?: string[] | null
          features_used?: string[] | null
          last_activity?: string | null
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_engagement_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_engagement_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      automation_workflows: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          trigger_type: 'pattern' | 'keyword' | 'context' | 'manual'
          trigger_conditions: Json
          actions: Json
          is_active: boolean
          priority: number
          usage_count: number
          last_used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          trigger_type: 'pattern' | 'keyword' | 'context' | 'manual'
          trigger_conditions?: Json
          actions?: Json
          is_active?: boolean
          priority?: number
          usage_count?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          trigger_type?: 'pattern' | 'keyword' | 'context' | 'manual'
          trigger_conditions?: Json
          actions?: Json
          is_active?: boolean
          priority?: number
          usage_count?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_workflows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      conversation_patterns: {
        Row: {
          id: string
          user_id: string
          pattern_type: 'repetitive_question' | 'common_response' | 'workflow_sequence' | 'context_pattern'
          pattern_data: Json
          confidence_score: number
          detection_count: number
          last_detected_at: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pattern_type: 'repetitive_question' | 'common_response' | 'workflow_sequence' | 'context_pattern'
          pattern_data: Json
          confidence_score: number
          detection_count?: number
          last_detected_at?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          pattern_type?: 'repetitive_question' | 'common_response' | 'workflow_sequence' | 'context_pattern'
          pattern_data?: Json
          confidence_score?: number
          detection_count?: number
          last_detected_at?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      workflow_executions: {
        Row: {
          id: string
          user_id: string
          workflow_id: string | null
          conversation_id: string
          trigger_type: string
          trigger_data: Json
          actions_executed: Json
          success: boolean
          error_message: string | null
          execution_time_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workflow_id?: string | null
          conversation_id: string
          trigger_type: string
          trigger_data?: Json
          actions_executed?: Json
          success?: boolean
          error_message?: string | null
          execution_time_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workflow_id?: string | null
          conversation_id?: string
          trigger_type?: string
          trigger_data?: Json
          actions_executed?: Json
          success?: boolean
          error_message?: string | null
          execution_time_ms?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_conversations_semantic: {
        Args: {
          query_embedding: any
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          title: string
          similarity: number
          category: string | null
          tags: string[] | null
          priority: 'low' | 'medium' | 'high' | 'urgent' | null
          archived: boolean | null
        }[]
      }
      search_messages_semantic: {
        Args: {
          query_embedding: any
          conversation_id_filter?: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          conversation_id: string
          content: string
          similarity: number
        }[]
      }
      categorize_conversation: {
        Args: {
          conv_id: string
        }
        Returns: string
      }
      determine_conversation_priority: {
        Args: {
          conv_id: string
        }
        Returns: 'low' | 'medium' | 'high' | 'urgent'
      }
      archive_inactive_conversations: {
        Args: {
          days_inactive: number
        }
        Returns: number
      }
      unarchive_conversation: {
        Args: {
          conv_id: string
        }
        Returns: boolean
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