import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, url, description, category, color, icon, order } = body

    const app = await db.app.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(url !== undefined && { url }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(order !== undefined && { order }),
      },
    })

    return NextResponse.json(app)
  } catch (error) {
    console.error('Error updating app:', error)
    return NextResponse.json({ error: 'Failed to update app' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.app.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting app:', error)
    return NextResponse.json({ error: 'Failed to delete app' }, { status: 500 })
  }
}
