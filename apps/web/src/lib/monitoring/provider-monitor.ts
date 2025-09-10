import { supabase, getCurrentUser } from '../supabase'
import type { ProviderApiClient } from '../../types/providers'

/**
 * Provider Usage Monitoring System
 * 
 * Wraps all provider API clients to intercept calls, log usage,
 * check feature flags, and track costs in real-time.
 */

// Feature names that can make provider calls
export type MonitoredFeature = 
  | 'chat'
  | 'writing_assistant'
  | 'model_management'
  | 'prompt_library'
  | 'file_upload'
  | 'conversation_export'

// Usage log entry structure
export interface UsageLogEntry {
  feature: MonitoredFeature
  userId?: string
  provider: string
  model: string
  tokensInput: number
  tokensOutput: number
  costUsd: number
  durationMs: number
  success: boolean
  errorMessage?: string
  metadata?: Record<string, any>
}

// Provider pricing models (approximate rates - should be configurable)
const PROVIDER_PRICING: Record<string, Record<string, { input: number; output: number }>> = {
  'openrouter': {
    // OpenRouter pricing varies by model - these are examples
    'anthropic/claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'anthropic/claude-3-sonnet': { input: 0.003, output: 0.015 },
    'anthropic/claude-3-opus': { input: 0.015, output: 0.075 },
    'openai/gpt-4': { input: 0.03, output: 0.06 },
    'openai/gpt-3.5-turbo': { input: 0.001, output: 0.002 },
    'google/gemini-pro': { input: 0.00125, output: 0.00375 }
  },
  'openai': {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
  },
  'anthropic': {
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-opus': { input: 0.015, output: 0.075 }
  },
  'google': {
    'gemini-pro': { input: 0.00125, output: 0.00375 }
  },
  'xai': {
    'grok-beta': { input: 0.002, output: 0.004 }
  }
}

/**
 * Calculate cost based on token usage and provider pricing
 */
function calculateCost(provider: string, model: string, tokensInput: number, tokensOutput: number): number {
  const providerPricing = PROVIDER_PRICING[provider]
  if (!providerPricing) return 0

  const modelPricing = providerPricing[model]
  if (!modelPricing) {
    // Fallback to average pricing if specific model not found
    const avgPricing = { input: 0.002, output: 0.006 } // Conservative estimate
    return (tokensInput * avgPricing.input + tokensOutput * avgPricing.output) / 1000
  }

  return (tokensInput * modelPricing.input + tokensOutput * modelPricing.output) / 1000
}

/**
 * Extract token usage from API response
 * This function handles different provider response formats
 */
function extractTokenUsage(response: any, provider: string): { input: number; output: number } {
  try {
    // OpenRouter format
    if (response?.usage) {
      return {
        input: response.usage.prompt_tokens || 0,
        output: response.usage.completion_tokens || 0
      }
    }

    // Anthropic format
    if (response?.usage || response?.metadata?.usage) {
      const usage = response.usage || response.metadata.usage
      return {
        input: usage.input_tokens || 0,
        output: usage.output_tokens || 0
      }
    }

    // OpenAI format
    if (response?.data?.usage) {
      return {
        input: response.data.usage.prompt_tokens || 0,
        output: response.data.usage.completion_tokens || 0
      }
    }

    // For streaming responses, tokens might not be available immediately
    return { input: 0, output: 0 }
  } catch (error) {
    console.warn('Failed to extract token usage:', error)
    return { input: 0, output: 0 }
  }
}

/**
 * Log usage to Supabase database
 */
async function logUsage(entry: UsageLogEntry): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_provider_usage', {
      p_feature: entry.feature,
      p_user_id: entry.userId || null,
      p_provider: entry.provider,
      p_model: entry.model,
      p_tokens_input: entry.tokensInput,
      p_tokens_output: entry.tokensOutput,
      p_cost_usd: entry.costUsd,
      p_duration_ms: entry.durationMs,
      p_success: entry.success,
      p_error_message: entry.errorMessage || null,
      p_metadata: entry.metadata || {}
    })

    if (error) {
      console.error('Failed to log provider usage:', error)
    }
  } catch (error) {
    console.error('Error logging provider usage:', error)
  }
}

/**
 * Check if a feature is enabled
 */
export async function isFeatureEnabled(feature: MonitoredFeature): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_feature_enabled', {
      p_feature_name: feature
    })

    if (error) {
      console.error('Failed to check feature flag:', error)
      return true // Default to enabled on error
    }

    return data === true
  } catch (error) {
    console.error('Error checking feature flag:', error)
    return true // Default to enabled on error
  }
}

/**
 * Feature disabled error class
 */
export class FeatureDisabledError extends Error {
  constructor(feature: string) {
    super(`Feature "${feature}" is currently disabled`)
    this.name = 'FeatureDisabledError'
  }
}

/**
 * Monitor wrapper for ProviderApiClient
 * Intercepts all calls and logs usage data
 */
export function createMonitoredClient(
  originalClient: ProviderApiClient,
  provider: string,
  feature: MonitoredFeature
): ProviderApiClient {
  return {
    // Wrap getModels to check feature flags and log usage
    getModels: async () => {
      const enabled = await isFeatureEnabled(feature)
      if (!enabled) {
        throw new FeatureDisabledError(feature)
      }

      const startTime = Date.now()
      let success = true
      let error: string | undefined

      try {
        const result = await originalClient.getModels()
        return result
      } catch (err) {
        success = false
        error = err instanceof Error ? err.message : 'Unknown error'
        throw err
      } finally {
        const duration = Date.now() - startTime
        
        // Log the getModels call (no tokens, minimal cost)
        await logUsage({
          feature,
          userId: (await getCurrentUser())?.id,
          provider,
          model: 'getModels',
          tokensInput: 0,
          tokensOutput: 0,
          costUsd: 0,
          durationMs: duration,
          success,
          errorMessage: error,
          metadata: { operation: 'getModels' }
        })
      }
    },

    // Wrap chatCompletion with full monitoring
    chatCompletion: async (messages, model, onChunk, signal, settings) => {
      const enabled = await isFeatureEnabled(feature)
      if (!enabled) {
        throw new FeatureDisabledError(feature)
      }

      const startTime = Date.now()
      let success = true
      let error: string | undefined
      let tokens = { input: 0, output: 0 }

      try {
        const result = await originalClient.chatCompletion(messages, model, onChunk, signal, settings)
        
        // Extract token usage from response
        tokens = extractTokenUsage(result, provider)
        
        return result
      } catch (err) {
        success = false
        error = err instanceof Error ? err.message : 'Unknown error'
        throw err
      } finally {
        const duration = Date.now() - startTime
        const cost = calculateCost(provider, model, tokens.input, tokens.output)
        
        // Log the chat completion call
        await logUsage({
          feature,
          userId: (await getCurrentUser())?.id,
          provider,
          model,
          tokensInput: tokens.input,
          tokensOutput: tokens.output,
          costUsd: cost,
          durationMs: duration,
          success,
          errorMessage: error,
          metadata: {
            messageCount: Array.isArray(messages) ? messages.length : 0,
            settings: settings || {}
          }
        })
      }
    },

    // Wrap testConnection
    testConnection: async () => {
      const enabled = await isFeatureEnabled(feature)
      if (!enabled) {
        throw new FeatureDisabledError(feature)
      }

      const startTime = Date.now()
      let success = true
      let error: string | undefined

      try {
        const result = await originalClient.testConnection()
        return result
      } catch (err) {
        success = false
        error = err instanceof Error ? err.message : 'Unknown error'
        throw err
      } finally {
        const duration = Date.now() - startTime
        
        // Log the connection test
        await logUsage({
          feature,
          userId: (await getCurrentUser())?.id,
          provider,
          model: 'testConnection',
          tokensInput: 0,
          tokensOutput: 0,
          costUsd: 0,
          durationMs: duration,
          success,
          errorMessage: error,
          metadata: { operation: 'testConnection' }
        })
      }
    },

    // Pass through other methods without monitoring (they don't make API calls)
    setApiKey: originalClient.setApiKey,
    getStoredApiKey: originalClient.getStoredApiKey
  }
}

/**
 * Helper function to get real-time usage stats
 */
export async function getFeatureUsageStats(
  feature?: MonitoredFeature,
  timePeriod: string = '24 hours'
) {
  try {
    const { data, error } = await supabase.rpc('get_feature_usage_summary', {
      p_feature_name: feature || null,
      p_time_period: `${timePeriod}` // Convert to PostgreSQL interval
    })

    if (error) {
      console.error('Failed to get usage stats:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting usage stats:', error)
    return []
  }
}

/**
 * Helper function to toggle feature flags
 */
export async function toggleFeature(feature: MonitoredFeature, enabled: boolean): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Must be authenticated to toggle features')
    }

    const { error } = await supabase
      .from('feature_flags')
      .upsert({
        feature_name: feature,
        enabled,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to toggle feature:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error toggling feature:', error)
    return false
  }
}

/**
 * Helper function to get all feature flags
 */
export async function getAllFeatureFlags() {
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('feature_name')

    if (error) {
      console.error('Failed to get feature flags:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting feature flags:', error)
    return []
  }
}