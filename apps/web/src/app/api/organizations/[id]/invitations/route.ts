import { NextRequest, NextResponse } from 'next/server'
import { organizationInvitationService } from '../../../../../lib/organizationService'
import { requireOrganizationAccess } from '../../../../../middleware/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accessCheck = await requireOrganizationAccess(request, 'admin')
    if (!accessCheck.isAuthorized) {
      return accessCheck.response!
    }

    const invitations = await organizationInvitationService.getPendingInvitations(params.id)
    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Error fetching organization invitations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accessCheck = await requireOrganizationAccess(request, 'admin')
    if (!accessCheck.isAuthorized) {
      return accessCheck.response!
    }

    const body = await request.json()
    const { email, role } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const invitation = await organizationInvitationService.createInvitation(
      params.id,
      email,
      role || 'member'
    )

    return NextResponse.json({ invitation }, { status: 201 })
  } catch (error) {
    console.error('Error creating organization invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}