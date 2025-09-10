import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '../types/database'

export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        // This helps with server-side authentication
        'X-Client-Info': 'supabase-js-server'
      }
    }
  })
}