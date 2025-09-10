'use client'

import { useEffect } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import { openRouterAPI } from '../lib/openrouter'

export function useRateLimitNotifications() {
  const { addNotification } = useNotifications()

  useEffect(() => {
    // Check for development mode notification
    if (openRouterAPI.isDevelopment()) {
      addNotification({
        type: 'info',
        title: 'Development Mode',
        message: 'Free models are enforced to prevent accidental costs.',
        duration: 10000,
        persistent: false
      })
    }

    // Set up periodic cost checking
    const checkCostAlerts = () => {
      const alerts = openRouterAPI.getCostAlerts()

      alerts.warnings.forEach(warning => {
        addNotification({
          type: 'warning',
          title: 'Cost Warning',
          message: warning,
          duration: 8000
        })
      })

      alerts.critical.forEach(critical => {
        addNotification({
          type: 'error',
          title: 'Cost Alert',
          message: critical,
          persistent: true
        })
      })
    }

    // Check immediately and then every 30 seconds
    checkCostAlerts()
    const interval = setInterval(checkCostAlerts, 30000)

    return () => clearInterval(interval)
  }, [addNotification])

  // Function to show rate limit exceeded notification
  const showRateLimitExceeded = (retryAfter: number) => {
    addNotification({
      type: 'error',
      title: 'Rate Limit Exceeded',
      message: `Too many requests. Please wait ${Math.ceil(retryAfter)} seconds before trying again.`,
      duration: 5000
    })
  }

  // Function to show approaching limit notification
  const showApproachingLimit = (remaining: number) => {
    if (remaining <= 2) {
      addNotification({
        type: 'warning',
        title: 'Approaching Rate Limit',
        message: `Only ${remaining} requests remaining. Please slow down.`,
        duration: 3000
      })
    }
  }

  return {
    showRateLimitExceeded,
    showApproachingLimit
  }
}