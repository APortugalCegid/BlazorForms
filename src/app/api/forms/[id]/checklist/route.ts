import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { checklistProgress } from "@/lib/constants"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const raw: string | null = typeof body.checklistData === "string" ? body.checklistData : null
  const now = new Date().toISOString()

  // Use raw SQL to guarantee the field is written regardless of Prisma client cache state
  await prisma.$executeRaw`UPDATE "Form" SET "checklistData" = ${raw}, "updatedAt" = ${now} WHERE "id" = ${id}`

  const form = await prisma.form.findUnique({ where: { id }, select: { classification: true } })
  return NextResponse.json({ ok: true, checklistProgress: checklistProgress(raw, form?.classification ?? "Editor") })
}
