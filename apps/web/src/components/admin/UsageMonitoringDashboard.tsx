'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { FeatureTogglePanel } from './FeatureTogglePanel'
import { useAdminFeatureFlags } from '../../hooks/useFeatureFlags'

/**
 * Usage Monitoring Dashboard
 * 
 * Comprehensive dashboard for monitoring AI provider usage, costs,
 * and feature management. Updates in real-time.
 */

interface UsageStats {
  period: string
  feature: string
  groupBy: string
  summary: Array<{
    feature: string
    total_calls: number
    total_tokens_input: number
    total_tokens_output: number
    total_cost_usd: number
    avg_duration_ms: number
    success_rate: number
    unique_users: number
  }>
  current: {
    activeCallsLastMinute: number
    lastCallTime: string | null
  }
  featureFlags: Record<string, boolean>
  aggregated: Array<{
    group: string
    totalCalls: number
    totalTokensInput: number
    totalTokensOutput: number
    totalCost: number
    successCount: number
    failureCount: number
  }>
  timestamp: string
}

interface UsageMonitoringDashboardProps {
  className?: string
  refreshInterval?: number // milliseconds
}

export const UsageMonitoringDashboard: React.FC<UsageMonitoringDashboardProps> = ({
  className = '',
  refreshInterval = 30000 // 30 seconds
}) => {
  const { isAdmin } = useAdminFeatureFlags()
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('24 hours')
  const [selectedGroupBy, setSelectedGroupBy] = useState('feature')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return

    try {
      const { supabase } = await import('../../lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      
      const response = await fetch(
        `/api/admin/usage-stats?period=${encodeURIComponent(selectedPeriod)}&groupBy=${selectedGroupBy}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        setStats(data.data)
        setError(null)
        setLastUpdate(new Date())
      } else {
        throw new Error(data.error || 'Failed to fetch stats')
      }
    } catch (err) {
      console.error('Failed to fetch usage stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch usage stats')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, selectedPeriod, selectedGroupBy])

  // Initial load and periodic refresh
  useEffect(() => {
    if (isAdmin) {
      fetchStats()
      const interval = setInterval(fetchStats, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [isAdmin, fetchStats, refreshInterval])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`
  }

  if (!isAdmin) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-8 text-center ${className}`}>
        <div className="text-red-800">
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p>You need administrator privileges to view the usage monitoring dashboard.</p>
        </div>
      </div>
    )
  }

  if (loading && !stats) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading skeleton */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4 w-48"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-32"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 h-96">
          <div className="animate-pulse h-full bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="text-red-800">
          <h3 className="font-semibold mb-2">Error Loading Dashboard</h3>
          <p className="mb-3">{error}</p>
          <button
            onClick={fetchStats}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const totalCost = stats?.summary.reduce((sum, item) => sum + parseFloat(item.total_cost_usd.toString()), 0) || 0
  const totalCalls = stats?.summary.reduce((sum, item) => sum + item.total_calls, 0) || 0
  const totalTokens = stats?.summary.reduce((sum, item) => sum + item.total_tokens_input + item.total_tokens_output, 0) || 0
  const avgSuccessRate = stats?.summary.length > 0 
    ? stats.summary.reduce((sum, item) => sum + item.success_rate, 0) / stats.summary.length 
    : 0

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usage Monitoring Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Real-time monitoring of AI provider usage, costs, and feature states
            </p>
            {lastUpdate && (
              <p className="text-xs text-gray-400 mt-1">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="1 hour">Last Hour</option>
              <option value="24 hours">Last 24 Hours</option>
              <option value="7 days">Last 7 Days</option>
              <option value="30 days">Last 30 Days</option>
            </select>

            <select
              value={selectedGroupBy}
              onChange={(e) => setSelectedGroupBy(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="feature">By Feature</option>
              <option value="provider">By Provider</option>
              <option value="model">By Model</option>
              <option value="user">By User</option>
            </select>

            <button
              onClick={fetchStats}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{formatCurrency(totalCost)}</div>
            <div className="text-sm text-gray-600">Total Cost ({selectedPeriod})</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{formatNumber(totalCalls)}</div>
            <div className="text-sm text-gray-600">Total API Calls</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{formatNumber(totalTokens)}</div>
            <div className="text-sm text-gray-600">Total Tokens</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{formatPercentage(avgSuccessRate)}</div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Current Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Activity</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${stats?.current.activeCallsLastMinute > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm text-gray-600">
                {stats?.current.activeCallsLastMinute || 0} calls in last minute
              </span>
            </div>
            {stats?.current.lastCallTime && (
              <div className="text-sm text-gray-500">
                Last call: {new Date(stats.current.lastCallTime).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Usage by Group */}
      {stats?.aggregated && stats.aggregated.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Usage by {selectedGroupBy.charAt(0).toUpperCase() + selectedGroupBy.slice(1)}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {selectedGroupBy.charAt(0).toUpperCase() + selectedGroupBy.slice(1)}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.aggregated.slice(0, 10).map((item, index) => {
                  const successRate = item.totalCalls > 0 ? item.successCount / item.totalCalls : 0
                  const totalTokens = item.totalTokensInput + item.totalTokensOutput

                  return (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.group}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatNumber(item.totalCalls)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatNumber(totalTokens)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(item.totalCost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="flex-1">
                            <div className={`text-sm font-medium ${successRate > 0.95 ? 'text-green-600' : successRate > 0.8 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {formatPercentage(successRate)}
                            </div>
                          </div>
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${successRate > 0.95 ? 'bg-green-500' : successRate > 0.8 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${successRate * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature Toggle Panel */}
      <FeatureTogglePanel 
        onFeatureToggle={(feature, enabled) => {
          console.log(`Feature ${feature} ${enabled ? 'enabled' : 'disabled'}`)
          // Refresh stats after a short delay to see the impact
          setTimeout(fetchStats, 1000)
        }}
      />
    </div>
  )
}