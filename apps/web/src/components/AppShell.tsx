'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from './ui/LoadingSpinner'
import { ErrorBoundary } from './ui/ErrorBoundary'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // App shell ready - hide loading after critical resources
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)

    // Listen for load errors
    const handleError = () => setHasError(true)
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleError)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleError)
    }
  }, [])

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please refresh the page to try again
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="app-shell" className="min-h-screen">
      {/* Critical CSS and fonts loaded immediately */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

      {/* App shell loading state */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Sleek Chat...</p>
          </div>
        </div>
      )}

      {/* Main content with error boundary */}
      <ErrorBoundary
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center max-w-md mx-auto p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Application Error
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh Application
              </button>
            </div>
          </div>
        }
      >
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading content...</p>
              </div>
            </div>
          }
        >
          {children}
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

// Performance monitoring hook
export function usePerformanceMonitoring() {
  useEffect(() => {
    // Core Web Vitals tracking
    if (typeof window !== 'undefined' && 'web-vitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(console.log)
        getFID(console.log)
        getFCP(console.log)
        getLCP(console.log)
        getTTFB(console.log)
      })
    }

    // Resource loading performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Log slow resources
        if (entry.duration > 1000) {
          console.warn('Slow resource:', entry.name, entry.duration + 'ms')
        }
      }
    })

    observer.observe({ entryTypes: ['resource'] })

    // Navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          console.log('Page load metrics:', {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            totalTime: navigation.loadEventEnd - navigation.fetchStart
          })
        }
      }, 0)
    })

    return () => observer.disconnect()
  }, [])
}

// Lazy loading wrapper with performance tracking
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: P) {
    useEffect(() => {
      const startTime = performance.now()

      return () => {
        const loadTime = performance.now() - startTime
        console.log(`${componentName} load time:`, loadTime + 'ms')

        // Track component load time
        if (loadTime > 100) {
          console.warn(`Slow component load: ${componentName}`, loadTime + 'ms')
        }
      }
    }, [])

    return <Component {...props} />
  }
}

// Bundle splitting helper
export function lazyWithPerformanceTracking<P extends object>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>,
  componentName: string
) {
  const LazyComponent = lazy(importFunc)
  return withPerformanceTracking(LazyComponent, componentName)
}