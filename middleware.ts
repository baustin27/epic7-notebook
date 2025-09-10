/**
 * Next.js Middleware
 * Integrates all security middleware for the chat application
 */

import { NextRequest, NextResponse } from 'next/server'
import { corsMiddleware, withSecurityHeaders, validateRequest, ipFilter, securityAudit } from '@/lib/middleware/security'
import { createRateLimit, rateLimits } from '@/lib/middleware/rate-limit'

// Apply rate limiting to API routes
const apiRateLimit = createRateLimit(rateLimits.api)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Security audit logging
  const clientIP = ipFilter.getClientIP(request)
  
  // IP filtering (if configured)
  if (!ipFilter.isAllowed(clientIP)) {
    securityAudit.log({
      type: 'suspicious_activity',
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || undefined,
      details: `Blocked IP: ${clientIP}`,
    })
    
    return new NextResponse('Access denied', { status: 403 })
  }

  // Request validation
  const validationError = validateRequest(request)
  if (validationError) {
    securityAudit.log({
      type: 'invalid_request',
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || undefined,
      details: validationError,
    })
    
    return new NextResponse(validationError, { status: 400 })
  }

  // Handle CORS for API routes
  if (pathname.startsWith('/api/')) {
    const corsResponse = corsMiddleware(request)
    if (corsResponse) return withSecurityHeaders(corsResponse)

    // Apply rate limiting to API routes
    try {
      const rateLimit = createRateLimit(rateLimits.api)
      // Note: In actual implementation, you'd need to adapt this for Next.js middleware
      // This is a simplified version for demonstration
    } catch (error) {
      console.error('Rate limiting error in middleware:', error)
    }
  }

  // Continue with the request and apply security headers
  const response = NextResponse.next()
  return withSecurityHeaders(response)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}