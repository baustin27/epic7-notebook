import { NextRequest, NextResponse } from 'next/server'
import { openRouterAPI } from '../../../lib/openrouter'

export interface EmbeddingRequest {
  text: string
  model?: string
}

export interface EmbeddingResponse {
  embedding: number[]
  model: string
  usage?: {
    prompt_tokens: number
    total_tokens: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, model = 'text-embedding-ada-002' }: EmbeddingRequest = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      )
    }

    if (text.length > 8000) {
      return NextResponse.json(
        { error: 'Text is too long. Maximum 8000 characters allowed.' },
        { status: 400 }
      )
    }

    // Call OpenRouter embeddings API
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || await openRouterAPI.getStoredApiKey()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': request.headers.get('referer') || '',
        'X-Title': 'Sleek Chat Interface',
      },
      body: JSON.stringify({
        input: text,
        model: model,
        encoding_format: 'float',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenRouter embeddings API error:', errorData)

      return NextResponse.json(
        {
          error: 'Failed to generate embeddings',
          details: errorData.error?.message || 'Unknown error'
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // OpenRouter embeddings response format
    const embedding = data.data?.[0]?.embedding
    const usage = data.usage

    if (!embedding || !Array.isArray(embedding)) {
      return NextResponse.json(
        { error: 'Invalid embedding response from API' },
        { status: 500 }
      )
    }

    const result: EmbeddingResponse = {
      embedding,
      model: data.model || model,
      usage: usage ? {
        prompt_tokens: usage.prompt_tokens,
        total_tokens: usage.total_tokens,
      } : undefined,
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Embeddings API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate embeddings.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate embeddings.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate embeddings.' },
    { status: 405 }
  )
}