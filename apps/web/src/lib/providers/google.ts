import { supabase } from '../supabase'
import type { ProviderApiClient, ProviderModel, ProviderConfig } from '../../types/providers'

interface GoogleMessage {
  role: 'user' | 'model' | 'assistant'
  parts: Array<{
    text?: string
    inline_data?: {
      mime_type: string
      data: string
    }
  }>
}

interface GoogleResponse {
  candidates: Array<{
    content: {
      role: string
      parts: Array<{
        text: string
      }>
    }
    finishReason: string
  }>
  usageMetadata: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

class GoogleClient implements ProviderApiClient {
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta'
  private config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
    if (config.baseUrl) {
      this.baseURL = config.baseUrl
    }
  }

  async getModels(): Promise<ProviderModel[]> {
    try {
      const response = await fetch(`${this.baseURL}/models?key=${await this.getApiKey()}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`)
      }

      const data = await response.json()

      return data.models
        ?.filter((model: any) => model.name.includes('gemini'))
        .map((model: any) => ({
          id: model.name.replace('models/', ''),
          name: model.displayName || model.name,
          description: model.description || `Google ${model.name}`,
          contextLength: 32768, // Default for Gemini models
        })) || [
          { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Latest Gemini model', contextLength: 2097152 },
          { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast Gemini model', contextLength: 1048576 },
          { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', description: 'Previous Gemini model', contextLength: 32768 },
        ]
    } catch (error) {
      console.error('Error fetching Google models:', error)
      return [
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Latest Gemini model', contextLength: 2097152 },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast Gemini model', contextLength: 1048576 },
        { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', description: 'Previous Gemini model', contextLength: 32768 },
      ]
    }
  }

  async chatCompletion(
    messages: GoogleMessage[],
    model: string,
    onChunk?: (chunk: any) => void,
    signal?: AbortSignal,
    settings?: any
  ): Promise<GoogleResponse> {
    try {
      // Convert messages to Google format
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: msg.parts
      }))

      const response = await fetch(`${this.baseURL}/models/${model}:generateContent?key=${await this.getApiKey()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: settings?.temperature ?? 0.7,
            maxOutputTokens: settings?.maxTokens ?? 2000,
            topP: settings?.topP ?? 1.0,
          }
        }),
        signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Google API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error in Google chat completion:', error)
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const models = await this.getModels()
      return models.length > 0
    } catch {
      return false
    }
  }

  async setApiKey(apiKey: string): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem('google_api_key', apiKey)
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const encryptedKey = btoa(apiKey)
        const { data: currentData } = await supabase
          .from('users')
          .select('api_keys')
          .eq('id', user.id)
          .single()

        const currentKeys = (currentData?.api_keys as Record<string, any>) || {}
        const updatedKeys = { ...currentKeys, google: encryptedKey }

        await supabase
          .from('users')
          .update({ api_keys: updatedKeys })
          .eq('id', user.id)
      }
    } catch (error) {
      console.warn('Failed to store Google API key in database:', error)
    }
  }

  async getStoredApiKey(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('api_keys')
          .eq('id', user.id)
          .single()

        if (data?.api_keys && typeof data.api_keys === 'object' && 'google' in data.api_keys) {
          const apiKeys = data.api_keys as { google?: string }
          if (apiKeys.google) {
            return atob(apiKeys.google)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve stored Google API key:', error)
    }

    if (typeof window !== 'undefined') {
      return localStorage.getItem('google_api_key')
    }

    return null
  }

  private async getApiKey(): Promise<string> {
    const storedKey = await this.getStoredApiKey()
    if (storedKey) return storedKey

    if (typeof window === 'undefined' && process.env.GOOGLE_AI_API_KEY) {
      return process.env.GOOGLE_AI_API_KEY
    }

    throw new Error('Google API key not found. Please set your API key in settings.')
  }
}

export const googleClient = new GoogleClient({
  id: 'google',
  name: 'Google',
  type: 'google',
  isConfigured: false,
  models: [],
  icon: 'google',
  description: 'Access to Google Gemini models'
})