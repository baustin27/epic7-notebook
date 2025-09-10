import { NextRequest, NextResponse } from 'next/server'
import { semanticSearchService } from '../../../../lib/database'

export interface ArchiveRequest {
  daysInactive?: number
  dryRun?: boolean
}

export interface ArchiveResponse {
  archivedCount: number
  totalProcessed: number
  dryRun: boolean
  details?: {
    conversationIds: string[]
    titles: string[]
  }
}

export async function GET() {
  try {
    // Default values for cron job
    const daysInactive = 90
    const dryRun = false

    // Perform actual archiving
    const archivedCount = await semanticSearchService.archiveInactiveConversations(daysInactive)

    console.log(`Cron job: Archived ${archivedCount} conversations inactive for ${daysInactive} days`)

    return NextResponse.json({
      archivedCount,
      totalProcessed: archivedCount,
      dryRun: false,
      message: `Successfully archived ${archivedCount} conversations inactive for ${daysInactive} days`
    })

  } catch (error) {
    console.error('Archive cron job error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { daysInactive = 90, dryRun = false }: ArchiveRequest = await request.json()

    if (daysInactive < 1 || daysInactive > 365) {
      return NextResponse.json(
        { error: 'Days inactive must be between 1 and 365' },
        { status: 400 }
      )
    }

    if (dryRun) {
      // For dry run, we need to query conversations that would be archived
      // This is a simplified version - in production you'd want more sophisticated logic
      const archivedCount = 0 // Placeholder - would need to implement actual dry run logic
      const totalProcessed = 0

      return NextResponse.json({
        archivedCount,
        totalProcessed,
        dryRun: true,
        message: `Dry run: Would archive ${archivedCount} conversations inactive for ${daysInactive} days`
      })
    }

    // Perform actual archiving
    const archivedCount = await semanticSearchService.archiveInactiveConversations(daysInactive)

    return NextResponse.json({
      archivedCount,
      totalProcessed: archivedCount,
      dryRun: false,
      message: `Successfully archived ${archivedCount} conversations inactive for ${daysInactive} days`
    })

  } catch (error) {
    console.error('Archive API error:', error)

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

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to trigger archiving.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to trigger archiving.' },
    { status: 405 }
  )
}