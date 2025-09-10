'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Track the error with performance monitoring
    if (typeof window !== 'undefined') {
      import('../../lib/performance').then(({ trackReactError }) => {
        trackReactError(error, errorInfo)
      }).catch(e => console.warn('Failed to track React error:', e))
    }
    
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary bg-white border border-gray-200 rounded-lg p-6 max-w-md mx-auto shadow-sm">
          <div className="flex items-center mb-4">
            <div className="bg-amber-100 p-2 rounded-full mr-3">
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Service Temporarily Unavailable</h2>
          </div>
          <p className="text-gray-600 mb-4">
            We're experiencing a temporary service interruption. Your work is safe and we're working to restore full functionality.
          </p>
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Recommended actions:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Refresh the application
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Check your connection
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Contact support if issue persists
              </li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Refresh Application
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary