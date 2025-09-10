'use client'

import { useState, useEffect } from 'react'
import { useOfflineStorage } from '../../hooks/useOfflineStorage'
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

interface OfflineIndicatorProps {
  className?: string
  showDetails?: boolean
}

export function OfflineIndicator({ className = '', showDetails = false }: OfflineIndicatorProps) {
  const { isOnline, syncStatus } = useOfflineStorage()
  const [showExpanded, setShowExpanded] = useState(false)

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-600 dark:text-red-400'
    if (syncStatus.isSyncing) return 'text-yellow-600 dark:text-yellow-400'
    if (syncStatus.pendingItems > 0) return 'text-orange-600 dark:text-orange-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />
    if (syncStatus.isSyncing) return <RefreshCw className="w-4 h-4 animate-spin" />
    if (syncStatus.pendingItems > 0) return <AlertCircle className="w-4 h-4" />
    return <CheckCircle className="w-4 h-4" />
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    if (syncStatus.isSyncing) return 'Syncing...'
    if (syncStatus.pendingItems > 0) return `${syncStatus.pendingItems} pending`
    return 'Online'
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowExpanded(!showExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${getStatusColor()} ${
          isOnline
            ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
            : 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
        }`}
        aria-label={`Connection status: ${getStatusText()}`}
      >
        {getStatusIcon()}
        <span className="hidden sm:inline">{getStatusText()}</span>
        {showDetails && (
          <svg
            className={`w-4 h-4 transition-transform ${showExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {showDetails && showExpanded && (
        <div className="absolute top-full mt-2 right-0 z-50 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Connection Status
              </span>
              <div className={`flex items-center gap-1 ${getStatusColor()}`}>
                {getStatusIcon()}
                <span className="text-xs">{getStatusText()}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Network:</span>
                <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                  {isOnline ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {syncStatus.lastSync && (
                <div className="flex justify-between">
                  <span>Last sync:</span>
                  <span>{syncStatus.lastSync.toLocaleTimeString()}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Pending items:</span>
                <span className={syncStatus.pendingItems > 0 ? 'text-orange-600' : 'text-green-600'}>
                  {syncStatus.pendingItems}
                </span>
              </div>

              {syncStatus.isSyncing && (
                <div className="flex items-center gap-2 text-yellow-600">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Syncing changes...</span>
                </div>
              )}
            </div>

            {!isOnline && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-800 dark:text-blue-200">
                <Wifi className="w-3 h-3 inline mr-1" />
                You'll be able to view recent conversations and compose messages offline.
                Changes will sync when connection is restored.
              </div>
            )}

            {syncStatus.pendingItems > 0 && isOnline && (
              <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-orange-800 dark:text-orange-200">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                {syncStatus.pendingItems} item{syncStatus.pendingItems !== 1 ? 's' : ''} waiting to sync.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for header/status bar
export function CompactOfflineIndicator({ className = '' }: { className?: string }) {
  const { isOnline, syncStatus } = useOfflineStorage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Wifi className="w-4 h-4 text-gray-400" />
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {isOnline ? (
        <Wifi className="w-4 h-4 text-green-600" />
      ) : (
        <WifiOff className="w-4 h-4 text-red-600" />
      )}

      {syncStatus.isSyncing && (
        <RefreshCw className="w-3 h-3 text-yellow-600 animate-spin" />
      )}

      {syncStatus.pendingItems > 0 && (
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-orange-600" />
          <span className="text-xs text-orange-600">{syncStatus.pendingItems}</span>
        </div>
      )}
    </div>
  )
}