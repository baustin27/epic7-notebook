import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { conversationService, messageService, semanticSearchService } from '../../../../lib/database'

export interface GenerateEmbeddingsRequest {
  type: 'conversation' | 'message' | 'all'
  conversationId?: string
  messageId?: string
  batchSize?: number
  force?: boolean // Regenerate even if embeddings exist
}

export interface GenerateEmbeddingsResponse {
  success: boolean
  processed: number
  failed: number
  errors: string[]
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const {
      type = 'all',
      conversationId,
      messageId,
      batchSize = 10,
      force = false
    }: GenerateEmbeddingsRequest = await request.json()

    const errors: string[] = []
    let processed = 0
    let failed = 0

    if (type === 'conversation' || type === 'all') {
      try {
        const conversationsToProcess = conversationId
          ? [await conversationService.getById(conversationId)].filter(Boolean)
          : await conversationService.getAll()

        for (const conversation of conversationsToProcess) {
          if (!conversation) continue

          try {
            // Skip if embedding exists and not forcing regeneration
            if (!force && conversation.embedding) {
              continue
            }

            await semanticSearchService.generateConversationEmbedding(conversation.id)
            processed++
          } catch (error) {
            console.error(`Failed to generate embedding for conversation ${conversation.id}:`, error)
            errors.push(`Conversation ${conversation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            failed++
          }
        }
      } catch (error) {
        console.error('Error processing conversations:', error)
        errors.push(`Conversation processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (type === 'message' || type === 'all') {
      try {
        let messagesToProcess

        if (messageId) {
          // Get specific message
          const message = await supabase
            .from('messages')
            .select('*')
            .eq('id', messageId)
            .single()
          messagesToProcess = message.data ? [message.data] : []
        } else if (conversationId) {
          // Get messages for specific conversation
          messagesToProcess = await messageService.getByConversationId(conversationId)
        } else {
          // Get all messages (with pagination for performance)
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .is('embedding', null)
            .limit(batchSize)

          if (error) throw error
          messagesToProcess = data || []
        }

        for (const message of messagesToProcess) {
          try {
            // Skip if embedding exists and not forcing regeneration
            if (!force && message.embedding) {
              continue
            }

            await semanticSearchService.generateMessageEmbedding(message.id)
            processed++
          } catch (error) {
            console.error(`Failed to generate embedding for message ${message.id}:`, error)
            errors.push(`Message ${message.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            failed++
          }
        }
      } catch (error) {
        console.error('Error processing messages:', error)
        errors.push(`Message processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    const response: GenerateEmbeddingsResponse = {
      success: failed === 0,
      processed,
      failed,
      errors,
      message: `Processed ${processed} items${failed > 0 ? `, ${failed} failed` : ''}`
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Generate embeddings API error:', error)

    return NextResponse.json(
      {
        success: false,
        processed: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        message: 'Failed to generate embeddings'
      },
      { status: 500 }
    )
  }
}

// Handle GET requests to check embedding status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'conversation' | 'message' | 'all' || 'all'
    const conversationId = searchParams.get('conversationId') || undefined

    let total = 0
    let withEmbeddings = 0

    if (type === 'conversation' || type === 'all') {
      const conversations = conversationId
        ? [await conversationService.getById(conversationId)].filter(Boolean)
        : await conversationService.getAll()

      total += conversations.length
      withEmbeddings += conversations.filter(c => c?.embedding).length
    }

    if (type === 'message' || type === 'all') {
      let query = supabase.from('messages').select('id, embedding', { count: 'exact', head: false })

      if (conversationId) {
        query = query.eq('conversation_id', conversationId)
      }

      const { count, error } = await query

      if (!error && count !== null) {
        total += count

        // Count messages with embeddings
        const { count: embeddingsCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .not('embedding', 'is', null)
          .eq('conversation_id', conversationId || '')

        withEmbeddings += embeddingsCount || 0
      }
    }

    return NextResponse.json({
      total,
      withEmbeddings,
      withoutEmbeddings: total - withEmbeddings,
      coverage: total > 0 ? (withEmbeddings / total) * 100 : 0
    })

  } catch (error) {
    console.error('Embedding status API error:', error)

    return NextResponse.json(
      {
        error: 'Failed to get embedding status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}