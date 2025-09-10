'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/SimpleAuthContext'
import { supabase } from '../../lib/supabase'
import { Skeleton } from '../ui/Skeleton'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorMessage } from '../ui/ErrorMessage'

interface UserActivity {
  user_id: string
  email: string
  full_name: string | null
  last_activity: string
  conversations_count: number
  messages_count: number
  total_tokens: number
  average_response_time: number
}

interface ConversationAudit {
  id: string
  title: string
  user_id: string
  user_email: string
  created_at: string
  updated_at: string
  message_count: number
  total_tokens: number
  model: string
}

interface ComplianceReport {
  date: string
  total_users: number
  active_users: number
  total_conversations: number
  total_messages: number
  data_retention_compliant: boolean
  privacy_compliant: boolean
  security_incidents: number
}

export function UsageOversight() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'activity' | 'audit' | 'compliance'>('activity')
  const [userActivity, setUserActivity] = useState<UserActivity[]>([])
  const [conversationAudits, setConversationAudits] = useState<ConversationAudit[]>([])
  const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState('7d')

  useEffect(() => {
    fetchData()
  }, [activeTab, dateRange])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (activeTab === 'activity') {
        await fetchUserActivity()
      } else if (activeTab === 'audit') {
        await fetchConversationAudits()
      } else if (activeTab === 'compliance') {
        await fetchComplianceReports()
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserActivity = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('No session')
    
    const response = await fetch(`/api/admin/oversight/activity?range=${dateRange}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })
    if (!response.ok) {
      throw new Error('Failed to fetch user activity')
    }
    const data = await response.json()
    setUserActivity(data.activity || [])
  }

  const fetchConversationAudits = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('No session')
    
    const response = await fetch(`/api/admin/oversight/audits?search=${searchTerm}&range=${dateRange}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })
    if (!response.ok) {
      throw new Error('Failed to fetch conversation audits')
    }
    const data = await response.json()
    setConversationAudits(data.audits || [])
  }

  const fetchComplianceReports = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('No session')
    
    const response = await fetch(`/api/admin/oversight/compliance?range=${dateRange}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })
    if (!response.ok) {
      throw new Error('Failed to fetch compliance reports')
    }
    const data = await response.json()
    setComplianceReports(data.reports || [])
  }

  const exportData = async (type: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      
      const response = await fetch(`/api/admin/oversight/export?type=${type}&range=${dateRange}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error exporting data:', err)
      setError('Failed to export data')
    }
  }

  const filteredUserActivity = userActivity.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const filteredConversationAudits = conversationAudits.filter(conversation =>
    conversation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <UsageOversightSkeleton />
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <ErrorMessage message={error} />
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Usage Oversight
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor user activity, audit conversations, and generate compliance reports
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          <button
            onClick={() => exportData(activeTab)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'activity', label: 'User Activity', count: filteredUserActivity.length },
              { id: 'audit', label: 'Conversation Audit', count: filteredConversationAudits.length },
              { id: 'compliance', label: 'Compliance Reports', count: complianceReports.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Search */}
      {(activeTab === 'activity' || activeTab === 'audit') && (
        <div className="mb-6">
          <div className="max-w-md">
            <input
              type="text"
              placeholder={`Search ${activeTab === 'activity' ? 'users' : 'conversations'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'activity' && (
        <UserActivityTable users={filteredUserActivity} />
      )}

      {activeTab === 'audit' && (
        <ConversationAuditTable conversations={filteredConversationAudits} />
      )}

      {activeTab === 'compliance' && (
        <ComplianceReportsTable reports={complianceReports} />
      )}
    </div>
  )
}

function UserActivityTable({ users }: { users: UserActivity[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">User Activity Overview</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conversations
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Messages
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Tokens
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Response Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.user_id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.email}
                    </div>
                    {user.full_name && (
                      <div className="text-sm text-gray-500">
                        {user.full_name}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.last_activity).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {user.conversations_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {user.messages_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {user.total_tokens.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {user.average_response_time}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">No user activity found for the selected period</p>
        </div>
      )}
    </div>
  )
}

function ConversationAuditTable({ conversations }: { conversations: ConversationAudit[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">Conversation Audit Log</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conversation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Messages
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tokens
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Model
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {conversations.map((conversation) => (
              <tr key={conversation.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {conversation.title}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {conversation.user_email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(conversation.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {conversation.message_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {conversation.total_tokens.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {conversation.model}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {conversations.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">No conversations found for the selected period</p>
        </div>
      )}
    </div>
  )
}

function ComplianceReportsTable({ reports }: { reports: ComplianceReport[] }) {
  return (
    <div className="space-y-6">
      {reports.map((report) => (
        <div key={report.date} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Compliance Report - {new Date(report.date).toLocaleDateString()}
            </h3>
            <div className="flex items-center space-x-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                report.data_retention_compliant && report.privacy_compliant
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {report.data_retention_compliant && report.privacy_compliant ? 'Compliant' : 'Non-Compliant'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{report.total_users}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{report.active_users}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{report.total_conversations}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Conversations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{report.total_messages}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Messages</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${report.data_retention_compliant ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">Data Retention: {report.data_retention_compliant ? 'Compliant' : 'Non-Compliant'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${report.privacy_compliant ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">Privacy: {report.privacy_compliant ? 'Compliant' : 'Non-Compliant'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${report.security_incidents === 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">Security Incidents: {report.security_incidents}</span>
            </div>
          </div>
        </div>
      ))}

      {reports.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No compliance reports available</p>
        </div>
      )}
    </div>
  )
}

function UsageOversightSkeleton() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="mb-6">
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="mb-6">
        <Skeleton className="h-10 w-64" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <Skeleton className="h-6 w-48" />
        </div>

        <div className="p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-4 border-b last:border-b-0">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}