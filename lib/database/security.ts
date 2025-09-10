/**
 * Database Connection Security
 * Secure Supabase client configuration with connection pooling and security measures
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config, isProduction, isDevelopment } from '@/lib/config'
import { logger, PerformanceMonitor } from '@/lib/monitoring/logger'

// Database types (to be expanded with actual schema)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: {
          content?: string
        }
      }
    }
  }
}

// Connection configuration
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'chat-interface@1.0.0',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
}

// Client instances
let supabaseClient: SupabaseClient<Database> | null = null
let supabaseServiceClient: SupabaseClient<Database> | null = null

// Create public client (for client-side operations)
export function createSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseClient) {
    supabaseClient = createClient<Database>(
      config.NEXT_PUBLIC_SUPABASE_URL,
      config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseConfig
    )

    logger.info('Supabase public client initialized')
  }

  return supabaseClient
}

// Create service client (for server-side operations with elevated privileges)
export function createSupabaseServiceClient(): SupabaseClient<Database> {
  if (!supabaseServiceClient) {
    supabaseServiceClient = createClient<Database>(
      config.NEXT_PUBLIC_SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY,
      {
        ...supabaseConfig,
        auth: {
          ...supabaseConfig.auth,
          persistSession: false, // Don't persist sessions for service client
        },
      }
    )

    logger.info('Supabase service client initialized')
  }

  return supabaseServiceClient
}

// Database query wrapper with security and monitoring
export class SecureDatabase {
  private client: SupabaseClient<Database>
  private userId?: string

  constructor(client: SupabaseClient<Database>, userId?: string) {
    this.client = client
    this.userId = userId
  }

  // Execute query with monitoring and error handling
  private async executeQuery<T>(
    operation: string,
    queryFn: () => Promise<{ data: T | null; error: any }>
  ): Promise<T> {
    const endTimer = PerformanceMonitor.startTimer(`db:${operation}`)
    
    try {
      const { data, error } = await queryFn()
      
      if (error) {
        logger.error(`Database query failed: ${operation}`, {
          userId: this.userId,
          additionalData: { error: error.message, code: error.code }
        })
        throw new Error(`Database error: ${error.message}`)
      }

      endTimer()
      
      if (isDevelopment) {
        logger.debug(`Database query successful: ${operation}`, {
          userId: this.userId
        })
      }

      return data as T
    } catch (error) {
      endTimer()
      logger.error(`Database operation failed: ${operation}`, {
        userId: this.userId
      }, error as Error)
      throw error
    }
  }

  // User operations
  async getUser(userId: string) {
    return this.executeQuery('getUser', () =>
      this.client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
    )
  }

  async createUser(userData: Database['public']['Tables']['users']['Insert']) {
    return this.executeQuery('createUser', () =>
      this.client
        .from('users')
        .insert(userData)
        .select()
        .single()
    )
  }

  async updateUser(userId: string, updates: Database['public']['Tables']['users']['Update']) {
    // Ensure user can only update their own data
    if (this.userId && this.userId !== userId) {
      throw new Error('Unauthorized: Cannot update other user data')
    }

    return this.executeQuery('updateUser', () =>
      this.client
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()
    )
  }

  // Conversation operations
  async getUserConversations(userId: string) {
    // Ensure user can only access their own conversations
    if (this.userId && this.userId !== userId) {
      throw new Error('Unauthorized: Cannot access other user conversations')
    }

    return this.executeQuery('getUserConversations', () =>
      this.client
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
    )
  }

  async createConversation(conversationData: Database['public']['Tables']['conversations']['Insert']) {
    // Ensure user can only create conversations for themselves
    if (this.userId && this.userId !== conversationData.user_id) {
      throw new Error('Unauthorized: Cannot create conversation for other user')
    }

    return this.executeQuery('createConversation', () =>
      this.client
        .from('conversations')
        .insert(conversationData)
        .select()
        .single()
    )
  }

  async updateConversation(
    conversationId: string,
    updates: Database['public']['Tables']['conversations']['Update']
  ) {
    return this.executeQuery('updateConversation', () =>
      this.client
        .from('conversations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('user_id', this.userId!) // Ensure user owns the conversation
        .select()
        .single()
    )
  }

  async deleteConversation(conversationId: string) {
    return this.executeQuery('deleteConversation', () =>
      this.client
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', this.userId!) // Ensure user owns the conversation
    )
  }

  // Message operations
  async getConversationMessages(conversationId: string) {
    return this.executeQuery('getConversationMessages', () =>
      this.client
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
    )
  }

  async createMessage(messageData: Database['public']['Tables']['messages']['Insert']) {
    return this.executeQuery('createMessage', () =>
      this.client
        .from('messages')
        .insert(messageData)
        .select()
        .single()
    )
  }

  async updateMessage(messageId: string, updates: Database['public']['Tables']['messages']['Update']) {
    return this.executeQuery('updateMessage', () =>
      this.client
        .from('messages')
        .update(updates)
        .eq('id', messageId)
        .select()
        .single()
    )
  }

  async deleteMessage(messageId: string) {
    return this.executeQuery('deleteMessage', () =>
      this.client
        .from('messages')
        .delete()
        .eq('id', messageId)
    )
  }
}

// Database helper functions
export function createSecureDatabase(userId?: string): SecureDatabase {
  const client = userId ? createSupabaseClient() : createSupabaseServiceClient()
  return new SecureDatabase(client, userId)
}

// Connection health check
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy'
  latency?: number
  error?: string
}> {
  try {
    const start = Date.now()
    const client = createSupabaseServiceClient()
    
    const { error } = await client
      .from('users')
      .select('count')
      .limit(1)
      .single()
    
    const latency = Date.now() - start

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found" which is OK
      return {
        status: 'unhealthy',
        error: error.message
      }
    }

    return {
      status: 'healthy',
      latency
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: (error as Error).message
    }
  }
}

// Row Level Security policies helper
export const RLS_POLICIES = {
  // Users can only see their own data
  users: {
    select: 'auth.uid() = id',
    insert: 'auth.uid() = id',
    update: 'auth.uid() = id',
    delete: 'auth.uid() = id',
  },
  
  // Users can only see their own conversations
  conversations: {
    select: 'auth.uid() = user_id',
    insert: 'auth.uid() = user_id',
    update: 'auth.uid() = user_id',
    delete: 'auth.uid() = user_id',
  },
  
  // Users can only see messages from their own conversations
  messages: {
    select: `
      EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = conversation_id 
        AND conversations.user_id = auth.uid()
      )
    `,
    insert: `
      EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = conversation_id 
        AND conversations.user_id = auth.uid()
      )
    `,
    update: `
      EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = conversation_id 
        AND conversations.user_id = auth.uid()
      )
    `,
    delete: `
      EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = conversation_id 
        AND conversations.user_id = auth.uid()
      )
    `,
  },
} as const

// Database migration helper (for development)
export async function runMigrations() {
  if (!isDevelopment) {
    logger.warn('Migrations should only be run in development')
    return
  }

  const client = createSupabaseServiceClient()
  
  try {
    // Enable RLS on all tables
    await client.rpc('enable_rls_all_tables')
    
    logger.info('Database migrations completed successfully')
  } catch (error) {
    logger.error('Database migrations failed', undefined, error as Error)
    throw error
  }
}