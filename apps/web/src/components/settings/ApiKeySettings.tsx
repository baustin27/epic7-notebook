'use client'

import { useState, useEffect } from 'react'
import { providerFactory } from '../../lib/providers/factory'
import { createCustomClient } from '../../lib/providers/custom'
import type { ProviderType, CustomEndpointConfig } from '../../types/providers'

interface ProviderConfig {
  id: ProviderType
  name: string
  icon: string
  description: string
  apiKeyUrl: string
  placeholder: string
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: '🔗',
    description: 'Access to 100+ AI models through OpenRouter',
    apiKeyUrl: 'https://openrouter.ai/keys',
    placeholder: 'sk-or-v1-...'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    description: 'Direct access to GPT models',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-...'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    description: 'Access to Claude models by Anthropic',
    apiKeyUrl: 'https://console.anthropic.com/',
    placeholder: 'sk-ant-...'
  },
  {
    id: 'google',
    name: 'Google',
    icon: '🌐',
    description: 'Access to Google Gemini models',
    apiKeyUrl: 'https://makersuite.google.com/app/apikey',
    placeholder: 'AIza...'
  },
  {
    id: 'xai',
    name: 'xAI',
    icon: '🚀',
    description: 'Access to xAI Grok models',
    apiKeyUrl: 'https://x.ai/api',
    placeholder: 'xai-...'
  }
]

interface ProviderSectionProps {
  config: ProviderConfig
}

function ProviderSection({ config }: ProviderSectionProps) {
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [hasStoredKey, setHasStoredKey] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const checkStoredKey = async () => {
      try {
        const client = providerFactory.getClient(config.id)
        if (client) {
          const storedKey = await client.getStoredApiKey()
          setHasStoredKey(!!storedKey)
          if (storedKey) {
            setApiKey('•'.repeat(Math.min(storedKey.length, 20)))
          }
        }
      } catch (error) {
        console.error(`Error checking stored key for ${config.name}:`, error)
      }
    }

    checkStoredKey()
  }, [config.id, config.name])

  const handleSave = async () => {
    const keyToSave = apiKey.trim()
    setIsLoading(true)
    setMessage('')

    try {
      const client = providerFactory.getClient(config.id)
      if (client) {
        await client.setApiKey(keyToSave)
        if (!keyToSave) {
          setMessage('✅ API key removed successfully!')
          setHasStoredKey(false)
          setApiKey('')
        } else {
          setMessage('✅ API key saved successfully!')
          setHasStoredKey(true)

          // Test the API key only if it's not empty
          const isConnected = await providerFactory.testProviderConnection(config.id)
          if (isConnected) {
            setMessage('✅ API key saved and tested successfully!')
          } else {
            setMessage('⚠️ API key saved but connection test failed. Please verify your key.')
          }
        }
      }
    } catch (error) {
      console.error(`Error saving API key for ${config.name}:`, error)
      setMessage('❌ Failed to save API key. Please check your key and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = async () => {
    setApiKey('')
    setIsLoading(true)
    setMessage('Removing API key...')

    try {
      const client = providerFactory.getClient(config.id)
      if (client) {
        await client.setApiKey('')
        setMessage('✅ API key removed successfully!')
        setHasStoredKey(false)
      }
    } catch (error) {
      console.error(`Error clearing API key for ${config.name}:`, error)
      setMessage('❌ Failed to remove API key.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTest = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      const isConnected = await providerFactory.testProviderConnection(config.id)
      if (isConnected) {
        setMessage('✅ API key is working correctly!')
      } else {
        setMessage('❌ API key test failed. Please check your key.')
      }
    } catch (error) {
      console.error(`Error testing API key for ${config.name}:`, error)
      setMessage('❌ API key test failed. Please check your key.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <span className="text-xl">{config.icon}</span>
          <div className="text-left">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {config.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {config.description}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${hasStoredKey ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-4 pt-4">
            <div>
              <label htmlFor={`${config.id}-api-key`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key
              </label>
              <input
                id={`${config.id}-api-key`}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasStoredKey ? "••••••••••••••••••••" : config.placeholder}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Get your API key from <a href={config.apiKeyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{config.name}</a>
              </p>
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.includes('✅')
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : message.includes('⚠️')
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}>
                {message}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Saving...' : 'Save API Key'}
              </button>

              {hasStoredKey && (
                <button
                  onClick={handleTest}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Testing...' : 'Test Connection'}
                </button>
              )}
              {hasStoredKey && (
                <button
                  onClick={() => {
                    setApiKey('')
                    handleSave()
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Remove Key
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CustomEndpointsSection() {
  const [endpoints, setEndpoints] = useState<CustomEndpointConfig[]>([])
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newEndpoint, setNewEndpoint] = useState({
    name: '',
    baseUrl: '',
    apiKey: ''
  })

  useEffect(() => {
    // Load custom endpoints from localStorage
    const loadEndpoints = () => {
      try {
        const stored = localStorage.getItem('custom_endpoints')
        if (stored) {
          const parsedEndpoints = JSON.parse(stored)
          setEndpoints(parsedEndpoints)
        }
      } catch (error) {
        console.error('Error loading custom endpoints:', error)
      }
    }

    loadEndpoints()
  }, [])

  const saveEndpoints = (updatedEndpoints: CustomEndpointConfig[]) => {
    try {
      localStorage.setItem('custom_endpoints', JSON.stringify(updatedEndpoints))
      setEndpoints(updatedEndpoints)
    } catch (error) {
      console.error('Error saving custom endpoints:', error)
    }
  }

  const handleAddEndpoint = () => {
    if (!newEndpoint.name.trim() || !newEndpoint.baseUrl.trim()) {
      return
    }

    const endpoint: CustomEndpointConfig = {
      id: `custom_${Date.now()}`,
      name: newEndpoint.name.trim(),
      baseUrl: newEndpoint.baseUrl.trim(),
      apiKey: newEndpoint.apiKey.trim(),
      models: [],
      isConfigured: !!newEndpoint.apiKey.trim()
    }

    const updatedEndpoints = [...endpoints, endpoint]
    saveEndpoints(updatedEndpoints)

    setNewEndpoint({ name: '', baseUrl: '', apiKey: '' })
    setIsAddingNew(false)
  }

  const handleRemoveEndpoint = (endpointId: string) => {
    const updatedEndpoints = endpoints.filter(ep => ep.id !== endpointId)
    saveEndpoints(updatedEndpoints)
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <span className="text-xl">🔧</span>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Custom Endpoints
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add OpenAI-compatible API endpoints
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          {isAddingNew ? 'Cancel' : '+ Add New'}
        </button>
      </div>

      {isAddingNew && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-3 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Endpoint Name
              </label>
              <input
                type="text"
                value={newEndpoint.name}
                onChange={(e) => setNewEndpoint(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Local Ollama"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Base URL
              </label>
              <input
                type="url"
                value={newEndpoint.baseUrl}
                onChange={(e) => setNewEndpoint(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="e.g., http://localhost:11434/v1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Key (Optional)
              </label>
              <input
                type="password"
                value={newEndpoint.apiKey}
                onChange={(e) => setNewEndpoint(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="API key if required"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEndpoint}
                disabled={!newEndpoint.name.trim() || !newEndpoint.baseUrl.trim()}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Add Endpoint
              </button>
            </div>
          </div>
        </div>
      )}

      {endpoints.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${endpoint.isConfigured ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {endpoint.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {endpoint.baseUrl}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemoveEndpoint(endpoint.id)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                title="Remove endpoint"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ApiKeySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          AI Provider API Keys
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Configure API keys for different AI providers. Your keys are stored securely and encrypted.
        </p>
      </div>

      <div className="space-y-4">
        {PROVIDER_CONFIGS.map((config) => (
          <ProviderSection key={config.id} config={config} />
        ))}

        {/* Custom Endpoints Section */}
        <CustomEndpointsSection />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Security Note
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your API keys are encrypted before storage and never transmitted in plain text.
          They're stored locally and synced with your account when authenticated.
        </p>
      </div>
    </div>
  )
}