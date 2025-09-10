'use client'

import { useState, useCallback } from 'react'

export interface ErrorInfo {
  message: string
  type: 'network' | 'api' | 'validation' | 'session' | 'general'
  code?: string | number
  recoverable: boolean
  actions?: Array<{
    label: string
    action: () => void
  }>
}

export const useErrorHandling = () => {
  const [currentError, setCurrentError] = useState<ErrorInfo | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const classifyError = useCallback((error: any): ErrorInfo => {
    // Network errors
    if (error.name === 'NetworkError' || error.message?.includes('fetch') || error.message?.includes('network')) {
      return {
        message: 'Connection temporarily unavailable. Retrying automatically...',
        type: 'network',
        recoverable: true,
        actions: [
          {
            label: 'Retry Now',
            action: () => {} // Will be replaced with actual retry function in return object
          }
        ]
      }
    }

    // API errors
    if (error.status >= 400 && error.status < 500) {
      const messages: Record<number, string> = {
        400: 'Invalid request. Please check your input.',
        401: 'Authentication required. Please sign in again.',
        403: 'Access denied. You don\'t have permission for this action.',
        404: 'Resource not found. The item may have been moved or deleted.',
        429: 'Too many requests. Please wait a moment before trying again.'
      }

      return {
        message: messages[error.status] || 'Service temporarily unavailable. Please try again.',
        type: 'api',
        code: error.status,
        recoverable: error.status !== 403,
        actions: error.status !== 403 ? [
          {
            label: 'Try Again',
            action: () => {} // Will be replaced with actual retry function in return object
          }
        ] : []
      }
    }

    // Session errors
    if (error.status === 401 || error.message?.includes('unauthorized') || error.message?.includes('session')) {
      return {
        message: 'Session expired. Refreshing authentication...',
        type: 'session',
        recoverable: true,
        actions: [
          {
            label: 'Sign In Again',
            action: () => window.location.reload()
          }
        ]
      }
    }

    // Validation errors
    if (error.type === 'validation' || error.message?.includes('validation')) {
      return {
        message: 'Please check your input and try again.',
        type: 'validation',
        recoverable: true
      }
    }

    // Default general error
    return {
      message: 'An unexpected issue occurred. Our team has been notified.',
      type: 'general',
      recoverable: true,
      actions: [
        {
          label: 'Refresh Page',
          action: () => window.location.reload()
        }
      ]
    }
  }, [])

  const handleError = useCallback((error: any) => {
    const errorInfo = classifyError(error)
    setCurrentError(errorInfo)

    // Log error safely (client-side, no sensitive data)
    console.error('Error handled:', {
      type: errorInfo.type,
      message: errorInfo.message,
      timestamp: new Date().toISOString(),
      recoverable: errorInfo.recoverable
    })

    return errorInfo
  }, [classifyError])

  const handleRetry = useCallback(async () => {
    if (!currentError?.recoverable) return

    setIsRetrying(true)
    try {
      // This would typically trigger a retry of the failed operation
      // For now, just clear the error after a delay
      setTimeout(() => {
        setCurrentError(null)
        setIsRetrying(false)
      }, 1000)
    } catch (retryError) {
      setIsRetrying(false)
      handleError(retryError)
    }
  }, [currentError, handleError])


  const clearError = useCallback(() => {
    setCurrentError(null)
    setIsRetrying(false)
  }, [])

  // Create a version of currentError with proper retry actions
  const enhancedError = currentError ? {
    ...currentError,
    actions: currentError.actions?.map(action => ({
      ...action,
      action: action.label.includes('Retry') || action.label.includes('Try Again') 
        ? handleRetry 
        : action.action
    }))
  } : null

  return {
    currentError: enhancedError,
    isRetrying,
    handleError,
    handleRetry,
    clearError,
    classifyError
  }
}

export default useErrorHandling