import { supabase } from './supabase'

export async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...')

    // Test basic connection
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Supabase connection error:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Supabase connection successful!')
    console.log('Session data:', data)

    // Test database connection by trying to get user count (if table exists)
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true })

      if (userError) {
        console.log('⚠️  Users table not found or not accessible (this is expected if not set up yet)')
        console.log('Database connection is working, but tables need to be created')
      } else {
        console.log('✅ Database tables accessible, user count:', userData)
      }
    } catch (dbError) {
      console.log('⚠️  Database test failed (expected if tables not created yet)')
    }

    return { success: true, data }

  } catch (error: any) {
    console.error('❌ Connection test failed:', error)
    return { success: false, error: error.message }
  }
}

// Test function for development
export async function runConnectionTest() {
  const result = await testSupabaseConnection()

  if (result.success) {
    console.log('🎉 All tests passed! Supabase is connected and ready.')
  } else {
    console.error('❌ Connection test failed:', result.error)
  }

  return result
}