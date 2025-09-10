'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface AutoSaveOptions {
  delay?: number
  onSave?: (data: any) => Promise<void>
  onError?: (error: Error) => void
  enabled?: boolean
}

interface AutoSaveState {
  isSaving: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  error: Error | null
}

export const useAutoSave = <T>(
  data: T,
  options: AutoSaveOptions = {}
) => {
  const {
    delay = 2000,
    onSave,
    onError,
    enabled = true
  } = options

  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null
  })

  const timeoutRef = useRef<NodeJS.Timeout>()
  const lastDataRef = useRef<T>(data)
  const isInitialMount = useRef(true)

  // Check for changes
  useEffect(() => {
    if (isInitialMount.current) {
      lastDataRef.current = data
      isInitialMount.current = false
      return
    }

    const hasChanged = JSON.stringify(data) !== JSON.stringify(lastDataRef.current)

    setState(prev => ({
      ...prev,
      hasUnsavedChanges: hasChanged,
      error: null
    }))

    if (hasChanged && enabled) {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout for auto-save
      timeoutRef.current = setTimeout(() => {
        performSave()
      }, delay)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, delay, enabled])

  const performSave = useCallback(async () => {
    if (!onSave || !enabled) return

    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      await onSave(data)
      lastDataRef.current = data

      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false
      }))
    } catch (error) {
      const saveError = error instanceof Error ? error : new Error('Save failed')
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: saveError
      }))

      onError?.(saveError)
    }
  }, [data, onSave, onError, enabled])

  const manualSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    await performSave()
  }, [performSave])

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    lastDataRef.current = data
    setState({
      isSaving: false,
      lastSaved: null,
      hasUnsavedChanges: false,
      error: null
    })
  }, [data])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    ...state,
    manualSave,
    reset,
    timeSinceLastSave: state.lastSaved
      ? Date.now() - state.lastSaved.getTime()
      : null
  }
}

// Hook for managing draft messages
export const useDraftMessage = (conversationId: string) => {
  const [draft, setDraft] = useState('')

  // Load draft from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`draft-${conversationId}`)
    if (stored) {
      setDraft(stored)
    }
  }, [conversationId])

  // Auto-save draft
  const { hasUnsavedChanges, isSaving, manualSave } = useAutoSave(
    draft,
    {
      delay: 500,
      onSave: async (data: string) => {
        if (data.trim()) {
          localStorage.setItem(`draft-${conversationId}`, data)
        } else {
          localStorage.removeItem(`draft-${conversationId}`)
        }
      },
      enabled: true
    }
  )

  const updateDraft = useCallback((newDraft: string) => {
    setDraft(newDraft)
  }, [])

  const clearDraft = useCallback(() => {
    setDraft('')
    localStorage.removeItem(`draft-${conversationId}`)
  }, [conversationId])

  const saveDraft = useCallback(async () => {
    await manualSave()
  }, [manualSave])

  return {
    draft,
    updateDraft,
    clearDraft,
    saveDraft,
    hasUnsavedChanges,
    isSaving
  }
}

// Hook for session timeout warnings
export const useSessionTimeout = (timeoutMinutes: number = 30) => {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()
  const warningShownRef = useRef(false)

  const startSession = useCallback(() => {
    const timeoutMs = timeoutMinutes * 60 * 1000
    const warningTimeMs = 5 * 60 * 1000 // Show warning 5 minutes before timeout
    const startTime = Date.now()

    setTimeRemaining(timeoutMs)
    setShowWarning(false)
    warningShownRef.current = false

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, timeoutMs - elapsed)

      setTimeRemaining(remaining)

      // Show warning when 5 minutes remaining
      if (remaining <= warningTimeMs && !warningShownRef.current) {
        setShowWarning(true)
        warningShownRef.current = true
      }

      // Clear interval when timeout reached
      if (remaining === 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }, 1000)
  }, [timeoutMinutes])

  const extendSession = useCallback(() => {
    setShowWarning(false)
    warningShownRef.current = false
    startSession()
  }, [startSession])

  const dismissWarning = useCallback(() => {
    setShowWarning(false)
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    timeRemaining,
    showWarning,
    startSession,
    extendSession,
    dismissWarning,
    isExpired: timeRemaining === 0
  }
}

export default useAutoSave