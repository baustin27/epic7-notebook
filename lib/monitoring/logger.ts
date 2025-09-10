/**
 * Error Logging and Monitoring System
 * Comprehensive logging with multiple transports and error tracking
 */

import { config, isDevelopment, isProduction, features } from '@/lib/config'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, any>
  stack?: string
  userId?: string
  sessionId?: string
  requestId?: string
  ip?: string
  userAgent?: string
}

export interface ErrorContext {
  userId?: string
  sessionId?: string
  requestId?: string
  endpoint?: string
  method?: string
  ip?: string
  userAgent?: string
  additionalData?: Record<string, any>
}

class Logger {
  private static instance: Logger
  private logs: LogEntry[] = []
  private maxLogs = 10000

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  // Core logging method
  private log(level: LogLevel, message: string, context?: ErrorContext, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      stack: error?.stack,
      userId: context?.userId,
      sessionId: context?.sessionId,
      requestId: context?.requestId,
      ip: context?.ip,
      userAgent: context?.userAgent,
    }

    this.logs.push(entry)

    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Output to console in development
    if (features.enableDetailedLogging) {
      this.consoleOutput(entry)
    }

    // Send to external services in production
    if (features.enableErrorReporting) {
      this.sendToMonitoring(entry)
    }

    // Write to file system (optional)
    this.writeToFile(entry)
  }

  // Console output with formatting
  private consoleOutput(entry: LogEntry) {
    const timestamp = entry.timestamp.toISOString()
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`
    
    const contextStr = entry.context 
      ? ` | Context: ${JSON.stringify(entry.context, null, 2)}` 
      : ''

    switch (entry.level) {
      case 'error':
        console.error(`${prefix} ${entry.message}${contextStr}`)
        if (entry.stack) console.error(entry.stack)
        break
      case 'warn':
        console.warn(`${prefix} ${entry.message}${contextStr}`)
        break
      case 'info':
        console.info(`${prefix} ${entry.message}${contextStr}`)
        break
      case 'debug':
        console.debug(`${prefix} ${entry.message}${contextStr}`)
        break
    }
  }

  // Send to monitoring service (Sentry, etc.)
  private async sendToMonitoring(entry: LogEntry) {
    if (!config.SENTRY_DSN || entry.level === 'debug') return

    try {
      // In production, integrate with actual monitoring service
      // For now, we'll simulate the call
      if (isProduction) {
        // await Sentry.captureException(entry)
        console.log(`Would send to monitoring:`, entry)
      }
    } catch (error) {
      console.error('Failed to send to monitoring service:', error)
    }
  }

  // Write to file system (optional)
  private async writeToFile(entry: LogEntry) {
    if (!isDevelopment) return

    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      
      const logDir = path.join(process.cwd(), '.ai')
      const logFile = path.join(logDir, 'debug-log.md')
      
      // Ensure directory exists
      try {
        await fs.access(logDir)
      } catch {
        await fs.mkdir(logDir, { recursive: true })
      }

      const logLine = this.formatForFile(entry)
      await fs.appendFile(logFile, logLine + '\n')
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  // Format log entry for file output
  private formatForFile(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const level = entry.level.toUpperCase()
    const context = entry.context ? ` | ${JSON.stringify(entry.context)}` : ''
    const stack = entry.stack ? `\n\`\`\`\n${entry.stack}\n\`\`\`` : ''
    
    return `## ${timestamp} - ${level}\n\n${entry.message}${context}${stack}`
  }

  // Public logging methods
  error(message: string, context?: ErrorContext, error?: Error) {
    this.log('error', message, context, error)
  }

  warn(message: string, context?: ErrorContext) {
    this.log('warn', message, context)
  }

  info(message: string, context?: ErrorContext) {
    this.log('info', message, context)
  }

  debug(message: string, context?: ErrorContext) {
    if (config.LOG_LEVEL === 'debug') {
      this.log('debug', message, context)
    }
  }

  // Get recent logs
  getRecentLogs(level?: LogLevel, limit: number = 100): LogEntry[] {
    let filteredLogs = level 
      ? this.logs.filter(log => log.level === level)
      : this.logs

    return filteredLogs.slice(-limit).reverse()
  }

  // Clear logs
  clearLogs() {
    this.logs = []
  }

  // Health check
  healthCheck(): { status: 'ok' | 'warning' | 'error', details: Record<string, any> } {
    const recentErrors = this.getRecentLogs('error', 10)
    const recentWarnings = this.getRecentLogs('warn', 10)
    
    const errorCount = recentErrors.length
    const warningCount = recentWarnings.length
    
    let status: 'ok' | 'warning' | 'error' = 'ok'
    
    if (errorCount > 5) {
      status = 'error'
    } else if (errorCount > 0 || warningCount > 10) {
      status = 'warning'
    }

    return {
      status,
      details: {
        totalLogs: this.logs.length,
        recentErrors: errorCount,
        recentWarnings: warningCount,
        logLevel: config.LOG_LEVEL,
        monitoringEnabled: features.enableErrorReporting,
      }
    }
  }
}

export const logger = Logger.getInstance()

// Error boundary for API routes
export function withErrorLogging<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Partial<ErrorContext>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      logger.error(
        `Error in ${fn.name || 'anonymous function'}`,
        context,
        error as Error
      )
      throw error
    }
  }
}

// Request context helper
export function createRequestContext(req: any): ErrorContext {
  return {
    requestId: req.headers?.['x-request-id'] || generateRequestId(),
    endpoint: req.url,
    method: req.method,
    ip: getClientIP(req),
    userAgent: req.headers?.['user-agent'],
    userId: req.user?.id,
    sessionId: req.session?.id,
  }
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Get client IP address
function getClientIP(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for']
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = req.headers?.['x-real-ip']
  if (realIP) return realIP

  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         'unknown'
}

// Performance monitoring
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>()

  static startTimer(operation: string): () => void {
    const start = Date.now()
    
    return () => {
      const duration = Date.now() - start
      this.recordMetric(operation, duration)
      
      if (duration > 5000) { // Log slow operations
        logger.warn(`Slow operation detected: ${operation}`, {
          additionalData: { duration }
        })
      }
    }
  }

  static recordMetric(operation: string, value: number) {
    const existing = this.metrics.get(operation) || []
    existing.push(value)
    
    // Keep only recent metrics
    if (existing.length > 100) {
      existing.splice(0, existing.length - 100)
    }
    
    this.metrics.set(operation, existing)
  }

  static getMetrics(operation?: string) {
    if (operation) {
      const values = this.metrics.get(operation) || []
      return this.calculateStats(values)
    }

    const allMetrics: Record<string, any> = {}
    for (const [op, values] of this.metrics) {
      allMetrics[op] = this.calculateStats(values)
    }
    return allMetrics
  }

  private static calculateStats(values: number[]) {
    if (values.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0 }
    }

    const sorted = [...values].sort((a, b) => a - b)
    const sum = values.reduce((a, b) => a + b, 0)
    
    return {
      count: values.length,
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(values.length * 0.5)],
      p95: sorted[Math.floor(values.length * 0.95)],
    }
  }
}

// Export convenience functions
export const logError = (message: string, context?: ErrorContext, error?: Error) => 
  logger.error(message, context, error)

export const logWarn = (message: string, context?: ErrorContext) => 
  logger.warn(message, context)

export const logInfo = (message: string, context?: ErrorContext) => 
  logger.info(message, context)

export const logDebug = (message: string, context?: ErrorContext) => 
  logger.debug(message, context)