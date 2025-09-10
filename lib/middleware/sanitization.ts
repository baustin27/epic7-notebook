/**
 * Input Sanitization Middleware
 * Comprehensive input validation and sanitization
 */

import { z } from 'zod'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Setup DOMPurify for server-side use
const window = new JSDOM('').window
const purify = DOMPurify(window as any)

// Common validation schemas
export const schemas = {
  message: z.object({
    content: z.string()
      .min(1, 'Message cannot be empty')
      .max(10000, 'Message too long')
      .transform(str => str.trim()),
    conversationId: z.string().uuid().optional(),
    modelId: z.string().min(1).max(100),
  }),
  
  conversation: z.object({
    title: z.string()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title too long')
      .transform(str => sanitizeText(str)),
    description: z.string()
      .max(1000, 'Description too long')
      .optional()
      .transform(str => str ? sanitizeText(str) : undefined),
  }),

  user: z.object({
    email: z.string().email('Invalid email format'),
    name: z.string()
      .min(1, 'Name required')
      .max(100, 'Name too long')
      .transform(str => sanitizeText(str)),
  }),

  apiKey: z.object({
    provider: z.enum(['openrouter', 'openai', 'anthropic']),
    key: z.string().min(10, 'API key too short'),
  }),
}

// Text sanitization
export function sanitizeText(input: string): string {
  if (!input) return ''
  
  // Remove HTML tags and malicious content
  const cleaned = purify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [] 
  })
  
  // Additional sanitization
  return cleaned
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

// HTML content sanitization (for rich text)
export function sanitizeHtml(input: string): string {
  if (!input) return ''
  
  return purify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class'],
    FORBID_ATTR: ['style', 'onclick', 'onerror', 'onload'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'style'],
  })
}

// SQL injection prevention
export function sanitizeForDatabase(input: string): string {
  if (!input) return ''
  
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/"/g, '""') // Escape double quotes
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/\x00/g, '\\0') // Remove null bytes
}

// File name sanitization
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'untitled'
  
  return fileName
    .replace(/[^a-zA-Z0-9\-_\.]/g, '_') // Replace invalid chars
    .replace(/_{2,}/g, '_') // Remove multiple underscores
    .replace(/^[._]/, '') // Remove leading dots/underscores
    .substring(0, 100) // Limit length
}

// Rate limiting key sanitization
export function sanitizeRateLimitKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9:_-]/g, '_')
}

// Validation middleware factory
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const validatedData = schema.parse(req.body)
      req.validatedData = validatedData
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        })
      }
      
      return res.status(500).json({
        error: 'Internal validation error'
      })
    }
  }
}

// Content Security Policy helpers
export const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
  fontSrc: ["'self'", "fonts.gstatic.com"],
  imgSrc: ["'self'", "data:", "blob:", "*.supabase.co"],
  connectSrc: ["'self'", "*.supabase.co", "openrouter.ai"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
}

export function generateCSP(): string {
  return Object.entries(cspDirectives)
    .map(([directive, sources]) => `${directive.replace(/([A-Z])/g, '-$1').toLowerCase()} ${sources.join(' ')}`)
    .join('; ')
}

// XSS protection utilities
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  
  return text.replace(/[&<>"']/g, char => map[char])
}

// Input length validation
export function validateInputLength(input: string, maxLength: number): boolean {
  return input.length <= maxLength
}

// Common regex patterns for validation
export const validationPatterns = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
}