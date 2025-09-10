'use client'

import React, { useState } from 'react'
import { useAdminFeatureFlags } from '../../hooks/useFeatureFlags'
import { FeatureDisabledError, type MonitoredFeature } from '../../lib/monitoring/provider-monitor'

/**
 * Feature Toggle Panel Component
 * 
 * Admin interface for managing feature flags with real-time updates
 * Shows current state and allows toggling features on/off
 */

interface FeatureTogglePanelProps {
  className?: string
  onFeatureToggle?: (feature: string, enabled: boolean) => void
}

export const FeatureTogglePanel: React.FC<FeatureTogglePanelProps> = ({
  className = '',
  onFeatureToggle
}) => {
  const { flags, allFlags, loading, error, isAdmin, toggleFeature, refreshFlags } = useAdminFeatureFlags()
  const [toggling, setToggling] = useState<string | null>(null)
  const [lastToggleError, setLastToggleError] = useState<string | null>(null)

  const handleToggle = async (feature: MonitoredFeature, currentEnabled: boolean) => {
    setToggling(feature)
    setLastToggleError(null)
    
    try {
      const success = await toggleFeature(feature, !currentEnabled)
      if (success) {
        onFeatureToggle?.(feature, !currentEnabled)
      } else {
        setLastToggleError(`Failed to toggle ${feature}`)
      }
    } catch (err) {
      setLastToggleError(err instanceof Error ? err.message : `Failed to toggle ${feature}`)
    } finally {
      setToggling(null)
    }
  }

  const handleRefresh = async () => {
    setLastToggleError(null)
    await refreshFlags()
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-6 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="text-red-800">
          <h3 className="font-semibold mb-2">Access Denied</h3>
          <p>You don't have permission to manage feature flags.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="text-red-800">
          <h3 className="font-semibold mb-2">Error Loading Feature Flags</h3>
          <p className="mb-3">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const featureDescriptions: Record<MonitoredFeature, string> = {
    'chat': 'Main chat conversation functionality',
    'writing_assistant': 'AI writing assistant and suggestions',
    'model_management': 'Model testing and management features',
    'prompt_library': 'Prompt library and template management',
    'file_upload': 'File upload and processing capabilities',
    'conversation_export': 'Conversation export and sharing'
  }

  const sortedFlags = allFlags.sort((a, b) => a.feature_name.localeCompare(b.feature_name))

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Feature Toggles</h2>
          <button
            onClick={handleRefresh}
            className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-gray-700"
          >
            Refresh
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Control which AI-powered features are enabled. Changes take effect immediately.
        </p>
      </div>

      <div className="p-6">
        {lastToggleError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800">{lastToggleError}</p>
          </div>
        )}

        {sortedFlags.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No feature flags found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedFlags.map((flag) => {
              const isToggling = toggling === flag.feature_name
              const description = featureDescriptions[flag.feature_name as MonitoredFeature] || flag.description

              return (
                <div
                  key={flag.feature_name}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900 capitalize">
                        {flag.feature_name.replace(/_/g, ' ')}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          flag.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {description && (
                      <p className="text-sm text-gray-600 mt-1">{description}</p>
                    )}
                    {flag.updated_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Last updated: {new Date(flag.updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggle(flag.feature_name as MonitoredFeature, flag.enabled)}
                      disabled={isToggling}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        flag.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-transform ${
                          flag.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    
                    {isToggling && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{sortedFlags.length} features configured</span>
          <span>{sortedFlags.filter(f => f.enabled).length} enabled</span>
        </div>
      </div>
    </div>
  )
}

// Component for displaying when a feature is disabled
export const FeatureDisabledMessage: React.FC<{
  feature: string
  message?: string
  className?: string
}> = ({ feature, message, className = '' }) => {
  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Feature Temporarily Disabled
          </h3>
          <div className="mt-1 text-sm text-yellow-700">
            <p>
              {message || `The ${feature.replace(/_/g, ' ')} feature is currently disabled by an administrator.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for components to check and handle disabled features
export const useFeatureGuard = (feature: MonitoredFeature) => {
  const { isFeatureEnabled } = useAdminFeatureFlags()
  
  const checkFeature = (action: () => void | Promise<void>) => {
    return async () => {
      const enabled = isFeatureEnabled(feature)
      if (!enabled) {
        throw new FeatureDisabledError(feature)
      }
      return action()
    }
  }

  return {
    isEnabled: isFeatureEnabled(feature),
    guardedAction: checkFeature,
    FeatureDisabledMessage: (props: { message?: string; className?: string }) => (
      <FeatureDisabledMessage feature={feature} {...props} />
    )
  }
}