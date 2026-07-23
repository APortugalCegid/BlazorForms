import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 })

  const note = await prisma.note.create({
    data: { formId: id, content: content.trim(), userId: session.id },
    include: { user: { select: { id: true, name: true } } },
  })

  return NextResponse.json(note, { status: 201 })
}
