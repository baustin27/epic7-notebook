import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { getAllFeatureFlags, toggleFeature, type MonitoredFeature } from '../../../../lib/monitoring/provider-monitor'

/**
 * Feature Flags Admin API
 * 
 * GET /api/admin/feature-flags - Get all feature flags
 * POST /api/admin/feature-flags - Update/toggle feature flags
 */

// Admin email check (should be configurable)
const ADMIN_EMAILS = ['baustin2786@gmail.com'] // TODO: Make this configurable

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

    // Get all feature flags
    const featureFlags = await getAllFeatureFlags()

    return NextResponse.json({
      success: true,
      data: featureFlags
    })
  } catch (error) {
    console.error('Failed to get feature flags:', error)
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

    // Parse request body
    const body = await request.json()
    const { feature, enabled } = body

    if (!feature || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request - feature and enabled are required' },
        { status: 400 }
      )
    }

    // Validate feature name
    const validFeatures: MonitoredFeature[] = [
      'chat',
      'writing_assistant', 
      'model_management',
      'prompt_library',
      'file_upload',
      'conversation_export'
    ]

    if (!validFeatures.includes(feature)) {
      return NextResponse.json(
        { error: `Invalid feature name. Valid features: ${validFeatures.join(', ')}` },
        { status: 400 }
      )
    }

    // Toggle the feature
    const success = await toggleFeature(feature as MonitoredFeature, enabled)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update feature flag' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Feature "${feature}" ${enabled ? 'enabled' : 'disabled'} successfully`
    })
  } catch (error) {
    console.error('Failed to toggle feature flag:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check admin permissions
    if (!await isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // Parse request body for bulk updates
    const body = await request.json()
    const { updates } = body

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Invalid request - updates array is required' },
        { status: 400 }
      )
    }

    // Validate and process bulk updates
    const results = []
    for (const update of updates) {
      const { feature, enabled } = update
      
      if (!feature || typeof enabled !== 'boolean') {
        results.push({ feature, success: false, error: 'Invalid format' })
        continue
      }

      try {
        const success = await toggleFeature(feature as MonitoredFeature, enabled)
        results.push({ 
          feature, 
          success, 
          error: success ? null : 'Failed to update'
        })
      } catch (error) {
        results.push({ 
          feature, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('Failed to bulk update feature flags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}