import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock the semantic search service
jest.mock('../../../../lib/database', () => ({
  semanticSearchService: {
    searchConversations: jest.fn(),
    searchMessages: jest.fn()
  }
}))

import { semanticSearchService } from '../../../../lib/database'

describe('/api/search', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/search', () => {
    it('should perform conversation search successfully', async () => {
      const mockResults = [
        {
          id: 'conv-1',
          title: 'Test Conversation',
          similarity: 0.85,
          category: 'general_discussion',
          tags: ['test']
        }
      ]

      ;(semanticSearchService.searchConversations as jest.Mock).mockResolvedValueOnce(mockResults)

      const request = {
        json: async () => ({
          query: 'test query',
          type: 'conversations',
          limit: 10
        })
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        results: mockResults,
        total: 1,
        query: 'test query',
        searchType: 'conversations'
      })
      expect(semanticSearchService.searchConversations).toHaveBeenCalledWith({
        query: 'test query',
        limit: 10,
        threshold: 0.1
      })
    })

    it('should perform all types search successfully', async () => {
      const mockConversationResults = [
        {
          id: 'conv-1',
          title: 'Test Conversation',
          similarity: 0.85,
          category: 'general_discussion',
          tags: ['test']
        }
      ]

      const mockMessageResults = [
        {
          id: 'msg-1',
          content: 'Test message',
          similarity: 0.75
        }
      ]

      ;(semanticSearchService.searchConversations as jest.Mock).mockResolvedValueOnce(mockConversationResults)
      ;(semanticSearchService.searchMessages as jest.Mock).mockResolvedValueOnce(mockMessageResults)

      const request = {
        json: async () => ({
          query: 'test query',
          type: 'all',
          limit: 10
        })
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(2)
      expect(data.results[0]).toMatchObject({
        id: 'conv-1',
        title: 'Test Conversation',
        similarity: 0.85,
        type: 'conversation'
      })
      expect(data.results[1]).toMatchObject({
        id: 'msg-1',
        content: 'Test message',
        similarity: 0.75,
        type: 'message'
      })
    })

    it('should handle search errors gracefully', async () => {
      ;(semanticSearchService.searchConversations as jest.Mock).mockRejectedValueOnce(
        new Error('Search failed')
      )

      const request = {
        json: async () => ({
          query: 'test query',
          type: 'conversations'
        })
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toMatchObject({
        error: 'Internal server error',
        details: 'Search failed'
      })
    })

    it('should validate required query parameter', async () => {
      const request = {
        json: async () => ({
          type: 'conversations'
        })
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toMatchObject({
        error: 'Query is required and must be a string'
      })
    })

    it('should validate query length', async () => {
      const longQuery = 'a'.repeat(1001)

      const request = {
        json: async () => ({
          query: longQuery
        })
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toMatchObject({
        error: 'Query is too long. Maximum 1000 characters allowed.'
      })
    })
  })

  describe('GET /api/search', () => {
    it('should handle simple keyword search via GET', async () => {
      const mockResults = [
        {
          id: 'conv-1',
          title: 'Test Conversation',
          similarity: 0.85,
          category: 'general_discussion',
          tags: ['test']
        }
      ]

      ;(semanticSearchService.searchConversations as jest.Mock).mockResolvedValueOnce(mockResults)

      const request = {
        url: 'http://localhost/api/search?q=test+query&type=conversations&limit=5',
        nextUrl: new URL('http://localhost/api/search?q=test+query&type=conversations&limit=5')
      } as NextRequest

      // Mock URL.searchParams
      Object.defineProperty(request, 'url', {
        value: 'http://localhost/api/search?q=test+query&type=conversations&limit=5'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        results: mockResults,
        total: 1,
        query: 'test query',
        searchType: 'conversations'
      })
    })

    it('should require query parameter for GET requests', async () => {
      const request = {
        url: 'http://localhost/api/search',
        nextUrl: new URL('http://localhost/api/search')
      } as NextRequest

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toMatchObject({
        error: 'Query parameter "q" is required'
      })
    })
  })
})