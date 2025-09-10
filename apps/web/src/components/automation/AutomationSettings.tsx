'use client'

import { useState, useEffect } from 'react'
import { AutomationSettings as AutomationSettingsType } from '../../types/automation'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface AutomationSettingsProps {
  isOpen: boolean
  onClose: () => void
  currentSettings: AutomationSettingsType
  onUpdateSettings: (settings: Partial<AutomationSettingsType>) => Promise<void>
}

export function AutomationSettings({
  isOpen,
  onClose,
  currentSettings,
  onUpdateSettings
}: AutomationSettingsProps) {
  const [settings, setSettings] = useState<AutomationSettingsType>(currentSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setSettings(currentSettings)
    setHasChanges(false)
  }, [currentSettings])

  const updateSetting = <K extends keyof AutomationSettingsType>(
    key: K,
    value: AutomationSettingsType[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onUpdateSettings(settings)
      setHasChanges(false)
      onClose()
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setSettings(currentSettings)
    setHasChanges(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              ⚙️ Automation Settings
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Configure how automation features work for you
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-8">
            {/* General Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                General Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Enable Automation</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Turn automation features on or off
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => updateSetting('enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Require Confirmation</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Ask for confirmation before applying automated actions
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.confirmation_required}
                      onChange={(e) => updateSetting('confirmation_required', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Pattern Detection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Pattern Detection
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Pattern Detection</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Automatically detect repetitive patterns in conversations
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.pattern_detection_enabled}
                      onChange={(e) => updateSetting('pattern_detection_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confidence Threshold
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={settings.confidence_threshold}
                      onChange={(e) => updateSetting('confidence_threshold', parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem]">
                      {Math.round(settings.confidence_threshold * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Minimum confidence level required for suggestions
                  </p>
                </div>
              </div>
            </div>

            {/* Workflow Suggestions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Workflow Suggestions
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">AI-Powered Suggestions</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Use AI to generate workflow suggestions
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.workflow_suggestions_enabled}
                      onChange={(e) => updateSetting('workflow_suggestions_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Context-Aware Suggestions</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Consider conversation context for better suggestions
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.context_aware_suggestions_enabled}
                      onChange={(e) => updateSetting('context_aware_suggestions_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Suggestions Per Message
                  </label>
                  <select
                    value={settings.max_suggestions_per_message}
                    onChange={(e) => updateSetting('max_suggestions_per_message', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
                  >
                    <option value={1}>1 suggestion</option>
                    <option value={2}>2 suggestions</option>
                    <option value={3}>3 suggestions</option>
                    <option value={5}>5 suggestions</option>
                    <option value={10}>10 suggestions</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Auto-Apply Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Auto-Apply Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Auto-Apply High Confidence</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Automatically apply suggestions with high confidence
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.auto_apply_high_confidence}
                      onChange={(e) => updateSetting('auto_apply_high_confidence', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settings.auto_apply_high_confidence && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      High Confidence Threshold
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="0.7"
                        max="1.0"
                        step="0.05"
                        value={settings.high_confidence_threshold}
                        onChange={(e) => updateSetting('high_confidence_threshold', parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem]">
                        {Math.round(settings.high_confidence_threshold * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Suggestions above this threshold will be applied automatically
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Privacy & Security
                  </h4>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                    <p>
                      Automation patterns are analyzed locally and stored securely.
                      AI suggestions are generated using your conversation context but never shared with third parties.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset Changes
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}