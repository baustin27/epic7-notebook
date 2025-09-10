// Error translation utilities for converting technical errors to user-friendly messages

export interface TranslatedError {
  title: string
  message: string
  userMessage: string
  technicalDetails?: string
  suggestedActions: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export const translateApiError = (error: any): TranslatedError => {
  const status = error.status || error.code
  const message = error.message || ''

  // HTTP Status Code translations
  const statusTranslations: Record<number, TranslatedError> = {
    400: {
      title: 'Invalid Request',
      message: 'The request could not be processed due to invalid data.',
      userMessage: 'Please check your input and try again. Make sure all required fields are filled correctly.',
      suggestedActions: [
        'Review and correct your input',
        'Check for special characters or formatting issues',
        'Try submitting again'
      ],
      severity: 'medium'
    },
    401: {
      title: 'Authentication Required',
      message: 'Authentication credentials are missing or invalid.',
      userMessage: 'Your session has expired. Please sign in again to continue.',
      suggestedActions: [
        'Sign in with your credentials',
        'Check if your account is active',
        'Contact support if issues persist'
      ],
      severity: 'medium'
    },
    403: {
      title: 'Access Denied',
      message: 'You do not have permission to perform this action.',
      userMessage: 'You don\'t have the necessary permissions for this action.',
      suggestedActions: [
        'Contact your administrator for access',
        'Check if you\'re using the correct account',
        'Try a different action'
      ],
      severity: 'medium'
    },
    404: {
      title: 'Not Found',
      message: 'The requested resource could not be found.',
      userMessage: 'The item you\'re looking for doesn\'t exist or may have been moved.',
      suggestedActions: [
        'Check the URL or link',
        'Try searching for the item',
        'Go back to the previous page'
      ],
      severity: 'low'
    },
    429: {
      title: 'Too Many Requests',
      message: 'Rate limit exceeded.',
      userMessage: 'You\'ve made too many requests. Please wait a moment before trying again.',
      suggestedActions: [
        'Wait 1-2 minutes before retrying',
        'Reduce the frequency of your requests',
        'Contact support for higher limits'
      ],
      severity: 'medium'
    },
    500: {
      title: 'Server Error',
      message: 'Internal server error occurred.',
      userMessage: 'We\'re experiencing technical difficulties. Our team has been notified.',
      suggestedActions: [
        'Try again in a few moments',
        'Check our status page for updates',
        'Contact support if the issue persists'
      ],
      severity: 'high'
    },
    502: {
      title: 'Bad Gateway',
      message: 'Invalid response from upstream server.',
      userMessage: 'There\'s a temporary issue with our services. Please try again.',
      suggestedActions: [
        'Refresh the page',
        'Try again in a few minutes',
        'Check your internet connection'
      ],
      severity: 'high'
    },
    503: {
      title: 'Service Unavailable',
      message: 'Service is temporarily unavailable.',
      userMessage: 'The service is temporarily down for maintenance. Please try again later.',
      suggestedActions: [
        'Try again in 5-10 minutes',
        'Check our status page',
        'Subscribe to updates'
      ],
      severity: 'high'
    }
  }

  // Network and connection errors
  if (message.includes('fetch') || message.includes('network') || !navigator.onLine) {
    return {
      title: 'Connection Issue',
      message: 'Network connectivity problem detected.',
      userMessage: 'Please check your internet connection and try again.',
      suggestedActions: [
        'Check your internet connection',
        'Try refreshing the page',
        'Contact your network administrator'
      ],
      severity: 'medium'
    }
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('aborted')) {
    return {
      title: 'Request Timeout',
      message: 'The request took too long to complete.',
      userMessage: 'The request is taking longer than expected. Please try again.',
      suggestedActions: [
        'Try again with a simpler request',
        'Check your connection speed',
        'Try during off-peak hours'
      ],
      severity: 'medium'
    }
  }

  // Return status-specific translation or generic error
  return statusTranslations[status] || {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred.',
    userMessage: 'Something went wrong. Our team has been notified and is working on a fix.',
    suggestedActions: [
      'Try refreshing the page',
      'Clear your browser cache',
      'Contact support with details'
    ],
    severity: 'medium',
    technicalDetails: message
  }
}

export const getErrorSeverityColor = (severity: TranslatedError['severity']): string => {
  switch (severity) {
    case 'low':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'medium':
      return 'text-amber-600 bg-amber-50 border-amber-200'
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export const logErrorSafely = (error: any, context: string = 'general') => {
  // Client-safe logging - no sensitive user data
  const safeLog = {
    timestamp: new Date().toISOString(),
    context,
    errorType: error?.name || 'Unknown',
    status: error?.status,
    userAgent: navigator.userAgent,
    url: window.location.href,
    // Don't log actual error messages that might contain sensitive data
    hasMessage: !!error?.message,
    messageLength: error?.message?.length || 0
  }

  console.error('Client Error Log:', safeLog)

  // In production, this would send to error reporting service
  // Example: errorReportingService.captureException(safeLog)
}