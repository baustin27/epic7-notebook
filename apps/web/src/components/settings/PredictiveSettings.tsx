'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/SimpleAuthContext'

export interface PredictiveSettingsData {
  // Predictive Text
  predictiveTextEnabled: boolean
  predictiveTextMaxSuggestions: number
  predictiveTextMinConfidence: number
  predictiveTextCompletionTypes: ('word' | 'phrase' | 'sentence')[]

  // Smart Response Suggestions
  smartResponsesEnabled: boolean
  smartResponsesMaxSuggestions: number
  smartResponsesMinConfidence: number
  smartResponsesPreferredTone: 'auto' | 'professional' | 'casual' | 'friendly' | 'formal'
  smartResponsesCategories: ('agreement' | 'question' | 'clarification' | 'elaboration' | 'alternative' | 'conclusion')[]

  // Conversation Flow Prediction
  flowPredictionEnabled: boolean
  flowPredictionMaxPredictions: number
  flowPredictionMinConfidence: number
  flowPredictionTypes: ('action' | 'question' | 'clarification' | 'follow_up' | 'transition')[]

  // Proactive Assistance
  proactiveAssistanceEnabled: boolean
  proactiveAssistanceMaxInterventions: number
  proactiveAssistanceMinConfidence: number
  proactiveAssistanceTypes: ('reminder' | 'suggestion' | 'warning' | 'help' | 'optimization')[]
  proactiveAssistanceAutoTrigger: boolean

  // General Settings
  debounceMs: number
  useConversationHistory: boolean
  respectCooldowns: boolean
}

const DEFAULT_SETTINGS: PredictiveSettingsData = {
  predictiveTextEnabled: true,
  predictiveTextMaxSuggestions: 5,
  predictiveTextMinConfidence: 0.3,
  predictiveTextCompletionTypes: ['word', 'phrase', 'sentence'],

  smartResponsesEnabled: true,
  smartResponsesMaxSuggestions: 4,
  smartResponsesMinConfidence: 0.4,
  smartResponsesPreferredTone: 'auto',
  smartResponsesCategories: ['agreement', 'question', 'clarification', 'elaboration', 'alternative', 'conclusion'],

  flowPredictionEnabled: true,
  flowPredictionMaxPredictions: 3,
  flowPredictionMinConfidence: 0.5,
  flowPredictionTypes: ['action', 'question', 'clarification', 'follow_up', 'transition'],

  proactiveAssistanceEnabled: true,
  proactiveAssistanceMaxInterventions: 2,
  proactiveAssistanceMinConfidence: 0.6,
  proactiveAssistanceTypes: ['reminder', 'suggestion', 'warning', 'help', 'optimization'],
  proactiveAssistanceAutoTrigger: false,

  debounceMs: 300,
  useConversationHistory: true,
  respectCooldowns: true
}

interface PredictiveSettingsProps {
  isOpen: boolean
  onClose: () => void
  onSave: (settings: PredictiveSettingsData) => void
  currentSettings?: Partial<PredictiveSettingsData>
}

export function PredictiveSettings({
  isOpen,
  onClose,
  onSave,
  currentSettings = {}
}: PredictiveSettingsProps) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<PredictiveSettingsData>({
    ...DEFAULT_SETTINGS,
    ...currentSettings
  })
  const [hasChanges, setHasChanges] = useState(false)

  // Track changes
  useEffect(() => {
    const originalSettings = { ...DEFAULT_SETTINGS, ...currentSettings }
    const changed = Object.keys(settings).some(key =>
      JSON.stringify(settings[key as keyof PredictiveSettingsData]) !==
      JSON.stringify(originalSettings[key as keyof PredictiveSettingsData])
    )
    setHasChanges(changed)
  }, [settings, currentSettings])

  const updateSetting = <K extends keyof PredictiveSettingsData>(
    key: K,
    value: PredictiveSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    onSave(settings)
    setHasChanges(false)
  }

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS, ...currentSettings })
    setHasChanges(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              🤖 Predictive AI Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-8">
            {/* Predictive Text Settings */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📝 Predictive Text Completion
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.predictiveTextEnabled}
                      onChange={(e) => updateSetting('predictiveTextEnabled', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Predictive Text
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Suggestions
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.predictiveTextMaxSuggestions}
                    onChange={(e) => updateSetting('predictiveTextMaxSuggestions', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={!settings.predictiveTextEnabled}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Confidence ({Math.round(settings.predictiveTextMinConfidence * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    value={settings.predictiveTextMinConfidence}
                    onChange={(e) => updateSetting('predictiveTextMinConfidence', parseFloat(e.target.value))}
                    className="w-full"
                    disabled={!settings.predictiveTextEnabled}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Completion Types
                  </label>
                  <div className="space-y-1">
                    {(['word', 'phrase', 'sentence'] as const).map(type => (
                      <label key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={settings.predictiveTextCompletionTypes.includes(type)}
                          onChange={(e) => {
                            const newTypes = e.target.checked
                              ? [...settings.predictiveTextCompletionTypes, type]
                              : settings.predictiveTextCompletionTypes.filter(t => t !== type)
                            updateSetting('predictiveTextCompletionTypes', newTypes)
                          }}
                          className="rounded"
                          disabled={!settings.predictiveTextEnabled}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Response Settings */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                💬 Smart Response Suggestions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.smartResponsesEnabled}
                      onChange={(e) => updateSetting('smartResponsesEnabled', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Smart Responses
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Preferred Tone
                  </label>
                  <select
                    value={settings.smartResponsesPreferredTone}
                    onChange={(e) => updateSetting('smartResponsesPreferredTone', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={!settings.smartResponsesEnabled}
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="friendly">Friendly</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Suggestions
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={settings.smartResponsesMaxSuggestions}
                    onChange={(e) => updateSetting('smartResponsesMaxSuggestions', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={!settings.smartResponsesEnabled}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Confidence ({Math.round(settings.smartResponsesMinConfidence * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.2"
                    max="0.8"
                    step="0.1"
                    value={settings.smartResponsesMinConfidence}
                    onChange={(e) => updateSetting('smartResponsesMinConfidence', parseFloat(e.target.value))}
                    className="w-full"
                    disabled={!settings.smartResponsesEnabled}
                  />
                </div>
              </div>
            </div>

            {/* Flow Prediction Settings */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🔮 Conversation Flow Prediction
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.flowPredictionEnabled}
                      onChange={(e) => updateSetting('flowPredictionEnabled', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Flow Prediction
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Predictions
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={settings.flowPredictionMaxPredictions}
                    onChange={(e) => updateSetting('flowPredictionMaxPredictions', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={!settings.flowPredictionEnabled}
                  />
                </div>
              </div>
            </div>

            {/* Proactive Assistance Settings */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🚀 Proactive Assistance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.proactiveAssistanceEnabled}
                      onChange={(e) => updateSetting('proactiveAssistanceEnabled', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Proactive Assistance
                    </span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.proactiveAssistanceAutoTrigger}
                      onChange={(e) => updateSetting('proactiveAssistanceAutoTrigger', e.target.checked)}
                      className="rounded"
                      disabled={!settings.proactiveAssistanceEnabled}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Auto-trigger Interventions
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* General Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                ⚙️ General Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Response Delay (ms)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="2000"
                    step="100"
                    value={settings.debounceMs}
                    onChange={(e) => updateSetting('debounceMs', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2 mt-6">
                    <input
                      type="checkbox"
                      checked={settings.useConversationHistory}
                      onChange={(e) => updateSetting('useConversationHistory', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Use Conversation History
                    </span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center space-x-2 mt-6">
                    <input
                      type="checkbox"
                      checked={settings.respectCooldowns}
                      onChange={(e) => updateSetting('respectCooldowns', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Respect Cooldowns
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {hasChanges ? 'Save Changes' : 'No Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}