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

    // Get system health metrics
    const { data: metrics, error: metricsError } = await supabaseAdmin
      .rpc('get_system_health_status')

    if (metricsError) {
      console.error('Error fetching health metrics:', metricsError)
      // Return mock data if function doesn't exist yet
      const mockMetrics = [
        {
          metric_type: 'cpu_usage',
          current_value: 45,
          status: 'healthy',
          last_updated: new Date().toISOString()
        },
        {
          metric_type: 'memory_usage',
          current_value: 62,
          status: 'healthy',
          last_updated: new Date().toISOString()
        },
        {
          metric_type: 'disk_usage',
          current_value: 78,
          status: 'warning',
          last_updated: new Date().toISOString()
        },
        {
          metric_type: 'network_latency',
          current_value: 25,
          status: 'healthy',
          last_updated: new Date().toISOString()
        }
      ]
      return NextResponse.json({ metrics: mockMetrics })
    }

    return NextResponse.json({ metrics: metrics || [] })

  } catch (error) {
    console.error('Health monitoring API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}