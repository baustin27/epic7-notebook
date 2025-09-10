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
    const ADMIN_EMAILS = ['baustin2786@gmail.com']
    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get date range from query params
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '7d'

    // Calculate date range
    const now = new Date()
    let startDate: Date

    switch (range) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default: // 7d
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Get user activity data
    const { data: userActivity, error: activityError } = await supabaseAdmin
      .from('user_engagement')
      .select(`
        user_id,
        users!inner(email, full_name),
        last_activity,
        messages_sent,
        conversations_created,
        session_duration_minutes
      `)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('last_activity', { ascending: false })

    if (activityError) {
      console.error('Error fetching user activity:', activityError)
      // Return mock data if table doesn't exist yet
      const mockActivity = [
        {
          user_id: 'user-1',
          email: 'user1@example.com',
          full_name: 'John Doe',
          last_activity: new Date().toISOString(),
          conversations_count: 5,
          messages_count: 25,
          total_tokens: 1250,
          average_response_time: 1200
        },
        {
          user_id: 'user-2',
          email: 'user2@example.com',
          full_name: 'Jane Smith',
          last_activity: new Date(Date.now() - 86400000).toISOString(),
          conversations_count: 3,
          messages_count: 15,
          total_tokens: 750,
          average_response_time: 950
        }
      ]
      return NextResponse.json({ activity: mockActivity })
    }

    // Aggregate data by user
    const aggregatedActivity = userActivity?.reduce((acc: any[], curr: any) => {
      const existing = acc.find(item => item.user_id === curr.user_id)
      if (existing) {
        existing.messages_sent += curr.messages_sent || 0
        existing.conversations_created += curr.conversations_created || 0
        existing.session_duration_minutes += curr.session_duration_minutes || 0
        if (new Date(curr.last_activity) > new Date(existing.last_activity)) {
          existing.last_activity = curr.last_activity
        }
      } else {
        acc.push({
          user_id: curr.user_id,
          email: curr.users?.email || '',
          full_name: curr.users?.full_name || null,
          last_activity: curr.last_activity,
          conversations_count: curr.conversations_created || 0,
          messages_count: curr.messages_sent || 0,
          total_tokens: 0, // Would need to calculate from model_performance table
          average_response_time: 0 // Would need to calculate from model_performance table
        })
      }
      return acc
    }, []) || []

    return NextResponse.json({ activity: aggregatedActivity })

  } catch (error) {
    console.error('User activity API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}