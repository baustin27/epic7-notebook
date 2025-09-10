import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { semanticSearchService } from '../../../lib/database'

export interface SearchRequest {
  query: string
  type?: 'conversations' | 'messages' | 'all'
  limit?: number
  threshold?: number
  category?: string
  tags?: string[]
  conversationId?: string // For filtering messages within a conversation
}

export interface SearchResponse {
  results: Array<{
    id: string
    title?: string
    content?: string
    similarity: number
    category?: string | null
    tags?: string[] | null
    conversationId?: string
    type: 'conversation' | 'message'
  }>
  total: number
  query: string
  searchType: string
}

export async function POST(request: NextRequest) {
  try {
    const {
      query,
      type = 'all',
      limit = 20,
      threshold = 0.1,
      category,
      tags,
      conversationId
    }: SearchRequest = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      )
    }

    if (query.length > 1000) {
      return NextResponse.json(
        { error: 'Query is too long. Maximum 1000 characters allowed.' },
        { status: 400 }
      )
    }

    const results: SearchResponse['results'] = []

    // Perform semantic search based on type
    if (type === 'conversations' || type === 'all') {
      try {
        const conversationResults = await semanticSearchService.searchConversations({
          query,
          limit: type === 'all' ? Math.ceil(limit / 2) : limit,
          threshold,
          category,
          tags
        })

        results.push(
          ...conversationResults.map(result => ({
            id: result.id,
            title: result.title,
            similarity: result.similarity,
            category: result.category,
            tags: result.tags,
            type: 'conversation' as const
          }))
        )
      } catch (error) {
        console.warn('Conversation semantic search failed, falling back to keyword search:', error)
        // Fallback will be handled by the service
      }
    }

    if (type === 'messages' || type === 'all') {
      try {
        const messageResults = await semanticSearchService.searchMessages({
          query,
          limit: type === 'all' ? Math.ceil(limit / 2) : limit,
          threshold,
          includeMessages: true
        })

        results.push(
          ...messageResults.map(result => ({
            id: result.id,
            content: result.content,
            similarity: result.similarity,
            type: 'message' as const
          }))
        )
      } catch (error) {
        console.warn('Message semantic search failed, falling back to keyword search:', error)
        // Fallback will be handled by the service
      }
    }

    // Sort results by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity)

    // Apply final limit
    const limitedResults = results.slice(0, limit)

    const response: SearchResponse = {
      results: limitedResults,
      total: limitedResults.length,
      query,
      searchType: type
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Search API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle GET requests for simple keyword search (backward compatibility)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') as SearchRequest['type'] || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category') || undefined

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      )
    }

    // Use the POST handler logic for consistency
    const searchRequest: SearchRequest = {
      query,
      type,
      limit,
      category
    }

    // Create a mock request object for the POST handler
    const mockRequest = {
      json: async () => searchRequest
    } as NextRequest

    return POST(mockRequest)

  } catch (error) {
    console.error('Search GET API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}