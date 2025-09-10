import { supabase } from './supabase'
import type { Database } from '../types/database'

type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Insert']
type ModelPerformance = Database['public']['Tables']['model_performance']['Insert']
type UserEngagement = Database['public']['Tables']['user_engagement']['Insert']

export class AnalyticsService {
  private sessionId: string

  constructor() {
    // Generate a session ID for this browser session
    this.sessionId = this.getOrCreateSessionId()
  }

  private getOrCreateSessionId(): string {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      // Server-side: generate a temporary session ID
      return `server_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    let sessionId = localStorage.getItem('analytics_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('analytics_session_id', sessionId)
    }
    return sessionId
  }

  /**
   * Track a user interaction event
   */
  async trackEvent(
    eventType: string,
    eventData: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        session_id: this.sessionId,
        ip_address: null, // Will be set by server if needed
        user_agent: navigator.userAgent
      }

      const { error } = await supabase
        .from('analytics_events')
        .insert(event)

      if (error) {
        console.warn('Failed to track analytics event:', error)
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error)
    }
  }

  /**
   * Track model performance metrics
   */
  async trackModelPerformance(
    userId: string,
    conversationId: string,
    model: string,
    metrics: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
      responseTimeMs?: number
      costCents?: number
      success: boolean
      errorMessage?: string
    }
  ): Promise<void> {
    try {
      const performance: ModelPerformance = {
        user_id: userId,
        conversation_id: conversationId,
        model,
        prompt_tokens: metrics.promptTokens,
        completion_tokens: metrics.completionTokens,
        total_tokens: metrics.totalTokens,
        response_time_ms: metrics.responseTimeMs,
        cost_cents: metrics.costCents,
        success: metrics.success,
        error_message: metrics.errorMessage
      }

      const { error } = await supabase
        .from('model_performance')
        .insert(performance)

      if (error) {
        console.warn('Failed to track model performance:', error)
      }
    } catch (error) {
      console.warn('Model performance tracking failed:', error)
    }
  }

  /**
   * Update user engagement metrics
   */
  async updateUserEngagement(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]

      // First, try to update existing record
      const { error: updateError } = await supabase
        .from('user_engagement')
        .update({
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('date', today)

      if (updateError) {
        // If no existing record, create one
        const engagement: UserEngagement = {
          user_id: userId,
          date: today,
          messages_sent: 0,
          conversations_created: 0,
          session_duration_minutes: 0,
          models_used: [],
          features_used: [],
          last_activity: new Date().toISOString()
        }

        const { error: insertError } = await supabase
          .from('user_engagement')
          .insert(engagement)

        if (insertError) {
          console.warn('Failed to create user engagement record:', insertError)
        }
      }
    } catch (error) {
      console.warn('User engagement update failed:', error)
    }
  }

  /**
   * Increment message count for user
   */
  async incrementMessageCount(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get current value
      const { data: currentData, error: fetchError } = await supabase
        .from('user_engagement')
        .select('messages_sent')
        .eq('user_id', userId)
        .eq('date', today)
        .single()

      const currentCount = currentData?.messages_sent || 0

      // Update or insert
      const { error: upsertError } = await supabase
        .from('user_engagement')
        .upsert({
          user_id: userId,
          date: today,
          messages_sent: currentCount + 1,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,date'
        })

      if (upsertError) {
        console.warn('Failed to increment message count:', upsertError)
      }
    } catch (error) {
      console.warn('Message count increment failed:', error)
    }
  }

  /**
   * Increment conversation count for user
   */
  async incrementConversationCount(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get current value
      const { data: currentData, error: fetchError } = await supabase
        .from('user_engagement')
        .select('conversations_created')
        .eq('user_id', userId)
        .eq('date', today)
        .single()

      const currentCount = currentData?.conversations_created || 0

      // Update or insert
      const { error: upsertError } = await supabase
        .from('user_engagement')
        .upsert({
          user_id: userId,
          date: today,
          conversations_created: currentCount + 1,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,date'
        })

      if (upsertError) {
        console.warn('Failed to increment conversation count:', upsertError)
      }
    } catch (error) {
      console.warn('Conversation count increment failed:', error)
    }
  }

  /**
   * Track model usage for user
   */
  async trackModelUsage(userId: string, model: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get current models_used array
      const { data: currentData, error: fetchError } = await supabase
        .from('user_engagement')
        .select('models_used')
        .eq('user_id', userId)
        .eq('date', today)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows
        console.warn('Failed to fetch current model usage:', fetchError)
        return
      }

      const currentModels = currentData?.models_used || []
      const updatedModels = Array.from(new Set([...currentModels, model]))

      // Update or insert
      const { error: upsertError } = await supabase
        .from('user_engagement')
        .upsert({
          user_id: userId,
          date: today,
          models_used: updatedModels,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,date'
        })

      if (upsertError) {
        console.warn('Failed to track model usage:', upsertError)
      }
    } catch (error) {
      console.warn('Model usage tracking failed:', error)
    }
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(userId: string, feature: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get current features_used array
      const { data: currentData, error: fetchError } = await supabase
        .from('user_engagement')
        .select('features_used')
        .eq('user_id', userId)
        .eq('date', today)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows
        console.warn('Failed to fetch current feature usage:', fetchError)
        return
      }

      const currentFeatures = currentData?.features_used || []
      const updatedFeatures = Array.from(new Set([...currentFeatures, feature]))

      // Update or insert
      const { error: upsertError } = await supabase
        .from('user_engagement')
        .upsert({
          user_id: userId,
          date: today,
          features_used: updatedFeatures,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,date'
        })

      if (upsertError) {
        console.warn('Failed to track feature usage:', upsertError)
      }
    } catch (error) {
      console.warn('Feature usage tracking failed:', error)
    }
  }

  /**
   * Get analytics data for admin dashboard
   */
  async getAnalyticsData(dateRange: { start: string; end: string }) {
    try {
      // Get daily metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('analytics_metrics')
        .select('*')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: false })

      if (metricsError) throw metricsError

      // Get recent events
      const { data: events, error: eventsError } = await supabase
        .from('analytics_events')
        .select(`
          *,
          users:user_id (
            email,
            full_name
          )
        `)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: false })
        .limit(100)

      if (eventsError) throw eventsError

      // Get model performance data
      const { data: performance, error: performanceError } = await supabase
        .from('model_performance')
        .select('*')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: false })

      if (performanceError) throw performanceError

      // Get user engagement data
      const { data: engagement, error: engagementError } = await supabase
        .from('user_engagement')
        .select(`
          *,
          users:user_id (
            email,
            full_name
          )
        `)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: false })

      if (engagementError) throw engagementError

      return {
        metrics: metrics || [],
        events: events || [],
        performance: performance || [],
        engagement: engagement || []
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
      throw error
    }
  }
}

export const analyticsService = new AnalyticsService()