import { supabase } from './supabase'
import { conversationService, messageService } from './database'

interface PerformanceBenchmark {
  operation: string
  duration: number
  timestamp: Date
  recordCount?: number
}

const benchmarks: PerformanceBenchmark[] = []

export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  recordCount?: number
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now()
  const result = await fn()
  const endTime = performance.now()
  const duration = endTime - startTime

  benchmarks.push({
    operation,
    duration,
    timestamp: new Date(),
    recordCount
  })

  console.log(`🏃 Performance: ${operation} took ${duration.toFixed(2)}ms`)
  if (recordCount) {
    console.log(`📊 Records processed: ${recordCount} (${(duration / recordCount).toFixed(2)}ms per record)`)
  }

  return { result, duration }
}

// Database query performance tests
export async function runQueryPerformanceTests(): Promise<{
  success: boolean
  benchmarks: PerformanceBenchmark[]
  recommendations: string[]
}> {
  console.log('🚀 Running database query performance tests...')
  const recommendations: string[] = []

  try {
    // Test 1: Simple conversation fetch
    const { duration: convFetchTime } = await measurePerformance(
      'fetch_conversations',
      async () => {
        const { data, count } = await supabase
          .from('conversations')
          .select('*', { count: 'exact' })
          .order('updated_at', { ascending: false })
          .limit(100)
        return { data, count }
      }
    )

    if (convFetchTime > 500) {
      recommendations.push('Consider adding database indexes on conversations.updated_at for faster sorting')
    }

    // Test 2: Message fetch with conversation join
    const { result: conversationsResult } = await measurePerformance(
      'fetch_conversations_with_count',
      async () => {
        return await supabase
          .from('conversations')
          .select('*, messages(count)')
          .order('updated_at', { ascending: false })
          .limit(10)
      }
    )

    // Test 3: Large message set fetch
    if (conversationsResult.data && conversationsResult.data.length > 0) {
      const firstConvId = conversationsResult.data[0].id
      const { duration: msgFetchTime, result: messagesResult } = await measurePerformance(
        'fetch_messages_large_set',
        async () => {
          return await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', firstConvId)
            .order('created_at', { ascending: true })
        },
        0 // Will be updated after we get the result
      )

      if (msgFetchTime > 1000) {
        recommendations.push('Consider implementing pagination for large message sets')
      }
    }

    // Test 4: Complex query with user settings
    const { duration: complexQueryTime } = await measurePerformance(
      'complex_user_query',
      async () => {
        return await supabase
          .from('users')
          .select(`
            *,
            conversations:conversations(count),
            user_settings:user_settings(*)
          `)
          .single()
      }
    )

    if (complexQueryTime > 300) {
      recommendations.push('Consider optimizing complex queries with selective fields')
    }

    // Test 5: Concurrent operations
    const { duration: concurrentTime } = await measurePerformance(
      'concurrent_operations',
      async () => {
        return Promise.all([
          conversationService.getAll(),
          messageService.getByConversationId('test-id'),
          supabase.from('user_settings').select('*').single()
        ])
      }
    )

    if (concurrentTime > 1000) {
      recommendations.push('Database connection pool may need optimization for concurrent queries')
    }

    console.log('✅ Query performance tests completed')
    return {
      success: true,
      benchmarks: [...benchmarks],
      recommendations
    }

  } catch (error) {
    console.error('❌ Performance test failed:', error)
    return {
      success: false,
      benchmarks: [...benchmarks],
      recommendations: ['Database performance tests failed - check connection and schema']
    }
  }
}

// Real-time performance tests
export async function testRealtimePerformance(): Promise<{
  success: boolean
  latency: number
  recommendations: string[]
}> {
  console.log('📡 Testing real-time performance...')
  
  return new Promise((resolve) => {
    const startTime = performance.now()
    const recommendations: string[] = []

    const channel = supabase.channel('performance-test')

    channel
      .on('broadcast', { event: 'ping' }, () => {
        const latency = performance.now() - startTime
        supabase.removeChannel(channel)

        if (latency > 500) {
          recommendations.push('Real-time latency is high - consider connection optimization')
        }
        if (latency > 1000) {
          recommendations.push('Consider implementing fallback polling for real-time updates')
        }

        resolve({
          success: true,
          latency,
          recommendations
        })
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Send ping message
          channel.send({
            type: 'broadcast',
            event: 'ping',
            payload: { timestamp: Date.now() }
          })
        } else if (status === 'CHANNEL_ERROR') {
          supabase.removeChannel(channel)
          resolve({
            success: false,
            latency: -1,
            recommendations: ['Real-time connection failed']
          })
        }
      })

    // Timeout after 5 seconds
    setTimeout(() => {
      supabase.removeChannel(channel)
      resolve({
        success: false,
        latency: -1,
        recommendations: ['Real-time connection timeout - check network connectivity']
      })
    }, 5000)
  })
}

// Memory usage monitoring
export function startMemoryMonitoring(): () => PerformanceBenchmark[] {
  const memoryBenchmarks: PerformanceBenchmark[] = []
  
  const monitor = () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      memoryBenchmarks.push({
        operation: 'memory_usage',
        duration: memory.usedJSHeapSize,
        timestamp: new Date(),
        recordCount: memory.totalJSHeapSize
      })
    }
  }

  const interval = setInterval(monitor, 10000) // Every 10 seconds

  return () => {
    clearInterval(interval)
    return memoryBenchmarks
  }
}

// Generate performance report
export function generatePerformanceReport(
  queryResults: Awaited<ReturnType<typeof runQueryPerformanceTests>>,
  realtimeResults: Awaited<ReturnType<typeof testRealtimePerformance>>,
  memoryData?: PerformanceBenchmark[]
): {
  summary: string
  recommendations: string[]
  metrics: Record<string, number>
} {
  const allRecommendations = [
    ...queryResults.recommendations,
    ...realtimeResults.recommendations
  ]

  const queryMetrics = queryResults.benchmarks.reduce((acc, benchmark) => {
    acc[benchmark.operation] = benchmark.duration
    return acc
  }, {} as Record<string, number>)

  const metrics = {
    ...queryMetrics,
    realtime_latency: realtimeResults.latency,
    total_tests: queryResults.benchmarks.length + (realtimeResults.success ? 1 : 0)
  }

  const avgQueryTime = queryResults.benchmarks.reduce((sum, b) => sum + b.duration, 0) / queryResults.benchmarks.length

  const summary = `
Performance Test Summary:
- Average Query Time: ${avgQueryTime.toFixed(2)}ms
- Real-time Latency: ${realtimeResults.latency}ms
- Total Recommendations: ${allRecommendations.length}
- Database Health: ${queryResults.success ? '✅ Good' : '❌ Issues Found'}
- Real-time Health: ${realtimeResults.success ? '✅ Good' : '❌ Issues Found'}
  `.trim()

  return {
    summary,
    recommendations: allRecommendations,
    metrics
  }
}

// Run complete performance test suite
export async function runCompletePerformanceTest(): Promise<{
  success: boolean
  report: ReturnType<typeof generatePerformanceReport>
}> {
  console.log('🏁 Running complete performance test suite...')

  const stopMemoryMonitor = startMemoryMonitoring()

  try {
    const [queryResults, realtimeResults] = await Promise.all([
      runQueryPerformanceTests(),
      testRealtimePerformance()
    ])

    const memoryData = stopMemoryMonitor()
    const report = generatePerformanceReport(queryResults, realtimeResults, memoryData)

    console.log('🎯 Performance test suite completed')
    console.log(report.summary)

    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:')
      report.recommendations.forEach(rec => console.log(`  - ${rec}`))
    }

    return {
      success: queryResults.success && realtimeResults.success,
      report
    }

  } catch (error) {
    stopMemoryMonitor()
    console.error('❌ Performance test suite failed:', error)
    throw error
  }
}