import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { requireOrganizationAccess, getOrganizationContext } from '../../../middleware/admin'

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
    // Get organization context from request
    const orgContext = await getOrganizationContext(request)

    let organizationId: string | undefined
    let isSystemAdmin = false

    if (orgContext.organizationId) {
      // Organization-scoped request - check organization permissions
      const accessCheck = await requireOrganizationAccess(request, 'admin')
      if (!accessCheck.isAuthorized) {
        return accessCheck.response!
      }
      organizationId = orgContext.organizationId
    } else {
      // System-wide request - check system admin permissions
      const authHeader = request.headers.get('Authorization')
      if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check if user is system admin
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userError || userData?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }

      isSystemAdmin = true
    }

    // Get date range from query params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0]

    // Get analytics data
    const [metricsResult, eventsResult, performanceResult, engagementResult] = await Promise.all([
      // Daily metrics (only system-wide for now, organization-specific metrics can be added later)
      supabaseAdmin
        .from('analytics_metrics')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false }),

      // Recent events
      (() => {
        let query = supabaseAdmin
          .from('analytics_events')
          .select(`
            *,
            users:user_id (
              email,
              full_name
            )
          `)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false })
          .limit(100)

        // Filter by organization if specified
        if (organizationId) {
          query = query.eq('organization_id', organizationId)
        }

        return query
      })(),

      // Model performance
      (() => {
        let query = supabaseAdmin
          .from('model_performance')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false })

        // Filter by organization if specified
        if (organizationId) {
          query = query.eq('organization_id', organizationId)
        }

        return query
      })(),

      // User engagement
      (() => {
        let query = supabaseAdmin
          .from('user_engagement')
          .select(`
            *,
            users:user_id (
              email,
              full_name
            )
          `)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false })

        // Filter by organization if specified
        if (organizationId) {
          query = query.eq('organization_id', organizationId)
        }

        return query
      })()
    ])

    if (metricsResult.error) throw metricsResult.error
    if (eventsResult.error) throw eventsResult.error
    if (performanceResult.error) throw performanceResult.error
    if (engagementResult.error) throw engagementResult.error

    return NextResponse.json({
      metrics: metricsResult.data || [],
      events: eventsResult.data || [],
      performance: performanceResult.data || [],
      engagement: engagementResult.data || []
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}