'use client'

import { useState, useEffect } from 'react'
import { ModelSettingsService } from '../../lib/modelSettingsService'
import {
  ModelSettings,
  PRESET_TEMPLATES,
  PARAMETER_RANGES,
  PARAMETER_DESCRIPTIONS
} from '../../types/modelSettings'

interface AdvancedModelSettingsProps {
  isOpen: boolean
  onClose: () => void
  modelId: string
  modelName: string
}

export function AdvancedModelSettings({ isOpen, onClose, modelId, modelName }: AdvancedModelSettingsProps) {
  const [settings, setSettings] = useState<ModelSettings>({
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: '',
    topP: 1.0,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen && modelId) {
      loadSettings()
    }
  }, [isOpen, modelId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const modelSettings = await ModelSettingsService.getModelSettings(modelId)
      setSettings(modelSettings)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    // Validate settings
    const validation = ModelSettingsService.validateSettings(settings)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    try {
      setSaving(true)
      setErrors([])
      await ModelSettingsService.saveModelSettings(modelId, settings)
      onClose()
    } catch (error) {
      console.error('Failed to save settings:', error)
      setErrors(['Failed to save settings. Please try again.'])
    } finally {
      setSaving(false)
    }
  }

  const applyPreset = async (presetId: string) => {
    try {
      const preset = PRESET_TEMPLATES.find(p => p.id === presetId)
      if (preset) {
        setSettings({ ...preset.settings })
        setErrors([])
      }
    } catch (error) {
      console.error('Failed to apply preset:', error)
    }
  }

  const resetToDefaults = async () => {
    try {
      const defaultSettings = await ModelSettingsService.resetModelSettings(modelId)
      setSettings(defaultSettings)
      setErrors([])
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  }

  const updateSetting = (key: keyof ModelSettings, value: number | string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setErrors([]) // Clear errors when user makes changes
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Advanced Settings
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {modelName} ({modelId})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close advanced settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Sidebar - Presets */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Presets
            </h3>
            <div className="space-y-3">
              {PRESET_TEMPLATES.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{preset.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {preset.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {preset.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={resetToDefaults}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading settings...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Errors */}
                {errors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex">
                      <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-red-700 dark:text-red-400">
                        <ul className="list-disc list-inside space-y-1">
                          {errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Temperature: {settings.temperature.toFixed(1)}
                    </label>
                    <div className="group relative">
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {PARAMETER_DESCRIPTIONS.temperature}
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={PARAMETER_RANGES.temperature.min}
                    max={PARAMETER_RANGES.temperature.max}
                    step={PARAMETER_RANGES.temperature.step}
                    value={settings.temperature}
                    onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Precise (0.0)</span>
                    <span>Creative (1.0)</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Max Tokens: {settings.maxTokens}
                    </label>
                    <div className="group relative">
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {PARAMETER_DESCRIPTIONS.maxTokens}
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={PARAMETER_RANGES.maxTokens.min}
                    max={PARAMETER_RANGES.maxTokens.max}
                    step={PARAMETER_RANGES.maxTokens.step}
                    value={settings.maxTokens}
                    onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Short (100)</span>
                    <span>Long (4000)</span>
                  </div>
                </div>

                {/* Top-p */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Top-p: {settings.topP.toFixed(2)}
                    </label>
                    <div className="group relative">
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {PARAMETER_DESCRIPTIONS.topP}
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={PARAMETER_RANGES.topP.min}
                    max={PARAMETER_RANGES.topP.max}
                    step={PARAMETER_RANGES.topP.step}
                    value={settings.topP}
                    onChange={(e) => updateSetting('topP', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Focused (0.1)</span>
                    <span>Diverse (1.0)</span>
                  </div>
                </div>

                {/* Presence Penalty */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Presence Penalty: {settings.presencePenalty.toFixed(1)}
                    </label>
                    <div className="group relative">
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {PARAMETER_DESCRIPTIONS.presencePenalty}
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={PARAMETER_RANGES.presencePenalty.min}
                    max={PARAMETER_RANGES.presencePenalty.max}
                    step={PARAMETER_RANGES.presencePenalty.step}
                    value={settings.presencePenalty}
                    onChange={(e) => updateSetting('presencePenalty', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Repetitive (-2.0)</span>
                    <span>Novel (2.0)</span>
                  </div>
                </div>

                {/* Frequency Penalty */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Frequency Penalty: {settings.frequencyPenalty.toFixed(1)}
                    </label>
                    <div className="group relative">
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {PARAMETER_DESCRIPTIONS.frequencyPenalty}
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={PARAMETER_RANGES.frequencyPenalty.min}
                    max={PARAMETER_RANGES.frequencyPenalty.max}
                    step={PARAMETER_RANGES.frequencyPenalty.step}
                    value={settings.frequencyPenalty}
                    onChange={(e) => updateSetting('frequencyPenalty', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Repetitive (-2.0)</span>
                    <span>Varied (2.0)</span>
                  </div>
                </div>

                {/* System Prompt */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      System Prompt
                    </label>
                    <div className="group relative">
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {PARAMETER_DESCRIPTIONS.systemPrompt}
                      </div>
                    </div>
                  </div>
                  <textarea
                    value={settings.systemPrompt}
                    onChange={(e) => updateSetting('systemPrompt', e.target.value)}
                    placeholder="Enter a system prompt to customize the AI's behavior..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-vertical"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}