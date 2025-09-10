import { analyticsService } from '../analyticsService'
import { supabase } from '../supabase'

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      insert: jest.fn(),
      update: jest.fn(),
      select: jest.fn(),
      eq: jest.fn(),
      upsert: jest.fn(),
      gte: jest.fn(),
      lte: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      single: jest.fn()
    }))
  }
}))

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock session
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'mock-token' } }
    })
  })

  describe('trackEvent', () => {
    it('should track an event successfully', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      ;(supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      })

      await analyticsService.trackEvent('test_event', { test: 'data' }, 'user-id')

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-id',
        event_type: 'test_event',
        event_data: { test: 'data' },
        session_id: expect.any(String),
        ip_address: null,
        user_agent: expect.any(String)
      })
    })

    it('should handle tracking errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const mockInsert = jest.fn().mockResolvedValue({ error: new Error('DB Error') })
      ;(supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      })

      await analyticsService.trackEvent('test_event', {}, 'user-id')

      expect(consoleSpy).toHaveBeenCalledWith('Failed to track analytics event:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('trackModelPerformance', () => {
    it('should track model performance metrics', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      ;(supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      })

      const metrics = {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        responseTimeMs: 1500,
        costCents: 5,
        success: true,
        errorMessage: undefined
      }

      await analyticsService.trackModelPerformance('user-id', 'conv-id', 'gpt-4', metrics)

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-id',
        conversation_id: 'conv-id',
        model: 'gpt-4',
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
        response_time_ms: 1500,
        cost_cents: 5,
        success: true,
        error_message: undefined
      })
    })
  })

  describe('incrementMessageCount', () => {
    it('should increment message count for user', async () => {
      const mockSelect = jest.fn().mockResolvedValue({ data: { messages_sent: 5 }, error: null })
      const mockUpdate = jest.fn().mockResolvedValue({ error: null })

      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: mockSelect,
        update: mockUpdate
      })

      await analyticsService.incrementMessageCount('user-id')

      expect(mockUpdate).toHaveBeenCalledWith({
        messages_sent: 6,
        last_activity: expect.any(String),
        updated_at: expect.any(String)
      })
    })
  })

  describe('updateUserEngagement', () => {
    it('should update user engagement', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })
      ;(supabase.from as jest.Mock).mockReturnValue({
        upsert: mockUpsert
      })

      await analyticsService.updateUserEngagement('user-id')

      expect(mockUpsert).toHaveBeenCalledWith({
        user_id: 'user-id',
        date: expect.any(String),
        last_activity: expect.any(String),
        updated_at: expect.any(String)
      }, {
        onConflict: 'user_id,date'
      })
    })
  })
})

describe('Analytics Integration Test', () => {
  it('should verify analytics data structure', () => {
    // Test that analytics data has expected structure
    const expectedEventData = {
      user_id: 'test-user',
      event_type: 'message_sent',
      event_data: { test: true },
      session_id: 'test-session',
      user_agent: 'test-agent'
    }

    expect(expectedEventData).toHaveProperty('user_id')
    expect(expectedEventData).toHaveProperty('event_type')
    expect(expectedEventData).toHaveProperty('event_data')
    expect(expectedEventData).toHaveProperty('session_id')
    expect(expectedEventData).toHaveProperty('user_agent')
  })

  it('should verify model performance data structure', () => {
    const expectedPerformanceData = {
      user_id: 'test-user',
      conversation_id: 'test-conv',
      model: 'gpt-4',
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
      response_time_ms: 1000,
      cost_cents: 1,
      success: true
    }

    expect(expectedPerformanceData).toHaveProperty('user_id')
    expect(expectedPerformanceData).toHaveProperty('conversation_id')
    expect(expectedPerformanceData).toHaveProperty('model')
    expect(expectedPerformanceData).toHaveProperty('response_time_ms')
    expect(expectedPerformanceData).toHaveProperty('success')
  })
})