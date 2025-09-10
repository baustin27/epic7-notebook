import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock the semantic search service
jest.mock('../../../../../lib/database', () => ({
  semanticSearchService: {
    archiveInactiveConversations: jest.fn()
  }
}))

import { semanticSearchService } from '../../../../../lib/database'

describe('/api/admin/archive', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/admin/archive (Cron Job)', () => {
    it('should archive conversations with default settings', async () => {
      const expectedArchivedCount = 15

      ;(semanticSearchService.archiveInactiveConversations as jest.Mock).mockResolvedValueOnce(expectedArchivedCount)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        archivedCount: expectedArchivedCount,
        totalProcessed: expectedArchivedCount,
        dryRun: false,
        message: `Successfully archived ${expectedArchivedCount} conversations inactive for 90 days`
      })
      expect(semanticSearchService.archiveInactiveConversations).toHaveBeenCalledWith(90)
    })

    it('should handle archiving errors gracefully', async () => {
      ;(semanticSearchService.archiveInactiveConversations as jest.Mock).mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toMatchObject({
        error: 'Internal server error',
        details: 'Database connection failed'
      })
    })
  })

  describe('POST /api/admin/archive', () => {
    it('should archive conversations with custom settings', async () => {
      const expectedArchivedCount = 8

      ;(semanticSearchService.archiveInactiveConversations as jest.Mock).mockResolvedValueOnce(expectedArchivedCount)

      const request = {
        json: async () => ({
          daysInactive: 60,
          dryRun: false
        })
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        archivedCount: expectedArchivedCount,
        totalProcessed: expectedArchivedCount,
        dryRun: false,
        message: `Successfully archived ${expectedArchivedCount} conversations inactive for 60 days`
      })
      expect(semanticSearchService.archiveInactiveConversations).toHaveBeenCalledWith(60)
    })

    it('should perform dry run successfully', async () => {
      const expectedArchivedCount = 0 // Dry run returns 0

      ;(semanticSearchService.archiveInactiveConversations as jest.Mock).mockResolvedValueOnce(expectedArchivedCount)

      const request = {
        json: async () => ({
          daysInactive: 30,
          dryRun: true
        })
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        archivedCount: expectedArchivedCount,
        totalProcessed: expectedArchivedCount,
        dryRun: true,
        message: `Dry run: Would archive ${expectedArchivedCount} conversations inactive for 30 days`
      })
    })

    it('should use default values when not provided', async () => {
      const expectedArchivedCount = 5

      ;(semanticSearchService.archiveInactiveConversations as jest.Mock).mockResolvedValueOnce(expectedArchivedCount)

      const request = {
        json: async () => ({})
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(semanticSearchService.archiveInactiveConversations).toHaveBeenCalledWith(90)
    })

    it('should validate daysInactive parameter', async () => {
      const request = {
        json: async () => ({
          daysInactive: 400 // Too high
        })
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toMatchObject({
        error: 'Days inactive must be between 1 and 365'
      })
    })

    it('should validate minimum daysInactive parameter', async () => {
      const request = {
        json: async () => ({
          daysInactive: 0 // Too low
        })
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toMatchObject({
        error: 'Days inactive must be between 1 and 365'
      })
    })

    it('should handle database errors gracefully', async () => {
      ;(semanticSearchService.archiveInactiveConversations as jest.Mock).mockRejectedValueOnce(
        new Error('Database timeout')
      )

      const request = {
        json: async () => ({
          daysInactive: 45
        })
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toMatchObject({
        error: 'Internal server error',
        details: 'Database timeout'
      })
    })

    it('should handle malformed JSON gracefully', async () => {
      const request = {
        json: async () => {
          throw new Error('Invalid JSON')
        }
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toMatchObject({
        error: 'Internal server error'
      })
    })
  })

  describe('Parameter validation', () => {
    it('should accept valid daysInactive values', async () => {
      const testCases = [1, 30, 90, 180, 365]

      for (const days of testCases) {
        ;(semanticSearchService.archiveInactiveConversations as jest.Mock).mockResolvedValueOnce(0)

        const request = {
          json: async () => ({ daysInactive: days })
        } as NextRequest

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(semanticSearchService.archiveInactiveConversations).toHaveBeenCalledWith(days)
      }
    })

    it('should reject invalid daysInactive values', async () => {
      const invalidCases = [0, -1, 366, 1000, '30' as any, null, undefined]

      for (const days of invalidCases) {
        const request = {
          json: async () => ({ daysInactive: days })
        } as NextRequest

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Days inactive must be between 1 and 365')
      }
    })
  })

  describe('Integration scenarios', () => {
    it('should handle large archive operations', async () => {
      const largeCount = 1000

      ;(semanticSearchService.archiveInactiveConversations as jest.Mock).mockResolvedValueOnce(largeCount)

      const request = {
        json: async () => ({
          daysInactive: 120
        })
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.archivedCount).toBe(largeCount)
      expect(data.message).toContain('1000 conversations')
    })

    it('should handle zero results gracefully', async () => {
      ;(semanticSearchService.archiveInactiveConversations as jest.Mock).mockResolvedValueOnce(0)

      const request = {
        json: async () => ({
          daysInactive: 7
        })
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.archivedCount).toBe(0)
      expect(data.message).toContain('0 conversations')
    })
  })
})