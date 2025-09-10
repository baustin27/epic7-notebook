import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    // Get the current user from the request
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get system statistics
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get user statistics
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })

    const { count: activeUsers24h } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', twentyFourHoursAgo.toISOString())

    // Get conversation and message statistics
    const { count: totalConversations } = await supabaseAdmin
      .from('conversations')
      .select('*', { count: 'exact', head: true })

    const { count: totalMessages } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })

    // Get performance metrics
    const { data: performanceData } = await supabaseAdmin
      .from('model_performance')
      .select('response_time_ms, success')
      .gte('created_at', twentyFourHoursAgo.toISOString())

    const averageResponseTime = performanceData && performanceData.length > 0
      ? Math.round(performanceData.reduce((sum, p) => sum + (p.response_time_ms || 0), 0) / performanceData.length)
      : 0

    const errorRate = performanceData && performanceData.length > 0
      ? Math.round((performanceData.filter(p => !p.success).length / performanceData.length) * 100)
      : 0

    // Mock additional metrics (these would come from actual system monitoring)
    const databaseConnections = 12
    const uptimeHours = 168 // 1 week

    const stats = {
      total_users: totalUsers || 0,
      active_users_24h: activeUsers24h || 0,
      total_conversations: totalConversations || 0,
      total_messages: totalMessages || 0,
      average_response_time: averageResponseTime,
      error_rate: errorRate,
      database_connections: databaseConnections,
      uptime_hours: uptimeHours
    }

    return NextResponse.json({ stats })

  } catch (error) {
    console.error('System stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}