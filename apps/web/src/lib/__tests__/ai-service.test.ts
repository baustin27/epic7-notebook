import { AIService } from '../ai-service'
import { providerFactory } from '../providers/factory'

// Mock the provider factory
jest.mock('../providers/factory', () => ({
  providerFactory: {
    getClient: jest.fn(),
    createClient: jest.fn(),
    getAvailableModels: jest.fn(),
    testProviderConnection: jest.fn(),
  }
}))

// Mock the database services
jest.mock('../database', () => ({
  conversationService: {
    getById: jest.fn(),
  },
  messageService: {
    getByConversationId: jest.fn(),
  }
}))

// Mock the model settings service
jest.mock('../modelSettingsService', () => ({
  ModelSettingsService: {
    getModelSettings: jest.fn(),
  }
}))

// Mock analytics service
jest.mock('../analyticsService', () => ({
  analyticsService: {
    trackModelPerformance: jest.fn(),
  }
}))

describe('AIService', () => {
  let aiService: AIService

  beforeEach(() => {
    aiService = new AIService()
    jest.clearAllMocks()
  })

  describe('getProviderFromModel', () => {
    it('should identify OpenAI models', () => {
      expect(aiService['getProviderFromModel']('gpt-4')).toBe('openai')
      expect(aiService['getProviderFromModel']('gpt-3.5-turbo')).toBe('openai')
      expect(aiService['getProviderFromModel']('openai/gpt-4')).toBe('openai')
    })

    it('should identify Anthropic models', () => {
      expect(aiService['getProviderFromModel']('claude-3')).toBe('anthropic')
      expect(aiService['getProviderFromModel']('claude-3-sonnet')).toBe('anthropic')
      expect(aiService['getProviderFromModel']('anthropic/claude')).toBe('anthropic')
    })

    it('should identify Google models', () => {
      expect(aiService['getProviderFromModel']('gemini-1.5')).toBe('google')
      expect(aiService['getProviderFromModel']('google/gemini')).toBe('google')
    })

    it('should identify xAI models', () => {
      expect(aiService['getProviderFromModel']('grok')).toBe('xai')
      expect(aiService['getProviderFromModel']('xai/grok')).toBe('xai')
    })

    it('should default to OpenRouter for unknown models', () => {
      expect(aiService['getProviderFromModel']('unknown-model')).toBe('openrouter')
      expect(aiService['getProviderFromModel']('some-random-model')).toBe('openrouter')
    })
  })

  describe('getClient', () => {
    it('should return existing client if available', () => {
      const mockClient = { testConnection: jest.fn() }
      ;(providerFactory.getClient as jest.Mock).mockReturnValue(mockClient)

      const client = aiService['getClient']('openai')
      expect(client).toBe(mockClient)
      expect(providerFactory.getClient).toHaveBeenCalledWith('openai')
    })

    it('should create new client if not available', () => {
      const mockClient = { testConnection: jest.fn() }
      ;(providerFactory.getClient as jest.Mock).mockReturnValue(null)
      ;(providerFactory.createClient as jest.Mock).mockReturnValue(mockClient)

      const client = aiService['getClient']('openai')
      expect(client).toBe(mockClient)
      expect(providerFactory.createClient).toHaveBeenCalledWith('openai', {
        id: 'openai',
        name: 'Openai',
        type: 'openai',
        isConfigured: false,
        models: []
      })
    })
  })

  describe('getAvailableModels', () => {
    it('should return models from provider factory', async () => {
      const mockModels = [
        { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
        { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic' }
      ]
      ;(providerFactory.getAvailableModels as jest.Mock).mockResolvedValue(mockModels)

      const models = await aiService.getAvailableModels()
      expect(models).toEqual([
        { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
        { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic' }
      ])
    })

    it('should handle provider factory errors', async () => {
      ;(providerFactory.getAvailableModels as jest.Mock).mockRejectedValue(new Error('API Error'))

      const models = await aiService.getAvailableModels()
      expect(models).toEqual([])
    })
  })

  describe('isConfigured', () => {
    it('should return true when any provider has API key', async () => {
      const mockClient = {
        getStoredApiKey: jest.fn().mockResolvedValue('test-key')
      }
      ;(providerFactory.getClient as jest.Mock).mockReturnValue(mockClient)

      const result = await aiService.isConfigured()
      expect(result).toBe(true)
    })

    it('should return false when no providers have API keys', async () => {
      const mockClient = {
        getStoredApiKey: jest.fn().mockResolvedValue(null)
      }
      ;(providerFactory.getClient as jest.Mock).mockReturnValue(mockClient)

      const result = await aiService.isConfigured()
      expect(result).toBe(false)
    })

    it('should handle provider errors gracefully', async () => {
      ;(providerFactory.getClient as jest.Mock).mockReturnValue(null)

      const result = await aiService.isConfigured()
      expect(result).toBe(false)
    })
  })

  describe('processMessage', () => {
    const mockConversation = { id: 'conv-1', user_id: 'user-1' }
    const mockMessages = [
      { id: 'msg-1', role: 'user', content: 'Hello', conversation_id: 'conv-1', created_at: '2024-01-01T00:00:00Z', metadata: null },
      { id: 'msg-2', role: 'assistant', content: 'Hi there!', conversation_id: 'conv-1', created_at: '2024-01-01T00:00:01Z', metadata: null }
    ]

    beforeEach(() => {
      // Setup mocks
      require('../database').conversationService.getById.mockResolvedValue(mockConversation)
      require('../database').messageService.getByConversationId.mockResolvedValue(mockMessages)
      require('../modelSettingsService').ModelSettingsService.getModelSettings.mockResolvedValue(null)
      require('../analyticsService').analyticsService.trackModelPerformance.mockResolvedValue(undefined)
    })

    it('should process message with OpenAI provider', async () => {
      const mockClient = {
        chatCompletion: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'OpenAI response' } }]
        })
      }
      ;(providerFactory.getClient as jest.Mock).mockReturnValue(mockClient)

      const result = await aiService.processMessage('conv-1', 'Test message', { model: 'gpt-4' })

      expect(result).toBe('OpenAI response')
      expect(mockClient.chatCompletion).toHaveBeenCalled()
    })

    it('should process message with Anthropic provider', async () => {
      const mockClient = {
        chatCompletion: jest.fn().mockResolvedValue({
          content: [{ text: 'Anthropic response' }]
        })
      }
      ;(providerFactory.getClient as jest.Mock).mockReturnValue(mockClient)

      const result = await aiService.processMessage('conv-1', 'Test message', { model: 'claude-3', provider: 'anthropic' })

      expect(result).toBe('Anthropic response')
      expect(mockClient.chatCompletion).toHaveBeenCalled()
    })

    it('should handle streaming responses', async () => {
      const mockClient = {
        chatCompletion: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Streaming response' } }]
        })
      }
      ;(providerFactory.getClient as jest.Mock).mockReturnValue(mockClient)

      const onStream = jest.fn()
      await aiService.processMessage('conv-1', 'Test message', {
        model: 'gpt-4',
        onStream
      })

      expect(onStream).toHaveBeenCalledWith({
        content: 'Streaming response',
        isComplete: true
      })
    })

    it('should throw error for non-existent conversation', async () => {
      require('../database').conversationService.getById.mockResolvedValue(null)

      await expect(aiService.processMessage('nonexistent', 'Test message')).rejects.toThrow('Conversation not found')
    })
  })
})