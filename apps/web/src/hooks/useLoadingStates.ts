'use client'

import { useState, useCallback, useRef } from 'react'

export interface LoadingState {
  isLoading: boolean
  progress?: number
  message?: string
  startTime?: number
}

export const useLoadingStates = () => {
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>({})
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})

  const setLoading = useCallback((key: string, isLoading: boolean, options?: {
    progress?: number
    message?: string
  }) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        isLoading,
        progress: options?.progress,
        message: options?.message,
        startTime: isLoading ? Date.now() : prev[key]?.startTime
      }
    }))

    // Clear any existing timeout for this key
    if (timeoutsRef.current[key]) {
      clearTimeout(timeoutsRef.current[key])
      delete timeoutsRef.current[key]
    }

    // If stopping loading, add a small delay to prevent flickering
    if (!isLoading) {
      timeoutsRef.current[key] = setTimeout(() => {
        setLoadingStates(prev => {
          const newState = { ...prev }
          delete newState[key]
          return newState
        })
        delete timeoutsRef.current[key]
      }, 200)
    }
  }, [])

  const updateProgress = useCallback((key: string, progress: number, message?: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        progress: Math.min(100, Math.max(0, progress)),
        message
      }
    }))
  }, [])

  const isLoading = useCallback((key: string): boolean => {
    return loadingStates[key]?.isLoading || false
  }, [loadingStates])

  const getLoadingState = useCallback((key: string): LoadingState | undefined => {
    return loadingStates[key]
  }, [loadingStates])

  const getElapsedTime = useCallback((key: string): number => {
    const state = loadingStates[key]
    if (!state?.startTime) return 0
    return Date.now() - state.startTime
  }, [loadingStates])

  const getGlobalLoading = useCallback((): boolean => {
    return Object.values(loadingStates).some(state => state.isLoading)
  }, [loadingStates])

  const clearAllLoading = useCallback(() => {
    // Clear all timeouts
    Object.values(timeoutsRef.current).forEach(timeout => clearTimeout(timeout))
    timeoutsRef.current = {}

    setLoadingStates({})
  }, [])

  // Cleanup timeouts on unmount
  const cleanup = useCallback(() => {
    Object.values(timeoutsRef.current).forEach(timeout => clearTimeout(timeout))
    timeoutsRef.current = {}
  }, [])

  return {
    setLoading,
    updateProgress,
    isLoading,
    getLoadingState,
    getElapsedTime,
    getGlobalLoading,
    clearAllLoading,
    cleanup,
    loadingStates
  }
}

// Hook for managing async operations with loading states
export const useAsyncOperation = (operationKey: string) => {
  const { setLoading, updateProgress, isLoading, getLoadingState } = useLoadingStates()

  const executeAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: {
      onProgress?: (progress: number, message?: string) => void
      showProgress?: boolean
      loadingMessage?: string
    }
  ): Promise<T> => {
    try {
      setLoading(operationKey, true, {
        message: options?.loadingMessage,
        progress: options?.showProgress ? 0 : undefined
      })

      const result = await operation()

      if (options?.showProgress) {
        updateProgress(operationKey, 100, 'Complete')
        // Small delay to show completion
        setTimeout(() => setLoading(operationKey, false), 500)
      } else {
        setLoading(operationKey, false)
      }

      return result
    } catch (error) {
      setLoading(operationKey, false)
      throw error
    }
  }, [operationKey, setLoading, updateProgress])

  return {
    executeAsync,
    isLoading: isLoading(operationKey),
    loadingState: getLoadingState(operationKey)
  }
}

export default useLoadingStates