export interface ModelSettings {
  temperature: number
  maxTokens: number
  systemPrompt: string
  topP: number
  presencePenalty: number
  frequencyPenalty: number
}

export interface ModelSpecificSettings {
  [modelId: string]: ModelSettings
}

export interface UserModelPreferences {
  modelSettings: ModelSpecificSettings
  defaultPreset: string
}

export interface PresetTemplate {
  id: string
  name: string
  description: string
  icon: string
  settings: ModelSettings
}

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: '',
  topP: 1.0,
  presencePenalty: 0.0,
  frequencyPenalty: 0.0
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'creative',
    name: 'Creative',
    description: 'High creativity, varied responses',
    icon: '🎨',
    settings: {
      temperature: 0.9,
      maxTokens: 2000,
      systemPrompt: 'You are a creative assistant that generates innovative and imaginative responses.',
      topP: 0.9,
      presencePenalty: 0.3,
      frequencyPenalty: 0.3
    }
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Balanced creativity and consistency',
    icon: '⚖️',
    settings: {
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: '',
      topP: 1.0,
      presencePenalty: 0.0,
      frequencyPenalty: 0.0
    }
  },
  {
    id: 'precise',
    name: 'Precise',
    description: 'Focused, accurate, and concise',
    icon: '🎯',
    settings: {
      temperature: 0.3,
      maxTokens: 1500,
      systemPrompt: 'You are a precise assistant that provides accurate, concise, and well-structured responses.',
      topP: 0.7,
      presencePenalty: -0.1,
      frequencyPenalty: 0.1
    }
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Your personalized settings',
    icon: '⚙️',
    settings: DEFAULT_MODEL_SETTINGS
  }
]

export const PARAMETER_RANGES = {
  temperature: { min: 0.0, max: 1.0, step: 0.1 },
  maxTokens: { min: 100, max: 4000, step: 50 },
  topP: { min: 0.0, max: 1.0, step: 0.05 },
  presencePenalty: { min: -2.0, max: 2.0, step: 0.1 },
  frequencyPenalty: { min: -2.0, max: 2.0, step: 0.1 }
}

export const PARAMETER_DESCRIPTIONS = {
  temperature: 'Controls randomness in responses. Higher values (0.8-1.0) make output more creative and varied. Lower values (0.0-0.3) make output more focused and deterministic.',
  maxTokens: 'Maximum number of tokens to generate. Higher values allow longer responses but may increase costs and response time.',
  systemPrompt: 'Instructions given to the AI at the start of each conversation. Use this to set the AI\'s personality or behavior.',
  topP: 'Controls diversity via nucleus sampling. Lower values (0.1-0.5) make responses more focused. Higher values (0.9-1.0) allow more diverse responses.',
  presencePenalty: 'Reduces likelihood of repeating topics already mentioned. Positive values encourage new topics, negative values allow more repetition.',
  frequencyPenalty: 'Reduces likelihood of repeating words already used. Positive values encourage word variety, negative values allow more repetition.'
}