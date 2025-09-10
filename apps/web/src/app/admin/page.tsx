'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/SimpleAuthContext'
import { useRouter } from 'next/navigation'
import { AnalyticsDashboard } from '../../components/analytics/AnalyticsDashboard'
import { UserManagement } from '../../components/admin/UserManagement'
import { SystemConfiguration } from '../../components/admin/SystemConfiguration'
import { SystemMonitoring } from '../../components/admin/SystemMonitoring'
import { SecurityMonitoring } from '../../components/admin/SecurityMonitoring'
import { UsageOversight } from '../../components/admin/UsageOversight'
import { UsageMonitoringDashboard } from '../../components/admin/UsageMonitoringDashboard'
import { isUserAdmin } from '../../lib/adminUtils'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'config' | 'monitoring' | 'security' | 'oversight' | 'usage-monitoring'>('analytics')

  useEffect(() => {
    checkAdminAccess()
  }, [user])

  const checkAdminAccess = async () => {
    if (!user) {
      setCheckingAdmin(false)
      return
    }

    try {
      const adminStatus = await isUserAdmin()
      setIsAdmin(adminStatus)

      if (!adminStatus) {
        // Redirect non-admin users
        router.push('/')
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
      router.push('/')
    } finally {
      setCheckingAdmin(false)
    }
  }

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Please sign in to access the admin panel.</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Access Required</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access the admin panel.</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Admin Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Panel
              </h1>
            </div>

            <nav className="flex space-x-4 overflow-x-auto">
               <button
                 onClick={() => setActiveTab('analytics')}
                 className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                   activeTab === 'analytics'
                     ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                     : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                 }`}
               >
                 Analytics
               </button>
               <button
                 onClick={() => setActiveTab('users')}
                 className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                   activeTab === 'users'
                     ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                     : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                 }`}
               >
                 User Management
               </button>
               <button
                 onClick={() => setActiveTab('config')}
                 className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                   activeTab === 'config'
                     ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                     : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                 }`}
               >
                 System Config
               </button>
               <button
                 onClick={() => setActiveTab('monitoring')}
                 className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                   activeTab === 'monitoring'
                     ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                     : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                 }`}
               >
                 Monitoring
               </button>
               <button
                 onClick={() => setActiveTab('security')}
                 className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                   activeTab === 'security'
                     ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                     : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                 }`}
               >
                 Security
               </button>
               <button
                 onClick={() => setActiveTab('oversight')}
                 className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                   activeTab === 'oversight'
                     ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                     : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                 }`}
               >
                 Usage Oversight
               </button>
               <button
                 onClick={() => setActiveTab('usage-monitoring')}
                 className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                   activeTab === 'usage-monitoring'
                     ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                     : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                 }`}
               >
                 Provider Usage
               </button>
             </nav>

            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              ← Back to App
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'config' && <SystemConfiguration />}
        {activeTab === 'monitoring' && <SystemMonitoring />}
        {activeTab === 'security' && <SecurityMonitoring />}
        {activeTab === 'oversight' && <UsageOversight />}
        {activeTab === 'usage-monitoring' && <UsageMonitoringDashboard />}
      </main>
    </div>
  )
}