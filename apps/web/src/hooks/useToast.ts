'use client'

import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((
    type: Toast['type'],
    message: string,
    options?: {
      title?: string
      duration?: number
    }
  ) => {
    const id = Date.now().toString()
    const toast: Toast = {
      id,
      type,
      message,
      title: options?.title,
      duration: options?.duration ?? 5000
    }

    setToasts(prev => [...prev, toast])

    // Auto-remove after duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    return addToast('success', message, options)
  }, [addToast])

  const error = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    return addToast('error', message, options)
  }, [addToast])

  const warning = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    return addToast('warning', message, options)
  }, [addToast])

  const info = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    return addToast('info', message, options)
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
}

export default useToast