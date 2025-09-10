import { NextRequest, NextResponse } from 'next/server'
import { organizationMemberService } from '../../../../../lib/organizationService'
import { requireOrganizationAccess } from '../../../../../middleware/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accessCheck = await requireOrganizationAccess(request, 'member')
    if (!accessCheck.isAuthorized) {
      return accessCheck.response!
    }

    const members = await organizationMemberService.getMembers(params.id)
    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error fetching organization members:', error)
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
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 })
    }

    const member = await organizationMemberService.addMember(params.id, {
      user_id: userId,
      role
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('Error adding organization member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}