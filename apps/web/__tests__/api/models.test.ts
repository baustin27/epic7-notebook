import { NextRequest } from 'next/server'
import { GET } from '../../src/app/api/models/route'

// Mock the provider factory
jest.mock('../../../src/lib/providers/factory', () => ({
  providerFactory: {
    getAvailableModels: jest.fn()
  }
}))

import { providerFactory } from '../../src/lib/providers/factory'

const mockGetAvailableModels = providerFactory.getAvailableModels as jest.MockedFunction<typeof providerFactory.getAvailableModels>

describe('/api/models', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return models from provider factory with metadata', async () => {
      const mockModels = [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          provider: 'OpenAI',
          pricing: { prompt: '$0.03', completion: '$0.06' },
          contextLength: 8192
        },
        {
          id: 'claude-3-opus',
          name: 'Claude 3 Opus',
          provider: 'Anthropic',
          pricing: { prompt: '$0.015', completion: '$0.075' },
          context_length: 200000
        }
      ]

      mockGetAvailableModels.mockResolvedValue(mockModels)

      const request = new NextRequest('http://localhost:3000/api/models')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        models: mockModels,
        totalCount: 2,
        providersCount: 2
      })
      expect(mockGetAvailableModels).toHaveBeenCalledTimes(1)
    })

    it('should return fallback models when no providers are configured', async () => {
      mockGetAvailableModels.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/models')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.models).toEqual([
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: 'Default'
        }
      ])
      expect(data.totalCount).toBe(1)
      expect(data.providersCount).toBe(1)
    })

    it('should handle provider factory errors gracefully', async () => {
      mockGetAvailableModels.mockRejectedValue(new Error('Provider factory error'))

      const request = new NextRequest('http://localhost:3000/api/models')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200) // Returns 200 with fallback instead of error
      expect(data.error).toBe('Failed to fetch models')
      expect(data.models).toEqual([
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: 'Default'
        }
      ])
    })

    it('should return correct provider count for multiple providers', async () => {
      const mockModels = [
        { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
        { id: 'gpt-3.5', name: 'GPT-3.5', provider: 'OpenAI' },
        { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic' },
        { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' }
      ]

      mockGetAvailableModels.mockResolvedValue(mockModels)

      const request = new NextRequest('http://localhost:3000/api/models')
      const response = await GET(request)
      const data = await response.json()

      expect(data.totalCount).toBe(4)
      expect(data.providersCount).toBe(3) // OpenAI, Anthropic, Google
    })

    it('should include pricing and context length in response when available', async () => {
      const mockModels = [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          provider: 'OpenAI',
          pricing: { prompt: '$0.03', completion: '$0.06' },
          context_length: 8192
        },
        {
          id: 'claude-3',
          name: 'Claude 3',
          provider: 'Anthropic'
          // No pricing or context length
        }
      ]

      mockGetAvailableModels.mockResolvedValue(mockModels)

      const request = new NextRequest('http://localhost:3000/api/models')
      const response = await GET(request)
      const data = await response.json()

      expect(data.models[0]).toHaveProperty('pricing')
      expect(data.models[0]).toHaveProperty('contextLength')
      expect(data.models[1]).not.toHaveProperty('pricing')
      expect(data.models[1]).not.toHaveProperty('contextLength')
    })
  })
})

// Integration test with multiple provider keys
describe('/api/models integration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should fetch models from multiple providers when keys are set', async () => {
    // Set multiple provider keys
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
    process.env.GOOGLE_AI_API_KEY = 'test-google-key'

    // Mock the factory to return models from multiple providers
    const mockModels = [
      { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
      { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic' },
      { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' }
    ]

    mockGetAvailableModels.mockResolvedValue(mockModels)

    const request = new NextRequest('http://localhost:3000/api/models')
    const response = await GET(request)
    const data = await response.json()

    expect(data.models.length).toBeGreaterThanOrEqual(2)
    expect(data.providersCount).toBeGreaterThanOrEqual(2)
    expect(mockGetAvailableModels).toHaveBeenCalledTimes(1)
  })

  it('should handle partial provider failures gracefully', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'

    // Mock factory to simulate partial failure
    const mockModels = [
      { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' }
      // Anthropic models failed to load
    ]

    mockGetAvailableModels.mockResolvedValue(mockModels)

    const request = new NextRequest('http://localhost:3000/api/models')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.models.length).toBe(1)
    expect(data.models[0].provider).toBe('OpenAI')
  })
})