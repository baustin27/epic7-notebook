import { supabase } from './supabase'

/**
 * Check if the current user has admin role
 */
export async function isUserAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error checking admin status:', error)
      return false
    }

    return data?.role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Grant admin role to a user (admin only)
 */
export async function grantAdminRole(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First check if current user is admin
    const isAdmin = await isUserAdmin()
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const { error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', userId)

    if (error) {
      console.error('Error granting admin role:', error)
      return { success: false, error: 'Failed to grant admin role' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error granting admin role:', error)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

/**
 * Revoke admin role from a user (admin only)
 */
export async function revokeAdminRole(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First check if current user is admin
    const isAdmin = await isUserAdmin()
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const { error } = await supabase
      .from('users')
      .update({ role: 'user' })
      .eq('id', userId)

    if (error) {
      console.error('Error revoking admin role:', error)
      return { success: false, error: 'Failed to revoke admin role' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error revoking admin role:', error)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

/**
 * Get all users with their roles (admin only)
 */
export async function getAllUsers(): Promise<{ users: any[] | null; error?: string }> {
  try {
    // First check if current user is admin
    const isAdmin = await isUserAdmin()
    if (!isAdmin) {
      return { users: null, error: 'Unauthorized: Admin access required' }
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return { users: null, error: 'Failed to fetch users' }
    }

    return { users: data || [] }
  } catch (error) {
    console.error('Error fetching users:', error)
    return { users: null, error: 'Unexpected error occurred' }
  }
}