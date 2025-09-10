import { ModelSettingsService } from '../modelSettingsService'
import { DEFAULT_MODEL_SETTINGS } from '../../types/modelSettings'

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      upsert: jest.fn(() => ({
        select: jest.fn()
      }))
    }))
  }
}))

const mockSupabase = require('../supabase').supabase

describe('ModelSettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear localStorage
    localStorage.clear()
  })

  describe('getModelSettings', () => {
    it('should return default settings when no user settings exist', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const settings = await ModelSettingsService.getModelSettings('test-model')

      expect(settings).toEqual(DEFAULT_MODEL_SETTINGS)
    })

    it('should return user settings when they exist', async () => {
      const userSettings = {
        temperature: 0.8,
        maxTokens: 1500,
        systemPrompt: 'Custom prompt'
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                preferences: {
                  modelSettings: {
                    'test-model': userSettings
                  }
                }
              }
            })
          }))
        }))
      })

      const settings = await ModelSettingsService.getModelSettings('test-model')

      expect(settings).toEqual({ ...DEFAULT_MODEL_SETTINGS, ...userSettings })
    })
  })

  describe('saveModelSettings', () => {
    it('should save settings to database for authenticated users', async () => {
      const testSettings = {
        temperature: 0.9,
        maxTokens: 2000,
        systemPrompt: 'Test prompt',
        topP: 1.0,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { preferences: {} }
            })
          }))
        })),
        upsert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({ data: null, error: null })
        }))
      })

      await ModelSettingsService.saveModelSettings('test-model', testSettings)

      expect(mockSupabase.from).toHaveBeenCalledWith('user_settings')
    })

    it('should fallback to localStorage for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const testSettings = {
        temperature: 0.8,
        maxTokens: 1500,
        systemPrompt: '',
        topP: 1.0,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0
      }

      await ModelSettingsService.saveModelSettings('test-model', testSettings)

      expect(localStorage.getItem('modelSettings')).toBeTruthy()
    })
  })

  describe('validateSettings', () => {
    it('should return valid for correct settings', () => {
      const validSettings = {
        temperature: 0.7,
        maxTokens: 2000,
        topP: 0.9,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0
      }

      const result = ModelSettingsService.validateSettings(validSettings)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return errors for invalid settings', () => {
      const invalidSettings = {
        temperature: 1.5, // Too high
        maxTokens: 5000, // Too high
        topP: -0.5 // Too low
      }

      const result = ModelSettingsService.validateSettings(invalidSettings)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Temperature must be between 0.0 and 1.0')
      expect(result.errors).toContain('Max tokens must be between 100 and 4000')
      expect(result.errors).toContain('Top-p must be between 0.0 and 1.0')
    })
  })
})