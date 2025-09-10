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

export async function POST(request: NextRequest) {
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

    // Get request body
    const body = await request.json()
    const { userIds, action } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds array is required' }, { status: 400 })
    }

    if (!['grant_admin', 'revoke_admin', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Prevent admin from modifying themselves in bulk operations
    const filteredUserIds = userIds.filter(id => id !== user.id)

    if (filteredUserIds.length === 0) {
      return NextResponse.json({ error: 'Cannot perform bulk operations on yourself' }, { status: 400 })
    }

    let result

    if (action === 'delete') {
      // Delete users
      const { error: deleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .in('id', filteredUserIds)

      if (deleteError) {
        console.error('Error deleting users:', deleteError)
        return NextResponse.json({ error: 'Failed to delete users' }, { status: 500 })
      }

      result = { deleted: filteredUserIds.length }
    } else {
      // Update user roles
      const newRole = action === 'grant_admin' ? 'admin' : 'user'

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ role: newRole })
        .in('id', filteredUserIds)

      if (updateError) {
        console.error('Error updating user roles:', updateError)
        return NextResponse.json({ error: 'Failed to update user roles' }, { status: 500 })
      }

      result = { updated: filteredUserIds.length, newRole }
    }

    // Log the bulk admin action
    await supabaseAdmin.rpc('log_admin_action', {
      p_action_type: `bulk_${action}`,
      p_resource_type: 'users',
      p_resource_id: null,
      p_action_details: {
        affected_users: filteredUserIds.length,
        action,
        result
      },
      p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      p_user_agent: request.headers.get('user-agent')
    })

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      result
    })

  } catch (error) {
    console.error('Bulk users API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}