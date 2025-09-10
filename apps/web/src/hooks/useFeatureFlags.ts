import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { MonitoredFeature } from '../lib/monitoring/provider-monitor'

/**
 * React hook for managing feature flags
 * 
 * Provides real-time feature flag state management with caching
 * and automatic updates via Supabase real-time subscriptions
 */

export interface FeatureFlag {
  feature_name: string
  enabled: boolean
  description?: string
  updated_at: string
  updated_by?: string
}

interface UseFeatureFlagsResult {
  flags: Record<string, boolean>
  loading: boolean
  error: string | null
  isFeatureEnabled: (feature: MonitoredFeature) => boolean
  toggleFeature: (feature: MonitoredFeature, enabled: boolean) => Promise<boolean>
  refreshFlags: () => Promise<void>
  allFlags: FeatureFlag[]
}

// Cache for feature flags to avoid excessive database calls
const flagsCache = new Map<string, boolean>()
let cacheTimestamp = 0
const CACHE_TTL = 30000 // 30 seconds

export function useFeatureFlags(): UseFeatureFlagsResult {
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [allFlags, setAllFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load feature flags from database
  const loadFlags = useCallback(async () => {
    try {
      setError(null)
      
      // Check cache first
      const now = Date.now()
      if (now - cacheTimestamp < CACHE_TTL && flagsCache.size > 0) {
        const cachedFlags = Object.fromEntries(flagsCache.entries())
        setFlags(cachedFlags)
        setLoading(false)
        return
      }

      const { data, error: dbError } = await supabase
        .from('feature_flags')
        .select('*')
        .order('feature_name')

      if (dbError) {
        throw dbError
      }

      const flagsMap: Record<string, boolean> = {}
      const flagsList: FeatureFlag[] = []

      if (data) {
        data.forEach((flag) => {
          flagsMap[flag.feature_name] = flag.enabled
          flagsList.push(flag)
          flagsCache.set(flag.feature_name, flag.enabled)
        })
      }

      setFlags(flagsMap)
      setAllFlags(flagsList)
      cacheTimestamp = now

    } catch (err) {
      console.error('Failed to load feature flags:', err)
      setError(err instanceof Error ? err.message : 'Failed to load feature flags')
      
      // Fall back to cache if available
      if (flagsCache.size > 0) {
        const cachedFlags = Object.fromEntries(flagsCache.entries())
        setFlags(cachedFlags)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Check if a specific feature is enabled
  const isFeatureEnabled = useCallback((feature: MonitoredFeature): boolean => {
    // Default to enabled if not found (fail open)
    return flags[feature] !== undefined ? flags[feature] : true
  }, [flags])

  // Toggle a feature flag (admin only)
  const toggleFeature = useCallback(async (feature: MonitoredFeature, enabled: boolean): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ feature, enabled })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to toggle feature')
      }

      // Update local state immediately
      setFlags(prev => ({ ...prev, [feature]: enabled }))
      flagsCache.set(feature, enabled)
      
      // Refresh from database to ensure consistency
      await loadFlags()
      
      return true
    } catch (err) {
      console.error('Failed to toggle feature:', err)
      setError(err instanceof Error ? err.message : 'Failed to toggle feature')
      return false
    }
  }, [loadFlags])

  // Refresh flags from database
  const refreshFlags = useCallback(async () => {
    flagsCache.clear()
    cacheTimestamp = 0
    await loadFlags()
  }, [loadFlags])

  // Set up real-time subscription for feature flag changes
  useEffect(() => {
    loadFlags()

    // Subscribe to feature flag changes
    const subscription = supabase
      .channel('feature_flags')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_flags'
        },
        (payload) => {
          console.log('Feature flag changed:', payload)
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newFlag = payload.new as FeatureFlag
            setFlags(prev => ({ ...prev, [newFlag.feature_name]: newFlag.enabled }))
            flagsCache.set(newFlag.feature_name, newFlag.enabled)
            
            // Update allFlags array
            setAllFlags(prev => {
              const existingIndex = prev.findIndex(f => f.feature_name === newFlag.feature_name)
              if (existingIndex >= 0) {
                const updated = [...prev]
                updated[existingIndex] = newFlag
                return updated
              } else {
                return [...prev, newFlag]
              }
            })
          } else if (payload.eventType === 'DELETE') {
            const oldFlag = payload.old as FeatureFlag
            setFlags(prev => {
              const updated = { ...prev }
              delete updated[oldFlag.feature_name]
              return updated
            })
            flagsCache.delete(oldFlag.feature_name)
            
            setAllFlags(prev => prev.filter(f => f.feature_name !== oldFlag.feature_name))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [loadFlags])

  return {
    flags,
    loading,
    error,
    isFeatureEnabled,
    toggleFeature,
    refreshFlags,
    allFlags
  }
}

// Separate hook for checking a single feature (optimized for performance)
export function useFeatureFlag(feature: MonitoredFeature): {
  enabled: boolean
  loading: boolean
} {
  const [enabled, setEnabled] = useState(() => {
    // Check cache first
    const cachedValue = flagsCache.get(feature)
    return cachedValue !== undefined ? cachedValue : true // Default to enabled
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkFlag = async () => {
      // Check cache first
      const now = Date.now()
      if (now - cacheTimestamp < CACHE_TTL && flagsCache.has(feature)) {
        const cachedValue = flagsCache.get(feature)!
        if (mounted) setEnabled(cachedValue)
        return
      }

      setLoading(true)
      
      try {
        const { data, error } = await supabase
          .from('feature_flags')
          .select('enabled')
          .eq('feature_name', feature)
          .single()

        if (!error && data && mounted) {
          setEnabled(data.enabled)
          flagsCache.set(feature, data.enabled)
        } else if (mounted) {
          // Default to enabled if not found
          setEnabled(true)
        }
      } catch (err) {
        console.warn(`Failed to check feature flag for ${feature}:`, err)
        if (mounted) setEnabled(true) // Default to enabled on error
      } finally {
        if (mounted) setLoading(false)
      }
    }

    checkFlag()

    // Subscribe to changes for this specific feature
    const subscription = supabase
      .channel(`feature_flag_${feature}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'feature_flags',
          filter: `feature_name=eq.${feature}`
        },
        (payload) => {
          if (mounted && payload.new) {
            const newFlag = payload.new as FeatureFlag
            setEnabled(newFlag.enabled)
            flagsCache.set(feature, newFlag.enabled)
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [feature])

  return { enabled, loading }
}

// Utility hook for admin operations
export function useAdminFeatureFlags() {
  const { flags, allFlags, loading, error, toggleFeature, refreshFlags } = useFeatureFlags()
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(true)

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: session, error } = await supabase.auth.getSession()
        if (error || !session?.session) {
          setIsAdmin(false)
          setAdminLoading(false)
          return
        }

        const response = await fetch('/api/admin/feature-flags', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`
          }
        })
        
        setIsAdmin(response.ok)
      } catch (err) {
        setIsAdmin(false)
      } finally {
        setAdminLoading(false)
      }
    }

    checkAdminStatus()
  }, [])

  return {
    flags,
    allFlags,
    loading: loading || adminLoading,
    error,
    isAdmin,
    toggleFeature,
    refreshFlags
  }
}