'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '../ui/Skeleton'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorMessage } from '../ui/ErrorMessage'

interface SecurityEvent {
  id: string
  event: string
  timestamp: string
  ip: string
  userAgent: string
  details: any
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface SecurityMetrics {
  totalEvents: number
  criticalEvents: number
  rateLimitHits: number
  blockedRequests: number
  activeThreats: number
  topThreatSources: Array<{
    ip: string
    count: number
    lastSeen: string
  }>
}

interface SecurityAlert {
  id: string
  type: 'threat' | 'anomaly' | 'breach' | 'compliance'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  status: 'active' | 'acknowledged' | 'resolved'
  affectedSystems: string[]
}

export function SecurityMonitoring() {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'alerts' | 'threats'>('overview')
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null)
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('24h')
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchSecurityData()

    if (autoRefresh) {
      const interval = setInterval(fetchSecurityData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [activeTab, timeRange])

  const fetchSecurityData = async () => {
    try {
      setLoading(true)
      setError(null)

      const endpoints = {
        overview: `/api/admin/security/metrics?range=${timeRange}`,
        events: `/api/admin/security/events?range=${timeRange}`,
        alerts: `/api/admin/security/alerts?range=${timeRange}`,
        threats: `/api/admin/security/threats?range=${timeRange}`
      }

      const response = await fetch(endpoints[activeTab])
      if (!response.ok) {
        throw new Error('Failed to fetch security data')
      }

      const data = await response.json()

      switch (activeTab) {
        case 'overview':
          setSecurityMetrics(data.metrics)
          break
        case 'events':
          setSecurityEvents(data.events || [])
          break
        case 'alerts':
          setSecurityAlerts(data.alerts || [])
          break
        case 'threats':
          // Handle threats data
          break
      }
    } catch (err) {
      console.error('Error fetching security data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load security data')
    } finally {
      setLoading(false)
    }
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/security/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert')
      }

      setSecurityAlerts(alerts =>
        alerts.map(alert =>
          alert.id === alertId
            ? { ...alert, status: 'acknowledged' as const }
            : alert
        )
      )
    } catch (err) {
      console.error('Error acknowledging alert:', err)
      setError('Failed to acknowledge alert')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300'
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300'
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300'
      default: return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300'
    }
  }

  const getEventIcon = (event: string) => {
    if (event.includes('auth')) return '🔐'
    if (event.includes('rate_limit')) return '⏱️'
    if (event.includes('threat')) return '🚨'
    if (event.includes('admin')) return '👑'
    return '📋'
  }

  if (loading) {
    return <SecurityMonitoringSkeleton />
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <ErrorMessage message={error} />
          <button
            onClick={fetchSecurityData}
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
            Security Monitoring
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time security monitoring and threat detection
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Auto Refresh</span>
          </label>

          <button
            onClick={fetchSecurityData}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'events', label: 'Security Events', icon: '📋' },
              { id: 'alerts', label: 'Active Alerts', icon: '🚨' },
              { id: 'threats', label: 'Threat Analysis', icon: '🔍' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && securityMetrics && (
        <SecurityOverview metrics={securityMetrics} />
      )}

      {activeTab === 'events' && (
        <SecurityEvents events={securityEvents} />
      )}

      {activeTab === 'alerts' && (
        <SecurityAlerts alerts={securityAlerts} onAcknowledge={acknowledgeAlert} />
      )}

      {activeTab === 'threats' && (
        <ThreatAnalysis />
      )}
    </div>
  )
}

function SecurityOverview({ metrics }: { metrics: SecurityMetrics }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Events</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalEvents.toLocaleString()}</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Critical Events</p>
              <p className="text-2xl font-bold text-red-600">{metrics.criticalEvents}</p>
            </div>
            <div className="text-2xl">🚨</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rate Limit Hits</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.rateLimitHits.toLocaleString()}</p>
            </div>
            <div className="text-2xl">⏱️</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Blocked Requests</p>
              <p className="text-2xl font-bold text-red-600">{metrics.blockedRequests}</p>
            </div>
            <div className="text-2xl">🚫</div>
          </div>
        </div>
      </div>

      {/* Top Threat Sources */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Top Threat Sources
        </h3>
        <div className="space-y-3">
          {metrics.topThreatSources.map((source, index) => (
            <div key={source.ip} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-900 dark:text-white">#{index + 1}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{source.ip}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">{source.count} events</span>
                <span className="text-xs text-gray-400">
                  {new Date(source.lastSeen).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SecurityEvents({ events }: { events: SecurityEvent[] }) {
  const getEventIcon = (event: string) => {
    if (event.includes('auth')) return '🔐'
    if (event.includes('rate_limit')) return '⏱️'
    if (event.includes('threat')) return '🚨'
    if (event.includes('admin')) return '👑'
    return '📋'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300'
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300'
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300'
      default: return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">Security Events Log</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Severity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getEventIcon(event.event)}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.event.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(event.severity)}`}>
                    {event.severity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {event.ip}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(event.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {JSON.stringify(event.details)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {events.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">No security events found for the selected period</p>
        </div>
      )}
    </div>
  )
}

function SecurityAlerts({ alerts, onAcknowledge }: {
  alerts: SecurityAlert[]
  onAcknowledge: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`border-l-4 p-4 rounded-r-lg ${
            alert.severity === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
            alert.severity === 'high' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' :
            alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
            'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {alert.title}
                </h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  alert.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                  alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {alert.severity}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  alert.status === 'active' ? 'bg-red-100 text-red-800' :
                  alert.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {alert.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {alert.description}
              </p>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>{new Date(alert.timestamp).toLocaleString()}</span>
                {alert.affectedSystems.length > 0 && (
                  <span>Affected: {alert.affectedSystems.join(', ')}</span>
                )}
              </div>
            </div>

            {alert.status === 'active' && (
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Acknowledge
              </button>
            )}
          </div>
        </div>
      ))}

      {alerts.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No active security alerts</p>
        </div>
      )}
    </div>
  )
}

function ThreatAnalysis() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Threat Analysis
      </h3>
      <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
        <p className="text-gray-500">Advanced threat analysis will be implemented in the next iteration</p>
      </div>
    </div>
  )
}

function SecurityMonitoringSkeleton() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="mb-6">
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-4" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-4 border-b last:border-b-0">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}