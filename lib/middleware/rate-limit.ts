/**
 * Rate Limiting Middleware
 * Advanced rate limiting with Redis backend and multiple strategies
 */

import { Redis } from '@upstash/redis'
import { config, features } from '@/lib/config'
import { sanitizeRateLimitKey } from './sanitization'

// Redis client (optional - falls back to in-memory)
let redis: Redis | null = null

if (config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: config.UPSTASH_REDIS_REST_URL,
    token: config.UPSTASH_REDIS_REST_TOKEN,
  })
}

// In-memory store fallback
const memoryStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  max: number // Maximum requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: any) => string
  onLimitReached?: (req: any) => void
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  totalHits: number
}

// Predefined rate limit configurations
export const rateLimits = {
  // API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
  },
  
  // Chat messages
  chat: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 messages per minute
  },
  
  // AI model requests
  aiRequests: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 AI requests per minute
  },
  
  // Authentication
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
  },
  
  // File uploads
  uploads: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 file uploads per hour
  },
} as const

class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    if (!features.enableRateLimiting) {
      return {
        allowed: true,
        remaining: this.config.max,
        resetTime: Date.now() + this.config.windowMs,
        totalHits: 0,
      }
    }

    const key = sanitizeRateLimitKey(`rate_limit:${identifier}`)
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    if (redis) {
      return this.checkLimitRedis(key, now, windowStart)
    } else {
      return this.checkLimitMemory(key, now, windowStart)
    }
  }

  private async checkLimitRedis(key: string, now: number, windowStart: number): Promise<RateLimitResult> {
    const pipeline = redis!.pipeline()
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart)
    
    // Count current requests
    pipeline.zcard(key)
    
    // Add current request
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` })
    
    // Set expiration
    pipeline.expire(key, Math.ceil(this.config.windowMs / 1000))
    
    const results = await pipeline.exec()
    const currentCount = results[1] as number + 1

    const allowed = currentCount <= this.config.max
    const resetTime = now + this.config.windowMs

    return {
      allowed,
      remaining: Math.max(0, this.config.max - currentCount),
      resetTime,
      totalHits: currentCount,
    }
  }

  private checkLimitMemory(key: string, now: number, windowStart: number): RateLimitResult {
    const existing = memoryStore.get(key)
    
    if (!existing || existing.resetTime < now) {
      // New window
      memoryStore.set(key, { count: 1, resetTime: now + this.config.windowMs })
      return {
        allowed: true,
        remaining: this.config.max - 1,
        resetTime: now + this.config.windowMs,
        totalHits: 1,
      }
    }

    existing.count++
    memoryStore.set(key, existing)

    const allowed = existing.count <= this.config.max

    return {
      allowed,
      remaining: Math.max(0, this.config.max - existing.count),
      resetTime: existing.resetTime,
      totalHits: existing.count,
    }
  }
}

// Rate limiting middleware factory
export function createRateLimit(config: RateLimitConfig) {
  const limiter = new RateLimiter(config)

  return async (req: any, res: any, next: any) => {
    try {
      const identifier = config.keyGenerator 
        ? config.keyGenerator(req)
        : getClientIdentifier(req)

      const result = await limiter.checkLimit(identifier)

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.max)
      res.setHeader('X-RateLimit-Remaining', result.remaining)
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString())

      if (!result.allowed) {
        if (config.onLimitReached) {
          config.onLimitReached(req)
        }

        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        })
      }

      next()
    } catch (error) {
      console.error('Rate limiting error:', error)
      // Fail open - allow the request if rate limiting fails
      next()
    }
  }
}

// Get client identifier for rate limiting
function getClientIdentifier(req: any): string {
  // Try to get user ID first
  if (req.user?.id) {
    return `user:${req.user.id}`
  }

  // Fall back to IP address
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded 
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
    : req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown'

  return `ip:${ip}`
}

// Predefined middleware instances
export const apiRateLimit = createRateLimit(rateLimits.api)
export const chatRateLimit = createRateLimit(rateLimits.chat)
export const aiRequestRateLimit = createRateLimit(rateLimits.aiRequests)
export const authRateLimit = createRateLimit(rateLimits.auth)
export const uploadRateLimit = createRateLimit(rateLimits.uploads)

// Custom rate limiters
export const createChatRateLimit = (userId: string) => createRateLimit({
  ...rateLimits.chat,
  keyGenerator: () => `chat:${userId}`,
})

export const createApiKeyRateLimit = (apiKey: string) => createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per API key
  keyGenerator: () => `apikey:${apiKey.slice(-8)}`, // Use last 8 chars for privacy
})

// Rate limit status check
export async function getRateLimitStatus(identifier: string, limitType: keyof typeof rateLimits) {
  const limiter = new RateLimiter(rateLimits[limitType])
  return limiter.checkLimit(identifier)
}

// Cleanup expired entries (for memory store)
export function cleanupMemoryStore() {
  const now = Date.now()
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetTime < now) {
      memoryStore.delete(key)
    }
  }
}

// Start cleanup interval for memory store
if (!redis) {
  setInterval(cleanupMemoryStore, 60 * 1000) // Clean up every minute
}