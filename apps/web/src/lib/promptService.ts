import { supabase } from './supabase'
import type { Database } from '../types/database'
import type { Prompt } from '../types/prompts'

type DbPrompt = Database['public']['Tables']['prompts']['Row']
type DbPromptInsert = Database['public']['Tables']['prompts']['Insert']
type DbPromptUpdate = Database['public']['Tables']['prompts']['Update']

// Convert database prompt to app prompt format
const dbPromptToPrompt = (dbPrompt: DbPrompt): Prompt => ({
  id: dbPrompt.id,
  title: dbPrompt.title,
  content: dbPrompt.content,
  category: dbPrompt.category,
  description: dbPrompt.description || undefined,
  tags: dbPrompt.tags || undefined,
  isCustom: dbPrompt.is_custom,
  createdAt: dbPrompt.created_at,
  updatedAt: dbPrompt.updated_at
})

// Convert app prompt to database format
const promptToDbPrompt = (prompt: Partial<Prompt>): Partial<DbPromptInsert> => ({
  id: prompt.id,
  title: prompt.title,
  content: prompt.content,
  category: prompt.category,
  description: prompt.description || null,
  tags: prompt.tags || null,
  is_custom: prompt.isCustom,
  created_at: prompt.createdAt,
  updated_at: prompt.updatedAt
})

export class PromptService {
  // Get all prompts for the current user
  static async getUserPrompts(): Promise<Prompt[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching prompts:', error)
      // Return empty array instead of throwing to prevent app crashes
      return []
    }

    return (data || []).map(dbPromptToPrompt)
  }

  // Get a single prompt by ID
  static async getPromptById(id: string): Promise<Prompt | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Prompt not found
      }
      console.error('Error fetching prompt:', error)
      throw new Error('Failed to fetch prompt')
    }

    return dbPromptToPrompt(data)
  }

  // Create a new prompt
  static async createPrompt(promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prompt> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const dbData: DbPromptInsert = {
      user_id: user.id,
      title: promptData.title,
      content: promptData.content,
      category: promptData.category,
      description: promptData.description || null,
      tags: promptData.tags || null,
      is_custom: promptData.isCustom
    }

    const { data, error } = await supabase
      .from('prompts')
      .insert(dbData)
      .select()
      .single()

    if (error) {
      console.error('Error creating prompt:', error)
      throw new Error('Failed to create prompt')
    }

    return dbPromptToPrompt(data)
  }

  // Update an existing prompt
  static async updatePrompt(id: string, updates: Partial<Prompt>): Promise<Prompt> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const dbUpdates: DbPromptUpdate = {
      title: updates.title,
      content: updates.content,
      category: updates.category,
      description: updates.description || null,
      tags: updates.tags || null,
      is_custom: updates.isCustom
    }

    const { data, error } = await supabase
      .from('prompts')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating prompt:', error)
      throw new Error('Failed to update prompt')
    }

    return dbPromptToPrompt(data)
  }

  // Delete a prompt
  static async deletePrompt(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting prompt:', error)
      throw new Error('Failed to delete prompt')
    }
  }

  // Search prompts by title, content, or tags
  static async searchPrompts(query: string): Promise<Prompt[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('user_id', user.id)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error searching prompts:', error)
      throw new Error('Failed to search prompts')
    }

    return data.map(dbPromptToPrompt)
  }

  // Get prompts by category
  static async getPromptsByCategory(category: string): Promise<Prompt[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', category)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching prompts by category:', error)
      throw new Error('Failed to fetch prompts by category')
    }

    return data.map(dbPromptToPrompt)
  }
}