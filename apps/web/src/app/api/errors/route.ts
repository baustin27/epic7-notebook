import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json()

    // Get user from auth header if available
    const { data: { user } } = await supabase.auth.getUser()

    // Store error in analytics_events table
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        user_id: user?.id || null,
        event_type: 'client_error',
        event_data: {
          message: errorData.message,
          stack: errorData.stack,
          url: errorData.url,
          user_agent: errorData.userAgent,
          component_stack: errorData.componentStack
        },
        session_id: `client_${Date.now()}`,
        user_agent: errorData.userAgent
      })

    if (error) {
      console.error('Failed to store error metric:', error)
      return NextResponse.json({ error: 'Failed to store error metric' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking API error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}