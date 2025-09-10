import { supabase } from './supabase'
import type { Database } from '../types/database'

// Type helpers
type Tables = Database['public']['Tables']
type Organization = Tables['organizations']['Row']
type OrganizationInsert = Tables['organizations']['Insert']
type OrganizationUpdate = Tables['organizations']['Update']
type OrganizationMember = Tables['organization_members']['Row']
type OrganizationMemberInsert = Tables['organization_members']['Insert']
type OrganizationInvitation = Tables['organization_invitations']['Row']

// Organization member management service (defined first)
const organizationMemberService = {
  // Add member to organization
  async addMember(organizationId: string, memberData: Omit<OrganizationMemberInsert, 'organization_id'>): Promise<OrganizationMember> {
    const { data, error } = await supabase
      .from('organization_members')
      .insert({
        ...memberData,
        organization_id: organizationId
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get organization members
  async getMembers(organizationId: string): Promise<(OrganizationMember & { user: { email: string; full_name: string | null } })[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        user:users(email, full_name)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Update member role
  async updateRole(memberId: string, role: 'owner' | 'admin' | 'member' | 'viewer'): Promise<OrganizationMember> {
    const { data, error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Remove member from organization
  async removeMember(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .update({ is_active: false })
      .eq('id', memberId)

    if (error) throw error
  },

  // Get user's organizations with roles
  async getUserMemberships(): Promise<(OrganizationMember & { organization: Organization })[]> {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('is_active', true)
        .order('joined_at', { ascending: false })

      if (error) {
        // Check for infinite recursion policy error
        if (error.code === '42P17') {
          console.warn('Organization members policy has infinite recursion - returning empty array')
          return []
        }
        throw error
      }
      return data || []
    } catch (error) {
      console.error('Error fetching user memberships:', error)
      return []
    }
  }
}

// Organization management service
export const organizationService = {
  // Include member service as a property
  organizationMemberService,

  // Create a new organization
  async create(organizationData: Omit<OrganizationInsert, 'created_by'>): Promise<Organization> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('organizations')
      .insert({
        ...organizationData,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get organization by ID
  async getById(id: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  },

  // Get all organizations for current user
  async getUserOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Update organization
  async update(id: string, updates: OrganizationUpdate): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete organization
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Get current user's organization context
  async getCurrentOrganizationContext() {
    try {
      const { data, error } = await supabase
        .rpc('get_user_organization_context')

      if (error) {
        // Check for infinite recursion policy error
        if (error.code === '42P17') {
          console.warn('Organization context function has infinite recursion - returning null')
          return null
        }
        throw error
      }
      return data?.[0] || null
    } catch (error) {
      console.error('Error fetching organization context:', error)
      return null
    }
  }
}

// Export the member service separately as well for backward compatibility
export { organizationMemberService }

// Organization invitation service
export const organizationInvitationService = {
  // Create invitation
  async createInvitation(organizationId: string, email: string, role: 'owner' | 'admin' | 'member' | 'viewer' = 'member'): Promise<OrganizationInvitation> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Generate secure token
    const token = crypto.randomUUID()

    const { data, error } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        email,
        role,
        invited_by: user.id,
        token
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get pending invitations for organization
  async getPendingInvitations(organizationId: string): Promise<OrganizationInvitation[]> {
    const { data, error } = await supabase
      .from('organization_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Accept invitation
  async acceptInvitation(token: string): Promise<{ organization: Organization; member: OrganizationMember }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invitations')
      .select('*, organization:organizations(*)')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invitation) {
      throw new Error('Invalid or expired invitation')
    }

    // Check if user email matches invitation
    if (invitation.email !== user.email) {
      throw new Error('Invitation is for a different email address')
    }

    // Add user to organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role,
        joined_at: new Date().toISOString()
      })
      .select()
      .single()

    if (memberError) throw memberError

    // Update invitation status
    await supabase
      .from('organization_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    return {
      organization: invitation.organization,
      member
    }
  },

  // Cancel invitation
  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId)

    if (error) throw error
  }
}

// Permission checking utilities
export const organizationPermissions = {
  // Check if user has permission in organization
  async hasPermission(organizationId: string, permission: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('has_organization_permission', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_organization_id: organizationId,
        p_permission: permission
      })

    if (error) throw error
    return data
  },

  // Check if user is owner/admin of organization
  async isAdmin(organizationId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('is_active', true)
      .single()

    if (error) return false
    return data?.role === 'owner' || data?.role === 'admin'
  },

  // Check if user is member of organization
  async isMember(organizationId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('is_active', true)
      .single()

    return !error && !!data
  }
}