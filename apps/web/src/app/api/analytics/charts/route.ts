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

    // Get chart data
    const [
      dailyActiveUsersResult,
      dailyMessagesResult,
      dailyConversationsResult,
      modelUsageOverTimeResult,
      userEngagementResult
    ] = await Promise.all([
      // Daily active users
      supabaseAdmin
        .from('analytics_events')
        .select('created_at::date as date, user_id')
        .eq('event_type', 'login')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr),

      // Daily messages
      supabaseAdmin
        .from('messages')
        .select('created_at::date as date, id')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr),

      // Daily conversations
      supabaseAdmin
        .from('conversations')
        .select('created_at::date as date, id')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr),

      // Model usage over time
      supabaseAdmin
        .from('model_performance')
        .select('created_at::date as date, model, response_time_ms, success')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr),

      // User engagement trends
      supabaseAdmin
        .from('user_engagement')
        .select('date, messages_sent, conversations_created')
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: true })
    ])

    if (dailyActiveUsersResult.error) throw dailyActiveUsersResult.error
    if (dailyMessagesResult.error) throw dailyMessagesResult.error
    if (dailyConversationsResult.error) throw dailyConversationsResult.error
    if (modelUsageOverTimeResult.error) throw modelUsageOverTimeResult.error
    if (userEngagementResult.error) throw userEngagementResult.error

    // Process daily active users
    const dailyActiveUsers = dailyActiveUsersResult.data?.reduce((acc: any, item: any) => {
      const date = item.date
      if (!acc[date]) {
        acc[date] = new Set()
      }
      acc[date].add(item.user_id)
      return acc
    }, {})

    const dailyActiveUsersChart = Object.entries(dailyActiveUsers || {}).map(([date, users]) => ({
      date,
      count: (users as Set<string>).size
    })).sort((a, b) => a.date.localeCompare(b.date))

    // Process daily messages
    const dailyMessages = dailyMessagesResult.data?.reduce((acc: any, item: any) => {
      const date = item.date
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    const dailyMessagesChart = Object.entries(dailyMessages || {}).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => a.date.localeCompare(b.date))

    // Process daily conversations
    const dailyConversations = dailyConversationsResult.data?.reduce((acc: any, item: any) => {
      const date = item.date
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    const dailyConversationsChart = Object.entries(dailyConversations || {}).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => a.date.localeCompare(b.date))

    // Process model usage over time
    const modelUsageOverTime = modelUsageOverTimeResult.data?.reduce((acc: any, item: any) => {
      const date = item.date
      const model = item.model

      if (!acc[date]) {
        acc[date] = {}
      }
      if (!acc[date][model]) {
        acc[date][model] = { requests: 0, avgResponseTime: 0, totalResponseTime: 0 }
      }

      acc[date][model].requests++
      if (item.response_time_ms) {
        acc[date][model].totalResponseTime += item.response_time_ms
        acc[date][model].avgResponseTime = acc[date][model].totalResponseTime / acc[date][model].requests
      }

      return acc
    }, {})

    const modelUsageChart = Object.entries(modelUsageOverTime || {}).map(([date, models]) => ({
      date,
      models: models as any
    })).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      dailyActiveUsers: dailyActiveUsersChart,
      dailyMessages: dailyMessagesChart,
      dailyConversations: dailyConversationsChart,
      modelUsageOverTime: modelUsageChart,
      userEngagement: userEngagementResult.data || [],
      period: {
        start: startDateStr,
        end: endDateStr,
        days
      }
    })

  } catch (error) {
    console.error('Analytics charts API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}