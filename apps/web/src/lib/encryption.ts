import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  saltLength: 32,
  tagLength: 16
}

// Get encryption key from environment or generate one
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY
  if (key) {
    return Buffer.from(key, 'hex')
  }

  // Generate a key for development (in production, use a proper key)
  const salt = randomBytes(ENCRYPTION_CONFIG.saltLength)
  return scryptSync('default-dev-key', salt, ENCRYPTION_CONFIG.keyLength)
}

// Data Encryption Class
export class DataEncryption {
  private static key = getEncryptionKey()

  /**
   * Encrypt sensitive data
   */
  static encrypt(text: string): string {
    try {
      const iv = randomBytes(ENCRYPTION_CONFIG.ivLength)
      const cipher = createCipheriv(ENCRYPTION_CONFIG.algorithm, this.key, iv) as any

      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      const authTag = cipher.getAuthTag()

      // Return format: iv:authTag:encryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':')
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format')
      }

      const iv = Buffer.from(parts[0], 'hex')
      const authTag = Buffer.from(parts[1], 'hex')
      const encrypted = parts[2]

      const decipher = createDecipheriv(ENCRYPTION_CONFIG.algorithm, this.key, iv) as any
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Hash sensitive data for storage (one-way)
   */
  static hashSensitiveData(data: string, salt?: string): string {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : randomBytes(ENCRYPTION_CONFIG.saltLength)
    const hash = scryptSync(data, saltBuffer, 64)
    return `${saltBuffer.toString('hex')}:${hash.toString('hex')}`
  }

  /**
   * Verify hashed data
   */
  static verifyHashedData(data: string, hashedData: string): boolean {
    try {
      const [saltHex, hashHex] = hashedData.split(':')
      const salt = Buffer.from(saltHex, 'hex')
      const originalHash = Buffer.from(hashHex, 'hex')
      const computedHash = scryptSync(data, salt, 64)
      return computedHash.equals(originalHash)
    } catch (error) {
      console.error('Hash verification error:', error)
      return false
    }
  }
}

// Privacy Controls Class
export class PrivacyControls {
  /**
   * Anonymize user data for analytics
   */
  static anonymizeUserData(userData: any): any {
    const anonymized = { ...userData }

    // Remove or hash personal identifiers
    if (anonymized.email) {
      anonymized.email = this.hashEmail(anonymized.email)
    }

    if (anonymized.full_name) {
      anonymized.full_name = this.anonymizeName(anonymized.full_name)
    }

    if (anonymized.ip_address) {
      anonymized.ip_address = this.anonymizeIP(anonymized.ip_address)
    }

    // Remove sensitive metadata
    delete anonymized.api_keys
    delete anonymized.password_hash
    delete anonymized.session_tokens

    return anonymized
  }

  /**
   * Hash email addresses for privacy
   */
  static hashEmail(email: string): string {
    const [local, domain] = email.split('@')
    const hashedLocal = DataEncryption.hashSensitiveData(local)
    return `${hashedLocal.substring(0, 8)}...@${domain}`
  }

  /**
   * Anonymize names
   */
  static anonymizeName(name: string): string {
    const parts = name.split(' ')
    if (parts.length === 1) {
      return `${name.charAt(0)}***`
    }

    const firstName = parts[0]
    const lastName = parts[parts.length - 1]
    return `${firstName.charAt(0)}*** ${lastName.charAt(0)}***`
  }

  /**
   * Anonymize IP addresses
   */
  static anonymizeIP(ip: string): string {
    if (ip.includes(':')) {
      // IPv6 - mask last 64 bits
      const parts = ip.split(':')
      return `${parts.slice(0, 4).join(':')}:****:****:****:****`
    } else {
      // IPv4 - mask last octet
      const parts = ip.split('.')
      return `${parts.slice(0, 3).join('.')}.***`
    }
  }

  /**
   * Check data retention compliance
   */
  static checkDataRetention(data: any, retentionDays: number = 2555): boolean {
    // GDPR requires max 2555 days (7 years) for legitimate interest
    const createdAt = new Date(data.created_at || data.timestamp)
    const now = new Date()
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

    return daysSinceCreation <= retentionDays
  }

  /**
   * Apply data minimization
   */
  static minimizeData(data: any, requiredFields: string[]): any {
    const minimized: any = {}

    requiredFields.forEach(field => {
      if (data[field] !== undefined) {
        minimized[field] = data[field]
      }
    })

    return minimized
  }

  /**
   * Generate privacy-compliant consent record
   */
  static generateConsentRecord(userId: string, consentType: string, consented: boolean): any {
    return {
      user_id: userId,
      consent_type: consentType,
      consented,
      consent_date: new Date().toISOString(),
      consent_version: '1.0',
      consent_ip: 'anonymized', // Would be actual IP in real implementation
      consent_user_agent: 'anonymized', // Would be actual UA in real implementation
      legal_basis: 'legitimate_interest',
      consent_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
    }
  }

  /**
   * Check if user has valid consent
   */
  static hasValidConsent(consentRecord: any): boolean {
    if (!consentRecord || !consentRecord.consented) {
      return false
    }

    const expiryDate = new Date(consentRecord.consent_expiry)
    const now = new Date()

    return now <= expiryDate
  }
}

// Data Classification
export class DataClassification {
  /**
   * Classify data sensitivity level
   */
  static classifyData(data: any): 'public' | 'internal' | 'confidential' | 'restricted' {
    // Check for sensitive patterns
    const sensitivePatterns = [
      /password/i,
      /ssn|social.security/i,
      /credit.card|ccv/i,
      /bank.account/i,
      /medical|health/i,
      /personal|private/i
    ]

    const dataString = JSON.stringify(data).toLowerCase()

    for (const pattern of sensitivePatterns) {
      if (pattern.test(dataString)) {
        return 'restricted'
      }
    }

    // Check for PII
    const piiPatterns = [
      /email/i,
      /phone|mobile/i,
      /address/i,
      /birthdate|age/i,
      /name/i
    ]

    for (const pattern of piiPatterns) {
      if (pattern.test(dataString)) {
        return 'confidential'
      }
    }

    // Check for internal data
    if (dataString.includes('internal') || dataString.includes('admin')) {
      return 'internal'
    }

    return 'public'
  }

  /**
   * Get data handling requirements based on classification
   */
  static getHandlingRequirements(classification: string): {
    encryption: boolean
    retention_days: number
    access_control: string[]
    audit_required: boolean
  } {
    switch (classification) {
      case 'restricted':
        return {
          encryption: true,
          retention_days: 2555, // 7 years max
          access_control: ['admin', 'legal'],
          audit_required: true
        }

      case 'confidential':
        return {
          encryption: true,
          retention_days: 2555,
          access_control: ['admin', 'user'],
          audit_required: true
        }

      case 'internal':
        return {
          encryption: false,
          retention_days: 2555,
          access_control: ['admin', 'staff'],
          audit_required: false
        }

      default: // public
        return {
          encryption: false,
          retention_days: 365,
          access_control: ['all'],
          audit_required: false
        }
    }
  }
}

// Export convenience functions
export const encrypt = DataEncryption.encrypt
export const decrypt = DataEncryption.decrypt
export const hashData = DataEncryption.hashSensitiveData
export const verifyHash = DataEncryption.verifyHashedData

export const anonymizeUserData = PrivacyControls.anonymizeUserData
export const checkDataRetention = PrivacyControls.checkDataRetention
export const minimizeData = PrivacyControls.minimizeData

export const classifyData = DataClassification.classifyData
export const getHandlingRequirements = DataClassification.getHandlingRequirements