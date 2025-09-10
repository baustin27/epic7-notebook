'use client'

import React, { useState, useEffect } from 'react'
import { openRouterAPI } from '../../lib/openrouter'
import { providerFactory } from '../../lib/providers/factory'
import { AdvancedModelSettings } from './AdvancedModelSettings'
import { Tooltip } from '../ui/Tooltip'
import type { ProviderType } from '../../types/providers'

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
  capabilities?: string[]
}

interface ProviderGroup {
  name: string
  icon: string
  models: Model[]
  isConnected: boolean
}

// Default free models to show when API is not available
const DEFAULT_MODELS: Model[] = [
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)', description: 'Fast and efficient free model', capabilities: ['text-generation'] },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', description: 'Powerful free model', capabilities: ['text-generation'] },
  { id: 'microsoft/wizardlm-2-8x22b', name: 'WizardLM 2 8x22B', description: 'Advanced reasoning model', capabilities: ['text-generation', 'reasoning'] },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', description: 'Fast and capable free model', capabilities: ['text-generation'] },
  { id: 'huggingface/zephyr-7b-beta:free', name: 'Zephyr 7B (Free)', description: 'Fine-tuned for chat', capabilities: ['text-generation', 'chat'] },
]

// Utility functions for sorting and filtering
const sortModels = (models: Model[], sortBy: string, sortOrder: 'asc' | 'desc'): Model[] => {
  return [...models].sort((a, b) => {
    let aValue: any, bValue: any

    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'provider':
        aValue = a.provider?.toLowerCase() || ''
        bValue = b.provider?.toLowerCase() || ''
        break
      case 'pricing':
        const aPrice = parseFloat(a.pricing?.prompt || '0') + parseFloat(a.pricing?.completion || '0')
        const bPrice = parseFloat(b.pricing?.prompt || '0') + parseFloat(b.pricing?.completion || '0')
        aValue = aPrice
        bValue = bPrice
        break
      case 'context_length':
        aValue = a.context_length || 0
        bValue = b.context_length || 0
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
    return 0
  })
}

const filterModels = (
  models: Model[],
  searchTerm: string,
  selectedProviders: Set<string>,
  selectedCapabilities: Set<string>,
  pricingTier: string
): Model[] => {
  // Early return for no filters
  if (!searchTerm && selectedProviders.size === 0 && selectedCapabilities.size === 0 && pricingTier === 'all') {
    return models
  }

  const searchLower = searchTerm.toLowerCase()

  return models.filter(model => {
    // Search filter - most restrictive first
    if (searchTerm) {
      const nameLower = model.name.toLowerCase()
      const idLower = model.id.toLowerCase()
      const descLower = model.description?.toLowerCase() || ''
      const providerLower = model.provider?.toLowerCase() || ''

      const matchesSearch =
        nameLower.includes(searchLower) ||
        idLower.includes(searchLower) ||
        descLower.includes(searchLower) ||
        providerLower.includes(searchLower)

      if (!matchesSearch) return false
    }

    // Provider filter
    if (selectedProviders.size > 0 && (!model.provider || !selectedProviders.has(model.provider))) {
      return false
    }

    // Capability filter
    if (selectedCapabilities.size > 0) {
      if (!model.capabilities || !model.capabilities.some(cap => selectedCapabilities.has(cap))) {
        return false
      }
    }

    // Pricing tier filter
    if (pricingTier !== 'all') {
      const isFree = (model.pricing?.prompt === '0' || model.pricing?.completion === '0') ||
                    model.id.includes(':free') ||
                    model.name.toLowerCase().includes('free')

      if (pricingTier === 'free' && !isFree) return false
      if (pricingTier === 'paid' && isFree) return false
    }

    return true
  })
}

export function ModelSelector() {
    const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo')
    const [isOpen, setIsOpen] = useState(false)
    const [models, setModels] = useState<Model[]>(DEFAULT_MODELS)
    const [providerGroups, setProviderGroups] = useState<ProviderGroup[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
    const [hasApiKey, setHasApiKey] = useState(false)
    const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false)
    const [adminSelectedModels, setAdminSelectedModels] = useState<Record<string, string[]> | null>(null)
    const [adminFreeOnly, setAdminFreeOnly] = useState<boolean>(false)

    // New state for enhanced filtering and sorting
    const [sortBy, setSortBy] = useState<'name' | 'provider' | 'pricing' | 'context_length'>('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set())
    const [selectedCapabilities, setSelectedCapabilities] = useState<Set<string>>(new Set())
    const [pricingTier, setPricingTier] = useState<'all' | 'free' | 'paid'>('all')
    const [showFilters, setShowFilters] = useState(false)
    const [visibleCount, setVisibleCount] = useState(50)
    const [isSearchDebouncing, setIsSearchDebouncing] = useState(false)
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
    const [focusedGroup, setFocusedGroup] = useState<string | null>(null)
    const [focusedModel, setFocusedModel] = useState<string | null>(null)

  // Load admin model selections
  useEffect(() => {
    const loadAdminSelections = async () => {
      try {
        const response = await fetch('/api/admin/models')
        if (response.ok) {
          const data = await response.json()
          setAdminSelectedModels(data.selectedModels || {})
          setAdminFreeOnly(data.freeOnly || false)
        } else {
          // If admin API fails, assume no restrictions
          setAdminSelectedModels(null)
          setAdminFreeOnly(false)
        }
      } catch (error) {
        console.warn('Failed to load admin model selections:', error)
        setAdminSelectedModels(null)
        setAdminFreeOnly(false)
      }
    }

    loadAdminSelections()
  }, [])

  // Debounce search term
  useEffect(() => {
    setIsSearchDebouncing(true)
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setIsSearchDebouncing(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Load models from multiple providers
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true)

        // Get models from API route
        const response = await fetch('/api/models')
        if (!response.ok) {
          throw new Error('Failed to fetch models')
        }

        const data = await response.json()
        const allModels: Model[] = data.models || []
        console.log('DEBUG: Raw models from /api/models:', allModels)

        // Group models by provider
        const groups: ProviderGroup[] = []
        const providerMap = new Map<string, Model[]>()

        // Add models to provider groups
        allModels.forEach((model: any) => {
          const provider = model.provider
          if (provider && !providerMap.has(provider)) {
            providerMap.set(provider, [])
          }
          if (provider) {
            providerMap.get(provider)!.push({
              id: model.id,
              name: model.name,
              description: model.description || `${model.name} from ${provider}`,
              provider: provider,
              pricing: model.pricing,
              context_length: model.context_length || model.contextLength,
              capabilities: model.capabilities || ['text-generation'] // Default capability
            })
          }
        })
        console.log('DEBUG: Provider map after grouping:', Object.fromEntries(providerMap))

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

          // Filter models based on admin selections
          let filteredModels = models
          if (adminSelectedModels && adminSelectedModels[config.name]) {
            // If admin has selected specific models for this provider, only show those
            const selectedModelIds = adminSelectedModels[config.name]
            filteredModels = models.filter(model => selectedModelIds.includes(model.id))
          } else if (adminSelectedModels && Object.keys(adminSelectedModels).length > 0) {
            // If admin has selections but not for this provider, don't show any models
            filteredModels = []
          }

          // Apply free-only filter if enabled
          if (adminFreeOnly) {
            filteredModels = filteredModels.filter(model =>
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
              isConnected
            })
          }
        }

        // If no models are available due to admin restrictions, show a message
        if (groups.length === 0 && adminSelectedModels && Object.keys(adminSelectedModels).length > 0) {
          console.warn('No models available due to admin restrictions')
        }

        // Flatten models for backward compatibility
        const flatModels = groups.flatMap(group => group.models)
        setModels(flatModels)
        setProviderGroups(groups)
        console.log('DEBUG: Final provider groups:', groups)

        // Keep current selection if it exists
        const currentExists = flatModels.find(m => m.id === selectedModel)
        if (!currentExists && flatModels.length > 0) {
          setSelectedModel(flatModels[0].id)
        }

        // Check if any provider has API key
        const hasAnyKey = groups.some(group => group.isConnected)
        setHasApiKey(hasAnyKey)

      } catch (error) {
        console.warn('Failed to load models from providers, using defaults:', error)
        // Keep default models
      } finally {
        setLoading(false)
      }
    }

    loadModels()
  }, [adminSelectedModels, adminFreeOnly])

  const selectedModelData = models.find(model => model.id === selectedModel)

  // Apply filters and sorting to models with performance optimization
  const processedModels = React.useMemo(() => {
    const startTime = performance.now()

    let result = filterModels(models, debouncedSearchTerm, selectedProviders, selectedCapabilities, pricingTier)
    result = sortModels(result, sortBy, sortOrder)

    const endTime = performance.now()
    const duration = endTime - startTime

    // Log performance warning if filtering takes too long
    if (duration > 200 && models.length > 50) {
      console.warn(`Model filtering took ${duration.toFixed(2)}ms for ${models.length} models`)
    }

    return result
  }, [models, debouncedSearchTerm, selectedProviders, selectedCapabilities, pricingTier, sortBy, sortOrder])

  // Get available providers and capabilities for filter options
  const availableProviders = React.useMemo(() => {
    const providers = new Set<string>()
    models.forEach(model => {
      if (model.provider) providers.add(model.provider)
    })
    return Array.from(providers).sort()
  }, [models])

  const availableCapabilities = React.useMemo(() => {
    const capabilities = new Set<string>()
    models.forEach(model => {
      model.capabilities?.forEach(cap => capabilities.add(cap))
    })
    return Array.from(capabilities).sort()
  }, [models])

  // Pagination
  const visibleModels = processedModels.slice(0, visibleCount)
  const hasMoreModels = processedModels.length > visibleCount

  // Toggle group collapse/expand
  const toggleGroupCollapse = (groupName: string) => {
    const newCollapsed = new Set(collapsedGroups)
    if (newCollapsed.has(groupName)) {
      newCollapsed.delete(groupName)
    } else {
      newCollapsed.add(groupName)
    }
    setCollapsedGroups(newCollapsed)
  }

  // Keyboard navigation handler
  const handleGroupKeyDown = (e: React.KeyboardEvent, groupName: string, groupIndex: number) => {
    const visibleGroups = providerGroups.filter(group => {
      const groupVisibleModels = visibleModels.filter(model => model.provider === group.name)
      return groupVisibleModels.length > 0
    })

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!collapsedGroups.has(groupName)) {
          // Move to first model in current group
          const groupModels = visibleModels.filter(model => model.provider === groupName)
          if (groupModels.length > 0) {
            setFocusedModel(groupModels[0].id)
            setFocusedGroup(null)
          }
        } else {
          // Move to next group
          const nextIndex = (groupIndex + 1) % visibleGroups.length
          setFocusedGroup(visibleGroups[nextIndex].name)
          setFocusedModel(null)
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        // Move to previous group
        const prevIndex = groupIndex === 0 ? visibleGroups.length - 1 : groupIndex - 1
        setFocusedGroup(visibleGroups[prevIndex].name)
        setFocusedModel(null)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        const groupModels = visibleModels.filter(model => model.provider === groupName)
        if (groupModels.length > 5) {
          toggleGroupCollapse(groupName)
        }
        break
    }
  }

  return (
    <div className="relative flex space-x-2">
      <div className="flex-1">
        <button
          id="model-selector-button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsOpen(!isOpen)
            } else if (e.key === 'Escape') {
              setIsOpen(false)
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              setIsOpen(true)
              // Focus first option if opening
              if (!isOpen) {
                const firstOption = document.querySelector('[role="option"]') as HTMLElement
                firstOption?.focus()
              }
            }
          }}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby="model-selector-button model-selector-label"
          data-testid="model-selector-button"
        >
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {selectedModelData?.name || 'Select Model'}
            </span>
          </div>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Advanced Settings Button */}
      <button
        onClick={() => setIsAdvancedSettingsOpen(true)}
        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        aria-label="Open advanced model settings"
        title="Advanced Settings"
      >
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-80 md:max-h-96 overflow-hidden"
          role="listbox"
          aria-labelledby="model-selector-button"
          aria-activedescendant={selectedModel ? `model-option-${selectedModel}` : undefined}
        >
          <div id="model-selector-label" className="sr-only">
            Select AI model
          </div>

          {/* Search and Filter Controls */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
            {/* Search Input */}
            <div className="relative">
              <label htmlFor="model-search-input" className="sr-only">
                Search models by name, description, or provider
              </label>
              <input
                id="model-search-input"
                type="text"
                placeholder="Search models, descriptions, providers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pr-8 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Search models by name, description, or provider"
                aria-describedby="search-status"
                role="searchbox"
                autoComplete="off"
              />
              {isSearchDebouncing && (
                <div className="absolute right-2 top-2" aria-hidden="true">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
              <div id="search-status" className="sr-only" aria-live="polite" aria-atomic="true">
                {isSearchDebouncing ? 'Searching...' : `${processedModels.length} models found`}
              </div>
            </div>

            {/* Sort and Filter Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label htmlFor="sort-models" className="sr-only">
                  Sort models by
                </label>
                <select
                  id="sort-models"
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [sort, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder]
                    setSortBy(sort)
                    setSortOrder(order)
                  }}
                  className="px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-label="Sort models by criteria"
                  aria-describedby="sort-description"
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="provider-asc">Provider A-Z</option>
                  <option value="provider-desc">Provider Z-A</option>
                  <option value="pricing-asc">Price Low-High</option>
                  <option value="pricing-desc">Price High-Low</option>
                  <option value="context_length-asc">Context Short-Long</option>
                  <option value="context_length-desc">Context Long-Short</option>
                </select>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-label="Toggle filters"
                  aria-expanded={showFilters}
                >
                  Filters {showFilters ? '▼' : '▶'}
                </button>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                {processedModels.length} model{processedModels.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                {/* Provider Filter */}
                {availableProviders.length > 0 && (
                  <fieldset>
                    <legend className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Filter by Providers
                    </legend>
                    <div className="flex flex-wrap gap-1" role="group" aria-label="Provider filters">
                      {availableProviders.map(provider => (
                        <label key={provider} className="flex items-center space-x-1 text-xs">
                          <input
                            type="checkbox"
                            checked={selectedProviders.has(provider)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedProviders)
                              if (e.target.checked) {
                                newSelected.add(provider)
                              } else {
                                newSelected.delete(provider)
                              }
                              setSelectedProviders(newSelected)
                            }}
                            className="rounded border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                            aria-describedby={`provider-${provider}-count`}
                          />
                          <span>{provider}</span>
                          <span id={`provider-${provider}-count`} className="sr-only">
                            {models.filter(m => m.provider === provider).length} models
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                {/* Pricing Tier Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pricing
                  </label>
                  <div className="flex space-x-2">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'free', label: 'Free' },
                      { value: 'paid', label: 'Paid' }
                    ].map(option => (
                      <label key={option.value} className="flex items-center space-x-1 text-xs">
                        <input
                          type="radio"
                          name="pricing"
                          value={option.value}
                          checked={pricingTier === option.value}
                          onChange={(e) => setPricingTier(e.target.value as typeof pricingTier)}
                          className="border-gray-300 dark:border-gray-600"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Capabilities Filter */}
                {availableCapabilities.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Capabilities
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {availableCapabilities.map(capability => (
                        <label key={capability} className="flex items-center space-x-1 text-xs">
                          <input
                            type="checkbox"
                            checked={selectedCapabilities.has(capability)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedCapabilities)
                              if (e.target.checked) {
                                newSelected.add(capability)
                              } else {
                                newSelected.delete(capability)
                              }
                              setSelectedCapabilities(newSelected)
                            }}
                            className="rounded border-gray-300 dark:border-gray-600"
                          />
                          <span className="capitalize">{capability.replace('-', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Models List */}
          <div className="max-h-64 md:max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading models...</p>
              </div>
            ) : visibleModels.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {debouncedSearchTerm || selectedProviders.size > 0 || selectedCapabilities.size > 0 || pricingTier !== 'all'
                    ? 'No models match your filters'
                    : 'No models available'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {providerGroups
                  .filter(group => {
                    // Filter groups based on selected providers and model visibility
                    if (selectedProviders.size > 0 && !selectedProviders.has(group.name)) {
                      return false
                    }
                    const groupVisibleModels = visibleModels.filter(model => model.provider === group.name)
                    return groupVisibleModels.length > 0
                  })
                  .map((group, groupIndex) => {
                    const groupVisibleModels = visibleModels.filter(model => model.provider === group.name)

                    const isCollapsed = collapsedGroups.has(group.name)
                    const shouldCollapse = groupVisibleModels.length > 5 // Only show collapse button if more than 5 models

                    return (
                      <div
                        key={group.name}
                        className="border-b border-gray-100 dark:border-gray-700 last:border-b-0 md:border-b-0 md:border md:border-gray-200 md:dark:border-gray-600 md:rounded-lg md:mb-2 md:last:mb-0"
                        role="region"
                        aria-labelledby={`group-${group.name}-header`}
                      >
                        <div
                          id={`group-${group.name}-header`}
                          className="px-3 py-2 bg-gray-50 dark:bg-gray-800 flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => shouldCollapse && toggleGroupCollapse(group.name)}
                          role={shouldCollapse ? "button" : undefined}
                          tabIndex={shouldCollapse ? 0 : -1}
                          aria-expanded={shouldCollapse ? !isCollapsed : undefined}
                          aria-controls={shouldCollapse ? `group-${group.name}-models` : undefined}
                          aria-label={shouldCollapse ? `${group.name} provider group, ${groupVisibleModels.length} models${isCollapsed ? ', collapsed' : ', expanded'}` : `${group.name} provider group, ${groupVisibleModels.length} models`}
                          onKeyDown={(e) => handleGroupKeyDown(e, group.name, groupIndex)}
                          onFocus={() => {
                            setFocusedGroup(group.name)
                            setFocusedModel(null)
                          }}
                          onBlur={() => setFocusedGroup(null)}
                        >
                          <span className="text-lg">{group.icon}</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {group.name}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${group.isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                            {groupVisibleModels.length} model{groupVisibleModels.length !== 1 ? 's' : ''}
                          </span>
                          {shouldCollapse && (
                            <svg
                              className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </div>
                        {!isCollapsed && (
                          <ul role="presentation" id={`group-${group.name}-models`} className="md:border-t md:border-gray-200 md:dark:border-gray-600">
                            {groupVisibleModels.map((model) => (
                            <li
                              key={model.id}
                              id={`model-option-${model.id}`}
                              onClick={() => {
                                console.log('DEBUG: Model selected:', model.id, 'from provider:', model.provider)
                                setSelectedModel(model.id)
                                setIsOpen(false)
                                setSearchTerm('')
                                setDebouncedSearchTerm('')
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setSelectedModel(model.id)
                                  setIsOpen(false)
                                  setSearchTerm('')
                                  setDebouncedSearchTerm('')
                                } else if (e.key === 'Escape') {
                                  setIsOpen(false)
                                }
                              }}
                              className="w-full px-3 py-2 pl-8 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:bg-gray-200 dark:focus:bg-gray-600"
                              role="option"
                              aria-selected={selectedModel === model.id}
                              tabIndex={selectedModel === model.id ? 0 : -1}
                              data-testid="model-option"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <Tooltip
                                    content={
                                      <div className="space-y-2 max-w-xs">
                                        <div className="font-medium">{model.name}</div>
                                        <div className="text-sm">{model.description || 'No description available'}</div>
                                        {model.pricing && (
                                          <div className="text-sm">
                                            <div>Prompt: ${parseFloat(model.pricing.prompt || '0').toFixed(4)}</div>
                                            <div>Completion: ${parseFloat(model.pricing.completion || '0').toFixed(4)}</div>
                                          </div>
                                        )}
                                        {model.context_length && (
                                          <div className="text-sm">Context: {model.context_length.toLocaleString()} tokens</div>
                                        )}
                                        {model.capabilities && model.capabilities.length > 0 && (
                                          <div className="text-sm">
                                            <div className="font-medium mb-1">Capabilities:</div>
                                            <div className="flex flex-wrap gap-1">
                                              {model.capabilities.map(cap => (
                                                <span key={cap} className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                                                  {cap.replace('-', ' ')}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    }
                                    position="right"
                                    maxWidth={300}
                                  >
                                    <div className="cursor-help">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {model.name}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {model.description || model.id}
                                      </div>
                                      {/* Show pricing and context info */}
                                      <div className="flex items-center space-x-2 mt-1">
                                        {model.pricing && (
                                          <span className="text-xs text-green-600 dark:text-green-400">
                                            ${parseFloat(model.pricing.prompt || '0').toFixed(4)}/prompt
                                          </span>
                                        )}
                                        {model.context_length && (
                                          <span className="text-xs text-blue-600 dark:text-blue-400">
                                            {model.context_length.toLocaleString()} tokens
                                          </span>
                                        )}
                                        {model.capabilities && model.capabilities.length > 0 && (
                                          <div className="flex space-x-1">
                                            {model.capabilities.slice(0, 2).map(cap => (
                                              <span key={cap} className="text-xs bg-gray-200 dark:bg-gray-600 px-1 rounded">
                                                {cap}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </Tooltip>
                                </div>
                                {selectedModel === model.id && (
                                  <svg className="w-4 h-4 text-blue-600 ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}

                {/* Show More Button */}
                {hasMoreModels && (
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setVisibleCount(prev => prev + 50)}
                      className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                      aria-label={`Show ${Math.min(50, processedModels.length - visibleCount)} more models`}
                      type="button"
                    >
                      Show {Math.min(50, processedModels.length - visibleCount)} more models
                      <span className="sr-only">
                        Currently showing {visibleCount} of {processedModels.length} models
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with provider status */}
          <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                {processedModels.length} of {models.length} model{models.length !== 1 ? 's' : ''} from {providerGroups.length} provider{providerGroups.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center space-x-2">
                {providerGroups.slice(0, 3).map((group, index) => (
                  <div key={group.name} className="flex items-center space-x-1">
                    <span className="text-sm">{group.icon}</span>
                    <div className={`w-2 h-2 rounded-full ${group.isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  </div>
                ))}
                {providerGroups.length > 3 && (
                  <span className="text-gray-500 dark:text-gray-400">
                    +{providerGroups.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Model Settings Modal */}
      <AdvancedModelSettings
        isOpen={isAdvancedSettingsOpen}
        onClose={() => setIsAdvancedSettingsOpen(false)}
        modelId={selectedModel}
        modelName={selectedModelData?.name || selectedModel}
      />
    </div>
  )
}