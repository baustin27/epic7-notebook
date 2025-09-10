import type { ProviderType, ProviderConfig, ProviderApiClient, CustomEndpointConfig } from '../../types/providers'
import { openaiClient } from './openai'
import { anthropicClient } from './anthropic'
import { googleClient } from './google'
import { xaiClient } from './xai'
import { createCustomClient } from './custom'
import { openRouterAPI } from '../openrouter'
import { createMonitoredClient, type MonitoredFeature } from '../monitoring/provider-monitor'

class ProviderFactory {
  private clients = new Map<string, ProviderApiClient>()

  getClient(providerId: string): ProviderApiClient | null {
    // If client already exists, return it
    if (this.clients.has(providerId)) {
      return this.clients.get(providerId) || null
    }

    // Otherwise, try to create it based on provider ID
    try {
      const providerType = providerId as ProviderType
      const config: ProviderConfig = {
        id: providerId,
        name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
        type: providerType,
        isConfigured: false,
        models: []
      }

      return this.createClient(providerType, config)
    } catch (error) {
      console.warn(`Failed to create client for provider ${providerId}:`, error)
      return null
    }
  }

  createClient(providerType: ProviderType, config: ProviderConfig, customConfig?: CustomEndpointConfig): ProviderApiClient {
    return this.createMonitoredClient(providerType, config, 'model_management', customConfig)
  }

  createMonitoredClient(
    providerType: ProviderType, 
    config: ProviderConfig, 
    feature: MonitoredFeature, 
    customConfig?: CustomEndpointConfig
  ): ProviderApiClient {
    const cacheKey = `${config.id}-${feature}`
    
    // If client already exists for this feature, return it
    if (this.clients.has(cacheKey)) {
      return this.clients.get(cacheKey)!
    }

    let rawClient: ProviderApiClient

    switch (providerType) {
      case 'openrouter':
        // Wrap OpenRouterAPI to match ProviderApiClient interface
        rawClient = {
          getModels: () => openRouterAPI.getModels().then(data => data.data || []),
          chatCompletion: (messages, model, onChunk, signal, settings) =>
            openRouterAPI.chatCompletion(messages, model, onChunk, signal, settings),
          testConnection: async () => {
            try {
              const models = await openRouterAPI.getModels()
              return !!(models.data && models.data.length > 0)
            } catch {
              return false
            }
          },
          setApiKey: (apiKey) => openRouterAPI.setApiKey(apiKey),
          getStoredApiKey: () => openRouterAPI.getStoredApiKey(),
        }
        break
      case 'openai':
        rawClient = openaiClient
        break
      case 'anthropic':
        rawClient = anthropicClient
        break
      case 'google':
        rawClient = googleClient
        break
      case 'xai':
        rawClient = xaiClient
        break
      case 'custom':
        if (!customConfig) {
          throw new Error('Custom endpoint configuration required for custom provider')
        }
        rawClient = createCustomClient(config, customConfig)
        break
      default:
        throw new Error(`Unknown provider type: ${providerType}`)
    }

    // Wrap with monitoring
    const monitoredClient = createMonitoredClient(rawClient, providerType, feature)
    
    this.clients.set(cacheKey, monitoredClient)
    return monitoredClient
  }

  async getAvailableModels(): Promise<Array<{ id: string; name: string; provider: string; pricing?: { prompt: string; completion: string }; context_length?: number }>> {
    const allModels: Array<{ id: string; name: string; provider: string; pricing?: { prompt: string; completion: string }; contextLength?: number }> = []

    // Only include providers that have API keys configured
    const configuredProviders = []

    // Check OpenRouter
    if (process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY) {
      configuredProviders.push({ id: 'openrouter', name: 'OpenRouter', client: openRouterAPI })
    }

    // Check OpenAI
    if (process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
      configuredProviders.push({ id: 'openai', name: 'OpenAI', client: openaiClient })
    }

    // Check Anthropic
    if (process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY) {
      configuredProviders.push({ id: 'anthropic', name: 'Anthropic', client: anthropicClient })
    }

    // Check Google
    if (process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY) {
      configuredProviders.push({ id: 'google', name: 'Google', client: googleClient })
    }

    // Check xAI
    if (process.env.NEXT_PUBLIC_XAI_API_KEY || process.env.XAI_API_KEY) {
      configuredProviders.push({ id: 'xai', name: 'xAI', client: xaiClient })
    }

    // If no providers configured, return empty array
    if (configuredProviders.length === 0) {
      console.warn('No AI providers configured. Please set API keys in environment variables.')
      return allModels
    }

    for (const provider of configuredProviders) {
      try {
        const models = await provider.client.getModels()
        console.log(`Fetched ${models.length} models from ${provider.name}`)
        models.forEach((model: any) => {
          allModels.push({
            id: model.id,
            name: model.name || model.id,
            provider: provider.name,
            pricing: model.pricing,
            context_length: model.contextLength || model.context_length
          })
        })
      } catch (error) {
        console.warn(`Failed to get models from ${provider.name}:`, error)
      }
    }

    return allModels
  }

  async testProviderConnection(providerId: string): Promise<boolean> {
    const client = this.getClient(providerId)
    if (!client) return false

    try {
      return await client.testConnection()
    } catch {
      return false
    }
  }
}

export const providerFactory = new ProviderFactory()

// Helper function to get monitored client for specific features
export function getMonitoredClient(providerId: string, feature: MonitoredFeature): ProviderApiClient | null {
  try {
    const providerType = providerId as ProviderType
    const config: ProviderConfig = {
      id: providerId,
      name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
      type: providerType,
      isConfigured: false,
      models: []
    }

    return providerFactory.createMonitoredClient(providerType, config, feature)
  } catch (error) {
    console.warn(`Failed to create monitored client for provider ${providerId}:`, error)
    return null
  }
}