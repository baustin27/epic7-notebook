import { supabase } from './supabase'
import type { Database } from '../types/database'
import { useAuth } from '../contexts/SimpleAuthContext'

// Type helpers
type Tables = Database['public']['Tables']
type Conversation = Tables['conversations']['Row']
type Message = Tables['messages']['Row']
type UserSettings = Tables['user_settings']['Row']

// Vector and search types
export interface SearchResult {
  id: string
  title?: string
  content?: string
  similarity: number
  category?: string | null
  tags?: string[] | null
  priority?: 'low' | 'medium' | 'high' | 'urgent' | null
  archived?: boolean | null
}

export interface SemanticSearchOptions {
  query: string
  limit?: number
  threshold?: number
  includeMessages?: boolean
  category?: string
  tags?: string[]
}

// Helper function to get current organization ID
const getCurrentOrganizationId = (): string | null => {
  // This will be called within React components that have access to auth context
  // For now, return null and let individual functions handle organization context
  return null
}

// Conversation operations
export const conversationService = {
  // Create a new conversation
  async create(title: string, model: string = 'gpt-3.5-turbo', organizationId?: string): Promise<Conversation> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // If no organization ID provided, try to get current user's organization
    let finalOrgId = organizationId
    if (!finalOrgId) {
      const { data: userData } = await supabase
        .from('users')
        .select('default_organization_id')
        .eq('id', user.id)
        .single()
      finalOrgId = userData?.default_organization_id || undefined
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        title,
        user_id: user.id,
        model,
        is_active: true,
        organization_id: finalOrgId
      })
      .select()
      .single()

    if (error) throw error

    // Trigger AI analysis in the background (don't await to avoid blocking)
    this.triggerAIAnalysis(data.id).catch(error =>
      console.warn('Background AI analysis failed:', error)
    )

    return data
  },

  // Get all conversations for current user
  async getAll(): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Get a specific conversation
  async getById(id: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  },

  // Update conversation
  async update(id: string, updates: Partial<Pick<Conversation, 'title' | 'model' | 'is_active' | 'priority' | 'archived' | 'archived_at'>>): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Trigger AI analysis if title was updated (re-analyze tags and priority)
    if (updates.title) {
      this.triggerAIAnalysis(id).catch((error: any) =>
        console.warn('Background AI analysis failed:', error)
      )
    }

    return data
  },

  // Delete conversation
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Archive conversation
  async archive(id: string): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .update({
        archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Unarchive conversation
  async unarchive(id: string): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .update({
        archived: false,
        archived_at: null
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update conversation priority
  async updatePriority(id: string, priority: 'low' | 'medium' | 'high' | 'urgent'): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .update({ priority })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get conversations by priority
  async getByPriority(priority: 'low' | 'medium' | 'high' | 'urgent'): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('priority', priority)
      .eq('archived', false)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Get archived conversations
  async getArchived(): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('archived', true)
      .order('archived_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Trigger AI analysis for a conversation (used internally)
  async triggerAIAnalysis(conversationId: string): Promise<void> {
    try {
      // Run AI analysis in parallel
      await Promise.allSettled([
        semanticSearchService.generateConversationTags(conversationId),
        semanticSearchService.determineConversationPriority(conversationId)
      ])
    } catch (error: any) {
      console.warn('AI analysis failed:', error)
      // Don't throw - we don't want to fail conversation creation
    }
  }
}

// Message operations
export const messageService = {
  // Create a new message
  async create(conversationId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: any, organizationId?: string): Promise<Message> {
    // If no organization ID provided, get it from the conversation
    let finalOrgId = organizationId
    if (!finalOrgId) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('organization_id')
        .eq('id', conversationId)
        .single()
      finalOrgId = conversation?.organization_id || undefined
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        metadata,
        organization_id: finalOrgId
      })
      .select()
      .single()

    if (error) throw error

    // Trigger AI analysis periodically (every 5 messages) to update tags and priority
    const messageCount = await this.getMessageCount(conversationId)
    if (messageCount % 5 === 0) {
      conversationService.triggerAIAnalysis(conversationId).catch((error: any) =>
        console.warn('Background AI analysis failed:', error)
      )
    }

    return data
  },

  // Get all messages for a conversation
  async getByConversationId(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  // Update message
  async update(id: string, updates: Partial<Pick<Message, 'content' | 'metadata'>>): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete message
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Get message count for a conversation
  async getMessageCount(conversationId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)

    if (error) throw error
    return count || 0
  }
}

// User settings operations
export const userSettingsService = {
  // Get user settings
  async get(organizationId?: string): Promise<UserSettings | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)

    // If organization ID provided, filter by it
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  },

  // Update user settings
  async update(updates: Partial<Pick<UserSettings, 'theme' | 'default_model' | 'preferences'>>, organizationId?: string): Promise<UserSettings> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // If no organization ID provided, try to get current user's organization
    let finalOrgId = organizationId
    if (!finalOrgId) {
      const { data: userData } = await supabase
        .from('users')
        .select('default_organization_id')
        .eq('id', user.id)
        .single()
      finalOrgId = userData?.default_organization_id || undefined
    }

    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        organization_id: finalOrgId,
        ...updates
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// User profile operations
export const userService = {
  // Get current user profile
  async getProfile() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  // Update user profile
  async updateProfile(updates: { full_name?: string; avatar_url?: string }) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Semantic search and AI services
export const semanticSearchService = {
  // Generate embeddings for conversation content
  async generateConversationEmbedding(conversationId: string): Promise<number[]> {
    try {
      // Get conversation and its messages
      const [conversation, messages] = await Promise.all([
        conversationService.getById(conversationId),
        messageService.getByConversationId(conversationId)
      ])

      if (!conversation) throw new Error('Conversation not found')

      // Create content for embedding (title + recent messages)
      const content = [
        conversation.title,
        ...messages.slice(-5).map(m => m.content) // Last 5 messages for context
      ].join(' ')

      // Call OpenRouter API for embeddings
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content })
      })

      if (!response.ok) throw new Error('Failed to generate embedding')

      const { embedding } = await response.json()

      // Update conversation with embedding
      await supabase
        .from('conversations')
        .update({
          embedding,
          embedding_updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      return embedding
    } catch (error) {
      console.error('Failed to generate conversation embedding:', error)
      throw error
    }
  },

  // Generate embeddings for individual messages
  async generateMessageEmbedding(messageId: string): Promise<number[]> {
    try {
      const { data: message } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single()

      if (!message) throw new Error('Message not found')

      // Call OpenRouter API for embeddings
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message.content })
      })

      if (!response.ok) throw new Error('Failed to generate embedding')

      const { embedding } = await response.json()

      // Update message with embedding
      await supabase
        .from('messages')
        .update({
          embedding,
          embedding_updated_at: new Date().toISOString()
        })
        .eq('id', messageId)

      return embedding
    } catch (error) {
      console.error('Failed to generate message embedding:', error)
      throw error
    }
  },

  // Perform semantic search across conversations
  async searchConversations(options: SemanticSearchOptions): Promise<SearchResult[]> {
    try {
      // Get embedding for the query
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: options.query })
      })

      if (!response.ok) throw new Error('Failed to generate query embedding')

      const { embedding } = await response.json()

      // Perform vector search using Supabase RPC
      const { data, error } = await supabase.rpc('search_conversations_semantic', {
        query_embedding: embedding,
        match_threshold: options.threshold || 0.1,
        match_count: options.limit || 10
      })

      if (error) throw error

      return data.map((item: any) => ({
        id: item.id,
        title: item.title || 'Untitled Conversation',
        similarity: item.similarity,
        category: item.category,
        tags: item.tags,
        priority: item.priority,
        archived: item.archived
      }))
    } catch (error) {
      console.error('Semantic search failed:', error)
      // Fallback to keyword search
      return this.fallbackKeywordSearch(options)
    }
  },

  // Perform semantic search across messages
  async searchMessages(options: SemanticSearchOptions): Promise<SearchResult[]> {
    try {
      // Get embedding for the query
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: options.query })
      })

      if (!response.ok) throw new Error('Failed to generate query embedding')

      const { embedding } = await response.json()

      // Perform vector search using Supabase RPC
      const { data, error } = await supabase.rpc('search_messages_semantic', {
        query_embedding: embedding,
        match_threshold: options.threshold || 0.1,
        match_count: options.limit || 20
      })

      if (error) throw error

      return data.map((item: any) => ({
        id: item.id,
        content: item.content,
        similarity: item.similarity
      }))
    } catch (error) {
      console.error('Message semantic search failed:', error)
      // Fallback to keyword search
      return this.fallbackMessageKeywordSearch(options)
    }
  },

  // Fallback keyword search for conversations
  async fallbackKeywordSearch(options: SemanticSearchOptions): Promise<SearchResult[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, category, tags')
      .ilike('title', `%${options.query}%`)
      .limit(options.limit || 10)

    if (error) throw error

    return data.map(item => ({
      id: item.id,
      title: item.title,
      similarity: 0.5, // Default similarity for keyword matches
      category: item.category,
      tags: item.tags
    }))
  },

  // Fallback keyword search for messages
  async fallbackMessageKeywordSearch(options: SemanticSearchOptions): Promise<SearchResult[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('id, content, conversation_id')
      .ilike('content', `%${options.query}%`)
      .limit(options.limit || 20)

    if (error) throw error

    return data.map(item => ({
      id: item.id,
      content: item.content,
      similarity: 0.5, // Default similarity for keyword matches
    }))
  },

  // Categorize a conversation
  async categorizeConversation(conversationId: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('categorize_conversation', {
        conv_id: conversationId
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to categorize conversation:', error)
      throw error
    }
  },

  // Get conversation suggestions based on current context
  async getRelatedConversations(conversationId: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      // Get the current conversation's embedding
      const { data: conversation } = await supabase
        .from('conversations')
        .select('embedding')
        .eq('id', conversationId)
        .single()

      if (!conversation?.embedding) {
        // Generate embedding if not exists
        await this.generateConversationEmbedding(conversationId)
        return this.getRelatedConversations(conversationId, limit)
      }

      // Find similar conversations
      const { data, error } = await supabase.rpc('search_conversations_semantic', {
        query_embedding: conversation.embedding,
        match_threshold: 0.3,
        match_count: limit + 1 // +1 to exclude self
      })

      if (error) throw error

      // Exclude the current conversation
      return data
        .filter((item: any) => item.id !== conversationId)
        .slice(0, limit)
        .map((item: any) => ({
          id: item.id,
          title: item.title,
          similarity: item.similarity,
          category: item.category,
          tags: item.tags,
          priority: item.priority,
          archived: item.archived
        }))
    } catch (error) {
      console.error('Failed to get related conversations:', error)
      return []
    }
  },

  // Generate AI-powered tags for a conversation
  async generateConversationTags(conversationId: string): Promise<string[]> {
    try {
      const [conversation, messages] = await Promise.all([
        conversationService.getById(conversationId),
        messageService.getByConversationId(conversationId)
      ])

      if (!conversation) throw new Error('Conversation not found')

      // Create content for AI analysis
      const content = [
        conversation.title,
        ...messages.slice(-10).map(m => m.content) // Last 10 messages for context
      ].join(' ')

      // Use smart tags API
      const response = await fetch('/api/smart-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          title: conversation.title,
          maxTags: 5
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Failed to generate tags: ${errorData.error || 'Unknown error'}`)
      }

      const { tags } = await response.json()

      // Update conversation with generated tags
      await supabase
        .from('conversations')
        .update({ tags })
        .eq('id', conversationId)

      return tags
    } catch (error) {
      console.error('Failed to generate conversation tags:', error)
      throw error
    }
  },

  // Determine conversation priority using AI analysis
  async determineConversationPriority(conversationId: string): Promise<'low' | 'medium' | 'high' | 'urgent'> {
    try {
      const [conversation, messages] = await Promise.all([
        conversationService.getById(conversationId),
        messageService.getByConversationId(conversationId)
      ])

      if (!conversation) throw new Error('Conversation not found')

      // Create content for AI analysis
      const content = [
        conversation.title,
        ...messages.slice(-10).map(m => m.content) // Last 10 messages for context
      ].join(' ')

      // Use smart priority API
      const response = await fetch('/api/smart-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          title: conversation.title,
          currentPriority: conversation.priority || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.warn(`Failed to determine priority via API: ${errorData.error || 'Unknown error'}`)
        // Fallback to database function
        return this.fallbackDeterminePriority(conversationId)
      }

      const { priority } = await response.json()

      // Update conversation with determined priority
      await supabase
        .from('conversations')
        .update({ priority })
        .eq('id', conversationId)

      return priority
    } catch (error) {
      console.error('Failed to determine conversation priority:', error)
      // Fallback to database function
      return this.fallbackDeterminePriority(conversationId)
    }
  },

  // Fallback priority determination using database function
  async fallbackDeterminePriority(conversationId: string): Promise<'low' | 'medium' | 'high' | 'urgent'> {
    try {
      const { data, error } = await supabase.rpc('determine_conversation_priority', {
        conv_id: conversationId
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Fallback priority determination failed:', error)
      return 'medium'
    }
  },

  // Archive inactive conversations
  async archiveInactiveConversations(daysInactive: number = 90): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('archive_inactive_conversations', {
        days_inactive: daysInactive
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to archive inactive conversations:', error)
      return 0
    }
  }
}

// Database health check
export const databaseHealth = {
  async checkConnection(): Promise<boolean> {
    try {
      const { error } = await supabase.from('users').select('count', { count: 'exact', head: true })
      return !error
    } catch {
      return false
    }
  },

  async getStats() {
    try {
      const [conversations, messages, settings] = await Promise.all([
        supabase.from('conversations').select('count', { count: 'exact', head: true }),
        supabase.from('messages').select('count', { count: 'exact', head: true }),
        supabase.from('user_settings').select('count', { count: 'exact', head: true })
      ])

      return {
        conversations: conversations.count || 0,
        messages: messages.count || 0,
        settings: settings.count || 0
      }
    } catch (error) {
      console.error('Failed to get database stats:', error)
      return { conversations: 0, messages: 0, settings: 0 }
    }
  }
}