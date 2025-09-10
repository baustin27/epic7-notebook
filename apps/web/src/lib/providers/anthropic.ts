import { supabase } from '../supabase'
import type { ProviderApiClient, ProviderModel, ProviderConfig } from '../../types/providers'

interface AnthropicMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | AnthropicContent[]
}

interface AnthropicContent {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

interface AnthropicResponse {
  id: string
  type: string
  role: string
  content: Array<{
    type: string
    text: string
  }>
  model: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

class AnthropicClient implements ProviderApiClient {
  private baseURL = 'https://api.anthropic.com/v1'
  private config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
    if (config.baseUrl) {
      this.baseURL = config.baseUrl
    }
  }

  async getModels(): Promise<ProviderModel[]> {
    // Anthropic doesn't have a public models endpoint, so return known models
    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most intelligent model', contextLength: 200000 },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and efficient model', contextLength: 200000 },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Powerful model for complex tasks', contextLength: 200000 },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced model for most tasks', contextLength: 200000 },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest model', contextLength: 200000 },
    ]
  }

  async chatCompletion(
    messages: AnthropicMessage[],
    model: string,
    onChunk?: (chunk: any) => void,
    signal?: AbortSignal,
    settings?: any
  ): Promise<AnthropicResponse> {
    try {
      // Convert messages to Anthropic format
      const systemMessage = messages.find(msg => msg.role === 'system')
      const chatMessages = messages.filter(msg => msg.role !== 'system')

      const requestBody: any = {
        model,
        max_tokens: settings?.maxTokens ?? 2000,
        messages: chatMessages,
      }

      if (systemMessage) {
        requestBody.system = typeof systemMessage.content === 'string'
          ? systemMessage.content
          : systemMessage.content.map(c => c.text || '').join('')
      }

      if (settings?.temperature !== undefined) {
        requestBody.temperature = settings.temperature
      }

      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': await this.getApiKey(),
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Anthropic API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error in Anthropic chat completion:', error)
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
      localStorage.setItem('anthropic_api_key', apiKey)
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
        const updatedKeys = { ...currentKeys, anthropic: encryptedKey }

        await supabase
          .from('users')
          .update({ api_keys: updatedKeys })
          .eq('id', user.id)
      }
    } catch (error) {
      console.warn('Failed to store Anthropic API key in database:', error)
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

        if (data?.api_keys && typeof data.api_keys === 'object' && 'anthropic' in data.api_keys) {
          const apiKeys = data.api_keys as { anthropic?: string }
          if (apiKeys.anthropic) {
            return atob(apiKeys.anthropic)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve stored Anthropic API key:', error)
    }

    if (typeof window !== 'undefined') {
      return localStorage.getItem('anthropic_api_key')
    }

    return null
  }

  private async getApiKey(): Promise<string> {
    const storedKey = await this.getStoredApiKey()
    if (storedKey) return storedKey

    if (typeof window === 'undefined' && process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY
    }

    throw new Error('Anthropic API key not found. Please set your API key in settings.')
  }
}

export const anthropicClient = new AnthropicClient({
  id: 'anthropic',
  name: 'Anthropic',
  type: 'anthropic',
  isConfigured: false,
  models: [],
  icon: 'anthropic',
  description: 'Access to Claude models by Anthropic'
})