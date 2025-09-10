'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '../ui/Skeleton'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorMessage } from '../ui/ErrorMessage'
import { ConfirmDialog } from '../ui/ConfirmDialog'

interface SystemConfig {
  id: string
  config_key: string
  config_value: any
  config_type: 'string' | 'number' | 'boolean' | 'json' | 'array'
  description: string
  category: string
  is_editable: boolean
  requires_restart: boolean
  validation_rules: any
  updated_at: string
}

interface ConfigCategory {
  name: string
  configs: SystemConfig[]
}

export function SystemConfiguration() {
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [categories, setCategories] = useState<ConfigCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('general')
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  useEffect(() => {
    fetchConfigurations()
  }, [])

  useEffect(() => {
    // Group configs by category
    const grouped = configs.reduce((acc, config) => {
      const category = acc.find(cat => cat.name === config.category)
      if (category) {
        category.configs.push(config)
      } else {
        acc.push({ name: config.category, configs: [config] })
      }
      return acc
    }, [] as ConfigCategory[])

    setCategories(grouped)
  }, [configs])

  const fetchConfigurations = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/system-config')
      if (!response.ok) {
        throw new Error('Failed to fetch system configuration')
      }

      const data = await response.json()
      setConfigs(data.configs || [])
    } catch (err) {
      console.error('Error fetching configurations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load configurations')
    } finally {
      setLoading(false)
    }
  }

  const updateConfiguration = async (configKey: string, newValue: any, configType: string) => {
    try {
      setSaving(configKey)

      const response = await fetch('/api/admin/system-config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          configKey,
          value: newValue,
          type: configType
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update configuration')
      }

      // Refresh configurations
      await fetchConfigurations()
    } catch (err) {
      console.error('Error updating configuration:', err)
      setError(err instanceof Error ? err.message : 'Failed to update configuration')
    } finally {
      setSaving(null)
    }
  }

  const handleValueChange = (config: SystemConfig, newValue: any) => {
    let processedValue = newValue

    // Process value based on type
    switch (config.config_type) {
      case 'number':
        processedValue = Number(newValue)
        if (isNaN(processedValue)) {
          setError('Invalid number value')
          return
        }
        break
      case 'boolean':
        processedValue = Boolean(newValue)
        break
      case 'json':
      case 'array':
        try {
          processedValue = JSON.parse(newValue)
        } catch (e) {
          setError('Invalid JSON format')
          return
        }
        break
    }

    if (config.requires_restart) {
      setConfirmDialog({
        isOpen: true,
        title: 'Restart Required',
        message: `Changing "${config.config_key}" requires a system restart. Are you sure you want to proceed?`,
        onConfirm: () => {
          updateConfiguration(config.config_key, processedValue, config.config_type)
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })
        }
      })
    } else {
      updateConfiguration(config.config_key, processedValue, config.config_type)
    }
  }

  const renderConfigValue = (config: SystemConfig) => {
    const isSaving = saving === config.config_key

    if (!config.is_editable) {
      return (
        <div className="text-sm text-gray-500 italic">
          {typeof config.config_value === 'object'
            ? JSON.stringify(config.config_value, null, 2)
            : String(config.config_value)
          }
        </div>
      )
    }

    switch (config.config_type) {
      case 'boolean':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={Boolean(config.config_value)}
              onChange={(e) => handleValueChange(config, e.target.checked)}
              disabled={isSaving}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              {Boolean(config.config_value) ? 'Enabled' : 'Disabled'}
            </span>
            {isSaving && <LoadingSpinner size="sm" />}
          </label>
        )

      case 'number':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={config.config_value || ''}
              onChange={(e) => handleValueChange(config, e.target.value)}
              disabled={isSaving}
              className="w-32 px-3 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            {isSaving && <LoadingSpinner size="sm" />}
          </div>
        )

      case 'json':
      case 'array':
        return (
          <div className="space-y-2">
            <textarea
              value={JSON.stringify(config.config_value, null, 2)}
              onChange={(e) => handleValueChange(config, e.target.value)}
              disabled={isSaving}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            {isSaving && <LoadingSpinner size="sm" />}
          </div>
        )

      default: // string
        return (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={config.config_value || ''}
              onChange={(e) => handleValueChange(config, e.target.value)}
              disabled={isSaving}
              className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            {isSaving && <LoadingSpinner size="sm" />}
          </div>
        )
    }
  }

  if (loading) {
    return <SystemConfigurationSkeleton />
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <ErrorMessage message={error} />
          <button
            onClick={fetchConfigurations}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            System Configuration
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage application settings and system parameters
          </p>
        </div>

        <button
          onClick={fetchConfigurations}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md"
        >
          Refresh
        </button>
      </div>

      {/* Category Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => setActiveCategory(category.name)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeCategory === category.name
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                  {category.configs.length}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Configuration Items */}
      <div className="space-y-6">
        {categories
          .filter(category => category.name === activeCategory)
          .map(category => (
            <div key={category.name} className="space-y-4">
              {category.configs.map((config) => (
                <div key={config.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {config.config_key}
                        </h3>
                        {config.requires_restart && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Requires Restart
                          </span>
                        )}
                        {!config.is_editable && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            Read Only
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {config.description}
                      </p>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Value
                        </label>
                        {renderConfigValue(config)}
                      </div>

                      <div className="mt-4 text-xs text-gray-500">
                        Last updated: {new Date(config.updated_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
      />
    </div>
  )
}

function SystemConfigurationSkeleton() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Skeleton className="h-10 w-20" />
      </div>

      <div className="mb-6">
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}