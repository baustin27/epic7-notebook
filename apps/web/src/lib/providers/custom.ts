import { supabase } from '../supabase'
import type { ProviderApiClient, ProviderModel, ProviderConfig, CustomEndpointConfig } from '../../types/providers'

interface CustomMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | CustomContent[]
}

interface CustomContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

interface CustomResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: CustomMessage
    finish_reason: string | null
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

class CustomClient implements ProviderApiClient {
  private config: ProviderConfig
  private endpointConfig: CustomEndpointConfig

  constructor(config: ProviderConfig, endpointConfig: CustomEndpointConfig) {
    this.config = config
    this.endpointConfig = endpointConfig
  }

  async getModels(): Promise<ProviderModel[]> {
    try {
      const response = await fetch(`${this.endpointConfig.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${await this.getApiKey()}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`)
      }

      const data = await response.json()

      return data.data
        ?.filter((model: any) => !model.id.includes('embedding'))
        .map((model: any) => ({
          id: model.id,
          name: model.id,
          description: `${this.endpointConfig.name} ${model.id}`,
          contextLength: model.context_length || 4096,
        })) || []
    } catch (error) {
      console.error('Error fetching custom endpoint models:', error)
      // Return empty array if API fails
      return []
    }
  }

  async chatCompletion(
    messages: CustomMessage[],
    model: string,
    onChunk?: (chunk: any) => void,
    signal?: AbortSignal,
    settings?: any
  ): Promise<CustomResponse> {
    try {
      const response = await fetch(`${this.endpointConfig.baseUrl}/chat/completions`, {
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
          top_p: settings?.topP ?? 1.0,
          presence_penalty: settings?.presencePenalty ?? 0.0,
          frequency_penalty: settings?.frequencyPenalty ?? 0.0,
        }),
        signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Custom Endpoint API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error in custom endpoint chat completion:', error)
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpointConfig.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${await this.getApiKey()}`,
          'Content-Type': 'application/json',
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  async setApiKey(apiKey: string): Promise<void> {
    // Store in localStorage with endpoint-specific key
    if (typeof window !== 'undefined') {
      localStorage.setItem(`custom_endpoint_${this.endpointConfig.id}_api_key`, apiKey)
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
        const customEndpoints = currentKeys.customEndpoints || {}
        customEndpoints[this.endpointConfig.id] = encryptedKey

        const updatedKeys = { ...currentKeys, customEndpoints }

        await supabase
          .from('users')
          .update({ api_keys: updatedKeys })
          .eq('id', user.id)
      }
    } catch (error) {
      console.warn('Failed to store custom endpoint API key in database:', error)
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

        if (data?.api_keys && typeof data.api_keys === 'object') {
          const apiKeys = data.api_keys as { customEndpoints?: Record<string, string> }
          if (apiKeys.customEndpoints?.[this.endpointConfig.id]) {
            return atob(apiKeys.customEndpoints[this.endpointConfig.id])
          }
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve stored custom endpoint API key:', error)
    }

    if (typeof window !== 'undefined') {
      return localStorage.getItem(`custom_endpoint_${this.endpointConfig.id}_api_key`)
    }

    return null
  }

  private async getApiKey(): Promise<string> {
    const storedKey = await this.getStoredApiKey()
    if (storedKey) return storedKey

    if (this.endpointConfig.apiKey) {
      return this.endpointConfig.apiKey
    }

    throw new Error(`API key not found for custom endpoint ${this.endpointConfig.name}. Please set your API key in settings.`)
  }
}

export const createCustomClient = (config: ProviderConfig, endpointConfig: CustomEndpointConfig): CustomClient => {
  return new CustomClient(config, endpointConfig)
}