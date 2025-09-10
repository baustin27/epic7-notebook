import { providerFactory } from '../factory'
import { openaiClient } from '../openai'
import { anthropicClient } from '../anthropic'
import { googleClient } from '../google'
import { xaiClient } from '../xai'
import { openRouterAPI } from '../../openrouter'

// Mock the clients
jest.mock('../openai', () => ({
  openaiClient: {
    getModels: jest.fn(),
    chatCompletion: jest.fn(),
    testConnection: jest.fn(),
    setApiKey: jest.fn(),
    getStoredApiKey: jest.fn(),
  }
}))

jest.mock('../anthropic', () => ({
  anthropicClient: {
    getModels: jest.fn(),
    chatCompletion: jest.fn(),
    testConnection: jest.fn(),
    setApiKey: jest.fn(),
    getStoredApiKey: jest.fn(),
  }
}))

jest.mock('../google', () => ({
  googleClient: {
    getModels: jest.fn(),
    chatCompletion: jest.fn(),
    testConnection: jest.fn(),
    setApiKey: jest.fn(),
    getStoredApiKey: jest.fn(),
  }
}))

jest.mock('../xai', () => ({
  xaiClient: {
    getModels: jest.fn(),
    chatCompletion: jest.fn(),
    testConnection: jest.fn(),
    setApiKey: jest.fn(),
    getStoredApiKey: jest.fn(),
  }
}))

jest.mock('../../openrouter', () => ({
  openRouterAPI: {
    getModels: jest.fn(),
    chatCompletion: jest.fn(),
    testConnection: jest.fn(),
    setApiKey: jest.fn(),
    getStoredApiKey: jest.fn(),
  }
}))

describe('ProviderFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createClient', () => {
    it('should create OpenRouter client', () => {
      const client = providerFactory.createClient('openrouter', {
        id: 'openrouter',
        name: 'OpenRouter',
        type: 'openrouter',
        isConfigured: false,
        models: []
      })

      expect(client).toBeDefined()
    })

    it('should create OpenAI client', () => {
      const client = providerFactory.createClient('openai', {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        isConfigured: false,
        models: []
      })

      expect(client).toBe(openaiClient)
    })

    it('should create Anthropic client', () => {
      const client = providerFactory.createClient('anthropic', {
        id: 'anthropic',
        name: 'Anthropic',
        type: 'anthropic',
        isConfigured: false,
        models: []
      })

      expect(client).toBe(anthropicClient)
    })

    it('should create Google client', () => {
      const client = providerFactory.createClient('google', {
        id: 'google',
        name: 'Google',
        type: 'google',
        isConfigured: false,
        models: []
      })

      expect(client).toBe(googleClient)
    })

    it('should create xAI client', () => {
      const client = providerFactory.createClient('xai', {
        id: 'xai',
        name: 'xAI',
        type: 'xai',
        isConfigured: false,
        models: []
      })

      expect(client).toBe(xaiClient)
    })

    it('should throw error for unknown provider type', () => {
      expect(() => {
        providerFactory.createClient('unknown' as any, {
          id: 'unknown',
          name: 'Unknown',
          type: 'unknown' as any,
          isConfigured: false,
          models: []
        })
      }).toThrow('Unknown provider type: unknown')
    })
  })

  describe('getClient', () => {
    it('should return null for non-existent client', () => {
      const client = providerFactory.getClient('nonexistent')
      expect(client).toBeNull()
    })

    it('should return client after creation', () => {
      providerFactory.createClient('openai', {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        isConfigured: false,
        models: []
      })

      const client = providerFactory.getClient('openai')
      expect(client).toBe(openaiClient)
    })
  })

  describe('getAvailableModels', () => {
    it('should aggregate models from all providers', async () => {
      // Mock successful responses
      ;(openaiClient.getModels as jest.Mock).mockResolvedValue([
        { id: 'gpt-4', name: 'GPT-4', description: 'OpenAI GPT-4' }
      ])
      ;(anthropicClient.getModels as jest.Mock).mockResolvedValue([
        { id: 'claude-3', name: 'Claude 3', description: 'Anthropic Claude 3' }
      ])
      ;(googleClient.getModels as jest.Mock).mockRejectedValue(new Error('API Error'))
      ;(xaiClient.getModels as jest.Mock).mockResolvedValue([
        { id: 'grok', name: 'Grok', description: 'xAI Grok' }
      ])
      ;(openRouterAPI.getModels as jest.Mock).mockResolvedValue({
        data: [{ id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }]
      })

      const models = await providerFactory.getAvailableModels()

      expect(models).toEqual([
        { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
        { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic' },
        { id: 'grok', name: 'Grok', provider: 'xAI' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenRouter' }
      ])
    })

    it('should handle provider errors gracefully', async () => {
      // Mock all providers to fail
      ;(openaiClient.getModels as jest.Mock).mockRejectedValue(new Error('API Error'))
      ;(anthropicClient.getModels as jest.Mock).mockRejectedValue(new Error('API Error'))
      ;(googleClient.getModels as jest.Mock).mockRejectedValue(new Error('API Error'))
      ;(xaiClient.getModels as jest.Mock).mockRejectedValue(new Error('API Error'))
      ;(openRouterAPI.getModels as jest.Mock).mockRejectedValue(new Error('API Error'))

      const models = await providerFactory.getAvailableModels()

      expect(models).toEqual([])
    })
  })

  describe('testProviderConnection', () => {
    it('should return true when client exists and connection succeeds', async () => {
      providerFactory.createClient('openai', {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        isConfigured: false,
        models: []
      })

      ;(openaiClient.testConnection as jest.Mock).mockResolvedValue(true)

      const result = await providerFactory.testProviderConnection('openai')
      expect(result).toBe(true)
    })

    it('should return false when client does not exist', async () => {
      const result = await providerFactory.testProviderConnection('nonexistent')
      expect(result).toBe(false)
    })

    it('should return false when connection fails', async () => {
      providerFactory.createClient('openai', {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        isConfigured: false,
        models: []
      })

      ;(openaiClient.testConnection as jest.Mock).mockRejectedValue(new Error('Connection failed'))

      const result = await providerFactory.testProviderConnection('openai')
      expect(result).toBe(false)
    })
  })
})