import { NextRequest, NextResponse } from 'next/server'
import { openRouterAPI } from '../../../lib/openrouter'

export interface SmartTagsRequest {
  content: string
  title?: string
  maxTags?: number
}

export interface SmartTagsResponse {
  tags: string[]
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, title, maxTags = 5 }: SmartTagsRequest = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      )
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { error: 'Content is too long. Maximum 10000 characters allowed.' },
        { status: 400 }
      )
    }

    // Create prompt for tag generation
    const prompt = `Analyze the following conversation content and generate ${maxTags} relevant tags that best describe the main topics, themes, and context. Return only a JSON array of tag strings, no explanations.

Title: ${title || 'Untitled Conversation'}

Content:
${content}

Tags should be:
- Concise (1-3 words each)
- Relevant to the conversation's main topics
- Useful for organization and search
- Lowercase with hyphens for multi-word tags

Example: ["machine-learning", "data-analysis", "python", "tutorial", "debugging"]`

    // Call OpenRouter chat completion API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || await openRouterAPI.getStoredApiKey()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': request.headers.get('referer') || '',
        'X-Title': 'Sleek Chat Interface',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku:beta',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.3, // Lower temperature for more consistent results
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenRouter smart tags API error:', errorData)

      return NextResponse.json(
        {
          error: 'Failed to generate smart tags',
          details: errorData.error?.message || 'Unknown error'
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const generatedText = data.choices?.[0]?.message?.content

    if (!generatedText) {
      return NextResponse.json(
        { error: 'Invalid response from AI service' },
        { status: 500 }
      )
    }

    // Parse the JSON response
    let tags: string[] = []
    try {
      // Try to parse as JSON first
      tags = JSON.parse(generatedText.trim())

      // Validate that we got an array of strings
      if (!Array.isArray(tags) || !tags.every(tag => typeof tag === 'string')) {
        throw new Error('Invalid tag format')
      }

      // Clean and validate tags
      tags = tags
        .map(tag => tag.toLowerCase().trim().replace(/\s+/g, '-'))
        .filter(tag => tag.length > 0 && tag.length <= 50)
        .slice(0, maxTags) // Limit to maxTags

    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, using fallback:', parseError)

      // Fallback: extract tags from text response
      const extractedTags = generatedText
        .split(/[\n,]/)
        .map((line: string) => line.trim().replace(/^["\[]|["\]]$/g, ''))
        .filter((line: string) => line.length > 0 && !line.includes(':'))
        .map((tag: string) => tag.toLowerCase().trim().replace(/\s+/g, '-'))
        .filter((tag: string) => tag.length > 0 && tag.length <= 50)
        .slice(0, maxTags)

      tags = extractedTags.length > 0 ? extractedTags : ['general-discussion']
    }

    const result: SmartTagsResponse = {
      tags,
      model: data.model || 'anthropic/claude-3-haiku:beta',
      usage: data.usage ? {
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
        total_tokens: data.usage.total_tokens,
      } : undefined,
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Smart tags API error:', error)

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
    { error: 'Method not allowed. Use POST to generate smart tags.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate smart tags.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate smart tags.' },
    { status: 405 }
  )
}