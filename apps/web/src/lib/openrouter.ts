import { supabase } from './supabase'
import type { ModelSettings } from '../types/modelSettings'

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | OpenRouterContent[]
}

export interface OpenRouterContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

export interface OpenRouterResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: OpenRouterMessage
    finish_reason: string | null
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// Cost tracking interfaces
export interface CostEstimate {
  promptCost: number
  completionCost: number
  totalCost: number
  currency: string
}

export interface CostTracking {
  totalCost: number
  totalTokens: number
  lastUpdated: Date
  costByModel: Record<string, number>
}

export interface StreamChunk {
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

class OpenRouterAPI {
  private baseURL = 'https://openrouter.ai/api/v1'
  private costTracking: CostTracking = {
    totalCost: 0,
    totalTokens: 0,
    lastUpdated: new Date(),
    costByModel: {}
  }

  // Model pricing data (simplified - in production, fetch from OpenRouter API)
  private modelPricing: Record<string, { prompt: number; completion: number }> = {
    // Free models
    'meta-llama/llama-3.1-8b-instruct:free': { prompt: 0, completion: 0 },
    'mistralai/mistral-7b-instruct:free': { prompt: 0, completion: 0 },
    'huggingface/zephyr-7b-beta:free': { prompt: 0, completion: 0 },

    // Paid models (example pricing in USD per 1M tokens)
    'openai/gpt-4o-mini': { prompt: 0.15, completion: 0.60 },
    'openai/gpt-4o': { prompt: 2.50, completion: 10.00 },
    'openai/gpt-3.5-turbo': { prompt: 0.50, completion: 1.50 },
    'anthropic/claude-3-5-sonnet-20241022': { prompt: 3.00, completion: 15.00 },
    'anthropic/claude-3-haiku-20240307': { prompt: 0.25, completion: 1.25 },
    'google/gemini-pro-1.5': { prompt: 1.25, completion: 5.00 },
    'google/gemini-flash-1.5': { prompt: 0.075, completion: 0.30 },
    'xai/grok-beta': { prompt: 5.00, completion: 15.00 },
  }

  // Free models list for development environment enforcement
  private freeModels = [
    'meta-llama/llama-3.1-8b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'huggingface/zephyr-7b-beta:free'
  ]

  async getModels(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.getApiKey()}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching models:', error)
      throw error
    }
  }

  async chatCompletion(
      messages: OpenRouterMessage[],
      model: string,
      onChunk?: (chunk: StreamChunk) => void,
      signal?: AbortSignal,
      settings?: ModelSettings
    ): Promise<OpenRouterResponse> {
      try {
        // Enforce free models in development environment
        const validatedModel = this.enforceFreeModel(model)
        if (validatedModel !== model) {
          console.warn(`Model enforced from ${model} to ${validatedModel} due to development environment restrictions`)
        }

        // Prepare messages with system prompt if provided
        let apiMessages = [...messages]
        if (settings?.systemPrompt && settings.systemPrompt.trim()) {
          // Check if there's already a system message
          const hasSystemMessage = apiMessages.some(msg => msg.role === 'system')
          if (!hasSystemMessage) {
            apiMessages.unshift({
              role: 'system',
              content: settings.systemPrompt.trim()
            })
          }
        }

       const response = await fetch(`${this.baseURL}/chat/completions`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${this.getApiKey()}`,
           'Content-Type': 'application/json',
           'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
           'X-Title': 'Sleek Chat Interface',
         },
         body: JSON.stringify({
           model: validatedModel,
           messages: apiMessages,
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
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      if (onChunk && response.body) {
        return this.handleStreamingResponse(response, onChunk)
      }

      const data = await response.json()

      // Track cost for the completed request
      if (data.usage) {
        this.trackCost(validatedModel, data.usage)
      }

      return data
    } catch (error) {
      console.error('Error in chat completion:', error)
      throw error
    }
  }

  private async handleStreamingResponse(
    response: Response,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<OpenRouterResponse> {
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finalResponse: OpenRouterResponse | null = null

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

              // Store the final response
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
                      content: '', // This will be built from chunks
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
              console.warn('Failed to parse streaming chunk:', parseError)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (!finalResponse) {
      throw new Error('No response received from streaming API')
    }

    // Note: For streaming responses, we don't have usage data in the final response
    // In a production implementation, you'd need to get usage data from the last chunk
    // or make a separate API call to get usage statistics

    return finalResponse
  }

  private getApiKey(): string {
    // Try to get from Next.js environment variable first (server-side)
    if (typeof window === 'undefined' && process.env.OPENROUTER_API_KEY) {
      return process.env.OPENROUTER_API_KEY
    }

    // Try to get from client-side environment variable
    if (typeof window !== 'undefined' && (window as any).ENV?.OPENROUTER_API_KEY) {
      return (window as any).ENV.OPENROUTER_API_KEY
    }

    // Fallback to local storage or user settings
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('openrouter_api_key')
      if (stored) return stored
    }

    throw new Error('OpenRouter API key not found. Please set your API key in settings.')
  }

  async setApiKey(apiKey: string): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem('openrouter_api_key', apiKey)
    }

    // Also store in user settings if authenticated
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Encrypt and store in database
        const encryptedKey = btoa(apiKey) // Simple base64 encoding (should use proper encryption)
        await supabase
          .from('users')
          .update({ api_keys: { openrouter: encryptedKey } })
          .eq('id', user.id)
      }
    } catch (error) {
      console.warn('Failed to store API key in database:', error)
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

        if (data?.api_keys && typeof data.api_keys === 'object' && 'openrouter' in data.api_keys) {
          const apiKeys = data.api_keys as { openrouter?: string }
          if (apiKeys.openrouter) {
            return atob(apiKeys.openrouter)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve stored API key:', error)
    }

    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('openrouter_api_key')
    }

    return null
  }

  // Cost estimation methods
  estimateCost(model: string, promptTokens: number, completionTokens: number): CostEstimate {
    const pricing = this.modelPricing[model] || { prompt: 0.001, completion: 0.002 } // Default fallback pricing

    const promptCost = (promptTokens / 1000000) * pricing.prompt
    const completionCost = (completionTokens / 1000000) * pricing.completion
    const totalCost = promptCost + completionCost

    return {
      promptCost,
      completionCost,
      totalCost,
      currency: 'USD'
    }
  }

  // Track cost for a completed request
  trackCost(model: string, usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }): CostEstimate {
    const cost = this.estimateCost(model, usage.prompt_tokens, usage.completion_tokens)

    // Update cost tracking
    this.costTracking.totalCost += cost.totalCost
    this.costTracking.totalTokens += usage.total_tokens
    this.costTracking.lastUpdated = new Date()

    // Track cost by model
    if (!this.costTracking.costByModel[model]) {
      this.costTracking.costByModel[model] = 0
    }
    this.costTracking.costByModel[model] += cost.totalCost

    // Log cost event for audit purposes
    console.log(`Cost tracked for ${model}:`, {
      cost,
      usage,
      totalCost: this.costTracking.totalCost,
      totalTokens: this.costTracking.totalTokens
    })

    return cost
  }

  // Get current cost tracking data
  getCostTracking(): CostTracking {
    return { ...this.costTracking }
  }

  // Reset cost tracking (for testing or admin purposes)
  resetCostTracking(): void {
    this.costTracking = {
      totalCost: 0,
      totalTokens: 0,
      lastUpdated: new Date(),
      costByModel: {}
    }
  }

  // Check if cost limit would be exceeded
  wouldExceedCostLimit(model: string, promptTokens: number, completionTokens: number, costLimit: number): boolean {
    const estimatedCost = this.estimateCost(model, promptTokens, completionTokens)
    return (this.costTracking.totalCost + estimatedCost.totalCost) > costLimit
  }

  // Get cost alerts based on thresholds
  getCostAlerts(warningThreshold: number = 0.8, criticalThreshold: number = 0.95): {
    warnings: string[]
    critical: string[]
  } {
    const warnings: string[] = []
    const critical: string[] = []

    // Check total cost against limits (assuming $10 daily limit for demo)
    const dailyLimit = 10.0
    const costRatio = this.costTracking.totalCost / dailyLimit

    if (costRatio >= criticalThreshold) {
      critical.push(`Daily cost limit (${dailyLimit}) exceeded: $${this.costTracking.totalCost.toFixed(2)}`)
    } else if (costRatio >= warningThreshold) {
      warnings.push(`Approaching daily cost limit: $${this.costTracking.totalCost.toFixed(2)} of $${dailyLimit}`)
    }

    return { warnings, critical }
  }

  // Check if we're in development environment
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NODE_ENV === 'development'
  }

  // Check if a model is free
  isFreeModel(model: string): boolean {
    return this.freeModels.includes(model)
  }

  // Enforce free models in development environment
  enforceFreeModel(model: string): string {
    if (this.isDevelopment() && !this.isFreeModel(model)) {
      console.warn(`Development environment: Forcing free model usage. Requested: ${model}, Using: ${this.freeModels[0]}`)
      return this.freeModels[0] // Use first free model as default
    }
    return model
  }

  // Get available models based on environment
  getAvailableModels(): string[] {
    if (this.isDevelopment()) {
      return [...this.freeModels]
    }
    // In production, return all models
    return Object.keys(this.modelPricing)
  }

  // Validate model selection for current environment
  validateModelForEnvironment(model: string): { isValid: boolean; enforcedModel?: string; message?: string } {
    if (this.isDevelopment() && !this.isFreeModel(model)) {
      return {
        isValid: false,
        enforcedModel: this.freeModels[0],
        message: `Development environment: Only free models are allowed. Using ${this.freeModels[0]} instead of ${model}.`
      }
    }
    return { isValid: true }
  }
}

export const openRouterAPI = new OpenRouterAPI()

// Helper function to generate conversation titles
export const generateConversationTitle = async (messages: OpenRouterMessage[]): Promise<string> => {
  try {
    // Only use the first few messages for context (user + assistant exchange)
    const contextMessages = messages.slice(0, 4)
    
    const titlePrompt: OpenRouterMessage[] = [
      {
        role: 'system',
        content: 'Generate a concise 3-5 word title for this conversation based on the main topic or question being discussed. Respond with only the title, no quotes or extra text.'
      },
      ...contextMessages,
      {
        role: 'user', 
        content: 'Based on our conversation above, what would be a good 3-5 word title?'
      }
    ]

    const response = await openRouterAPI.chatCompletion(
      titlePrompt,
      openRouterAPI.enforceFreeModel('gpt-3.5-turbo') // Use enforced model for title generation
    )

    const content = response.choices[0]?.message?.content
    const generatedTitle = typeof content === 'string' ? content.trim() : ''
    
    // Clean up the title and ensure it's reasonable length
    if (generatedTitle && generatedTitle.length > 0 && generatedTitle.length < 50) {
      // Remove quotes if present and capitalize first letter
      const cleanTitle = generatedTitle.replace(/^["']|["']$/g, '')
      return cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)
    }
    
    return 'New Chat' // Fallback
  } catch (error) {
    console.warn('Failed to generate conversation title:', error)
    return 'New Chat' // Fallback
  }
}