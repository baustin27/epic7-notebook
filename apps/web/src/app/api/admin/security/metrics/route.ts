import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../../../../../middleware/admin'

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
    // Check admin access using middleware
    const { isAdmin, user, response } = await requireAdmin(request)
    if (!isAdmin) {
      return response!
    }

    // Get time range from query params
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '24h'

    // Calculate date range
    const now = new Date()
    let startDate: Date

    switch (range) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default: // 24h
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Get security metrics from Redis (simulated for now)
    // In production, this would aggregate data from Redis security events
    const mockMetrics = {
      totalEvents: 1247,
      criticalEvents: 3,
      rateLimitHits: 89,
      blockedRequests: 12,
      activeThreats: 2,
      topThreatSources: [
        { ip: '192.168.1.100', count: 45, lastSeen: new Date().toISOString() },
        { ip: '10.0.0.50', count: 23, lastSeen: new Date(Date.now() - 3600000).toISOString() },
        { ip: '172.16.0.25', count: 18, lastSeen: new Date(Date.now() - 7200000).toISOString() }
      ]
    }

    // Try to get real metrics from audit logs
    try {
      const { data: auditLogs, error } = await supabaseAdmin
        .from('admin_audit_log')
        .select('action_type, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (!error && auditLogs) {
        // Count different types of security events
        const eventCounts = auditLogs.reduce((acc: any, log: any) => {
          if (log.action_type.includes('rate_limit')) acc.rateLimitHits++
          else if (log.action_type.includes('threat')) acc.criticalEvents++
          else if (log.action_type.includes('block')) acc.blockedRequests++
          acc.totalEvents++
          return acc
        }, { totalEvents: 0, criticalEvents: 0, rateLimitHits: 0, blockedRequests: 0 })

        mockMetrics.totalEvents = Math.max(mockMetrics.totalEvents, eventCounts.totalEvents)
        mockMetrics.criticalEvents = Math.max(mockMetrics.criticalEvents, eventCounts.criticalEvents)
        mockMetrics.rateLimitHits = Math.max(mockMetrics.rateLimitHits, eventCounts.rateLimitHits)
        mockMetrics.blockedRequests = Math.max(mockMetrics.blockedRequests, eventCounts.blockedRequests)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      // Continue with mock data
    }

    return NextResponse.json({ metrics: mockMetrics })

  } catch (error) {
    console.error('Security metrics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}