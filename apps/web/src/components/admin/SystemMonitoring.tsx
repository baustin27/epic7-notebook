'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '../ui/Skeleton'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorMessage } from '../ui/ErrorMessage'

interface HealthMetric {
  metric_type: string
  current_value: number
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  last_updated: string
}

interface SystemStats {
  total_users: number
  active_users_24h: number
  total_conversations: number
  total_messages: number
  average_response_time: number
  error_rate: number
  database_connections: number
  uptime_hours: number
}

interface Alert {
  id: string
  type: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  timestamp: string
  acknowledged: boolean
}

export function SystemMonitoring() {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([])
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchMonitoringData()
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchMonitoringData = async () => {
    try {
      setRefreshing(true)
      setError(null)

      const [healthResponse, statsResponse, alertsResponse] = await Promise.all([
        fetch('/api/admin/monitoring/health'),
        fetch('/api/admin/monitoring/stats'),
        fetch('/api/admin/monitoring/alerts')
      ])

      if (!healthResponse.ok || !statsResponse.ok || !alertsResponse.ok) {
        throw new Error('Failed to fetch monitoring data')
      }

      const [healthData, statsData, alertsData] = await Promise.all([
        healthResponse.json(),
        statsResponse.json(),
        alertsResponse.json()
      ])

      setHealthMetrics(healthData.metrics || [])
      setSystemStats(statsData.stats || null)
      setAlerts(alertsData.alerts || [])
    } catch (err) {
      console.error('Error fetching monitoring data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load monitoring data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300'
      case 'warning': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300'
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      case 'error': return 'border-red-400 bg-red-50 dark:bg-red-900/20'
      case 'warning': return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      case 'info': return 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
      default: return 'border-gray-300 bg-gray-50 dark:bg-gray-700'
    }
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert')
      }

      // Update local state
      setAlerts(alerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ))
    } catch (err) {
      console.error('Error acknowledging alert:', err)
      setError('Failed to acknowledge alert')
    }
  }

  if (loading) {
    return <SystemMonitoringSkeleton />
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <ErrorMessage message={error} />
          <button
            onClick={fetchMonitoringData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            System Monitoring
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time system health and performance metrics
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {refreshing && <LoadingSpinner size="sm" />}
          <button
            onClick={fetchMonitoringData}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {healthMetrics.map((metric) => (
          <div key={metric.metric_type} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {metric.metric_type.replace(/_/g, ' ').toUpperCase()}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.current_value}%
                </p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metric.status)}`}>
                {metric.status}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Updated: {new Date(metric.last_updated).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>

      {/* System Statistics */}
      {systemStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            System Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{systemStats.total_users.toLocaleString()}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{systemStats.active_users_24h.toLocaleString()}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active (24h)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{systemStats.total_conversations.toLocaleString()}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Conversations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{systemStats.total_messages.toLocaleString()}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Messages</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{systemStats.average_response_time}ms</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{systemStats.error_rate}%</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Error Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-600">{systemStats.database_connections}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">DB Connections</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-600">{systemStats.uptime_hours}h</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Active Alerts ({alerts.filter(a => !a.acknowledged).length})
        </h2>

        {alerts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active alerts</p>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`border-l-4 p-4 rounded-r-lg ${getAlertColor(alert.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {alert.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.type === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        alert.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {alert.type}
                      </span>
                      {alert.acknowledged && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          Acknowledged
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>

                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Charts Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Performance Trends
        </h2>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <p className="text-gray-500">Performance charts will be implemented in the next iteration</p>
        </div>
      </div>
    </div>
  )
}

function SystemMonitoringSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-20" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-4" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-12 mx-auto mb-2" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-l-4 border-gray-300 p-4 rounded-r-lg">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}