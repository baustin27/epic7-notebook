import { NextRequest, NextResponse } from 'next/server'
import { openRouterAPI } from '../../../lib/openrouter'

export interface SmartPriorityRequest {
  content: string
  title?: string
  currentPriority?: 'low' | 'medium' | 'high' | 'urgent'
}

export interface SmartPriorityResponse {
  priority: 'low' | 'medium' | 'high' | 'urgent'
  confidence: number
  reasoning: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, title, currentPriority }: SmartPriorityRequest = await request.json()

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

    // Create prompt for priority analysis
    const prompt = `Analyze the following conversation and determine its priority level based on urgency, importance, and context. Consider factors like:

- Time-sensitive requests or deadlines
- Critical business decisions
- Technical emergencies or blocking issues
- Customer or stakeholder urgency
- Strategic importance

Return a JSON object with the following structure:
{
  "priority": "low|medium|high|urgent",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of the priority assessment"
}

Title: ${title || 'Untitled Conversation'}
Current Priority: ${currentPriority || 'not set'}

Content:
${content}

Priority Guidelines:
- "urgent": Immediate action required, critical issues, time-sensitive deadlines, emergencies
- "high": Important but not immediately critical, stakeholder requests, significant decisions
- "medium": Standard priority, regular discussions, general questions
- "low": Low urgency, casual conversations, ideas for future consideration`

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
        max_tokens: 300,
        temperature: 0.2, // Lower temperature for more consistent results
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenRouter smart priority API error:', errorData)

      return NextResponse.json(
        {
          error: 'Failed to determine priority',
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
    let analysis: { priority: string; confidence: number; reasoning: string }
    try {
      analysis = JSON.parse(generatedText.trim())

      // Validate the response structure
      if (!analysis.priority || !['low', 'medium', 'high', 'urgent'].includes(analysis.priority)) {
        throw new Error('Invalid priority value')
      }

      if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 1) {
        analysis.confidence = 0.5 // Default confidence
      }

      if (!analysis.reasoning || typeof analysis.reasoning !== 'string') {
        analysis.reasoning = 'Priority determined based on content analysis'
      }

    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, using fallback:', parseError)

      // Fallback: determine priority based on keywords
      const urgentKeywords = ['urgent', 'emergency', 'critical', 'asap', 'deadline', 'blocking', 'broken']
      const highKeywords = ['important', 'priority', 'review', 'approval', 'decision', 'stakeholder']
      const lowKeywords = ['idea', 'maybe', 'later', 'eventually', 'casual', 'draft']

      const lowerContent = content.toLowerCase()
      const lowerTitle = (title || '').toLowerCase()

      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
      let confidence = 0.6
      let reasoning = 'Priority determined by keyword analysis'

      if (urgentKeywords.some(keyword => lowerContent.includes(keyword) || lowerTitle.includes(keyword))) {
        priority = 'urgent'
        confidence = 0.8
        reasoning = 'Contains urgent keywords indicating time-sensitive matter'
      } else if (highKeywords.some(keyword => lowerContent.includes(keyword) || lowerTitle.includes(keyword))) {
        priority = 'high'
        confidence = 0.7
        reasoning = 'Contains important keywords indicating stakeholder priority'
      } else if (lowKeywords.some(keyword => lowerContent.includes(keyword) || lowerTitle.includes(keyword))) {
        priority = 'low'
        confidence = 0.6
        reasoning = 'Contains casual keywords indicating low urgency'
      }

      analysis = { priority, confidence, reasoning }
    }

    const result: SmartPriorityResponse = {
      priority: analysis.priority as 'low' | 'medium' | 'high' | 'urgent',
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      model: data.model || 'anthropic/claude-3-haiku:beta',
      usage: data.usage ? {
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
        total_tokens: data.usage.total_tokens,
      } : undefined,
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Smart priority API error:', error)

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
    { error: 'Method not allowed. Use POST to determine priority.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to determine priority.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to determine priority.' },
    { status: 405 }
  )
}