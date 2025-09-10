'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/SimpleAuthContext'
import { useRouter } from 'next/navigation'
import { providerFactory } from '../../../lib/providers/factory'
import { isUserAdmin } from '../../../lib/adminUtils'

interface Model {
  id: string
  name: string
  description?: string
  pricing?: {
    prompt: string
    completion: string
  }
  context_length?: number
  provider?: string
}

interface ProviderGroup {
  name: string
  icon: string
  models: Model[]
  isConnected: boolean
  selectedModels: string[]
}

export default function AdminModelsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [activeTab, setActiveTab] = useState<'models' | 'rate-limits'>('models')
  const [providerGroups, setProviderGroups] = useState<ProviderGroup[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [freeOnly, setFreeOnly] = useState(process.env.NODE_ENV === 'development')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Rate limiting state
  const [rateLimits, setRateLimits] = useState({
    auth: { requests: 5, window: 60, maxCost: 0 },
    api: { requests: 100, window: 60, maxCost: 10 },
    chat: { requests: 10, window: 60, maxCost: 5 },
    writing_assistant: { requests: 20, window: 60, maxCost: 2 },
  })
  const [savingRateLimits, setSavingRateLimits] = useState(false)

  useEffect(() => {
    checkAdminAccess()
  }, [user])

  useEffect(() => {
    if (isAdmin) {
      loadProvidersAndModels()
    }
  }, [isAdmin, freeOnly])

  useEffect(() => {
    if (isAdmin && activeTab === 'rate-limits') {
      loadRateLimits()
    }
  }, [isAdmin, activeTab])

  const checkAdminAccess = async () => {
    if (!user) {
      setCheckingAdmin(false)
      return
    }

    try {
      const adminStatus = await isUserAdmin()
      setIsAdmin(adminStatus)

      if (!adminStatus) {
        router.push('/')
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
      router.push('/')
    } finally {
      setCheckingAdmin(false)
    }
  }

  const loadProvidersAndModels = async () => {
    try {
      setLoadingModels(true)
      setError(null)

      // Get models from API route
      const response = await fetch('/api/models')
      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }

      const data = await response.json()
      const allModels: Model[] = data.models || []

      // Group models by provider
      const groups: ProviderGroup[] = []
      const providerMap = new Map<string, Model[]>()

      // Add models to provider groups
      allModels.forEach((model: Model) => {
        const provider = model.provider
        if (provider && !providerMap.has(provider)) {
          providerMap.set(provider, [])
        }
        if (provider) {
          providerMap.get(provider)!.push(model)
        }
      })

      // Create provider groups with icons and connection status
      const providerConfigs = [
        { name: 'OpenRouter', icon: '🔗', id: 'openrouter' },
        { name: 'OpenAI', icon: '🤖', id: 'openai' },
        { name: 'Anthropic', icon: '🧠', id: 'anthropic' },
        { name: 'Google', icon: '🌐', id: 'google' },
        { name: 'xAI', icon: '🚀', id: 'xai' },
      ]

      for (const config of providerConfigs) {
        const models = providerMap.get(config.name) || []
        const isConnected = await providerFactory.testProviderConnection(config.id)

        // Filter free models if toggle is on
        let filteredModels = models
        if (freeOnly) {
          filteredModels = models.filter(model =>
            model.pricing?.prompt === '0' ||
            model.pricing?.completion === '0' ||
            model.id.includes(':free') ||
            model.name.toLowerCase().includes('free')
          )
        }

        if (filteredModels.length > 0) {
          groups.push({
            name: config.name,
            icon: config.icon,
            models: filteredModels,
            isConnected,
            selectedModels: [] // Will be loaded from saved settings
          })
        }
      }

      setProviderGroups(groups)

      // Load saved model selections
      await loadSavedSelections(groups)

    } catch (error) {
      console.error('Error loading providers and models:', error)
      setError('Failed to load providers and models')
    } finally {
      setLoadingModels(false)
    }
  }

  const loadSavedSelections = async (groups: ProviderGroup[]) => {
    try {
      const response = await fetch('/api/admin/models')
      if (response.ok) {
        const data = await response.json()
        const savedSelections = data.selectedModels || {}

        // Update groups with saved selections
        const updatedGroups = groups.map(group => ({
          ...group,
          selectedModels: savedSelections[group.name] || []
        }))

        setProviderGroups(updatedGroups)
      }
    } catch (error) {
      console.warn('Failed to load saved selections:', error)
      // Continue with empty selections
    }
  }

  const loadRateLimits = async () => {
    try {
      const response = await fetch('/api/admin/rate-limits')
      if (response.ok) {
        const data = await response.json()
        setRateLimits(data.rateLimits)
      }
    } catch (error) {
      console.warn('Failed to load rate limits:', error)
      // Continue with default rate limits
    }
  }

  const handleModelToggle = (providerName: string, modelId: string) => {
    setProviderGroups(prevGroups =>
      prevGroups.map(group =>
        group.name === providerName
          ? {
              ...group,
              selectedModels: group.selectedModels.includes(modelId)
                ? group.selectedModels.filter(id => id !== modelId)
                : [...group.selectedModels, modelId]
            }
          : group
      )
    )
  }

  const handleSaveSelections = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const selections = providerGroups.reduce((acc, group) => {
        acc[group.name] = group.selectedModels
        return acc
      }, {} as Record<string, string[]>)

      const response = await fetch('/api/admin/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectedModels: selections, freeOnly }),
      })

      if (!response.ok) {
        throw new Error('Failed to save model selections')
      }

      setSuccess('Model selections saved successfully!')
      setTimeout(() => setSuccess(null), 3000)

    } catch (error) {
      console.error('Error saving selections:', error)
      setError('Failed to save model selections')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRateLimits = async () => {
    try {
      setSavingRateLimits(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/admin/rate-limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rateLimits }),
      })

      if (!response.ok) {
        throw new Error('Failed to save rate limits')
      }

      setSuccess('Rate limits saved successfully!')
      setTimeout(() => setSuccess(null), 3000)

    } catch (error) {
      console.error('Error saving rate limits:', error)
      setError('Failed to save rate limits')
    } finally {
      setSavingRateLimits(false)
    }
  }

  const updateRateLimit = (endpoint: string, field: string, value: number) => {
    setRateLimits(prev => ({
      ...prev,
      [endpoint]: {
        ...prev[endpoint as keyof typeof prev],
        [field]: value
      }
    }))
  }

  const filteredGroups = providerGroups.map(group => ({
    ...group,
    models: group.models.filter(model =>
      model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(group => group.models.length > 0)

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Please sign in to access the admin panel.</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Access Required</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access the admin panel.</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Panel
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                ← Back to Admin
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('models')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'models'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Model Management
              </button>
              <button
                onClick={() => setActiveTab('rate-limits')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'rate-limits'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Rate Limits & Costs
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          {activeTab === 'models' ? (
            <>
              {/* Model Management Controls */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={freeOnly}
                        onChange={(e) => setFreeOnly(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        data-testid="free-only-toggle"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Free models only
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      placeholder="Search models..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      data-testid="search-input"
                    />

                    <button
                      onClick={handleSaveSelections}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="save-button"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Rate Limits Controls */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                      Rate Limiting Configuration
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Configure request limits and cost thresholds for different endpoints
                    </p>
                  </div>
                  <button
                    onClick={handleSaveRateLimits}
                    disabled={savingRateLimits}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingRateLimits ? 'Saving...' : 'Save Rate Limits'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Status Messages */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded" data-testid="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="mx-6 mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded" data-testid="success-message">
              {success}
            </div>
          )}

          {/* Content based on active tab */}
          <div className="p-6">
            {activeTab === 'models' ? (
              <>
                {loadingModels ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading providers and models...</p>
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'No models found matching your search' : 'No providers or models available'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredGroups.map((group) => (
                      <div key={group.name} className="border border-gray-200 dark:border-gray-700 rounded-lg" data-testid="provider-group">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">{group.icon}</span>
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {group.name}
                              </h3>
                              <div className={`w-3 h-3 rounded-full ${group.isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {group.isConnected ? 'Connected' : 'Not Connected'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {group.selectedModels.length} of {group.models.length} selected
                            </span>
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.models.map((model) => (
                              <div key={model.id} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700" data-testid="model-item">
                                <input
                                  type="checkbox"
                                  checked={group.selectedModels.includes(model.id)}
                                  onChange={() => handleModelToggle(group.name, model.id)}
                                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  data-testid="model-checkbox"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate" data-testid="model-label">
                                    {model.name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {model.id}
                                  </div>
                                  {model.pricing && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {model.pricing.prompt !== '0' || model.pricing.completion !== '0'
                                        ? `$${model.pricing.prompt}/$${model.pricing.completion}`
                                        : 'Free'
                                      }
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Rate Limits Configuration */
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Rate Limiting Information
                      </h4>
                      <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                        <p>• <strong>Requests</strong> per time window limit the number of API calls</p>
                        <p>• <strong>Cost limits</strong> prevent excessive spending on LLM features</p>
                        <p>• <strong>Development mode</strong> automatically enforces free models</p>
                        <p>• All limits are enforced per user when authenticated</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(rateLimits).map(([endpoint, config]) => (
                    <div key={endpoint} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 capitalize">
                        {endpoint.replace('_', ' ')} Endpoint
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Requests per Minute
                          </label>
                          <input
                            type="number"
                            value={config.requests}
                            onChange={(e) => updateRateLimit(endpoint, 'requests', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                            max="1000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Time Window (seconds)
                          </label>
                          <input
                            type="number"
                            value={config.window}
                            onChange={(e) => updateRateLimit(endpoint, 'window', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="10"
                            max="3600"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Max Cost per Window ($)
                          </label>
                          <input
                            type="number"
                            value={config.maxCost}
                            onChange={(e) => updateRateLimit(endpoint, 'maxCost', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            max="1000"
                            step="0.01"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Set to 0 to disable cost limiting for this endpoint
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}