import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
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

    // Get date range from query params (default to last 30 days)
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const endDate = new Date()
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Get summary statistics
    const [
      totalUsersResult,
      activeUsersResult,
      totalMessagesResult,
      totalConversationsResult,
      modelUsageResult,
      recentEventsResult
    ] = await Promise.all([
      // Total users
      supabaseAdmin
        .from('users')
        .select('id', { count: 'exact' }),

      // Active users in date range
      supabaseAdmin
        .from('analytics_events')
        .select('user_id', { count: 'exact' })
        .eq('event_type', 'login')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr),

      // Total messages in date range
      supabaseAdmin
        .from('messages')
        .select('id', { count: 'exact' })
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr),

      // Total conversations in date range
      supabaseAdmin
        .from('conversations')
        .select('id', { count: 'exact' })
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr),

      // Model usage statistics
      supabaseAdmin
        .from('model_performance')
        .select('model, response_time_ms, success')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr),

      // Recent events (last 10)
      supabaseAdmin
        .from('analytics_events')
        .select(`
          *,
          users:user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    if (totalUsersResult.error) throw totalUsersResult.error
    if (activeUsersResult.error) throw activeUsersResult.error
    if (totalMessagesResult.error) throw totalMessagesResult.error
    if (totalConversationsResult.error) throw totalConversationsResult.error
    if (modelUsageResult.error) throw modelUsageResult.error
    if (recentEventsResult.error) throw recentEventsResult.error

    // Process model usage data
    const modelStats = modelUsageResult.data?.reduce((acc: any, item: any) => {
      if (!acc[item.model]) {
        acc[item.model] = {
          requests: 0,
          successfulRequests: 0,
          avgResponseTime: 0,
          totalResponseTime: 0
        }
      }

      acc[item.model].requests++
      if (item.success) {
        acc[item.model].successfulRequests++
      }
      if (item.response_time_ms) {
        acc[item.model].totalResponseTime += item.response_time_ms
        acc[item.model].avgResponseTime = acc[item.model].totalResponseTime / acc[item.model].requests
      }

      return acc
    }, {}) || {}

    // Calculate success rates
    Object.keys(modelStats).forEach(model => {
      modelStats[model].successRate = (modelStats[model].successfulRequests / modelStats[model].requests) * 100
    })

    return NextResponse.json({
      summary: {
        totalUsers: totalUsersResult.count || 0,
        activeUsers: activeUsersResult.count || 0,
        totalMessages: totalMessagesResult.count || 0,
        totalConversations: totalConversationsResult.count || 0,
        period: {
          start: startDateStr,
          end: endDateStr,
          days
        }
      },
      modelStats,
      recentEvents: recentEventsResult.data || []
    })

  } catch (error) {
    console.error('Analytics summary API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}