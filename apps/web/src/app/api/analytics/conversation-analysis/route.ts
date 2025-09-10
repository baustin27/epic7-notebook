import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { conversationAnalysisService } from '../../../../lib/conversationAnalysis'

// Create a Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    // Get the current user from the request
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get conversation ID from query params
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (conversationId) {
      // Get analysis results for a specific conversation
      const analysis = await conversationAnalysisService.getConversationAnalysis(conversationId)

      return NextResponse.json({
        conversationId,
        analysis,
        timestamp: new Date().toISOString()
      })
    } else {
      // Get aggregated analysis data for dashboard
      const [
        totalAnalyzedResult,
        sentimentStatsResult,
        topTopicsResult,
        sentimentDistributionResult
      ] = await Promise.all([
        // Total analyzed conversations
        (supabaseAdmin as any)
          .from('conversation_analysis')
          .select('conversation_id', { count: 'exact' })
          .eq('status', 'completed'),

        // Average sentiment score
        (supabaseAdmin as any)
          .from('conversation_sentiment')
          .select('sentiment_score'),

        // Top topics
        (supabaseAdmin as any)
          .from('conversation_topics')
          .select('topic_name, relevance_score')
          .order('relevance_score', { ascending: false })
          .limit(10),

        // Sentiment distribution
        (supabaseAdmin as any)
          .from('conversation_sentiment')
          .select('overall_sentiment')
      ])

      if (totalAnalyzedResult.error) throw totalAnalyzedResult.error
      if (sentimentStatsResult.error) throw sentimentStatsResult.error
      if (topTopicsResult.error) throw topTopicsResult.error
      if (sentimentDistributionResult.error) throw sentimentDistributionResult.error

      // Calculate average sentiment
      const sentimentScores = sentimentStatsResult.data?.map((s: any) => s.sentiment_score) || []
      const averageSentimentScore = sentimentScores.length > 0
        ? sentimentScores.reduce((sum: number, score: number) => sum + score, 0) / sentimentScores.length
        : 0

      // Process top topics
      const topicMap = new Map<string, { count: number; totalRelevance: number }>()
      topTopicsResult.data?.forEach((topic: any) => {
        const existing = topicMap.get(topic.topic_name) || { count: 0, totalRelevance: 0 }
        topicMap.set(topic.topic_name, {
          count: existing.count + 1,
          totalRelevance: existing.totalRelevance + topic.relevance_score
        })
      })

      const topTopics = Array.from(topicMap.entries())
        .map(([topic, data]) => ({
          topic,
          count: data.count,
          avgRelevance: data.totalRelevance / data.count
        }))
        .sort((a, b) => b.avgRelevance - a.avgRelevance)
        .slice(0, 5)

      // Calculate sentiment distribution
      const sentimentData = sentimentDistributionResult.data || []
      const totalSentiments = sentimentData.length
      const sentimentCounts = sentimentData.reduce((acc: any, item: any) => {
        acc[item.overall_sentiment] = (acc[item.overall_sentiment] || 0) + 1
        return acc
      }, { positive: 0, neutral: 0, negative: 0 })

      const sentimentDistribution = {
        positive: totalSentiments > 0 ? Math.round((sentimentCounts.positive / totalSentiments) * 100) : 0,
        neutral: totalSentiments > 0 ? Math.round((sentimentCounts.neutral / totalSentiments) * 100) : 0,
        negative: totalSentiments > 0 ? Math.round((sentimentCounts.negative / totalSentiments) * 100) : 0
      }

      return NextResponse.json({
        totalAnalyzedConversations: totalAnalyzedResult.count || 0,
        averageSentimentScore,
        topTopics,
        sentimentDistribution,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Conversation analysis API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the current user from the request
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { conversationId, analysisType = 'comprehensive' } = body

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
    }

    // Trigger analysis asynchronously
    if (analysisType === 'comprehensive') {
      // Start comprehensive analysis in background
      conversationAnalysisService.analyzeConversation(conversationId, user.id)
        .then(result => {
          console.log('Analysis completed for conversation:', conversationId, result)
        })
        .catch(error => {
          console.error('Analysis failed for conversation:', conversationId, error)
        })
    } else if (analysisType === 'summary') {
      conversationAnalysisService.generateSummary(conversationId, user.id)
        .then(result => {
          console.log('Summary generated for conversation:', conversationId, result)
        })
        .catch(error => {
          console.error('Summary generation failed for conversation:', conversationId, error)
        })
    } else if (analysisType === 'sentiment') {
      conversationAnalysisService.generateSentiment(conversationId, user.id)
        .then(result => {
          console.log('Sentiment analysis completed for conversation:', conversationId, result)
        })
        .catch(error => {
          console.error('Sentiment analysis failed for conversation:', conversationId, error)
        })
    } else if (analysisType === 'topics') {
      conversationAnalysisService.generateTopics(conversationId, user.id)
        .then(result => {
          console.log('Topic extraction completed for conversation:', conversationId, result)
        })
        .catch(error => {
          console.error('Topic extraction failed for conversation:', conversationId, error)
        })
    }

    return NextResponse.json({
      message: 'Analysis started',
      conversationId,
      analysisType,
      status: 'processing'
    })

  } catch (error) {
    console.error('Conversation analysis POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}