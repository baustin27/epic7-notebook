e:import { NextRequest, NextResponse } from 'next/server'
import { openRouterAPI } from '../../../lib/openrouter'
import { supabase } from '../../../lib/supabase'

export interface CategorizeRequest {
  conversationId: string
  useAI?: boolean // Use AI for categorization vs rule-based
}

export interface CategorizeResponse {
  category: string
  confidence: number
  tags?: string[]
  reasoning?: string
}

const CATEGORIES = [
  'general_discussion',
  'bug_fix',
  'feature_development',
  'support_question',
  'code_review',
  'design_discussion',
  'documentation',
  'testing',
  'deployment',
  'performance',
  'security',
  'research',
  'learning',
  'planning'
]

export async function POST(request: NextRequest) {
  try {
    const { conversationId, useAI = false }: CategorizeRequest = await request.json()

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    // Get conversation and messages
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('content, role')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10)

    if (msgError) {
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    let category: string
    let confidence: number
    let tags: string[] = []
    let reasoning: string

    if (useAI) {
      // Use AI for categorization
      const content = [
        `Title: ${conversation.title}`,
        ...messages.map(m => `${m.role}: ${m.content}`)
      ].join('\n\n')

      const prompt = `Analyze this conversation and categorize it. Choose the most appropriate category from: ${CATEGORIES.join(', ')}

Conversation:
${content}

Respond with JSON in this format:
{
  "category": "chosen_category",
  "confidence": 0.95,
  "tags": ["tag1", "tag2"],
  "reasoning": "brief explanation"
}`

      const response = await openRouterAPI.chatCompletion([{
        role: 'user',
        content: prompt
      }], 'gpt-3.5-turbo')

      const aiResponse = response.choices[0]?.message?.content
      if (aiResponse && typeof aiResponse === 'string') {
        try {
          const parsed = JSON.parse(aiResponse)
          category = parsed.category
          confidence = parsed.confidence || 0.8
          tags = parsed.tags || []
          reasoning = parsed.reasoning || ''
        } catch (parseError) {
          console.warn('Failed to parse AI categorization response:', parseError)
          // Fallback to rule-based
          ;({ category, confidence, tags, reasoning } = await ruleBasedCategorization(conversation, messages))
        }
      } else {
        // Fallback to rule-based
        ;({ category, confidence, tags, reasoning } = await ruleBasedCategorization(conversation, messages))
      }
    } else {
      // Use rule-based categorization
      ;({ category, confidence, tags, reasoning } = await ruleBasedCategorization(conversation, messages))
    }

    // Update conversation with category and tags
    await supabase
      .from('conversations')
      .update({
        category,
        tags,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)

    const result: CategorizeResponse = {
      category,
      confidence,
      tags,
      reasoning
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Categorization API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function ruleBasedCategorization(conversation: any, messages: any[]): Promise<{
  category: string
  confidence: number
  tags: string[]
  reasoning: string
}> {
  const title = conversation.title.toLowerCase()
  const content = messages.map(m => m.content).join(' ').toLowerCase()

  let category = 'general_discussion'
  let confidence = 0.5
  let tags: string[] = []
  let reasoning = 'Rule-based categorization'

  // Title-based categorization
  if (title.includes('bug') || title.includes('fix') || title.includes('error')) {
    category = 'bug_fix'
    confidence = 0.8
    tags = ['bug', 'fix']
  } else if (title.includes('feature') || title.includes('implement') || title.includes('add')) {
    category = 'feature_development'
    confidence = 0.8
    tags = ['feature', 'development']
  } else if (title.includes('question') || title.includes('help') || title.includes('how')) {
    category = 'support_question'
    confidence = 0.7
    tags = ['question', 'support']
  } else if (title.includes('design') || title.includes('ui') || title.includes('ux')) {
    category = 'design_discussion'
    confidence = 0.8
    tags = ['design', 'ui']
  } else if (title.includes('review') || title.includes('pr')) {
    category = 'code_review'
    confidence = 0.8
    tags = ['review', 'code']
  } else if (title.includes('test') || title.includes('testing')) {
    category = 'testing'
    confidence = 0.8
    tags = ['test', 'qa']
  } else if (title.includes('deploy') || title.includes('release')) {
    category = 'deployment'
    confidence = 0.8
    tags = ['deploy', 'release']
  } else if (title.includes('security') || title.includes('auth')) {
    category = 'security'
    confidence = 0.8
    tags = ['security', 'auth']
  }

  // Content-based categorization if title doesn't give clear signal
  if (confidence < 0.7) {
    if (content.includes('code review') || content.includes('pull request')) {
      category = 'code_review'
      confidence = 0.7
    } else if (content.includes('performance') || content.includes('slow') || content.includes('optimize')) {
      category = 'performance'
      confidence = 0.7
      tags = ['performance']
    } else if (content.includes('research') || content.includes('explore')) {
      category = 'research'
      confidence = 0.6
      tags = ['research']
    }
  }

  return { category, confidence, tags, reasoning }
}