import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const performanceData = await request.json()

    // Get user from auth header if available
    const { data: { user } } = await supabase.auth.getUser()

    // Store performance metric in analytics_events table
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        user_id: user?.id || null,
        event_type: 'performance_metric',
        event_data: {
          metric_name: performanceData.name,
          metric_value: performanceData.value,
          url: performanceData.url,
          user_agent: performanceData.userAgent,
          connection: performanceData.connection,
          device_memory: performanceData.deviceMemory,
          hardware_concurrency: performanceData.hardwareConcurrency
        },
        session_id: `client_${Date.now()}`,
        user_agent: performanceData.userAgent
      })

    if (error) {
      console.error('Failed to store performance metric:', error)
      return NextResponse.json({ error: 'Failed to store performance metric' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Performance API error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}