import { semanticSearchService } from '../database'
import { supabase } from '../supabase'

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        ilike: jest.fn(() => ({
          limit: jest.fn(() => ({
            order: jest.fn()
          }))
        })),
        eq: jest.fn(() => ({
          single: jest.fn(),
          limit: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      })),
      rpc: jest.fn()
    })),
    auth: {
      getUser: jest.fn()
    }
  }
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe('Semantic Search Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('searchConversations', () => {
    it('should perform semantic search successfully', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3]
      const mockRpcResponse = {
        data: [
          {
            id: 'conv-1',
            title: 'Test Conversation',
            similarity: 0.85,
            category: 'general_discussion',
            tags: ['test']
          }
        ],
        error: null
      }

      // Mock the embedding API call
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding })
      })

      // Mock the RPC call
      ;(supabase.rpc as jest.Mock).mockResolvedValueOnce(mockRpcResponse)

      const result = await semanticSearchService.searchConversations({
        query: 'test query',
        limit: 10,
        threshold: 0.1
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'conv-1',
        title: 'Test Conversation',
        similarity: 0.85,
        category: 'general_discussion',
        tags: ['test']
      })
    })

    it('should fallback to keyword search on semantic search failure', async () => {
      const mockSupabaseResponse = {
        data: [
          {
            id: 'conv-1',
            title: 'Test Conversation',
            category: 'general_discussion',
            tags: ['test']
          }
        ],
        error: null
      }

      // Mock embedding API to fail
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      // Mock the fallback keyword search
      const mockQuery = {
        select: jest.fn(() => ({
          ilike: jest.fn(() => ({
            limit: jest.fn(() => mockSupabaseResponse)
          }))
        }))
      }
      ;(supabase.from as jest.Mock).mockReturnValueOnce(mockQuery)

      const result = await semanticSearchService.searchConversations({
        query: 'test query'
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'conv-1',
        title: 'Test Conversation',
        similarity: 0.5, // Default similarity for keyword matches
        category: 'general_discussion',
        tags: ['test']
      })
    })
  })

  describe('generateConversationEmbedding', () => {
    it('should generate embedding for conversation', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3]
      const conversationId = 'conv-1'

      // Mock conversation and messages fetch
      const mockConversationQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { id: conversationId, title: 'Test Conversation' },
              error: null
            }))
          }))
        }))
      }

      const mockMessagesQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [
                { content: 'Hello', role: 'user' },
                { content: 'Hi there!', role: 'assistant' }
              ],
              error: null
            }))
          }))
        }))
      }

      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce(mockConversationQuery)
        .mockReturnValueOnce(mockMessagesQuery)

      // Mock embedding API
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding })
      })

      // Mock update
      const mockUpdate = {
        update: jest.fn(() => ({
          eq: jest.fn()
        }))
      }
      ;(supabase.from as jest.Mock).mockReturnValueOnce(mockUpdate)

      const result = await semanticSearchService.generateConversationEmbedding(conversationId)

      expect(result).toEqual(mockEmbedding)
      expect(global.fetch).toHaveBeenCalledWith('/api/embeddings', expect.any(Object))
    })

    it('should throw error for non-existent conversation', async () => {
      const mockConversationQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'Not found' }
            }))
          }))
        }))
      }

      ;(supabase.from as jest.Mock).mockReturnValueOnce(mockConversationQuery)

      await expect(
        semanticSearchService.generateConversationEmbedding('non-existent')
      ).rejects.toThrow('Conversation not found')
    })
  })

  describe('getRelatedConversations', () => {
    it('should return related conversations', async () => {
      const conversationId = 'conv-1'
      const mockEmbedding = [0.1, 0.2, 0.3]

      // Mock getting conversation embedding
      const mockConversationQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { embedding: mockEmbedding },
              error: null
            }))
          }))
        }))
      }

      // Mock RPC for related conversations
      const mockRpcResponse = {
        data: [
          {
            id: 'conv-2',
            title: 'Related Conversation',
            similarity: 0.75,
            category: 'bug_fix',
            tags: ['bug']
          }
        ],
        error: null
      }

      ;(supabase.from as jest.Mock).mockReturnValueOnce(mockConversationQuery)
      ;(supabase.rpc as jest.Mock).mockResolvedValueOnce(mockRpcResponse)

      const result = await semanticSearchService.getRelatedConversations(conversationId, 5)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'conv-2',
        title: 'Related Conversation',
        similarity: 0.75,
        category: 'bug_fix',
        tags: ['bug']
      })
    })

    it('should generate embedding if not exists', async () => {
      const conversationId = 'conv-1'
      const mockEmbedding = [0.1, 0.2, 0.3]

      // Mock conversation without embedding
      const mockConversationQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { embedding: null },
              error: null
            }))
          }))
        }))
      }

      // Mock embedding generation
      const mockUpdate = {
        update: jest.fn(() => ({
          eq: jest.fn()
        }))
      }

      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce(mockConversationQuery)
        .mockReturnValueOnce(mockConversationQuery) // For messages
        .mockReturnValueOnce(mockUpdate)

      // Mock embedding API
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding })
      })

      // Mock RPC for related conversations
      ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await semanticSearchService.getRelatedConversations(conversationId, 5)

      expect(global.fetch).toHaveBeenCalledWith('/api/embeddings', expect.any(Object))
      expect(result).toHaveLength(0)
    })
  })
})