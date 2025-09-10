import { NextRequest, NextResponse } from 'next/server'
import { organizationService } from '../../../lib/organizationService'
import { requireOrganizationAccess, getOrganizationContext } from '../../../middleware/admin'

export async function GET(request: NextRequest) {
  try {
    const context = await getOrganizationContext(request)
    if (context.error) {
      return NextResponse.json({ error: context.error }, { status: 401 })
    }

    const organizations = await organizationService.getUserOrganizations()
    return NextResponse.json({ organizations })
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, slug, description, industry, size } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    const organization = await organizationService.create({
      name,
      slug,
      description,
      industry,
      size
    })

    return NextResponse.json({ organization }, { status: 201 })
  } catch (error) {
    console.error('Error creating organization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}