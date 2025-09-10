import { NextRequest, NextResponse } from 'next/server'

// In-memory rate limiting for development (when Redis is not available)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Enhanced rate limiting with cost tracking
async function checkRateLimit(
  identifier: string,
  limit: number,
  window: number,
  maxCost: number = 0,
  currentCost: number = 0
): Promise<{ allowed: boolean; remaining: number; resetTime: number; costExceeded: boolean }> {
  const now = Date.now()
  const key = identifier

  // Clean expired entries
  for (const [k, v] of Array.from(rateLimitStore.entries())) {
    if (v.resetTime < now) {
      rateLimitStore.delete(k)
    }
  }

  const entry = rateLimitStore.get(key)

  if (!entry) {
    // First request
    rateLimitStore.set(key, { count: 1, resetTime: now + (window * 1000), cost: currentCost })
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: Math.floor((now + window * 1000) / 1000),
      costExceeded: false
    }
  }

  if (entry.resetTime < now) {
    // Window expired, reset
    const newEntry = { count: 1, resetTime: now + (window * 1000), cost: currentCost }
    rateLimitStore.set(key, newEntry)
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: Math.floor(newEntry.resetTime / 1000),
      costExceeded: false
    }
  }

  // Handle migration from old entries without cost property
  const currentEntryCost = (entry as any).cost || 0
  const newCost = currentEntryCost + currentCost
  const costExceeded = maxCost > 0 && newCost > maxCost

  const updatedEntry = { count: entry.count + 1, resetTime: entry.resetTime, cost: newCost }
  rateLimitStore.set(key, updatedEntry)

  const remaining = Math.max(0, limit - updatedEntry.count)
  const allowed = updatedEntry.count <= limit && !costExceeded

  return {
    allowed,
    remaining,
    resetTime: Math.floor(updatedEntry.resetTime / 1000),
    costExceeded
  }
}

// Rate limiting configurations with cost tracking
const RATE_LIMITS = {
  auth: { requests: 5, window: 60, maxCost: 0 }, // 5 requests per minute for auth
  api: { requests: 100, window: 60, maxCost: 10 }, // 100 requests per minute for API, $10 max cost
  chat: { requests: 10, window: 60, maxCost: 5 }, // 10 requests per minute for chat, $5 max cost (LLM features)
  admin: { requests: 200, window: 60, maxCost: 0 }, // 200 requests per minute for admin
  writing_assistant: { requests: 20, window: 60, maxCost: 2 }, // 20 requests per minute for writing assistant
}

// Type for rate limit configuration
type RateLimitConfig = {
  requests: number;
  window: number;
  maxCost: number;
}


// Security configurations
const SECURITY_CONFIG = {
  // Content Security Policy
  csp: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'font-src': ["'self'", 'https:', 'data:'],
    'connect-src': ["'self'", 'https:', 'wss:'],
    'media-src': ["'self'", 'https:', 'blob:'],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  },

  // Security headers
  headers: {
    'X-DNS-Prefetch-Control': 'on',
    'X-XSS-Protection': '1; mode=block',
    'X-Download-Options': 'noopen',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  },
}

// Threat patterns for input validation
const THREAT_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
  /eval\s*\(/gi,
  /document\.cookie/gi,
  /localStorage\.setItem/gi,
  /sessionStorage\.setItem/gi,
  /XMLHttpRequest/gi,
  /fetch\s*\(/gi,
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/gi,
  /--/g,
  /\/\*.*?\*\//g,
  /xp_cmdshell/gi,
  /EXEC\s*\(/gi,
  /UNION\s+SELECT/gi,
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
]

// Enhanced rate limiting with user authentication and cost tracking
async function checkEnhancedRateLimit(
  request: NextRequest,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetTime: number; costExceeded: boolean; userId?: string }> {
  const ip = request.headers.get('x-forwarded-for') ||
              request.headers.get('x-real-ip') ||
              'unknown'

  // Skip rate limiting for health checks and static assets
  if (endpoint.includes('/api/health') ||
      endpoint.includes('/_next/static') ||
      endpoint.includes('/favicon.ico')) {
    return { allowed: true, remaining: 100, resetTime: Date.now() + 60000, costExceeded: false }
  }

  try {
    let limits: RateLimitConfig = RATE_LIMITS.api
    let userId: string | undefined

    // Use different limits for different endpoints
    if (endpoint.includes('/api/auth') || endpoint.includes('/api/admin')) {
      limits = endpoint.includes('/api/admin') ? RATE_LIMITS.admin : RATE_LIMITS.auth
    } else if (endpoint.includes('/api/chat') || endpoint.includes('/api/messages')) {
      limits = RATE_LIMITS.chat
    } else if (endpoint.includes('/api/writing-assistant')) {
      limits = RATE_LIMITS.writing_assistant
    }

    // Try to get user ID from authentication (simplified for now)
    const authHeader = request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In a real implementation, you'd verify the JWT token here
      // For now, we'll use a placeholder user ID extraction
      try {
        // This is a simplified extraction - in production you'd verify the token
        const token = authHeader.replace('Bearer ', '')
        // For demo purposes, we'll assume the token contains user info
        // In reality, you'd decode and verify the JWT
        userId = 'user_' + token.slice(-8) // Simplified user ID extraction
      } catch (error) {
        console.warn('Failed to extract user ID from token:', error)
      }
    }

    // Use user ID if available, otherwise fall back to IP
    const identifier = userId ? `user:${userId}:${endpoint}` : `ip:${ip}:${endpoint}`

    // Estimate cost for this request (will be updated after actual API call)
    const estimatedCost = endpoint.includes('/api/chat') || endpoint.includes('/api/writing-assistant') ? 0.01 : 0

    const result = await checkRateLimit(identifier, limits.requests, limits.window, limits.maxCost, estimatedCost)
    return { ...result, userId }
  } catch (error) {
    console.error('Rate limiting error:', error)
    // Allow request if rate limiting fails
    return { allowed: true, remaining: 100, resetTime: Date.now() + 60000, costExceeded: false }
  }
}

// Input validation and threat detection
function validateInput(input: string): { isValid: boolean; threats: string[] } {
  if (!input || typeof input !== 'string') {
    return { isValid: true, threats: [] }
  }

  const threats: string[] = []
  let isValid = true

  for (const pattern of THREAT_PATTERNS) {
    const matches = input.match(pattern)
    if (matches) {
      threats.push(...matches)
      isValid = false
    }
  }

  // Additional checks for suspicious patterns
  if (input.length > 10000) {
    threats.push('Input too long')
    isValid = false
  }

  // Check for encoded payloads
  if (/%[0-9A-Fa-f]{2}/.test(input)) {
    threats.push('URL encoded content detected')
    isValid = false
  }

  return { isValid, threats }
}

// Generate CSP header
function generateCSP(): string {
  const cspParts = Object.entries(SECURITY_CONFIG.csp).map(([directive, sources]) => {
    return `${directive} ${Array.isArray(sources) ? sources.join(' ') : sources}`
  })

  return cspParts.join('; ')
}

// Security audit logging
async function logSecurityEvent(
  event: string,
  details: any,
  request: NextRequest
): Promise<void> {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      url: request.url,
      method: request.method,
      details,
    }

    // Log to console for now (in production, you'd send to a logging service)
    console.log(`Security Event: ${event}`, logEntry)
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static assets and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next()
  }

  // Rate limiting
  const rateLimitResult = await checkEnhancedRateLimit(request, pathname)
  if (!rateLimitResult.allowed) {
    await logSecurityEvent('rate_limit_exceeded', {
      pathname,
      ip: request.headers.get('x-forwarded-for'),
      remaining: rateLimitResult.remaining,
      resetTime: rateLimitResult.resetTime
    }, request)

    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now() / 1000))
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now() / 1000)).toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        },
      }
    )
  }

  // Input validation for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const body = await request.text()
      if (body) {
        const { isValid, threats } = validateInput(body)
        if (!isValid) {
          await logSecurityEvent('suspicious_input_detected', {
            pathname,
            threats,
            bodyLength: body.length
          }, request)

          return new NextResponse(
            JSON.stringify({
              error: 'Invalid input detected',
              message: 'Your request contains potentially harmful content.'
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
      }
    } catch (error) {
      // If body parsing fails, continue (might be file upload)
    }
  }

  // Create response with security headers
  const response = NextResponse.next()

  // Add security headers
  response.headers.set('Content-Security-Policy', generateCSP())
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Add HSTS for HTTPS requests
  if (request.url.startsWith('https://')) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // Add rate limit headers
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
  response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString())

  // Add additional security headers
  Object.entries(SECURITY_CONFIG.headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Log security-relevant events
  if (pathname.includes('/api/auth')) {
    await logSecurityEvent('auth_request', {
      pathname,
      method: request.method
    }, request)
  }

  if (pathname.includes('/api/admin')) {
    await logSecurityEvent('admin_request', {
      pathname,
      method: request.method
    }, request)
  }

  return response
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}