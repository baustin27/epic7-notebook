/**
 * Environment Configuration
 * Centralized configuration management with validation
 */

import { z } from 'zod'

const envSchema = z.object({
  // Database
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // AI APIs
  OPENROUTER_API_KEY: z.string().min(1),
  
  // Authentication
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  
  // Rate Limiting
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Environment
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
})

export type Config = z.infer<typeof envSchema>

let config: Config

try {
  config = envSchema.parse(process.env)
} catch (error) {
  console.error('❌ Invalid environment configuration:', error)
  throw new Error('Invalid environment configuration')
}

export { config }

// Helper functions
export const isDevelopment = config.NODE_ENV === 'development'
export const isProduction = config.NODE_ENV === 'production'
export const isStaging = config.NODE_ENV === 'staging'

// Feature flags based on environment
export const features = {
  enableRateLimiting: isProduction || isStaging,
  enableDetailedLogging: isDevelopment,
  enableErrorReporting: isProduction || isStaging,
} as const