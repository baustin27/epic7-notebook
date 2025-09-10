/**
 * Security Middleware
 * CORS, security headers, and protection mechanisms
 */

import { NextRequest, NextResponse } from 'next/server'
import { config, isProduction } from '@/lib/config'
import { generateCSP } from './sanitization'

export interface SecurityConfig {
  cors: {
    allowedOrigins: string[]
    allowedMethods: string[]
    allowedHeaders: string[]
    credentials: boolean
  }
  headers: {
    csp: boolean
    hsts: boolean
    nosniff: boolean
    frameOptions: boolean
    xssProtection: boolean
  }
}

// Security configuration
const securityConfig: SecurityConfig = {
  cors: {
    allowedOrigins: isProduction 
      ? ['https://yourdomain.com'] // Replace with actual production domains
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-API-Key'
    ],
    credentials: true,
  },
  headers: {
    csp: true,
    hsts: isProduction,
    nosniff: true,
    frameOptions: true,
    xssProtection: true,
  }
}

// CORS middleware
export function corsMiddleware(req: NextRequest) {
  const origin = req.headers.get('origin')
  const method = req.method

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: getCorsHeaders(origin),
    })
  }

  // Check origin for non-GET requests
  if (method !== 'GET' && origin && !isAllowedOrigin(origin)) {
    return new NextResponse('CORS: Origin not allowed', { 
      status: 403,
      headers: getCorsHeaders(origin)
    })
  }

  return null // Continue with request
}

// Get CORS headers
function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': securityConfig.cors.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': securityConfig.cors.allowedHeaders.join(', '),
    'Access-Control-Max-Age': '86400', // 24 hours
  }

  if (securityConfig.cors.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  // Set specific origin if allowed, or omit for security
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}

// Check if origin is allowed
function isAllowedOrigin(origin: string): boolean {
  return securityConfig.cors.allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin === '*') return true
    if (allowedOrigin === origin) return true
    
    // Support wildcard subdomains
    if (allowedOrigin.startsWith('*.')) {
      const domain = allowedOrigin.slice(2)
      return origin.endsWith(domain)
    }
    
    return false
  })
}

// Security headers middleware
export function securityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}

  // Content Security Policy
  if (securityConfig.headers.csp) {
    headers['Content-Security-Policy'] = generateCSP()
  }

  // HTTP Strict Transport Security (HTTPS only)
  if (securityConfig.headers.hsts) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
  }

  // Prevent MIME type sniffing
  if (securityConfig.headers.nosniff) {
    headers['X-Content-Type-Options'] = 'nosniff'
  }

  // Frame options
  if (securityConfig.headers.frameOptions) {
    headers['X-Frame-Options'] = 'DENY'
  }

  // XSS Protection
  if (securityConfig.headers.xssProtection) {
    headers['X-XSS-Protection'] = '1; mode=block'
  }

  // Additional security headers
  headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
  headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
  headers['X-DNS-Prefetch-Control'] = 'off'
  headers['X-Powered-By'] = '' // Remove X-Powered-By header

  return headers
}

// Apply security headers to response
export function withSecurityHeaders(response: NextResponse): NextResponse {
  const headers = securityHeaders()
  
  Object.entries(headers).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value)
    } else {
      response.headers.delete(key)
    }
  })

  return response
}

// API route security wrapper
export function withSecurity(handler: Function) {
  return async (req: NextRequest) => {
    // Apply CORS
    const corsResponse = corsMiddleware(req)
    if (corsResponse) return corsResponse

    // Execute handler
    const response = await handler(req)

    // Apply security headers if it's a NextResponse
    if (response instanceof NextResponse) {
      return withSecurityHeaders(response)
    }

    return response
  }
}

// Request validation middleware
export function validateRequest(req: NextRequest): string | null {
  // Check request size
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    return 'Request too large'
  }

  // Check content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return 'Invalid content type'
    }
  }

  // Check for suspicious headers
  const suspiciousHeaders = ['x-forwarded-host', 'x-rewrite-url', 'x-original-url']
  for (const header of suspiciousHeaders) {
    if (req.headers.get(header)) {
      return 'Suspicious request detected'
    }
  }

  return null
}

// IP whitelist/blacklist (if needed)
export class IPFilter {
  private whitelist: Set<string> = new Set()
  private blacklist: Set<string> = new Set()

  addToWhitelist(ip: string) {
    this.whitelist.add(ip)
  }

  addToBlacklist(ip: string) {
    this.blacklist.add(ip)
  }

  isAllowed(ip: string): boolean {
    // If whitelist exists and IP is not in it, deny
    if (this.whitelist.size > 0 && !this.whitelist.has(ip)) {
      return false
    }

    // If IP is in blacklist, deny
    if (this.blacklist.has(ip)) {
      return false
    }

    return true
  }

  getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for')
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    const realIP = req.headers.get('x-real-ip')
    if (realIP) {
      return realIP
    }

    // Fallback for development
    return '127.0.0.1'
  }
}

export const ipFilter = new IPFilter()

// Request timeout wrapper
export function withTimeout(handler: Function, timeoutMs: number = 30000) {
  return async (req: NextRequest) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await Promise.race([
        handler(req),
        new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('Request timeout'))
          })
        })
      ])

      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.message === 'Request timeout') {
        return new NextResponse('Request timeout', { status: 408 })
      }
      
      throw error
    }
  }
}

// Security audit log
export interface SecurityEvent {
  type: 'cors_violation' | 'rate_limit' | 'invalid_request' | 'suspicious_activity'
  ip: string
  userAgent?: string
  timestamp: Date
  details: string
}

class SecurityAuditLogger {
  private events: SecurityEvent[] = []
  private maxEvents = 1000

  log(event: Omit<SecurityEvent, 'timestamp'>) {
    this.events.push({
      ...event,
      timestamp: new Date()
    })

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }

    // In production, send to monitoring service
    if (isProduction) {
      console.warn('Security event:', event)
    }
  }

  getRecentEvents(minutes: number = 60): SecurityEvent[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    return this.events.filter(event => event.timestamp >= cutoff)
  }
}

export const securityAudit = new SecurityAuditLogger()