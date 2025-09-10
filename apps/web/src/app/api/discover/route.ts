import { NextRequest, NextResponse } from 'next/server'
import { semanticSearchService } from '../../../lib/database'
import { openRouterAPI } from '../../../lib/openrouter'
import { supabase } from '../../../lib/supabase'

export interface DiscoverRequest {
  conversationId?: string
  query?: string
  context?: string
  limit?: number
  includeInsights?: boolean
}

export interface DiscoverResponse {
  suggestions: Array<{
    id: string
    title: string
    similarity: number
    category?: string | null
    tags?: string[] | null
    reasoning?: string
  }>
  insights?: string[]
  total: number
}

export async function POST(request: NextRequest) {
  try {
    const {
      conversationId,
      query,
      context,
      limit = 5,
      includeInsights = false
    }: DiscoverRequest = await request.json()

    if (!conversationId && !query) {
      return NextResponse.json(
        { error: 'Either conversationId or query is required' },
        { status: 400 }
      )
    }

    const suggestions: DiscoverResponse['suggestions'] = []
    let insights: string[] = []

    if (conversationId) {
      // Get related conversations based on existing conversation
      const related = await semanticSearchService.getRelatedConversations(conversationId, limit)

      for (const item of related) {
        suggestions.push({
          id: item.id,
          title: item.title || 'Untitled Conversation',
          similarity: item.similarity,
          category: item.category,
          tags: item.tags,
          reasoning: `Related to conversation "${item.title || 'Untitled'}"`
        })
      }

      // Generate insights if requested
      if (includeInsights && suggestions.length > 0) {
        insights = await generateInsights(conversationId, suggestions)
      }
    } else if (query) {
      // Discover based on query
      const searchResults = await semanticSearchService.searchConversations({
        query,
        limit,
        threshold: 0.2
      })

      for (const result of searchResults) {
        suggestions.push({
          id: result.id,
          title: result.title || 'Untitled Conversation',
          similarity: result.similarity,
          category: result.category,
          tags: result.tags,
          reasoning: `Matches query "${query}"`
        })
      }

      // Generate insights for query-based discovery
      if (includeInsights && suggestions.length > 0) {
        insights = await generateQueryInsights(query, suggestions)
      }
    }

    const response: DiscoverResponse = {
      suggestions,
      insights: includeInsights ? insights : undefined,
      total: suggestions.length
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Discovery API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function generateInsights(conversationId: string, suggestions: any[]): Promise<string[]> {
  try {
    // Get current conversation details
    const { data: conversation } = await supabase
      .from('conversations')
      .select('title')
      .eq('id', conversationId)
      .single()

    if (!conversation) return []

    const suggestionTitles = suggestions.map(s => s.title).join(', ')

    const prompt = `Based on the current conversation "${conversation.title}" and these related conversations: ${suggestionTitles}

Generate 2-3 insightful observations about patterns, connections, or opportunities. Keep each insight concise (1-2 sentences).

Respond with a JSON array of strings.`

    const response = await openRouterAPI.chatCompletion([{
      role: 'user',
      content: prompt
    }], 'gpt-3.5-turbo')

    const aiResponse = response.choices[0]?.message?.content
    if (aiResponse && typeof aiResponse === 'string') {
      try {
        const parsed = JSON.parse(aiResponse)
        return Array.isArray(parsed) ? parsed : []
      } catch (parseError) {
        console.warn('Failed to parse insights response:', parseError)
        return []
      }
    }

    return []
  } catch (error) {
    console.warn('Failed to generate insights:', error)
    return []
  }
}

async function generateQueryInsights(query: string, suggestions: any[]): Promise<string[]> {
  try {
    const suggestionTitles = suggestions.map(s => s.title).join(', ')

    const prompt = `Based on the search query "${query}" and these matching conversations: ${suggestionTitles}

Generate 2-3 insights about what this search reveals about the user's interests or patterns. Keep each insight concise (1-2 sentences).

Respond with a JSON array of strings.`

    const response = await openRouterAPI.chatCompletion([{
      role: 'user',
      content: prompt
    }], 'gpt-3.5-turbo')

    const aiResponse = response.choices[0]?.message?.content
    if (aiResponse && typeof aiResponse === 'string') {
      try {
        const parsed = JSON.parse(aiResponse)
        return Array.isArray(parsed) ? parsed : []
      } catch (parseError) {
        console.warn('Failed to parse query insights response:', parseError)
        return []
      }
    }

    return []
  } catch (error) {
    console.warn('Failed to generate query insights:', error)
    return []
  }
}

// GET endpoint for simple discovery based on conversation ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId parameter is required' },
        { status: 400 }
      )
    }

    // Use the POST handler logic
    const discoverRequest: DiscoverRequest = {
      conversationId,
      limit
    }

    const mockRequest = {
      json: async () => discoverRequest
    } as NextRequest

    return POST(mockRequest)

  } catch (error) {
    console.error('Discovery GET API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}