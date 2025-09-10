export type ProviderType = 'openrouter' | 'openai' | 'google' | 'anthropic' | 'xai' | 'custom'

export interface ProviderConfig {
  id: string
  name: string
  type: ProviderType
  baseUrl?: string
  apiKey?: string
  isConfigured: boolean
  models: ProviderModel[]
  icon?: string
  description?: string
}

export interface ProviderModel {
  id: string
  name: string
  description?: string
  contextLength?: number
  pricing?: {
    prompt: string
    completion: string
  }
  capabilities?: string[]
}

export interface ProviderConnectionStatus {
  providerId: string
  isConnected: boolean
  lastTested?: Date
  error?: string
  modelCount?: number
}

export interface CustomEndpointConfig {
  id: string
  name: string
  baseUrl: string
  apiKey?: string
  models: ProviderModel[]
  isConfigured: boolean
}

export interface ProviderApiClient {
  getModels(): Promise<ProviderModel[]>
  chatCompletion(
    messages: any[],
    model: string,
    onChunk?: (chunk: any) => void,
    signal?: AbortSignal,
    settings?: any
  ): Promise<any>
  testConnection(): Promise<boolean>
  setApiKey(apiKey: string): Promise<void>
  getStoredApiKey(): Promise<string | null>
}

export interface ProviderFactory {
  createClient(providerType: ProviderType, config: ProviderConfig): ProviderApiClient
}