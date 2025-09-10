import DOMPurify from 'dompurify'

// Initialize DOMPurify for server-side usage
let DOMPurifyServer: any = DOMPurify

// Check if we're in a browser environment
if (typeof window === 'undefined') {
  // For server-side, we'll use a simpler sanitization approach
  DOMPurifyServer = {
    sanitize: (html: string) => {
      // Basic HTML tag removal for server-side
      return html.replace(/<[^>]*>/g, '').trim()
    }
  }
}

// Threat patterns for comprehensive input validation
export const THREAT_PATTERNS = {
  // XSS patterns
  xss: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /eval\s*\(/gi,
    /document\.cookie/gi,
    /localStorage\.setItem/gi,
    /sessionStorage\.setItem/gi,
    /XMLHttpRequest/gi,
    /fetch\s*\(/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<form[^>]*>/gi,
    /<input[^>]*>/gi,
  ],

  // SQL injection patterns
  sqlInjection: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /--/g,
    /\/\*.*?\*\//g,
    /xp_cmdshell/gi,
    /EXEC\s*\(/gi,
    /UNION\s+SELECT/gi,
    /;\s*(DROP|DELETE|UPDATE)/gi,
    /'\s*OR\s*'/gi,
    /'\s*AND\s*'/gi,
  ],

  // Command injection patterns
  commandInjection: [
    /;\s*(rm|del|format|shutdown|reboot)/gi,
    /\|\s*(cat|ls|dir|type)/gi,
    /`\s*.*?\s*`/g,
    /\$\(.*?\)/g,
    /&\s*(rm|del|format)/gi,
  ],

  // Path traversal patterns
  pathTraversal: [
    /\.\.\//g,
    /\.\\/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /\/\.\.\//g,
    /\\\.\\\./g,
  ],

  // Suspicious encoding patterns
  encoding: [
    /%[0-9A-Fa-f]{2}/g, // URL encoded content
    /&#[0-9]+;/g, // HTML entity encoding
    /\\x[0-9A-Fa-f]{2}/g, // Hex encoding
    /\\u[0-9A-Fa-f]{4}/g, // Unicode encoding
  ],
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean
  threats: string[]
  sanitized?: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

// Input sanitization and validation
export class SecurityValidator {
  /**
   * Comprehensive input validation with threat detection
   */
  static validateInput(input: string, options: {
    allowHtml?: boolean
    maxLength?: number
    fieldType?: 'text' | 'email' | 'url' | 'json' | 'sql'
  } = {}): ValidationResult {
    const { allowHtml = false, maxLength = 10000, fieldType = 'text' } = options

    if (!input || typeof input !== 'string') {
      return { isValid: true, threats: [], riskLevel: 'low' }
    }

    const threats: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

    // Length validation
    if (input.length > maxLength) {
      threats.push(`Input too long (${input.length} > ${maxLength})`)
      riskLevel = 'medium'
    }

    // Check all threat patterns
    Object.entries(THREAT_PATTERNS).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        const matches = input.match(pattern)
        if (matches) {
          threats.push(...matches.map(match => `${category}: ${match}`))

          // Determine risk level based on threat category
          if (category === 'sqlInjection' || category === 'commandInjection') {
            riskLevel = 'critical'
          } else if (category === 'xss' && riskLevel !== 'critical') {
            riskLevel = 'high'
          } else if (riskLevel === 'low') {
            riskLevel = 'medium'
          }
        }
      })
    })

    // Field-specific validation
    switch (fieldType) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
          threats.push('Invalid email format')
          riskLevel = riskLevel === 'low' ? 'medium' : riskLevel
        }
        break

      case 'url':
        try {
          new URL(input)
        } catch {
          threats.push('Invalid URL format')
          riskLevel = riskLevel === 'low' ? 'medium' : riskLevel
        }
        break

      case 'json':
        try {
          JSON.parse(input)
        } catch {
          threats.push('Invalid JSON format')
          riskLevel = riskLevel === 'low' ? 'medium' : riskLevel
        }
        break
    }

    // HTML sanitization if allowed
    let sanitized: string | undefined
    if (allowHtml && threats.length === 0) {
      sanitized = DOMPurifyServer.sanitize(input, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        ALLOWED_ATTR: [],
      })
    }

    return {
      isValid: threats.length === 0,
      threats,
      sanitized,
      riskLevel
    }
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(html: string): string {
    return DOMPurifyServer.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
    })
  }

  /**
   * Validate file upload
   */
  static validateFile(file: {
    name: string
    size: number
    type: string
  }, options: {
    maxSize?: number
    allowedTypes?: string[]
    allowedExtensions?: string[]
  } = {}): ValidationResult {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [], allowedExtensions = [] } = options
    const threats: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

    // Size validation
    if (file.size > maxSize) {
      threats.push(`File too large (${file.size} > ${maxSize})`)
      riskLevel = 'medium'
    }

    // Type validation
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      threats.push(`File type not allowed: ${file.type}`)
      riskLevel = 'high'
    }

    // Extension validation
    if (allowedExtensions.length > 0) {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!extension || !allowedExtensions.includes(extension)) {
        threats.push(`File extension not allowed: ${extension}`)
        riskLevel = 'high'
      }
    }

    // Suspicious filename patterns
    const suspiciousPatterns = [
      /\.\./g, // Directory traversal
      /[<>:*?"|]/g, // Invalid filename characters
      /\s+$/g, // Trailing spaces
      /^\s+/g, // Leading spaces
    ]

    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(file.name)) {
        threats.push('Suspicious filename pattern detected')
        riskLevel = 'high'
      }
    })

    return {
      isValid: threats.length === 0,
      threats,
      riskLevel
    }
  }

  /**
   * Generate secure random string
   */
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Hash sensitive data (for logging purposes)
   */
  static hashSensitiveData(data: string): string {
    // Simple hash for logging - in production, use proper crypto
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  /**
   * Check password strength
   */
  static checkPasswordStrength(password: string): {
    score: number
    feedback: string[]
    isStrong: boolean
  } {
    const feedback: string[] = []
    let score = 0

    // Length check
    if (password.length >= 8) score += 1
    else feedback.push('Password should be at least 8 characters long')

    if (password.length >= 12) score += 1

    // Character variety
    if (/[a-z]/.test(password)) score += 1
    else feedback.push('Include lowercase letters')

    if (/[A-Z]/.test(password)) score += 1
    else feedback.push('Include uppercase letters')

    if (/[0-9]/.test(password)) score += 1
    else feedback.push('Include numbers')

    if (/[^A-Za-z0-9]/.test(password)) score += 1
    else feedback.push('Include special characters')

    // Common patterns
    if (/(.)\1{2,}/.test(password)) {
      score -= 1
      feedback.push('Avoid repeated characters')
    }

    if (/123|abc|qwe|password|admin/i.test(password)) {
      score -= 1
      feedback.push('Avoid common patterns')
    }

    return {
      score: Math.max(0, score),
      feedback,
      isStrong: score >= 4
    }
  }
}

// Export convenience functions
export const validateInput = SecurityValidator.validateInput
export const sanitizeHtml = SecurityValidator.sanitizeHtml
export const validateFile = SecurityValidator.validateFile
export const generateSecureToken = SecurityValidator.generateSecureToken
export const hashSensitiveData = SecurityValidator.hashSensitiveData
export const checkPasswordStrength = SecurityValidator.checkPasswordStrength