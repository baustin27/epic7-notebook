/**
 * Performance optimization utilities for PWA
 */

// Core Web Vitals tracking
export function reportWebVitals(metric: any) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', metric)
  }

  // Send to analytics in production
  if (process.env.NODE_ENV === 'production') {
    // Send to your analytics service
    // Example: sendToAnalytics(metric)
  }
}

// Image optimization helper
export function getOptimizedImageUrl(src: string, width: number, height?: number): string {
  // Use Next.js Image optimization or a CDN
  const params = new URLSearchParams({
    url: src,
    w: width.toString(),
    ...(height && { h: height.toString() }),
    q: '75', // Quality
    f: 'webp' // Format
  })

  return `/api/image?${params}`
}

// Bundle size monitoring
export function logBundleSize() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    // Log bundle size information
    const resources = performance.getEntriesByType('resource')
    const scripts = resources.filter(r => r.name.includes('.js'))

    scripts.forEach(script => {
      if (script.transferSize > 0) {
        console.log(`Bundle: ${script.name} - ${(script.transferSize / 1024).toFixed(2)}KB`)
      }
    })
  }
}

// Alias for backward compatibility
export const trackBundleSize = logBundleSize

// Memory usage monitoring
export function monitorMemoryUsage() {
  if ('memory' in performance) {
    const memInfo = (performance as any).memory
    console.log('Memory Usage:', {
      used: Math.round(memInfo.usedJSHeapSize / 1048576 * 100) / 100 + ' MB',
      total: Math.round(memInfo.totalJSHeapSize / 1048576 * 100) / 100 + ' MB',
      limit: Math.round(memInfo.jsHeapSizeLimit / 1048576 * 100) / 100 + ' MB'
    })
  }
}

// Lazy loading with intersection observer
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) {
  if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
    return new IntersectionObserver(callback, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    })
  }
  return null
}

// Debounced performance logging
let logTimeout: NodeJS.Timeout
export function debouncedPerformanceLog(message: string, data?: any) {
  clearTimeout(logTimeout)
  logTimeout = setTimeout(() => {
    console.log(`[Performance] ${message}`, data)
  }, 100)
}

// Resource preloading
export function preloadResource(href: string, as: string, type?: string) {
  if (typeof document !== 'undefined') {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = as
    if (type) link.type = type
    document.head.appendChild(link)
  }
}

// Critical resource preloading
export function preloadCriticalResources() {
  // Preload critical fonts
  preloadResource('/fonts/inter-var.woff2', 'font', 'font/woff2')

  // Preload critical CSS
  preloadResource('/_next/static/css/app.css', 'style')

  // Preload critical JS
  preloadResource('/_next/static/js/main.js', 'script')
}

// Service worker performance monitoring
export function monitorServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'PERFORMANCE_METRIC') {
        console.log('SW Performance:', event.data.metric)
      }
    })
  }
}

// Cache performance monitoring
export function monitorCachePerformance() {
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(async (cacheName) => {
        const cache = await caches.open(cacheName)
        const keys = await cache.keys()
        console.log(`Cache ${cacheName}: ${keys.length} items`)
      })
    })
  }
}

// Network request monitoring
export function monitorNetworkRequests() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming

          // Log slow network requests
          if (resourceEntry.responseEnd - resourceEntry.requestStart > 1000) {
            console.warn('Slow network request:', {
              url: resourceEntry.name,
              duration: resourceEntry.responseEnd - resourceEntry.requestStart,
              size: resourceEntry.transferSize
            })
          }
        }
      }
    })

    observer.observe({ entryTypes: ['resource'] })
  }
}

// Initialize all performance monitoring
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return

  // Preload critical resources
  preloadCriticalResources()

  // Monitor service worker
  monitorServiceWorker()

  // Monitor cache performance
  monitorCachePerformance()

  // Monitor network requests
  monitorNetworkRequests()

  // Log bundle sizes
  logBundleSize()

  // Monitor memory usage periodically
  setInterval(monitorMemoryUsage, 30000)
}

// Performance budget checking
export const PERFORMANCE_BUDGETS = {
  // Bundle sizes
  main: 200 * 1024, // 200KB
  vendor: 300 * 1024, // 300KB
  total: 500 * 1024, // 500KB

  // Web Vitals
  lcp: 2500, // 2.5s
  fid: 100, // 100ms
  cls: 0.1, // 0.1

  // Network
  ttfb: 800, // 800ms
  fcp: 1800 // 1.8s
}

export function checkPerformanceBudgets() {
  if (typeof window === 'undefined') return

  // Check bundle sizes
  const resources = performance.getEntriesByType('resource')
  const scripts = resources.filter(r => r.name.includes('.js'))

  scripts.forEach(script => {
    const size = script.transferSize
    if (size > PERFORMANCE_BUDGETS.main) {
      console.warn(`Bundle size exceeds budget: ${script.name} (${(size / 1024).toFixed(2)}KB)`)
    }
  })
}