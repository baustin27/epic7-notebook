import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { usePerformanceMonitor, reportWebVitals, trackBundleSize, trackReactError } from '../performance'

// Mock window and performance APIs
const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  location: { href: 'http://localhost:3000' },
  navigator: {
    userAgent: 'test-user-agent',
    hardwareConcurrency: 4,
    deviceMemory: 8,
  },
}

const mockPerformance = {
  getEntriesByType: jest.fn(),
  mark: jest.fn(),
  measure: jest.fn(),
  now: jest.fn(() => 1000),
}

const mockFetch = jest.fn()

// Setup global mocks
Object.defineProperty(window, 'window', { value: mockWindow })
Object.defineProperty(window, 'performance', { value: mockPerformance })
Object.defineProperty(window, 'fetch', { value: mockFetch })

describe('Performance Monitoring Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the global performance monitor instance
    ;(global as any).__performanceMonitor = null
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('usePerformanceMonitor hook', () => {
    it('should return performance monitoring functions', () => {
      const monitor = usePerformanceMonitor()

      expect(monitor).toHaveProperty('trackMetric')
      expect(monitor).toHaveProperty('trackError')
      expect(monitor).toHaveProperty('getSummary')
      expect(monitor).toHaveProperty('exportData')
      expect(typeof monitor.trackMetric).toBe('function')
      expect(typeof monitor.trackError).toBe('function')
      expect(typeof monitor.getSummary).toBe('function')
      expect(typeof monitor.exportData).toBe('function')
    })

    it('should track metrics through the hook', () => {
      const monitor = usePerformanceMonitor()

      monitor.trackMetric('test-metric', 150)

      const summary = monitor.getSummary()
      expect(summary.totalMetrics).toBeGreaterThan(0)
    })

    it('should track errors through the hook', () => {
      const monitor = usePerformanceMonitor()

      monitor.trackError('Test error message', 'Error stack')

      const summary = monitor.getSummary()
      expect(summary.errorCount).toBeGreaterThan(0)
    })

    it('should export performance data', () => {
      const monitor = usePerformanceMonitor()

      monitor.trackMetric('test', 100)
      monitor.trackError('test error')

      const data = monitor.exportData()

      expect(data).toHaveProperty('metrics')
      expect(data).toHaveProperty('errors')
      expect(data).toHaveProperty('summary')
      expect(Array.isArray(data.metrics)).toBe(true)
      expect(Array.isArray(data.errors)).toBe(true)
    })
  })

  describe('reportWebVitals', () => {
    it('should handle web vitals reporting', async () => {
      const mockOnPerfEntry = jest.fn()

      // Mock web-vitals import
      jest.doMock('web-vitals', () => ({
        onCLS: jest.fn((callback) => callback({ value: 0.1 })),
        onFCP: jest.fn((callback) => callback({ value: 1200 })),
        onINP: jest.fn((callback) => callback({ value: 100 })),
        onLCP: jest.fn((callback) => callback({ value: 2500 })),
        onTTFB: jest.fn((callback) => callback({ value: 200 })),
      }))

      await reportWebVitals(mockOnPerfEntry)

      // Should have called the callback for each vital
      expect(mockOnPerfEntry).toHaveBeenCalledTimes(5)
    })

    it('should handle missing web-vitals gracefully', async () => {
      const mockOnPerfEntry = jest.fn()

      // Mock failed import
      jest.doMock('web-vitals', () => {
        throw new Error('Module not found')
      })

      // Should not throw
      await expect(reportWebVitals(mockOnPerfEntry)).resolves.not.toThrow()
    })

    it('should skip in server environment', async () => {
      const originalWindow = global.window
      delete (global as any).window

      const mockOnPerfEntry = jest.fn()
      await reportWebVitals(mockOnPerfEntry)

      // Should not call the callback
      expect(mockOnPerfEntry).not.toHaveBeenCalled()

      // Restore window
      ;(global as any).window = originalWindow
    })
  })

  describe('trackBundleSize', () => {
    it('should track bundle load time from navigation timing', () => {
      const mockNavigationEntry = {
        loadEventEnd: 2000,
        fetchStart: 1000,
      }

      mockPerformance.getEntriesByType.mockReturnValue([mockNavigationEntry])

      trackBundleSize()

      // Should have tracked the metric
      const monitor = usePerformanceMonitor()
      const summary = monitor.getSummary()
      expect(summary.totalMetrics).toBeGreaterThan(0)
    })

    it('should handle missing navigation timing gracefully', () => {
      mockPerformance.getEntriesByType.mockReturnValue([])

      // Should not throw
      expect(() => trackBundleSize()).not.toThrow()
    })

    it('should skip in server environment', () => {
      const originalWindow = global.window
      delete (global as any).window

      // Should not throw
      expect(() => trackBundleSize()).not.toThrow()

      // Restore window
      ;(global as any).window = originalWindow
    })
  })

  describe('trackReactError', () => {
    it('should track React errors with component stack', () => {
      const testError = new Error('React component error')
      testError.stack = 'Error stack trace'

      const errorInfo = {
        componentStack: 'Component stack trace'
      }

      trackReactError(testError, errorInfo)

      const monitor = usePerformanceMonitor()
      const summary = monitor.getSummary()
      expect(summary.errorCount).toBeGreaterThan(0)
    })
  })

  describe('Performance Summary Calculations', () => {
    it('should calculate averages correctly', () => {
      const monitor = usePerformanceMonitor()

      // Track multiple LCP values
      monitor.trackMetric('LCP', 100)
      monitor.trackMetric('LCP', 200)
      monitor.trackMetric('LCP', 300)

      const summary = monitor.getSummary()
      expect(summary.averageLCP).toBe(200)
    })

    it('should filter metrics by time window', () => {
      const monitor = usePerformanceMonitor()

      // Mock Date.now to control timestamps
      const realDateNow = Date.now
      const mockNow = jest.fn(() => 1000000000) // 1 second ago
      Date.now = mockNow

      monitor.trackMetric('LCP', 100)

      // Advance time by 2 hours
      mockNow.mockReturnValue(1000000000 + (2 * 60 * 60 * 1000))

      monitor.trackMetric('LCP', 200)

      const summary = monitor.getSummary()

      // Should have 2 total metrics but only 1 recent (within last hour)
      expect(summary.totalMetrics).toBe(2)
      expect(summary.recentMetrics).toBe(1)

      // Restore Date.now
      Date.now = realDateNow
    })
  })
})