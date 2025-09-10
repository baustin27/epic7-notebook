import { conversationService, semanticSearchService } from '../database'
import { supabase } from '../supabase'

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            data: [],
            error: null
          }))
        })),
        order: jest.fn(() => ({
          data: [],
          error: null
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      rpc: jest.fn()
    })),
    auth: {
      getUser: jest.fn(() => ({
        data: { user: { id: 'user-1' } },
        error: null
      }))
    }
  }
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe('Smart Conversation Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Conversation Service - Archive/Unarchive', () => {
    it('should archive a conversation successfully', async () => {
      const mockUpdate = {
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: {
                  id: 'conv-1',
                  title: 'Test Conversation',
                  archived: true,
                  archived_at: '2025-01-01T00:00:00Z'
                },
                error: null
              }))
            }))
          }))
        }))
      }

      ;(supabase.from as jest.Mock).mockReturnValueOnce(mockUpdate)

      const result = await conversationService.archive('conv-1')

      expect(result.archived).toBe(true)
      expect(result.archived_at).toBeDefined()
    })

    it('should unarchive a conversation successfully', async () => {
      const mockUpdate = {
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: {
                  id: 'conv-1',
                  title: 'Test Conversation',
                  archived: false,
                  archived_at: null
                },
                error: null
              }))
            }))
          }))
        }))
      }

      ;(supabase.from as jest.Mock).mockReturnValueOnce(mockUpdate)

      const result = await conversationService.unarchive('conv-1')

      expect(result.archived).toBe(false)
      expect(result.archived_at).toBeNull()
    })

    it('should get archived conversations', async () => {
      const mockArchivedConversations = [
        {
          id: 'conv-1',
          title: 'Archived Conversation 1',
          archived_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'conv-2',
          title: 'Archived Conversation 2',
          archived_at: '2025-01-02T00:00:00Z'
        }
      ]

      const mockQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: mockArchivedConversations,
              error: null
            }))
          }))
        }))
      }

      ;(supabase.from as jest.Mock).mockReturnValueOnce(mockQuery)

      const result = await conversationService.getArchived()

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Archived Conversation 1')
      expect(result[1].title).toBe('Archived Conversation 2')
    })
  })

  describe('Conversation Service - Priority Management', () => {
    it('should update conversation priority', async () => {
      const mockUpdate = {
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: {
                  id: 'conv-1',
                  title: 'Test Conversation',
                  priority: 'high'
                },
                error: null
              }))
            }))
          }))
        }))
      }

      ;(supabase.from as jest.Mock).mockReturnValueOnce(mockUpdate)

      const result = await conversationService.updatePriority('conv-1', 'high')

      expect(result.priority).toBe('high')
    })

    it('should get conversations by priority', async () => {
      const mockHighPriorityConversations = [
        {
          id: 'conv-1',
          title: 'High Priority Conversation',
          priority: 'high'
        }
      ]

      const mockQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                data: mockHighPriorityConversations,
                error: null
              }))
            }))
          }))
        }))
      }

      ;(supabase.from as jest.Mock).mockReturnValueOnce(mockQuery)

      const result = await conversationService.getByPriority('high')

      expect(result).toHaveLength(1)
      expect(result[0].priority).toBe('high')
    })
  })

  describe('Semantic Search Service - AI Tagging', () => {
    it('should generate conversation tags successfully', async () => {
      const conversationId = 'conv-1'
      const mockTags = ['machine-learning', 'tutorial', 'python']

      // Mock conversation and messages fetch
      const mockConversationQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { id: conversationId, title: 'ML Tutorial' },
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
                { content: 'How to use machine learning', role: 'user' },
                { content: 'Here is a Python tutorial', role: 'assistant' }
              ],
              error: null
            }))
          }))
        }))
      }

      // Mock smart tags API
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags })
      })

      // Mock update
      const mockUpdate = {
        update: jest.fn(() => ({
          eq: jest.fn()
        }))
      }

      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce(mockConversationQuery)
        .mockReturnValueOnce(mockMessagesQuery)
        .mockReturnValueOnce(mockUpdate)

      const result = await semanticSearchService.generateConversationTags(conversationId)

      expect(result).toEqual(mockTags)
      expect(global.fetch).toHaveBeenCalledWith('/api/smart-tags', expect.any(Object))
    })

    it('should handle API failure gracefully', async () => {
      const conversationId = 'conv-1'

      // Mock conversation fetch
      const mockConversationQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { id: conversationId, title: 'Test' },
              error: null
            }))
          }))
        }))
      }

      ;(supabase.from as jest.Mock).mockReturnValueOnce(mockConversationQuery)

      // Mock API failure
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      await expect(
        semanticSearchService.generateConversationTags(conversationId)
      ).rejects.toThrow('Failed to generate tags')
    })
  })

  describe('Semantic Search Service - Priority Detection', () => {
    it('should determine conversation priority successfully', async () => {
      const conversationId = 'conv-1'
      const mockPriority = 'urgent'

      // Mock conversation and messages fetch
      const mockConversationQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { id: conversationId, title: 'Urgent Bug Fix' },
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
                { content: 'This is an urgent issue', role: 'user' },
                { content: 'I need this fixed ASAP', role: 'user' }
              ],
              error: null
            }))
          }))
        }))
      }

      // Mock smart priority API
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ priority: mockPriority })
      })

      // Mock update
      const mockUpdate = {
        update: jest.fn(() => ({
          eq: jest.fn()
        }))
      }

      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce(mockConversationQuery)
        .mockReturnValueOnce(mockMessagesQuery)
        .mockReturnValueOnce(mockUpdate)

      const result = await semanticSearchService.determineConversationPriority(conversationId)

      expect(result).toBe(mockPriority)
      expect(global.fetch).toHaveBeenCalledWith('/api/smart-priority', expect.any(Object))
    })

    it('should fallback to database function on API failure', async () => {
      const conversationId = 'conv-1'
      const fallbackPriority = 'medium'

      // Mock conversation fetch
      const mockConversationQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { id: conversationId, title: 'Test' },
              error: null
            }))
          }))
        }))
      }

      ;(supabase.from as jest.Mock).mockReturnValueOnce(mockConversationQuery)

      // Mock API failure
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      // Mock RPC fallback
      ;(supabase.rpc as jest.Mock).mockResolvedValueOnce(fallbackPriority)

      const result = await semanticSearchService.determineConversationPriority(conversationId)

      expect(result).toBe(fallbackPriority)
      expect(supabase.rpc).toHaveBeenCalledWith('determine_conversation_priority', {
        conv_id: conversationId
      })
    })
  })

  describe('Semantic Search Service - Archiving', () => {
    it('should archive inactive conversations', async () => {
      const daysInactive = 90
      const expectedArchivedCount = 5

      ;(supabase.rpc as jest.Mock).mockResolvedValueOnce(expectedArchivedCount)

      const result = await semanticSearchService.archiveInactiveConversations(daysInactive)

      expect(result).toBe(expectedArchivedCount)
      expect(supabase.rpc).toHaveBeenCalledWith('archive_inactive_conversations', {
        days_inactive: daysInactive
      })
    })

    it('should handle archiving errors gracefully', async () => {
      const daysInactive = 90

      ;(supabase.rpc as jest.Mock).mockRejectedValueOnce(new Error('Database error'))

      const result = await semanticSearchService.archiveInactiveConversations(daysInactive)

      expect(result).toBe(0)
    })
  })
})