export interface AIProvider {
  id: string
  name: string
  displayName: string
  description: string
  icon: string
  color: string
  baseUrl?: string
  supportedFeatures: {
    streaming: boolean
    vision: boolean
    functionCalling: boolean
    systemMessages: boolean
  }
  isConfigured: () => Promise<boolean>
  testConnection: () => Promise<{ success: boolean; error?: string }>
  getApiKey: () => Promise<string | null>
  setApiKey: (key: string) => Promise<void>
  getModels: () => Promise<AIModel[]>
  chatCompletion: (params: ChatCompletionParams) => Promise<ChatCompletionResponse>
}

export interface AIModel {
  id: string
  name: string
  providerId: string
  description?: string
  contextLength?: number
  pricing?: {
    prompt: string
    completion: string
  }
  features: {
    vision: boolean
    functionCalling: boolean
  }
}

export interface ChatCompletionParams {
  messages: ChatMessage[]
  model: string
  onChunk?: (chunk: StreamChunk) => void
  signal?: AbortSignal
  settings?: ModelSettings
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ChatMessageContent[]
}

export interface ChatMessageContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: ChatMessage
    finish_reason: string | null
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface StreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string
    }
    finish_reason: string | null
  }>
}

export interface ModelSettings {
  temperature?: number
  maxTokens?: number
  topP?: number
  presencePenalty?: number
  frequencyPenalty?: number
  systemPrompt?: string
}

export interface CustomEndpoint {
  id: string
  name: string
  baseUrl: string
  apiKey?: string
  description?: string
  isActive: boolean
  models?: AIModel[]
}

export interface ProviderConfig {
  apiKey?: string
  customSettings?: Record<string, any>
  isEnabled: boolean
}

export type ProviderStatus = 'connected' | 'error' | 'not_configured' | 'testing'