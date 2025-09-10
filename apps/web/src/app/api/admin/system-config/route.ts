import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, logAdminAction } from '../../../../middleware/admin'

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

    // Get all system configurations
    const { data: configs, error: configError } = await supabaseAdmin
      .from('system_configuration')
      .select('*')
      .order('category', { ascending: true })
      .order('config_key', { ascending: true })

    if (configError) {
      console.error('Error fetching system configuration:', configError)
      return NextResponse.json({ error: 'Failed to fetch system configuration' }, { status: 500 })
    }

    return NextResponse.json({ configs: configs || [] })

  } catch (error) {
    console.error('System config API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check admin access using middleware
    const { isAdmin, user, response } = await requireAdmin(request)
    if (!isAdmin) {
      return response!
    }

    // Get request body
    const body = await request.json()
    const { configKey, value, type } = body

    if (!configKey || value === undefined) {
      return NextResponse.json({ error: 'configKey and value are required' }, { status: 400 })
    }

    // Validate the configuration exists and is editable
    const { data: configData, error: configCheckError } = await supabaseAdmin
      .from('system_configuration')
      .select('is_editable, config_type, validation_rules, config_value')
      .eq('config_key', configKey)
      .single()

    if (configCheckError || !configData) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
    }

    if (!configData.is_editable) {
      return NextResponse.json({ error: 'Configuration is not editable' }, { status: 403 })
    }

    // Validate value type matches
    if (configData.config_type !== type) {
      return NextResponse.json({ error: 'Value type does not match configuration type' }, { status: 400 })
    }

    // Additional validation based on rules
    if (configData.validation_rules) {
      const rules = configData.validation_rules

      if (type === 'number' && rules.min !== undefined && value < rules.min) {
        return NextResponse.json({ error: `Value must be at least ${rules.min}` }, { status: 400 })
      }

      if (type === 'number' && rules.max !== undefined && value > rules.max) {
        return NextResponse.json({ error: `Value must be at most ${rules.max}` }, { status: 400 })
      }

      if (type === 'string' && rules.pattern && !new RegExp(rules.pattern).test(value)) {
        return NextResponse.json({ error: 'Value does not match required pattern' }, { status: 400 })
      }
    }

    // Update the configuration
    const { error: updateError } = await supabaseAdmin
      .from('system_configuration')
      .update({
        config_value: value,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('config_key', configKey)

    if (updateError) {
      console.error('Error updating system configuration:', updateError)
      return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 })
    }

    // Log the admin action using enhanced logging
    await logAdminAction(request, 'update_config', 'system_configuration', configKey, {
      new_value: value,
      config_type: type,
      old_value: configData.config_value
    }, user)

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully'
    })

  } catch (error) {
    console.error('System config PATCH API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}