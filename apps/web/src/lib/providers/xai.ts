import { supabase } from '../supabase'
import type { ProviderApiClient, ProviderModel, ProviderConfig } from '../../types/providers'

interface XAIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface XAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: XAIMessage
    finish_reason: string | null
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

class XAIClient implements ProviderApiClient {
  private baseURL = 'https://api.x.ai/v1'
  private config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
    if (config.baseUrl) {
      this.baseURL = config.baseUrl
    }
  }

  async getModels(): Promise<ProviderModel[]> {
    // xAI doesn't have a public models endpoint, so return known models
    return [
      { id: 'grok-beta', name: 'Grok Beta', description: 'xAI Grok model', contextLength: 128000 },
      { id: 'grok-vision-beta', name: 'Grok Vision Beta', description: 'xAI Grok with vision capabilities', contextLength: 128000 },
    ]
  }

  async chatCompletion(
    messages: XAIMessage[],
    model: string,
    onChunk?: (chunk: any) => void,
    signal?: AbortSignal,
    settings?: any
  ): Promise<XAIResponse> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: !!onChunk,
          temperature: settings?.temperature ?? 0.7,
          max_tokens: settings?.maxTokens ?? 2000,
        }),
        signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`xAI API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error in xAI chat completion:', error)
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
      localStorage.setItem('xai_api_key', apiKey)
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
        const updatedKeys = { ...currentKeys, xai: encryptedKey }

        await supabase
          .from('users')
          .update({ api_keys: updatedKeys })
          .eq('id', user.id)
      }
    } catch (error) {
      console.warn('Failed to store xAI API key in database:', error)
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

        if (data?.api_keys && typeof data.api_keys === 'object' && 'xai' in data.api_keys) {
          const apiKeys = data.api_keys as { xai?: string }
          if (apiKeys.xai) {
            return atob(apiKeys.xai)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve stored xAI API key:', error)
    }

    if (typeof window !== 'undefined') {
      return localStorage.getItem('xai_api_key')
    }

    return null
  }

  private async getApiKey(): Promise<string> {
    const storedKey = await this.getStoredApiKey()
    if (storedKey) return storedKey

    if (typeof window === 'undefined' && process.env.XAI_API_KEY) {
      return process.env.XAI_API_KEY
    }

    throw new Error('xAI API key not found. Please set your API key in settings.')
  }
}

export const xaiClient = new XAIClient({
  id: 'xai',
  name: 'xAI',
  type: 'xai',
  isConfigured: false,
  models: [],
  icon: 'xai',
  description: 'Access to xAI Grok models'
})