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

    // Get saved model selections from system configuration
    const { data: configData, error: configError } = await supabaseAdmin
      .from('system_configuration')
      .select('config_value, updated_at')
      .eq('config_key', 'admin_selected_models')
      .single()

    if (configError && configError.code !== 'PGRST116') { // PGRST116 is "no rows found"
      console.error('Error fetching model selections:', configError)
      return NextResponse.json({ error: 'Failed to fetch model selections' }, { status: 500 })
    }

    let selectedModels = {}
    if (configData?.config_value) {
      try {
        selectedModels = JSON.parse(configData.config_value)
      } catch (parseError) {
        console.warn('Failed to parse saved model selections:', parseError)
        selectedModels = {}
      }
    }

    return NextResponse.json({
      selectedModels,
      lastUpdated: configData?.updated_at || null
    })

  } catch (error) {
    console.error('Admin models API GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin access using middleware
    const { isAdmin, user, response } = await requireAdmin(request)
    if (!isAdmin) {
      return response!
    }

    // Get request body
    const body = await request.json()
    const { selectedModels, freeOnly } = body

    if (!selectedModels || typeof selectedModels !== 'object') {
      return NextResponse.json({ error: 'selectedModels is required and must be an object' }, { status: 400 })
    }

    // Validate the structure of selectedModels
    for (const [provider, models] of Object.entries(selectedModels)) {
      if (!Array.isArray(models)) {
        return NextResponse.json({
          error: `selectedModels.${provider} must be an array`
        }, { status: 400 })
      }
    }

    // Save model selections to system configuration
    const configValue = JSON.stringify(selectedModels)

    // First, check if the configuration already exists
    const { data: existingConfig } = await supabaseAdmin
      .from('system_configuration')
      .select('id, config_value')
      .eq('config_key', 'admin_selected_models')
      .single()

    let updateResult
    if (existingConfig) {
      // Update existing configuration
      updateResult = await supabaseAdmin
        .from('system_configuration')
        .update({
          config_value: configValue,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', 'admin_selected_models')
    } else {
      // Insert new configuration
      updateResult = await supabaseAdmin
        .from('system_configuration')
        .insert({
          config_key: 'admin_selected_models',
          config_value: configValue,
          config_type: 'json',
          category: 'models',
          is_editable: true,
          created_by: user.id,
          updated_by: user.id
        })
    }

    if (updateResult.error) {
      console.error('Error saving model selections:', updateResult.error)
      return NextResponse.json({ error: 'Failed to save model selections' }, { status: 500 })
    }

    // Also save the freeOnly setting
    const freeOnlyConfigValue = JSON.stringify({ freeOnly })

    const { data: freeOnlyExisting } = await supabaseAdmin
      .from('system_configuration')
      .select('id')
      .eq('config_key', 'admin_free_models_only')
      .single()

    if (freeOnlyExisting) {
      await supabaseAdmin
        .from('system_configuration')
        .update({
          config_value: freeOnlyConfigValue,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', 'admin_free_models_only')
    } else {
      await supabaseAdmin
        .from('system_configuration')
        .insert({
          config_key: 'admin_free_models_only',
          config_value: freeOnlyConfigValue,
          config_type: 'json',
          category: 'models',
          is_editable: true,
          created_by: user.id,
          updated_by: user.id
        })
    }

    // Log the admin action
    await logAdminAction(request, 'update_model_selections', 'system_configuration', 'admin_selected_models', {
      selectedModels,
      freeOnly,
      providerCount: Object.keys(selectedModels).length,
      totalSelectedModels: Object.values(selectedModels).flat().length
    }, user)

    return NextResponse.json({
      success: true,
      message: 'Model selections saved successfully',
      selectedModels,
      freeOnly
    })

  } catch (error) {
    console.error('Admin models API POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}