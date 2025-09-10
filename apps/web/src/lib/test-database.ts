import { supabase } from './supabase'
import { testSupabaseConnection } from './test-connection'

// Test database operations
export async function testDatabaseOperations() {
  console.log('🧪 Testing database operations...')

  try {
    // Test 1: Check if we can query the users table
    console.log('1. Testing users table access...')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })

    if (userError) {
      console.log('❌ Users table not accessible:', userError.message)
      return { success: false, error: 'Database schema not created yet' }
    }

    console.log('✅ Users table accessible, count:', userData)

    // Test 2: Check conversations table
    console.log('2. Testing conversations table...')
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('count', { count: 'exact', head: true })

    if (convError) {
      console.log('❌ Conversations table not accessible:', convError.message)
      return { success: false, error: 'Conversations table missing' }
    }

    console.log('✅ Conversations table accessible, count:', convData)

    // Test 3: Check messages table
    console.log('3. Testing messages table...')
    const { data: msgData, error: msgError } = await supabase
      .from('messages')
      .select('count', { count: 'exact', head: true })

    if (msgError) {
      console.log('❌ Messages table not accessible:', msgError.message)
      return { success: false, error: 'Messages table missing' }
    }

    console.log('✅ Messages table accessible, count:', msgData)

    // Test 4: Check user_settings table
    console.log('4. Testing user_settings table...')
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('count', { count: 'exact', head: true })

    if (settingsError) {
      console.log('❌ User settings table not accessible:', settingsError.message)
      return { success: false, error: 'User settings table missing' }
    }

    console.log('✅ User settings table accessible, count:', settingsData)

    console.log('🎉 All database tables are accessible!')
    return {
      success: true,
      stats: {
        users: userData,
        conversations: convData,
        messages: msgData,
        settings: settingsData
      }
    }

  } catch (error: any) {
    console.error('❌ Database test failed:', error)
    return { success: false, error: error.message }
  }
}

// Test real-time subscriptions
export async function testRealtimeConnection() {
  console.log('🔄 Testing real-time connection...')

  return new Promise((resolve) => {
    const channel = supabase.channel('test-connection')

    channel
      .on('broadcast', { event: 'test' }, ({ payload }) => {
        console.log('✅ Real-time message received:', payload)
        supabase.removeChannel(channel)
        resolve({ success: true })
      })
      .subscribe((status) => {
        console.log('Real-time subscription status:', status)

        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time channel subscribed successfully')
          // Send a test message to ourselves
          channel.send({
            type: 'broadcast',
            event: 'test',
            payload: { message: 'Hello from test!', timestamp: new Date().toISOString() }
          })
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Real-time channel error')
          supabase.removeChannel(channel)
          resolve({ success: false, error: 'Channel error' })
        }
      })

    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('⏰ Real-time test timeout')
      supabase.removeChannel(channel)
      resolve({ success: false, error: 'Timeout' })
    }, 10000)
  })
}

// Run comprehensive database test
export async function runFullDatabaseTest() {
  console.log('🚀 Running full database test suite...')

  // Test basic connection
  const connectionResult = await testSupabaseConnection()
  if (!connectionResult.success) {
    return { success: false, error: 'Connection failed', details: connectionResult }
  }

  // Test database operations
  const dbResult = await testDatabaseOperations()
  if (!dbResult.success) {
    return { success: false, error: 'Database operations failed', details: dbResult }
  }

  // Test real-time connection
  const realtimeResult = await testRealtimeConnection() as { success: boolean; error?: string }
  if (!realtimeResult.success) {
    return { success: false, error: 'Real-time connection failed', details: realtimeResult }
  }

  console.log('🎉 All tests passed! Database and real-time features are working.')
  return {
    success: true,
    results: {
      connection: connectionResult,
      database: dbResult,
      realtime: realtimeResult
    }
  }
}