import { NextRequest, NextResponse } from 'next/server'
import { organizationInvitationService } from '../../../../../lib/organizationService'

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const result = await organizationInvitationService.acceptInvitation(params.token)

    return NextResponse.json({
      message: 'Invitation accepted successfully',
      organization: result.organization,
      member: result.member
    })
  } catch (error: any) {
    console.error('Error accepting invitation:', error)

    if (error.message?.includes('Invalid') || error.message?.includes('expired')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}