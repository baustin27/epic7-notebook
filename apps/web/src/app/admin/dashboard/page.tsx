import { UsageMonitoringDashboard } from '../../../components/admin/UsageMonitoringDashboard'

/**
 * Admin Dashboard Page
 * 
 * Provides comprehensive monitoring and control interface for AI provider usage
 */

export const metadata = {
  title: 'Admin Dashboard - Usage Monitoring',
  description: 'Monitor AI provider usage, costs, and manage feature toggles'
}

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <UsageMonitoringDashboard 
            className="w-full"
            refreshInterval={30000} // 30 seconds
          />
        </div>
      </div>
    </div>
  )
}