import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../../../../middleware/admin'

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

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const adminCheck = await requireAdmin(request)
    if (!adminCheck.isAdmin) {
      return adminCheck.response || NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { rateLimits } = await request.json()

    if (!rateLimits) {
      return NextResponse.json({ error: 'Rate limits data is required' }, { status: 400 })
    }

    // Validate rate limits structure
    const requiredEndpoints = ['auth', 'api', 'chat', 'writing_assistant']
    for (const endpoint of requiredEndpoints) {
      if (!rateLimits[endpoint]) {
        return NextResponse.json({
          error: `Missing rate limits for endpoint: ${endpoint}`
        }, { status: 400 })
      }

      const config = rateLimits[endpoint]
      if (typeof config.requests !== 'number' || config.requests < 1) {
        return NextResponse.json({
          error: `Invalid requests value for ${endpoint}`
        }, { status: 400 })
      }

      if (typeof config.window !== 'number' || config.window < 10) {
        return NextResponse.json({
          error: `Invalid window value for ${endpoint}`
        }, { status: 400 })
      }

      if (typeof config.maxCost !== 'number' || config.maxCost < 0) {
        return NextResponse.json({
          error: `Invalid maxCost value for ${endpoint}`
        }, { status: 400 })
      }
    }

    // Save rate limits to database
    const { error } = await supabaseAdmin
      .from('admin_settings')
      .upsert({
        key: 'rate_limits',
        value: rateLimits,
        updated_by: adminCheck.user?.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })

    if (error) {
      console.error('Error saving rate limits:', error)
      return NextResponse.json({ error: 'Failed to save rate limits' }, { status: 500 })
    }

    // Log admin action
    await supabaseAdmin.rpc('log_admin_action', {
      p_action_type: 'rate_limits_updated',
      p_resource_type: 'admin_settings',
      p_resource_id: 'rate_limits',
      p_action_details: { rateLimits },
      p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      p_user_agent: request.headers.get('user-agent')
    })

    return NextResponse.json({
      success: true,
      message: 'Rate limits updated successfully',
      rateLimits
    })

  } catch (error) {
    console.error('Rate limits API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const adminCheck = await requireAdmin(request)
    if (!adminCheck.isAdmin) {
      return adminCheck.response || NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get current rate limits from database
    const { data, error } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', 'rate_limits')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching rate limits:', error)
      return NextResponse.json({ error: 'Failed to fetch rate limits' }, { status: 500 })
    }

    // Return default rate limits if none saved
    const defaultRateLimits = {
      auth: { requests: 5, window: 60, maxCost: 0 },
      api: { requests: 100, window: 60, maxCost: 10 },
      chat: { requests: 10, window: 60, maxCost: 5 },
      writing_assistant: { requests: 20, window: 60, maxCost: 2 },
    }

    const rateLimits = data?.value || defaultRateLimits

    return NextResponse.json({ rateLimits })

  } catch (error) {
    console.error('Rate limits GET API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}