import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock the OpenRouter API
jest.mock('../../../../lib/openrouter', () => ({
  openRouterAPI: {
    getStoredApiKey: jest.fn(() => 'mock-api-key')
  }
}))

// Mock fetch for OpenRouter API calls
global.fetch = jest.fn()

describe('/api/smart-priority', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/smart-priority', () => {
    it('should determine priority successfully', async () => {
      const mockAnalysis = {
        priority: 'urgent',
        confidence: 0.9,
        reasoning: 'Contains urgent keywords and time-sensitive content'
      }

      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify(mockAnalysis)
          }
        }],
        model: 'anthropic/claude-3-haiku:beta',
        usage: {
          prompt_tokens: 120,
          completion_tokens: 60,
          total_tokens: 180
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const request = {
        json: async () => ({
          content: 'This is an urgent issue that needs immediate attention',
          title: 'Critical Bug Report',
          currentPriority: 'medium'
        }),
        headers: {
          get: jest.fn(() => 'http://localhost')
        }
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        priority: 'urgent',
        confidence: 0.9,
        reasoning: 'Contains urgent keywords and time-sensitive content',
        model: 'anthropic/claude-3-haiku:beta',
        usage: {
          prompt_tokens: 120,
          completion_tokens: 60,
          total_tokens: 180
        }
      })
    })

    it('should handle JSON parsing errors with fallback', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'urgent - this is critical' // Not valid JSON
          }
        }],
        model: 'anthropic/claude-3-haiku:beta'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const request = {
        json: async () => ({
          content: 'URGENT: Fix this immediately',
          title: 'Emergency'
        }),
        headers: {
          get: jest.fn(() => 'http://localhost')
        }
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(['low', 'medium', 'high', 'urgent']).toContain(data.priority)
      expect(typeof data.confidence).toBe('number')
      expect(typeof data.reasoning).toBe('string')
    })

    it('should validate required content parameter', async () => {
      const request = {
        json: async () => ({
          title: 'Test Title'
        }),
        headers: {
          get: jest.fn(() => 'http://localhost')
        }
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toMatchObject({
        error: 'Content is required and must be a string'
      })
    })

    it('should validate content length', async () => {
      const longContent = 'a'.repeat(10001)

      const request = {
        json: async () => ({
          content: longContent,
          title: 'Test Title'
        }),
        headers: {
          get: jest.fn(() => 'http://localhost')
        }
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toMatchObject({
        error: 'Content is too long. Maximum 10000 characters allowed.'
      })
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limit exceeded' } })
      })

      const request = {
        json: async () => ({
          content: 'Test content for priority analysis',
          title: 'Test Conversation'
        }),
        headers: {
          get: jest.fn(() => 'http://localhost')
        }
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data).toMatchObject({
        error: 'Failed to determine priority'
      })
    })

    it('should handle network errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'))

      const request = {
        json: async () => ({
          content: 'Test content',
          title: 'Test Title'
        }),
        headers: {
          get: jest.fn(() => 'http://localhost')
        }
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toMatchObject({
        error: 'Internal server error'
      })
    })

    it('should validate priority values', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              priority: 'invalid_priority',
              confidence: 0.8,
              reasoning: 'Test reasoning'
            })
          }
        }],
        model: 'anthropic/claude-3-haiku:beta'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const request = {
        json: async () => ({
          content: 'Test content',
          title: 'Test Title'
        }),
        headers: {
          get: jest.fn(() => 'http://localhost')
        }
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500) // Should fail due to invalid priority
    })

    it('should provide default confidence for invalid confidence values', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              priority: 'high',
              confidence: 'invalid', // Should be a number
              reasoning: 'Test reasoning'
            })
          }
        }],
        model: 'anthropic/claude-3-haiku:beta'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const request = {
        json: async () => ({
          content: 'Test content',
          title: 'Test Title'
        }),
        headers: {
          get: jest.fn(() => 'http://localhost')
        }
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.confidence).toBe(0.5) // Default value
    })

    it('should use keyword-based fallback for urgent content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'urgent priority detected' // Not valid JSON
          }
        }],
        model: 'anthropic/claude-3-haiku:beta'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const request = {
        json: async () => ({
          content: 'URGENT: This needs immediate attention ASAP',
          title: 'Emergency Issue'
        }),
        headers: {
          get: jest.fn(() => 'http://localhost')
        }
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.priority).toBe('urgent')
      expect(data.confidence).toBeGreaterThan(0.5)
    })
  })
})