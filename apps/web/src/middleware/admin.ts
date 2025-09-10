import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with service role for middleware operations
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

// Create a Supabase client for user operations
const supabaseUser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Middleware to check if the current user has admin privileges
 * Should be used to protect admin-only routes
 */
export async function requireAdmin(request: NextRequest): Promise<{
  isAdmin: boolean;
  user?: any;
  response?: NextResponse;
}> {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return {
        isAdmin: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return {
        isAdmin: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Check if user email is in admin list
    const ADMIN_EMAILS = ['baustin2786@gmail.com'] // TODO: Make this configurable
    const isAdmin = ADMIN_EMAILS.includes(user.email || '')

    if (!isAdmin) {
      return {
        isAdmin: false,
        response: NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    // Log admin access for audit purposes
    await supabaseAdmin.rpc('log_admin_action', {
      p_action_type: 'admin_access',
      p_resource_type: 'admin_panel',
      p_resource_id: request.nextUrl.pathname,
      p_action_details: { method: request.method, user_agent: request.headers.get('user-agent') },
      p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      p_user_agent: request.headers.get('user-agent')
    })

    return { isAdmin: true, user }

  } catch (error) {
    console.error('Admin middleware error:', error)
    return {
      isAdmin: false,
      response: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

/**
 * Check if user has specific permissions for a resource
 */
export async function checkPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    // Get user roles and permissions
    const { data: userRoles, error } = await supabaseAdmin
      .from('user_roles')
      .select('permissions')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      console.error('Error checking permissions:', error)
      return false
    }

    // Check if any role has the required permission
    for (const role of userRoles || []) {
      const permissions = role.permissions || {}
      if (permissions[resource]?.includes(action)) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Permission check error:', error)
    return false
  }
}

/**
 * Log admin action with comprehensive details
 */
export async function logAdminAction(
  request: NextRequest,
  actionType: string,
  resourceType: string,
  resourceId: string | null = null,
  actionDetails: any = {},
  user?: any
): Promise<void> {
  try {
    const userId = user?.id || 'system'

    await supabaseAdmin.rpc('log_admin_action', {
      p_action_type: actionType,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_action_details: {
        ...actionDetails,
        method: request.method,
        url: request.nextUrl.pathname,
        timestamp: new Date().toISOString()
      },
      p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      p_user_agent: request.headers.get('user-agent'),
      p_session_id: null // Could be extracted from session if available
    })
  } catch (error) {
    console.error('Failed to log admin action:', error)
    // Don't throw error to avoid breaking the main flow
  }
}

/**
 * Rate limiting for admin actions
 */
const adminActionLimits = new Map<string, { count: number; resetTime: number }>()

export function checkAdminRateLimit(userId: string, action: string): boolean {
  const key = `${userId}:${action}`
  const now = Date.now()
  const limit = 100 // actions per hour
  const windowMs = 60 * 60 * 1000 // 1 hour

  const current = adminActionLimits.get(key)

  if (!current || now > current.resetTime) {
    adminActionLimits.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (current.count >= limit) {
    return false
  }

  current.count++
  return true
}

/**
 * Middleware to check organization membership and permissions
 */
export async function requireOrganizationAccess(
  request: NextRequest,
  requiredRole: 'owner' | 'admin' | 'member' | 'viewer' = 'member'
): Promise<{
  isAuthorized: boolean;
  user?: any;
  organization?: any;
  member?: any;
  response?: NextResponse;
}> {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return {
        isAuthorized: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)

    if (authError || !user) {
      return {
        isAuthorized: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Get organization ID from request (could be from header, query param, or path)
    const organizationId = request.headers.get('X-Organization-ID') ||
                          request.nextUrl.searchParams.get('organizationId')

    if (!organizationId) {
      return {
        isAuthorized: false,
        response: NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
      }
    }

    // Check if user is a member of the organization with required role
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (memberError || !memberData) {
      return {
        isAuthorized: false,
        response: NextResponse.json({ error: 'Organization access denied' }, { status: 403 })
      }
    }

    // Check role hierarchy
    const roleHierarchy = { viewer: 1, member: 2, admin: 3, owner: 4 }
    const userRoleLevel = roleHierarchy[memberData.role as keyof typeof roleHierarchy] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0

    if (userRoleLevel < requiredRoleLevel) {
      return {
        isAuthorized: false,
        response: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    return {
      isAuthorized: true,
      user,
      organization: memberData.organization,
      member: memberData
    }

  } catch (error) {
    console.error('Organization access middleware error:', error)
    return {
      isAuthorized: false,
      response: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

/**
 * Get current organization context from request
 */
export async function getOrganizationContext(request: NextRequest): Promise<{
  organizationId?: string;
  userId?: string;
  member?: any;
  error?: string;
}> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return { error: 'No authorization header' }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)

    if (authError || !user) {
      return { error: 'Invalid token' }
    }

    // Try to get organization from various sources
    let organizationId = request.headers.get('X-Organization-ID') ||
                        request.nextUrl.searchParams.get('organizationId')

    // If no explicit organization ID, get user's default
    if (!organizationId) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('default_organization_id')
        .eq('id', user.id)
        .single()

      organizationId = userData?.default_organization_id
    }

    if (!organizationId) {
      return { error: 'No organization context available' }
    }

    // Get member data
    const { data: memberData } = await supabaseAdmin
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    return {
      organizationId,
      userId: user.id,
      member: memberData
    }

  } catch (error) {
    console.error('Error getting organization context:', error)
    return { error: 'Failed to get organization context' }
  }
}

/**
 * Middleware for organization-scoped API endpoints
 */
export async function withOrganizationContext(
  request: NextRequest,
  handler: (context: {
    user: any;
    organization: any;
    member: any;
    request: NextRequest;
  }) => Promise<NextResponse>
): Promise<NextResponse> {
  const accessCheck = await requireOrganizationAccess(request)

  if (!accessCheck.isAuthorized) {
    return accessCheck.response!
  }

  return handler({
    user: accessCheck.user,
    organization: accessCheck.organization,
    member: accessCheck.member,
    request
  })
}