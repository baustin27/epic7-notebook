'use client'

import { useEffect } from 'react'
import { reportWebVitals, trackBundleSize } from '../lib/performance'
import { setupConsoleOverrides, setupGlobalErrorHandlers } from '../lib/errorHandling'

function sendToAnalytics(metric: any) {
  console.log('Web Vitals Metric:', metric)
  // Send to analytics service if needed
  if (metric.name && metric.value !== undefined) {
    // Example: post to /api/performance
    fetch('/api/performance', {
      method: 'POST',
      body: JSON.stringify(metric),
      headers: { 'Content-Type': 'application/json' },
    }).catch(console.error)
  }
}

export function ClientPerformance() {
  useEffect(() => {
    // Setup global error handling and console overrides
    setupConsoleOverrides()
    setupGlobalErrorHandlers()
    
    // Setup performance monitoring
    reportWebVitals(sendToAnalytics)
    trackBundleSize()
  }, [])

  return null
}