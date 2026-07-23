import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { ids, assignedUserId, status, dueDate } = body as {
    ids: string[]
    assignedUserId?: string | null
    status?: string
    dueDate?: string | null
  }

  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: "ids required" }, { status: 400 })
  if (!assignedUserId && !status && dueDate === undefined)
    return NextResponse.json({ error: "assignedUserId, status or dueDate required" }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (assignedUserId !== undefined) updates.assignedUserId = assignedUserId || null
  if (status !== undefined) updates.status = status

  // Fetch current states before updating (needed for stateHistory)
  const currentForms = status
    ? await prisma.form.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } })
    : []

  await prisma.form.updateMany({ where: { id: { in: ids } }, data: updates })

  // stateHistory for status changes
  if (status) {
    const changed = currentForms.filter((f) => f.status !== status)
    if (changed.length > 0) {
      await prisma.stateHistory.createMany({
        data: changed.map((f) => ({
          formId: f.id,
          fromStatus: f.status,
          toStatus: status,
          userId: session.id,
        })),
      })
    }

    // Auto-clear blocked when moving to Concluído
    if (status === "Concluído") {
      for (const id of ids) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Form" SET "isBlocked" = 0, "blockedReason" = NULL, "updatedAt" = ? WHERE "id" = ?`,
          new Date().toISOString(), id
        )
      }
    }
  }

  // dueDate is a raw field (outside stale Prisma schema) — must use raw SQL
  if (dueDate !== undefined) {
    for (const id of ids) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Form" SET "dueDate" = ?, "updatedAt" = ? WHERE "id" = ?`,
        dueDate || null, new Date().toISOString(), id
      )
    }
  }

  return NextResponse.json({ updated: ids.length })
}
