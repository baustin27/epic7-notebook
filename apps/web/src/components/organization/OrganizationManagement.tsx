'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/SimpleAuthContext'
import { organizationService, organizationMemberService, organizationInvitationService } from '../../lib/organizationService'
import type { Database } from '../../types/database'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationMember = Database['public']['Tables']['organization_members']['Row']
type MemberWithUser = OrganizationMember & { user: { email: string; full_name: string | null } }

interface OrganizationManagementProps {
  className?: string
}

export function OrganizationManagement({ className = '' }: OrganizationManagementProps) {
  const { user, currentOrganization } = useAuth()
  const [members, setMembers] = useState<MemberWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'members' | 'settings'>('members')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [isInviting, setIsInviting] = useState(false)

  useEffect(() => {
    if (currentOrganization) {
      loadMembers()
    }
  }, [currentOrganization])

  const loadMembers = async () => {
    if (!currentOrganization) return

    try {
      const membersData = await organizationMemberService.getMembers(currentOrganization.id)
      setMembers(membersData)
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentOrganization || !inviteEmail.trim()) return

    setIsInviting(true)
    try {
      await organizationInvitationService.createInvitation(
        currentOrganization.id,
        inviteEmail.trim(),
        inviteRole
      )
      setInviteEmail('')
      setInviteRole('member')
      // TODO: Show success message
    } catch (error) {
      console.error('Failed to invite member:', error)
      // TODO: Show error message
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      await organizationMemberService.removeMember(memberId)
      await loadMembers()
      // TODO: Show success message
    } catch (error) {
      console.error('Failed to remove member:', error)
      // TODO: Show error message
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: 'owner' | 'admin' | 'member' | 'viewer') => {
    try {
      await organizationMemberService.updateRole(memberId, newRole)
      await loadMembers()
      // TODO: Show success message
    } catch (error) {
      console.error('Failed to update role:', error)
      // TODO: Show error message
    }
  }

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">No Organization Selected</h3>
          <p className="text-gray-500">Please select an organization to manage.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {currentOrganization.logo_url ? (
              <img
                src={currentOrganization.logo_url}
                alt={currentOrganization.name}
                className="w-12 h-12 rounded-lg"
              />
            ) : (
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-lg font-medium text-white">
                  {currentOrganization.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentOrganization.name}</h1>
              <p className="text-gray-600">{currentOrganization.description || 'No description'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Invite Member Form */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New Member</h3>
                <form onSubmit={handleInviteMember} className="flex space-x-4">
                  <div className="flex-1">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isInviting ? 'Inviting...' : 'Invite'}
                  </button>
                </form>
              </div>

              {/* Members List */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Members</h3>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading members...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {member.user.full_name?.charAt(0).toUpperCase() || member.user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.user.full_name || 'No name'}
                            </p>
                            <p className="text-sm text-gray-500">{member.user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value as any)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={member.user_id === user?.id} // Can't change own role
                          >
                            <option value="viewer">Viewer</option>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>

                          {member.user_id !== user?.id && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                    <input
                      type="text"
                      value={currentOrganization.name}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={currentOrganization.description || ''}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      currentOrganization.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {currentOrganization.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}