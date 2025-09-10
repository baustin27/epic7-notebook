'use client'

import { useState } from 'react'
import { useOfflineStorage } from '../../hooks/useOfflineStorage'
import { RefreshCw, CheckCircle, AlertTriangle, Clock, Wifi, WifiOff } from 'lucide-react'

interface SyncStatusProps {
  className?: string
  compact?: boolean
}

export function SyncStatus({ className = '', compact = false }: SyncStatusProps) {
  const { syncStatus, processOfflineQueue } = useOfflineStorage()
  const [isManualSyncing, setIsManualSyncing] = useState(false)

  const handleManualSync = async () => {
    if (syncStatus.isSyncing || isManualSyncing) return

    setIsManualSyncing(true)
    try {
      await processOfflineQueue()
    } finally {
      setIsManualSyncing(false)
    }
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        {syncStatus.isSyncing || isManualSyncing ? (
          <div className="flex items-center gap-1 text-yellow-600">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Syncing...</span>
          </div>
        ) : syncStatus.pendingItems > 0 ? (
          <div className="flex items-center gap-1 text-orange-600">
            <AlertTriangle className="w-4 h-4" />
            <span>{syncStatus.pendingItems} pending</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>Synced</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Sync Status
        </h3>

        {syncStatus.pendingItems > 0 && syncStatus.isOnline && (
          <button
            onClick={handleManualSync}
            disabled={syncStatus.isSyncing || isManualSyncing}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(syncStatus.isSyncing || isManualSyncing) ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Sync Now
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Connection:</span>
          <div className="flex items-center gap-1">
            {syncStatus.isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-600" />
                <span className="text-red-600">Offline</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Pending items:</span>
          <span className={syncStatus.pendingItems > 0 ? 'text-orange-600' : 'text-green-600'}>
            {syncStatus.pendingItems}
          </span>
        </div>

        {syncStatus.lastSync && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Last sync:</span>
            <div className="flex items-center gap-1 text-gray-900 dark:text-gray-100">
              <Clock className="w-3 h-3" />
              <span>{syncStatus.lastSync.toLocaleString()}</span>
            </div>
          </div>
        )}

        {(syncStatus.isSyncing || isManualSyncing) && (
          <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Syncing changes...</span>
          </div>
        )}

        {!syncStatus.isOnline && syncStatus.pendingItems > 0 && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
            <WifiOff className="w-4 h-4" />
            <span>Changes will sync when connection is restored</span>
          </div>
        )}

        {syncStatus.isOnline && syncStatus.pendingItems === 0 && !syncStatus.isSyncing && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
            <CheckCircle className="w-4 h-4" />
            <span>All changes are synced</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Toast notification for sync events
export function SyncToast({ message, type = 'info', onClose }: {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  onClose?: () => void
}) {
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      default: return <Clock className="w-5 h-5 text-blue-600" />
    }
  }

  const getBgColor = () => {
    switch (type) {
      case 'success': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'error': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      default: return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
  }

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg border ${getBgColor()}`}>
      {getIcon()}
      <p className="text-sm text-gray-900 dark:text-gray-100 flex-1">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}