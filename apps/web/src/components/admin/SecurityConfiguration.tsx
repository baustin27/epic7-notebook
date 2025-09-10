'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '../ui/Skeleton'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorMessage } from '../ui/ErrorMessage'
import { ConfirmDialog } from '../ui/ConfirmDialog'

interface SecuritySetting {
  id: string
  key: string
  value: any
  type: 'boolean' | 'number' | 'string' | 'array'
  category: string
  description: string
  requires_restart: boolean
  validation_rules?: any
}

interface SecurityCategory {
  name: string
  settings: SecuritySetting[]
}

export function SecurityConfiguration() {
  const [settings, setSettings] = useState<SecuritySetting[]>([])
  const [categories, setCategories] = useState<SecurityCategory[]>([])
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
    fetchSecuritySettings()
  }, [])

  useEffect(() => {
    // Group settings by category
    const grouped = settings.reduce((acc, setting) => {
      const category = acc.find(cat => cat.name === setting.category)
      if (category) {
        category.settings.push(setting)
      } else {
        acc.push({ name: setting.category, settings: [setting] })
      }
      return acc
    }, [] as SecurityCategory[])

    setCategories(grouped)
  }, [settings])

  const fetchSecuritySettings = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/security/settings')
      if (!response.ok) {
        throw new Error('Failed to fetch security settings')
      }

      const data = await response.json()
      setSettings(data.settings || [])
    } catch (err) {
      console.error('Error fetching security settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load security settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSecuritySetting = async (settingKey: string, newValue: any, settingType: string) => {
    try {
      setSaving(settingKey)

      const response = await fetch('/api/admin/security/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          settingKey,
          value: newValue,
          type: settingType
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update security setting')
      }

      // Refresh settings
      await fetchSecuritySettings()
    } catch (err) {
      console.error('Error updating security setting:', err)
      setError(err instanceof Error ? err.message : 'Failed to update security setting')
    } finally {
      setSaving(null)
    }
  }

  const handleValueChange = (setting: SecuritySetting, newValue: any) => {
    let processedValue = newValue

    // Process value based on type
    switch (setting.type) {
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
      case 'array':
        try {
          processedValue = Array.isArray(newValue) ? newValue : JSON.parse(newValue)
        } catch (e) {
          setError('Invalid array format')
          return
        }
        break
    }

    if (setting.requires_restart) {
      setConfirmDialog({
        isOpen: true,
        title: 'Restart Required',
        message: `Changing "${setting.key}" requires a system restart. Are you sure you want to proceed?`,
        onConfirm: () => {
          updateSecuritySetting(setting.key, processedValue, setting.type)
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })
        }
      })
    } else {
      updateSecuritySetting(setting.key, processedValue, setting.type)
    }
  }

  const renderSettingValue = (setting: SecuritySetting) => {
    const isSaving = saving === setting.key

    if (setting.key.includes('password') || setting.key.includes('secret') || setting.key.includes('key')) {
      return (
        <div className="flex items-center space-x-2">
          <input
            type="password"
            placeholder="••••••••"
            onChange={(e) => handleValueChange(setting, e.target.value)}
            disabled={isSaving}
            className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          {isSaving && <LoadingSpinner size="sm" />}
        </div>
      )
    }

    switch (setting.type) {
      case 'boolean':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={Boolean(setting.value)}
              onChange={(e) => handleValueChange(setting, e.target.checked)}
              disabled={isSaving}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              {Boolean(setting.value) ? 'Enabled' : 'Disabled'}
            </span>
            {isSaving && <LoadingSpinner size="sm" />}
          </label>
        )

      case 'number':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={setting.value || ''}
              onChange={(e) => handleValueChange(setting, e.target.value)}
              disabled={isSaving}
              className="w-32 px-3 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            {isSaving && <LoadingSpinner size="sm" />}
          </div>
        )

      case 'array':
        return (
          <div className="space-y-2">
            <textarea
              value={Array.isArray(setting.value) ? JSON.stringify(setting.value, null, 2) : (setting.value || '')}
              onChange={(e) => handleValueChange(setting, e.target.value)}
              disabled={isSaving}
              rows={3}
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
              value={setting.value || ''}
              onChange={(e) => handleValueChange(setting, e.target.value)}
              disabled={isSaving}
              className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            {isSaving && <LoadingSpinner size="sm" />}
          </div>
        )
    }
  }

  const runSecurityScan = async () => {
    try {
      setSaving('scan')

      const response = await fetch('/api/admin/security/scan', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to run security scan')
      }

      const result = await response.json()
      alert(`Security scan completed. Found ${result.vulnerabilities} vulnerabilities.`)
    } catch (err) {
      console.error('Error running security scan:', err)
      setError('Failed to run security scan')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return <SecurityConfigurationSkeleton />
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <ErrorMessage message={error} />
          <button
            onClick={fetchSecuritySettings}
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
            Security Configuration
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage security settings and policies
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={runSecurityScan}
            disabled={saving === 'scan'}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {saving === 'scan' ? 'Scanning...' : 'Run Security Scan'}
          </button>

          <button
            onClick={fetchSecuritySettings}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md"
          >
            Refresh
          </button>
        </div>
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
                  {category.settings.length}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Security Settings */}
      <div className="space-y-6">
        {categories
          .filter(category => category.name === activeCategory)
          .map(category => (
            <div key={category.name} className="space-y-4">
              {category.settings.map((setting) => (
                <div key={setting.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {setting.key.replace(/_/g, ' ').toUpperCase()}
                        </h3>
                        {setting.requires_restart && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Requires Restart
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {setting.description}
                      </p>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Value
                        </label>
                        {renderSettingValue(setting)}
                      </div>

                      {setting.validation_rules && (
                        <div className="mt-4 text-xs text-gray-500">
                          Validation: {JSON.stringify(setting.validation_rules)}
                        </div>
                      )}
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

function SecurityConfigurationSkeleton() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-32" />
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