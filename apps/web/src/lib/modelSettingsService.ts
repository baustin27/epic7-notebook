import { supabase } from './supabase'
import type {
  ModelSettings,
  ModelSpecificSettings,
  UserModelPreferences
} from '../types/modelSettings'
import {
  DEFAULT_MODEL_SETTINGS,
  PRESET_TEMPLATES
} from '../types/modelSettings'

class ModelSettingsService {
  private static readonly STORAGE_KEY = 'modelSettings'

  // Get user model preferences from database
  static async getUserModelPreferences(): Promise<UserModelPreferences> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Return default preferences for unauthenticated users
        return this.getDefaultPreferences()
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user preferences:', error)
        return this.getDefaultPreferences()
      }

      if (data?.preferences && typeof data.preferences === 'object') {
        const prefs = data.preferences as any
        if (prefs.modelSettings) {
          return {
            modelSettings: prefs.modelSettings,
            defaultPreset: prefs.defaultPreset || 'balanced'
          }
        }
      }

      return this.getDefaultPreferences()
    } catch (error) {
      console.error('Error getting user model preferences:', error)
      return this.getDefaultPreferences()
    }
  }

  // Save user model preferences to database
  static async saveUserModelPreferences(preferences: UserModelPreferences): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Store in localStorage for unauthenticated users
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences))
        return
      }

      // Get existing preferences
      const { data: existingData } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .single()

      const existingPrefs = (existingData?.preferences && typeof existingData.preferences === 'object')
        ? existingData.preferences
        : {}
      const updatedPrefs = {
        ...existingPrefs,
        modelSettings: preferences.modelSettings,
        defaultPreset: preferences.defaultPreset
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          preferences: updatedPrefs as any,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error saving user preferences:', error)
        throw error
      }
    } catch (error) {
      console.error('Error saving user model preferences:', error)
      // Fallback to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences))
    }
  }

  // Get settings for a specific model
  static async getModelSettings(modelId: string): Promise<ModelSettings> {
    const preferences = await this.getUserModelPreferences()
    return preferences.modelSettings[modelId] || { ...DEFAULT_MODEL_SETTINGS }
  }

  // Save settings for a specific model
  static async saveModelSettings(modelId: string, settings: ModelSettings): Promise<void> {
    const preferences = await this.getUserModelPreferences()
    preferences.modelSettings[modelId] = { ...settings }
    await this.saveUserModelPreferences(preferences)
  }

  // Apply preset template to a model
  static async applyPresetToModel(modelId: string, presetId: string): Promise<ModelSettings> {
    const preset = PRESET_TEMPLATES.find(p => p.id === presetId)
    if (!preset) {
      throw new Error(`Preset ${presetId} not found`)
    }

    const settings = { ...preset.settings }
    await this.saveModelSettings(modelId, settings)
    return settings
  }

  // Reset model settings to defaults
  static async resetModelSettings(modelId: string): Promise<ModelSettings> {
    const defaultSettings = { ...DEFAULT_MODEL_SETTINGS }
    await this.saveModelSettings(modelId, defaultSettings)
    return defaultSettings
  }

  // Get default preferences
  private static getDefaultPreferences(): UserModelPreferences {
    return {
      modelSettings: {},
      defaultPreset: 'balanced'
    }
  }

  // Validate model settings
  static validateSettings(settings: Partial<ModelSettings>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (settings.temperature !== undefined) {
      if (settings.temperature < 0 || settings.temperature > 1) {
        errors.push('Temperature must be between 0.0 and 1.0')
      }
    }

    if (settings.maxTokens !== undefined) {
      if (settings.maxTokens < 100 || settings.maxTokens > 4000) {
        errors.push('Max tokens must be between 100 and 4000')
      }
    }

    if (settings.topP !== undefined) {
      if (settings.topP < 0 || settings.topP > 1) {
        errors.push('Top-p must be between 0.0 and 1.0')
      }
    }

    if (settings.presencePenalty !== undefined) {
      if (settings.presencePenalty < -2 || settings.presencePenalty > 2) {
        errors.push('Presence penalty must be between -2.0 and 2.0')
      }
    }

    if (settings.frequencyPenalty !== undefined) {
      if (settings.frequencyPenalty < -2 || settings.frequencyPenalty > 2) {
        errors.push('Frequency penalty must be between -2.0 and 2.0')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export { ModelSettingsService }