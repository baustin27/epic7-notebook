import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { getFeatureUsageStats, type MonitoredFeature } from '../../../../lib/monitoring/provider-monitor'

/**
 * Usage Stats Admin API
 * 
 * GET /api/admin/usage-stats - Get provider usage statistics
 * Supports query parameters:
 * - feature: specific feature to get stats for
 * - period: time period (24 hours, 7 days, 30 days, etc.)
 * - groupBy: group results by (feature, provider, user, model)
 */

// Admin email check (should match feature-flags route)
const ADMIN_EMAILS = ['baustin2786@gmail.com']

async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return false
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      console.error('User auth failed:', error)
      return false
    }

    return ADMIN_EMAILS.includes(user.email || '')
  } catch (error) {
    console.error('Admin check failed:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check admin permissions
    if (!await isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const feature = searchParams.get('feature') as MonitoredFeature | null
    const period = searchParams.get('period') || '24 hours'
    const groupBy = searchParams.get('groupBy') || 'feature'

    // Validate period format
    const validPeriods = ['1 hour', '24 hours', '7 days', '30 days', '90 days']
    if (!validPeriods.some(p => period.includes(p.split(' ')[1]))) {
      // Allow custom periods but sanitize
      const periodMatch = period.match(/^(\d+)\s+(minute|hour|day|week|month)s?$/)
      if (!periodMatch) {
        return NextResponse.json(
          { error: 'Invalid period format. Use format like "24 hours", "7 days", etc.' },
          { status: 400 }
        )
      }
    }

    // Get usage stats using the database function
    const usageStats = await getFeatureUsageStats(feature, period)

    // Get real-time current stats
    let currentStats = {}
    try {
      const { data: currentData, error: currentError } = await supabase
        .from('provider_usage_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
        .order('created_at', { ascending: false })

      if (!currentError && currentData) {
        currentStats = {
          activeCallsLastMinute: currentData.length,
          lastCallTime: currentData[0]?.created_at || null
        }
      }
    } catch (error) {
      console.warn('Failed to get real-time stats:', error)
    }

    // Get feature flags status
    let featureFlags = {}
    try {
      const { data: flagsData, error: flagsError } = await supabase
        .from('feature_flags')
        .select('feature_name, enabled')

      if (!flagsError && flagsData) {
        featureFlags = flagsData.reduce((acc, flag) => ({
          ...acc,
          [flag.feature_name]: flag.enabled
        }), {})
      }
    } catch (error) {
      console.warn('Failed to get feature flags:', error)
    }

    // Additional aggregated stats based on groupBy parameter
    let aggregatedStats = []
    try {
      let query = supabase
        .from('provider_usage_logs')
        .select('feature, provider, user_id, model, tokens_input, tokens_output, cost_usd, success, created_at')

      // Apply time filter
      const timeFilter = new Date()
      if (period.includes('hour')) {
        const hours = parseInt(period.split(' ')[0])
        timeFilter.setHours(timeFilter.getHours() - hours)
      } else if (period.includes('day')) {
        const days = parseInt(period.split(' ')[0])
        timeFilter.setDate(timeFilter.getDate() - days)
      }
      
      query = query.gte('created_at', timeFilter.toISOString())

      // Apply feature filter if specified
      if (feature) {
        query = query.eq('feature', feature)
      }

      const { data: rawData, error: rawError } = await query

      if (!rawError && rawData) {
        // Group data based on groupBy parameter
        const groupedData: Record<string, any> = {}

        rawData.forEach(row => {
          let groupKey = ''
          switch (groupBy) {
            case 'feature':
              groupKey = row.feature
              break
            case 'provider':
              groupKey = row.provider
              break
            case 'model':
              groupKey = `${row.provider}/${row.model}`
              break
            case 'user':
              groupKey = row.user_id || 'anonymous'
              break
            default:
              groupKey = row.feature
          }

          if (!groupedData[groupKey]) {
            groupedData[groupKey] = {
              group: groupKey,
              totalCalls: 0,
              totalTokensInput: 0,
              totalTokensOutput: 0,
              totalCost: 0,
              successCount: 0,
              failureCount: 0
            }
          }

          const group = groupedData[groupKey]
          group.totalCalls++
          group.totalTokensInput += row.tokens_input || 0
          group.totalTokensOutput += row.tokens_output || 0
          group.totalCost += parseFloat(row.cost_usd || '0')
          
          if (row.success) {
            group.successCount++
          } else {
            group.failureCount++
          }
        })

        aggregatedStats = Object.values(groupedData)
          .sort((a: any, b: any) => b.totalCost - a.totalCost) // Sort by cost descending
      }
    } catch (error) {
      console.warn('Failed to get aggregated stats:', error)
    }

    return NextResponse.json({
      success: true,
      data: {
        period,
        feature: feature || 'all',
        groupBy,
        summary: usageStats,
        current: currentStats,
        featureFlags,
        aggregated: aggregatedStats,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Failed to get usage stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin permissions
    if (!await isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // This endpoint can be used to trigger manual usage calculations or cleanup
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'cleanup_old_logs':
        // Clean up logs older than 90 days (configurable)
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - 90)
        
        const { error: cleanupError } = await supabase
          .from('provider_usage_logs')
          .delete()
          .lt('created_at', cutoffDate.toISOString())

        if (cleanupError) {
          throw cleanupError
        }

        return NextResponse.json({
          success: true,
          message: 'Old usage logs cleaned up successfully'
        })

      case 'recalculate_costs':
        // This would be used to recalculate costs if pricing models change
        // For now, just return success
        return NextResponse.json({
          success: true,
          message: 'Cost recalculation triggered (not implemented yet)'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Failed to execute admin action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}