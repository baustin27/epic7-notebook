'use client'

import { useState, useEffect } from 'react'
import { openRouterAPI } from '../../lib/openrouter'

interface WritingAssistantSettingsProps {
  className?: string
}

interface WritingAssistantSettings {
  model: string
  enabled: boolean
  toneMode: 'auto' | 'formal' | 'casual' | 'professional' | 'friendly' | 'academic'
  suggestionTypes: ('grammar' | 'style' | 'tone' | 'content')[]
}

const AI_MODELS = [
  // Free Models (Recommended for Writing Assistant)
  {
    id: 'meta-llama/llama-3.1-8b-instruct:free',
    name: 'Llama 3.1 8B',
    provider: 'Meta',
    isFree: true,
    description: 'Fast and efficient for writing assistance',
    category: 'free'
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    name: 'Mistral 7B',
    provider: 'Mistral AI',
    isFree: true,
    description: 'Excellent for creative writing',
    category: 'free'
  },
  {
    id: 'huggingface/zephyr-7b-beta:free',
    name: 'Zephyr 7B',
    provider: 'Hugging Face',
    isFree: true,
    description: 'Fine-tuned for conversational writing',
    category: 'free'
  },

  // OpenAI Models
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    isFree: false,
    description: 'Efficient and affordable GPT-4 variant',
    category: 'premium'
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    isFree: false,
    description: 'Latest multimodal GPT-4 model',
    category: 'premium'
  },
  {
    id: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    isFree: false,
    description: 'Fast and reliable for most tasks',
    category: 'premium'
  },

  // Claude Models (Anthropic)
  {
    id: 'anthropic/claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    isFree: false,
    description: 'Excellent for nuanced writing and analysis',
    category: 'premium'
  },
  {
    id: 'anthropic/claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    isFree: false,
    description: 'Fast and concise responses',
    category: 'premium'
  },

  // Google Gemini Models
  {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    provider: 'Google',
    isFree: false,
    description: 'Advanced reasoning and long context',
    category: 'premium'
  },
  {
    id: 'google/gemini-flash-1.5',
    name: 'Gemini Flash 1.5',
    provider: 'Google',
    isFree: false,
    description: 'Faster responses with good quality',
    category: 'premium'
  },

  // xAI Models
  {
    id: 'xai/grok-beta',
    name: 'Grok Beta',
    provider: 'xAI',
    isFree: false,
    description: 'Creative and unconventional writing style',
    category: 'premium'
  }
]

const DEFAULT_SETTINGS: WritingAssistantSettings = {
  model: 'meta-llama/llama-3.1-8b-instruct:free',
  enabled: true,
  toneMode: 'auto',
  suggestionTypes: ['grammar', 'style', 'tone', 'content']
}

// Get default model based on environment
const getDefaultModel = (): string => {
  const availableModels = openRouterAPI.getAvailableModels()
  const preferredModel = DEFAULT_SETTINGS.model

  // If preferred model is available, use it
  if (availableModels.includes(preferredModel)) {
    return preferredModel
  }

  // Otherwise, use first available model
  return availableModels[0] || preferredModel
}

export function WritingAssistantSettings({ className }: WritingAssistantSettingsProps) {
  const [settings, setSettings] = useState<WritingAssistantSettings>({
    ...DEFAULT_SETTINGS,
    model: getDefaultModel()
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showAllModels, setShowAllModels] = useState(false)

  // Get available models based on environment
  const availableModels = openRouterAPI.getAvailableModels()
  const isDevelopment = openRouterAPI.isDevelopment()

  // Filter models based on user preference and environment
  const visibleModels = showAllModels && !isDevelopment
    ? AI_MODELS.filter(model => availableModels.includes(model.id))
    : AI_MODELS.filter(model => model.isFree && availableModels.includes(model.id))

  const selectedModel = AI_MODELS.find(model => model.id === settings.model)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('writingAssistantSettings')
      if (saved) {
        const parsedSettings = JSON.parse(saved)
        // Ensure the saved model is still available
        const availableModels = openRouterAPI.getAvailableModels()
        const model = availableModels.includes(parsedSettings.model)
          ? parsedSettings.model
          : getDefaultModel()

        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings, model })
      } else {
        // No saved settings, use defaults with environment-appropriate model
        setSettings({ ...DEFAULT_SETTINGS, model: getDefaultModel() })
      }
    } catch (error) {
      console.error('Failed to load writing assistant settings:', error)
      setSettings({ ...DEFAULT_SETTINGS, model: getDefaultModel() })
    }
    setIsLoading(false)
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('writingAssistantSettings', JSON.stringify(settings))
      } catch (error) {
        console.error('Failed to save writing assistant settings:', error)
      }
    }
  }, [settings, isLoading])

  const updateSetting = <K extends keyof WritingAssistantSettings>(
    key: K,
    value: WritingAssistantSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const toggleSuggestionType = (type: 'grammar' | 'style' | 'tone' | 'content') => {
    setSettings(prev => ({
      ...prev,
      suggestionTypes: prev.suggestionTypes.includes(type)
        ? prev.suggestionTypes.filter(t => t !== type)
        : [...prev.suggestionTypes, type]
    }))
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }


  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Writing Assistant
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Configure real-time writing suggestions and assistance features
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-white">
            Enable Writing Assistant
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Get real-time grammar, style, and content suggestions
          </p>
        </div>
        <button
          role="switch"
          aria-checked={settings.enabled}
          onClick={() => updateSetting('enabled', !settings.enabled)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            settings.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span className="sr-only">Enable writing assistant</span>
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              settings.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {settings.enabled && (
        <>
          {/* Model Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                AI Model
              </label>
              {!isDevelopment && (
                <button
                  type="button"
                  onClick={() => setShowAllModels(!showAllModels)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                >
                  {showAllModels ? 'Show only free models' : 'Show all models'}
                </button>
              )}
            </div>

            {/* Current Selection Display */}
            {selectedModel && (
              <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedModel.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      by {selectedModel.provider}
                    </span>
                    {selectedModel.isFree && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        Free
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {selectedModel.description}
                </p>
              </div>
            )}

            <select
              value={settings.model}
              onChange={(e) => updateSetting('model', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {/* Free Models Section */}
              <optgroup label={isDevelopment ? "🆓 Free Models (Development Mode)" : "🆓 Free Models (Recommended)"}>
                {AI_MODELS.filter(model => model.isFree && availableModels.includes(model.id)).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} • {model.provider}
                  </option>
                ))}
              </optgroup>

              {/* Premium Models Section - Only show if user wants to see all and not in development */}
              {showAllModels && !isDevelopment && (
                <>
                  <optgroup label="💎 OpenAI Models">
                    {AI_MODELS.filter(model => model.provider === 'OpenAI' && availableModels.includes(model.id)).map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} • Premium
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="🧠 Anthropic Models">
                    {AI_MODELS.filter(model => model.provider === 'Anthropic' && availableModels.includes(model.id)).map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} • Premium
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="🎯 Google Models">
                    {AI_MODELS.filter(model => model.provider === 'Google' && availableModels.includes(model.id)).map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} • Premium
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="⚡ xAI Models">
                    {AI_MODELS.filter(model => model.provider === 'xAI' && availableModels.includes(model.id)).map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} • Premium
                      </option>
                    ))}
                  </optgroup>
                </>
              )}
            </select>

            {!selectedModel?.isFree && (
              <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ Premium model selected. This will incur costs for writing assistance.
                </p>
              </div>
            )}

            {isDevelopment && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  🔒 Development Mode: Only free models are available to prevent accidental costs.
                </p>
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Free models are recommended for real-time writing assistance to avoid costs
            </p>
          </div>

          {/* Tone Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Tone Mode
            </label>
            <select
              value={settings.toneMode}
              onChange={(e) => updateSetting('toneMode', e.target.value as WritingAssistantSettings['toneMode'])}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="auto">Auto-detect</option>
              <option value="formal">Formal</option>
              <option value="casual">Casual</option>
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="academic">Academic</option>
            </select>
          </div>

          {/* Suggestion Types */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
              Suggestion Types
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'grammar', label: 'Grammar', description: 'Fix grammar errors' },
                { key: 'style', label: 'Style', description: 'Improve writing style' },
                { key: 'tone', label: 'Tone', description: 'Adjust tone and voice' },
                { key: 'content', label: 'Content', description: 'Content suggestions' }
              ].map(({ key, label, description }) => (
                <label key={key} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.suggestionTypes.includes(key as any)}
                    onChange={() => toggleSuggestionType(key as any)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Info about models and providers */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  AI Model Information
                </h4>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                  <p>• <strong>Free models</strong> are recommended for real-time writing assistance</p>
                  <p>• <strong>Premium models</strong> offer higher quality but incur costs</p>
                  <p>• Available providers: Meta, Mistral AI, OpenAI, Anthropic, Google, xAI</p>
                  <p>• All models work through OpenRouter for unified access</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}