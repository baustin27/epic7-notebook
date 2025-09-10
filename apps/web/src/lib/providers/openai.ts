import { supabase } from '../supabase'
import type { ProviderApiClient, ProviderModel, ProviderConfig } from '../../types/providers'

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | OpenAIContent[]
}

interface OpenAIContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: OpenAIMessage
    finish_reason: string | null
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface StreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string
    }
    finish_reason: string | null
  }>
}

class OpenAIClient implements ProviderApiClient {
  private baseURL = 'https://api.openai.com/v1'
  private config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
    if (config.baseUrl) {
      this.baseURL = config.baseUrl
    }
  }

  async getModels(): Promise<ProviderModel[]> {
    try {
      // Get API key first, so any errors are caught by the try-catch block
      const apiKey = await this.getApiKey()

      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`)
      }

      const data = await response.json()

      return data.data
        ?.filter((model: any) => !model.id.includes('embedding')) // Filter out embedding models
        .map((model: any) => ({
          id: model.id,
          name: model.id,
          description: `OpenAI ${model.id}`,
          contextLength: model.context_length || 4096,
        })) || []
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('API key not found')) {
          console.warn('OpenAI API key not configured, using default models')
        } else if (error.message.includes('401')) {
          console.error('OpenAI API authentication failed (401). Please check your API key.')
        } else {
          console.error('Error fetching OpenAI models:', error.message)
        }
      } else {
        console.error('Unknown error fetching OpenAI models:', error)
      }

      // Return default models if API fails
      console.log('Falling back to default OpenAI models')
      return [
        { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest GPT-4 optimized model', contextLength: 128000 },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient GPT-4 model', contextLength: 128000 },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous GPT-4 model with larger context', contextLength: 128000 },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective model', contextLength: 16385 },
      ]
    }
  }

  async chatCompletion(
    messages: OpenAIMessage[],
    model: string,
    onChunk?: (chunk: StreamChunk) => void,
    signal?: AbortSignal,
    settings?: any
  ): Promise<OpenAIResponse> {
    try {
      // Get API key first, so any errors are caught by the try-catch block
      const apiKey = await this.getApiKey()

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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
        throw new Error(`OpenAI API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      if (onChunk && response.body) {
        return this.handleStreamingResponse(response, onChunk)
      }

      const data = await response.json()
      return data
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('API key not found')) {
          console.error('OpenAI API key not configured for chat completion')
        } else if (error.message.includes('401')) {
          console.error('OpenAI API authentication failed (401) during chat completion. Please check your API key.')
        } else {
          console.error('Error in OpenAI chat completion:', error.message)
        }
      } else {
        console.error('Unknown error in OpenAI chat completion:', error)
      }
      throw error
    }
  }

  private async handleStreamingResponse(
    response: Response,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<OpenAIResponse> {
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finalResponse: OpenAIResponse | null = null

    if (!reader) {
      throw new Error('No response body reader available')
    }

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            if (data === '[DONE]') {
              break
            }

            try {
              const chunk: StreamChunk = JSON.parse(data)
              onChunk(chunk)

              if (chunk.choices[0]?.finish_reason) {
                finalResponse = {
                  id: chunk.id,
                  object: chunk.object,
                  created: chunk.created,
                  model: chunk.model,
                  choices: [{
                    index: 0,
                    message: {
                      role: 'assistant',
                      content: '',
                    },
                    finish_reason: chunk.choices[0].finish_reason,
                  }],
                  usage: {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0,
                  },
                }
              }
            } catch (parseError) {
              console.warn('Failed to parse OpenAI streaming chunk:', parseError)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (!finalResponse) {
      throw new Error('No response received from OpenAI streaming API')
    }

    return finalResponse
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
      localStorage.setItem('openai_api_key', apiKey)
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const encryptedKey = btoa(apiKey)
        // First get current api_keys, then update
        const { data: currentData } = await supabase
          .from('users')
          .select('api_keys')
          .eq('id', user.id)
          .single()

        const currentKeys = (currentData?.api_keys as Record<string, any>) || {}
        const updatedKeys = { ...currentKeys, openai: encryptedKey }

        await supabase
          .from('users')
          .update({ api_keys: updatedKeys })
          .eq('id', user.id)
      }
    } catch (error) {
      console.warn('Failed to store OpenAI API key in database:', error)
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

        if (data?.api_keys && typeof data.api_keys === 'object' && 'openai' in data.api_keys) {
          const apiKeys = data.api_keys as { openai?: string }
          if (apiKeys.openai) {
            return atob(apiKeys.openai)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve stored OpenAI API key:', error)
    }

    if (typeof window !== 'undefined') {
      return localStorage.getItem('openai_api_key')
    }

    return null
  }

  private async getApiKey(): Promise<string> {
    const storedKey = await this.getStoredApiKey()
    if (storedKey) {
      console.log('Using stored OpenAI API key')
      return storedKey
    }

    if (typeof window === 'undefined' && process.env.OPENAI_API_KEY) {
      console.log('Using OpenAI API key from environment variable')
      return process.env.OPENAI_API_KEY
    }

    console.warn('OpenAI API key not found. Please set your API key in settings or environment variables.')
    throw new Error('OpenAI API key not found. Please set your API key in settings.')
  }
}

export const openaiClient = new OpenAIClient({
  id: 'openai',
  name: 'OpenAI',
  type: 'openai',
  isConfigured: false,
  models: [],
  icon: 'openai',
  description: 'Direct access to OpenAI GPT models'
})