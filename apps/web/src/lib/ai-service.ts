import { openRouterAPI, OpenRouterMessage } from './openrouter'
import { conversationService, messageService } from './database'
import { ModelSettingsService } from './modelSettingsService'
import { analyticsService } from './analyticsService'
import { providerFactory, getMonitoredClient } from './providers/factory'
import { useFeatureFlag } from '../hooks/useFeatureFlags'
import { FeatureDisabledError } from './monitoring/provider-monitor'
import type { ModelSettings } from '../types/modelSettings'
import type { ProviderType } from '../types/providers'

export interface StreamingResponse {
  content: string
  isComplete: boolean
}

export interface AIServiceOptions {
  model?: string
  provider?: ProviderType
  onStream?: (response: StreamingResponse) => void
  signal?: AbortSignal
  assistantMessageId?: string
}

/**
 * AI Service abstraction layer for handling AI interactions
 * Separates AI logic from UI components for better maintainability
 */
export class AIService {
  private defaultModel = 'gpt-3.5-turbo'

  /**
   * Determine provider type from model ID
   */
  private getProviderFromModel(modelId: string): ProviderType {
    if (modelId.includes('gpt') || modelId.includes('openai')) {
      return 'openai'
    }
    if (modelId.includes('claude') || modelId.includes('anthropic')) {
      return 'anthropic'
    }
    if (modelId.includes('gemini') || modelId.includes('google')) {
      return 'google'
    }
    if (modelId.includes('grok') || modelId.includes('xai')) {
      return 'xai'
    }
    // Default to OpenRouter for backward compatibility
    return 'openrouter'
  }

  /**
   * Get the appropriate monitored API client for a provider
   */
  private getClient(provider: ProviderType) {
    // Use monitored client for chat feature
    return getMonitoredClient(provider, 'chat')
  }

  /**
   * Process a user message and generate AI response
   * Handles conversation context and streaming
   */
  async processMessage(
     conversationId: string,
     userMessage: string,
     options: AIServiceOptions = {}
   ): Promise<string> {
     const { model = this.defaultModel, provider, onStream, signal, assistantMessageId } = options
     const providerType = provider || this.getProviderFromModel(model)
    const startTime = Date.now()
  
    // Get conversation to find user ID for analytics
    const conversation = await conversationService.getById(conversationId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }
  
    // Get model settings for the selected model
    let modelSettings: ModelSettings | undefined
    try {
      modelSettings = await ModelSettingsService.getModelSettings(model)
    } catch (error) {
      console.warn('Failed to load model settings, using defaults:', error)
    }
  
    // Get conversation context
    const conversationMessages = await messageService.getByConversationId(conversationId)
  
    // Prepare messages for API
    const apiMessages: OpenRouterMessage[] = conversationMessages.map(msg => {
      // Check if message has image metadata for vision models
      if (msg.metadata && typeof msg.metadata === 'object' && 'image' in msg.metadata) {
        const imageData = (msg.metadata as any).image
        // Use base64 data if available (preferred for vision models), otherwise fallback to URL
        const imageUrl = imageData.base64 || imageData.url
        return {
          role: msg.role as 'user' | 'assistant' | 'system',
          content: [
            {
              type: 'text' as const,
              text: msg.content
            },
            {
              type: 'image_url' as const,
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      }
  
      return {
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }
    })
  
    let fullResponse = ''
    let success = true
    let errorMessage: string | undefined
  
    try {
      // Get the appropriate client for this provider
      const client = this.getClient(providerType)
  
      // Call AI API with streaming support
      await client.chatCompletion(
        apiMessages,
        model,
        onStream ? async (chunk) => {
          // Handle different response formats from different providers
          let content = ''
          if (providerType === 'openrouter' || providerType === 'openai' || providerType === 'xai') {
            content = chunk.choices[0]?.delta?.content || ''
          } else if (providerType === 'anthropic') {
            content = chunk.delta?.text || ''
          } else if (providerType === 'google') {
            content = chunk.candidates?.[0]?.content?.parts?.[0]?.text || ''
          }
  
          if (content) {
            fullResponse += content
            onStream({
              content: fullResponse,
              isComplete: false
            })
  
            // Incremental update to database if assistantMessageId provided
            if (assistantMessageId) {
              try {
                await messageService.update(assistantMessageId, { content: fullResponse })
              } catch (updateError) {
                console.error('Failed to update streaming message:', updateError)
              }
            }
          }
        } : undefined,
        signal,
        modelSettings
      )
    } catch (error) {
      success = false
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw error
    } finally {
      // Track model performance
      const responseTime = Date.now() - startTime
  
      // Extract token usage from response metadata if available
      let promptTokens: number | undefined
      let completionTokens: number | undefined
      let totalTokens: number | undefined
  
      // Note: Token usage would typically come from the API response
      // For now, we'll estimate based on character counts
      if (apiMessages.length > 0) {
        const promptText = apiMessages.map(msg =>
          typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        ).join(' ')
        promptTokens = Math.ceil(promptText.length / 4) // Rough estimation
      }
  
      if (fullResponse) {
        completionTokens = Math.ceil(fullResponse.length / 4) // Rough estimation
        totalTokens = (promptTokens || 0) + completionTokens
      }
  
      await analyticsService.trackModelPerformance(conversation.user_id, conversationId, model, {
        promptTokens,
        completionTokens,
        totalTokens,
        responseTimeMs: responseTime,
        costCents: 0, // Would need to be calculated based on model pricing
        success,
        errorMessage
      })
    }
  
    // Final callback with complete response
    if (onStream) {
      onStream({
        content: fullResponse,
        isComplete: true
      })
    }
  
    return fullResponse
   }

  /**
   * Generate a conversation title based on messages
   */
  async generateTitle(conversationId: string): Promise<string> {
    const messages = await messageService.getByConversationId(conversationId)
    
    // Only generate title if we have both user and assistant messages
    if (messages.length < 2) {
      return 'New Chat'
    }

    const apiMessages: OpenRouterMessage[] = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }))

    const titlePrompt: OpenRouterMessage[] = [
      {
        role: 'system',
        content: 'Generate a concise 3-5 word title for this conversation based on the main topic or question being discussed. Respond with only the title, no quotes or extra text.'
      },
      ...apiMessages.slice(0, 4), // Use first few messages for context
      {
        role: 'user', 
        content: 'Based on our conversation above, what would be a good 3-5 word title?'
      }
    ]

    try {
      const client = this.getClient('openrouter') // Use OpenRouter for title generation
      const response = await client.chatCompletion(titlePrompt, this.defaultModel)
      const content = response.choices[0]?.message?.content
      const generatedTitle = typeof content === 'string' ? content.trim() : ''
      
      if (generatedTitle && generatedTitle.length > 0 && generatedTitle.length < 50) {
        // Clean up the title and capitalize first letter
        const cleanTitle = generatedTitle.replace(/^["']|["']$/g, '')
        return cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)
      }
    } catch (error) {
      console.warn('Failed to generate conversation title:', error)
    }
    
    return 'New Chat'
  }

  /**
   * Validate message content before processing
   */
  validateMessage(content: string): { valid: boolean; error?: string } {
    const trimmed = content.trim()
    
    if (!trimmed) {
      return { valid: false, error: 'Message cannot be empty' }
    }

    if (trimmed.length > 2000) {
      return { valid: false, error: 'Message is too long (max 2000 characters)' }
    }

    // Additional validations can be added here
    // - Check for inappropriate content
    // - Rate limiting checks
    // - User permissions

    return { valid: true }
  }

  /**
   * Check if AI service is properly configured
   */
  async isConfigured(): Promise<boolean> {
    try {
      // Check if any provider has an API key configured
      const providers = ['openrouter', 'openai', 'anthropic', 'google', 'xai'] as const
      for (const provider of providers) {
        const client = this.getClient(provider)
        const apiKey = await client.getStoredApiKey()
        if (apiKey) return true
      }
      return false
    } catch {
      return false
    }
  }

  /**
   * Get available models for the current user
   */
  async getAvailableModels(): Promise<any[]> {
    try {
      const allModels = await providerFactory.getAvailableModels()
      return allModels.map(model => ({
        id: model.id,
        name: model.name,
        provider: model.provider
      }))
    } catch (error) {
      console.warn('Failed to fetch available models:', error)
      return []
    }
  }
}

export const aiService = new AIService()