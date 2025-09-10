// Global error handling utilities to prevent "[object Object]" and improve error reporting

export function safeStringify(obj: any): string {
  if (typeof obj === 'string') return obj
  if (obj === null || obj === undefined) return String(obj)
  
  try {
    return JSON.stringify(obj, null, 2)
  } catch (error) {
    // Fallback for circular references or non-serializable objects
    try {
      return Object.prototype.toString.call(obj)
    } catch {
      return '[Unserializable Object]'
    }
  }
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}\nStack: ${error.stack || 'No stack trace'}`
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  return safeStringify(error)
}

// Override console methods to prevent "[object Object]" errors
export function setupConsoleOverrides() {
  if (typeof window === 'undefined') return // Only run in browser
  
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn
  
  console.log = (...args: any[]) => {
    const safeArgs = args.map(arg => 
      typeof arg === 'object' && arg !== null ? safeStringify(arg) : arg
    )
    originalLog.apply(console, safeArgs)
  }
  
  console.error = (...args: any[]) => {
    const safeArgs = args.map(arg => 
      typeof arg === 'object' && arg !== null ? formatError(arg) : arg
    )
    originalError.apply(console, safeArgs)
  }
  
  console.warn = (...args: any[]) => {
    const safeArgs = args.map(arg => 
      typeof arg === 'object' && arg !== null ? safeStringify(arg) : arg
    )
    originalWarn.apply(console, safeArgs)
  }
}

// Global error handlers
export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return // Only run in browser
  
  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', formatError(event.error))
  })
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', formatError(event.reason))
  })
}