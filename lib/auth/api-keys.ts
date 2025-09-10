/**
 * API Key Management System
 * Secure handling of API keys with encryption and rotation
 */

import { createHash, randomBytes, createCipher, createDecipher } from 'crypto'
import { config } from '@/lib/config'

// Encryption utilities
const ENCRYPTION_KEY = createHash('sha256').update(config.NEXTAUTH_SECRET).digest()
const ALGORITHM = 'aes-256-cbc'

export interface ApiKeyData {
  id: string
  provider: string
  key: string
  createdAt: Date
  lastUsed?: Date
  isActive: boolean
}

class ApiKeyManager {
  private static instance: ApiKeyManager
  private keys = new Map<string, ApiKeyData>()

  private constructor() {}

  static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager()
    }
    return ApiKeyManager.instance
  }

  // Encrypt API key
  private encrypt(text: string): string {
    const iv = randomBytes(16)
    const cipher = createCipher(ALGORITHM, ENCRYPTION_KEY)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  }

  // Decrypt API key
  private decrypt(text: string): string {
    const [ivHex, encrypted] = text.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = createDecipher(ALGORITHM, ENCRYPTION_KEY)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  // Store API key securely
  async storeApiKey(provider: string, key: string, userId?: string): Promise<string> {
    const keyId = this.generateKeyId()
    const encryptedKey = this.encrypt(key)
    
    const keyData: ApiKeyData = {
      id: keyId,
      provider,
      key: encryptedKey,
      createdAt: new Date(),
      isActive: true
    }

    this.keys.set(keyId, keyData)
    
    // In production, store in database with user association
    // await this.persistToDatabase(keyData, userId)
    
    return keyId
  }

  // Retrieve API key
  async getApiKey(provider: string, userId?: string): Promise<string | null> {
    // For development, use environment variables
    if (provider === 'openrouter') {
      return config.OPENROUTER_API_KEY
    }

    // In production, retrieve from database
    const keyData = Array.from(this.keys.values())
      .find(k => k.provider === provider && k.isActive)

    if (!keyData) return null

    // Update last used timestamp
    keyData.lastUsed = new Date()
    
    return this.decrypt(keyData.key)
  }

  // Rotate API key
  async rotateApiKey(provider: string, newKey: string, userId?: string): Promise<void> {
    const existingKeys = Array.from(this.keys.values())
      .filter(k => k.provider === provider && k.isActive)

    // Deactivate old keys
    existingKeys.forEach(k => k.isActive = false)

    // Store new key
    await this.storeApiKey(provider, newKey, userId)
  }

  // Validate API key format
  validateApiKey(provider: string, key: string): boolean {
    const patterns = {
      openrouter: /^sk-or-v1-[a-f0-9]{64}$/,
      openai: /^sk-[a-zA-Z0-9]{48}$/,
      anthropic: /^sk-ant-api03-[a-zA-Z0-9_-]{95}$/
    }

    const pattern = patterns[provider as keyof typeof patterns]
    return pattern ? pattern.test(key) : key.length > 10
  }

  // Generate secure key ID
  private generateKeyId(): string {
    return 'key_' + randomBytes(16).toString('hex')
  }

  // Health check for API keys
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}
    
    try {
      const openrouterKey = await this.getApiKey('openrouter')
      results.openrouter = !!openrouterKey && this.validateApiKey('openrouter', openrouterKey)
    } catch {
      results.openrouter = false
    }

    return results
  }
}

export const apiKeyManager = ApiKeyManager.getInstance()

// Utility functions
export async function getProviderApiKey(provider: string): Promise<string> {
  const key = await apiKeyManager.getApiKey(provider)
  if (!key) {
    throw new Error(`API key not found for provider: ${provider}`)
  }
  return key
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '***'
  return key.slice(0, 4) + '***' + key.slice(-4)
}