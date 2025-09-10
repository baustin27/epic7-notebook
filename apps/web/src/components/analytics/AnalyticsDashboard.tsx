'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/SimpleAuthContext'
import { Skeleton } from '../ui/Skeleton'
import { supabase } from '../../lib/supabase'

interface AnalyticsData {
  summary: {
    totalUsers: number
    activeUsers: number
    totalMessages: number
    totalConversations: number
    period: {
      start: string
      end: string
      days: number
    }
  }
  modelStats: Record<string, {
    requests: number
    successfulRequests: number
    avgResponseTime: number
    successRate: number
  }>
  recentEvents: any[]
  conversationAnalysis: {
    totalAnalyzedConversations: number
    averageSentimentScore: number
    topTopics: Array<{
      topic: string
      count: number
      avgRelevance: number
    }>
    sentimentDistribution: {
      positive: number
      neutral: number
      negative: number
    }
  }
}

export function AnalyticsDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get the session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('Not authenticated')
      }

      const [summaryResponse, analysisResponse] = await Promise.all([
        fetch(`/api/analytics/summary?days=${timeRange}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('/api/analytics/conversation-analysis', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ])

      if (!summaryResponse.ok) {
        throw new Error('Failed to fetch analytics summary')
      }

      const summaryData = await summaryResponse.json()

      let analysisData = {
        totalAnalyzedConversations: 0,
        averageSentimentScore: 0,
        topTopics: [],
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 }
      }

      if (analysisResponse.ok) {
        const analysisResult = await analysisResponse.json()
        analysisData = analysisResult.analysis || analysisData
      }

      const analyticsData = {
        ...summaryData,
        conversationAnalysis: analysisData
      }

      setData(analyticsData)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <AnalyticsDashboardSkeleton />
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-center text-red-600">
            <p className="text-lg font-medium">Error loading analytics</p>
            <p className="text-sm text-gray-600 mt-2">{error}</p>
            <button
              onClick={fetchAnalyticsData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor usage patterns and system performance
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>

          <button
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold">{data.summary.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Registered users</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold">{data.summary.activeUsers.toLocaleString()}</p>
              <p className="text-xs text-gray-500">In the last {timeRange} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold">{data.summary.totalMessages.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Messages sent</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversations</p>
              <p className="text-2xl font-bold">{data.summary.totalConversations.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total conversations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Model Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Model Performance</h2>
        <div className="space-y-4">
          {Object.entries(data.modelStats).map(([model, stats]) => (
            <div key={model} className="flex items-center justify-between p-4 border rounded">
              <div>
                <p className="font-medium">{model}</p>
                <p className="text-sm text-gray-500">
                  {stats.requests} requests • {stats.successRate.toFixed(1)}% success rate
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Avg Response Time</p>
                <p className="font-medium">{stats.avgResponseTime.toFixed(0)}ms</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Conversation Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{data.conversationAnalysis.totalAnalyzedConversations}</p>
            <p className="text-sm text-gray-500">Analyzed Conversations</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{data.conversationAnalysis.averageSentimentScore.toFixed(2)}</p>
            <p className="text-sm text-gray-500">Avg Sentiment Score</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{data.conversationAnalysis.topTopics.length}</p>
            <p className="text-sm text-gray-500">Top Topics Identified</p>
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Sentiment Distribution</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Positive: {data.conversationAnalysis.sentimentDistribution.positive}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-500 rounded"></div>
              <span className="text-sm">Neutral: {data.conversationAnalysis.sentimentDistribution.neutral}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Negative: {data.conversationAnalysis.sentimentDistribution.negative}%</span>
            </div>
          </div>
        </div>

        {/* Top Topics */}
        <div>
          <h3 className="text-lg font-medium mb-3">Top Topics</h3>
          <div className="space-y-2">
            {data.conversationAnalysis.topTopics.slice(0, 5).map((topic, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{topic.topic}</p>
                  <p className="text-sm text-gray-500">Relevance: {topic.avgRelevance.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Count</p>
                  <p className="font-medium">{topic.count}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Events</h2>
        <div className="space-y-2">
          {data.recentEvents.slice(0, 10).map((event: any, index: number) => (
            <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
              <div>
                <p className="font-medium">{event.event_type}</p>
                <p className="text-sm text-gray-500">
                  {event.users?.email || 'Unknown user'} • {new Date(event.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AnalyticsDashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border rounded">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}