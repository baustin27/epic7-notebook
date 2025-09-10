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

    // Generate mock alerts based on system health
    // In a real implementation, this would query an alerts table
    const alerts = []

    // Check for high CPU usage
    const { data: highCpuUsers } = await supabaseAdmin
      .from('model_performance')
      .select('user_id, response_time_ms')
      .gte('response_time_ms', 5000)
      .limit(5)

    if (highCpuUsers && highCpuUsers.length > 0) {
      alerts.push({
        id: 'high-response-time',
        type: 'warning',
        title: 'High Response Times Detected',
        message: `${highCpuUsers.length} requests have response times over 5 seconds in the last hour.`,
        timestamp: new Date().toISOString(),
        acknowledged: false
      })
    }

    // Check for error rate
    const { data: errorData } = await supabaseAdmin
      .from('model_performance')
      .select('success')
      .limit(100)

    if (errorData) {
      const errorRate = errorData.filter(p => !p.success).length / errorData.length
      if (errorRate > 0.1) { // 10% error rate
        alerts.push({
          id: 'high-error-rate',
          type: 'error',
          title: 'High Error Rate Detected',
          message: `Error rate is ${(errorRate * 100).toFixed(1)}% in recent requests.`,
          timestamp: new Date().toISOString(),
          acknowledged: false
        })
      }
    }

    // Check for inactive users (potential security issue)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const { count: inactiveUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .lt('updated_at', thirtyDaysAgo.toISOString())

    if (inactiveUsers && inactiveUsers > 10) {
      alerts.push({
        id: 'inactive-users',
        type: 'info',
        title: 'Many Inactive Users',
        message: `${inactiveUsers} users haven't been active in the last 30 days.`,
        timestamp: new Date().toISOString(),
        acknowledged: false
      })
    }

    // Add a sample critical alert for demonstration
    if (alerts.length === 0) {
      alerts.push({
        id: 'system-healthy',
        type: 'info',
        title: 'System Operating Normally',
        message: 'All system metrics are within normal parameters.',
        timestamp: new Date().toISOString(),
        acknowledged: false
      })
    }

    return NextResponse.json({ alerts })

  } catch (error) {
    console.error('Alerts API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}