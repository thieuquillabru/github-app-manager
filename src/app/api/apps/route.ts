import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const apps = await db.app.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(apps)
  } catch (error) {
    console.error('Error fetching apps:', error)
    return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, url, description, category, color, icon } = body

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 })
    }

    // Get the max order to append at the end
    const maxOrder = await db.app.aggregate({ _max: { order: true } })
    const nextOrder = (maxOrder._max.order ?? -1) + 1

    const app = await db.app.create({
      data: {
        name,
        url,
        description: description || null,
        category: category || 'General',
        color: color || '#6e40c9',
        icon: icon || 'Link',
        order: nextOrder,
      },
    })

    return NextResponse.json(app, { status: 201 })
  } catch (error) {
    console.error('Error creating app:', error)
    return NextResponse.json({ error: 'Failed to create app' }, { status: 500 })
  }
}
