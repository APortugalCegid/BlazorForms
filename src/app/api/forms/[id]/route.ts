import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { checklistProgress } from "@/lib/constants"

// Raw query helper — bypasses stale Prisma client cache for fields added after initial codegen
async function getRawFields(id: string) {
  const rows = await prisma.$queryRaw<{
    checklistData: string | null
    isBlocked: number
    blockedReason: string | null
    dueDate: string | null
  }[]>`
    SELECT "checklistData", "isBlocked", "blockedReason", "dueDate" FROM "Form" WHERE "id" = ${id}
  `
  const row = rows[0]
  return {
    checklistData: row?.checklistData ?? null,
    isBlocked: Boolean(row?.isBlocked),
    blockedReason: row?.blockedReason ?? null,
    dueDate: row?.dueDate ?? null,
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const [form, raw] = await Promise.all([
    prisma.form.findUnique({
      where: { id },
      include: {
        assignedUser: { select: { id: true, name: true } },
        stateHistory: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
        notes: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    getRawFields(id),
  ])

  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({
    ...(form as Record<string, unknown>),
    ...raw,
    checklistProgress: checklistProgress(raw.checklistData),
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { status, assignedUserId, isBlocked, blockedReason, dueDate } = body

  const current = await prisma.form.findUnique({ where: { id }, select: { status: true } })
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Fields the stale Prisma client knows — safe to use typed update
  const coreUpdates: { status?: string; assignedUserId?: string | null } = {}
  if (status !== undefined) coreUpdates.status = status
  if (assignedUserId !== undefined) coreUpdates.assignedUserId = assignedUserId || null

  let form = null
  if (Object.keys(coreUpdates).length > 0) {
    form = await prisma.form.update({
      where: { id },
      data: coreUpdates,
      include: { assignedUser: { select: { id: true, name: true } } },
    })
  }

  // New fields — use raw SQL to bypass stale Prisma client cache
  const rawParts: string[] = []
  const rawVals: unknown[] = []
  if (isBlocked !== undefined) { rawParts.push('"isBlocked" = ?'); rawVals.push(isBlocked ? 1 : 0) }
  if (blockedReason !== undefined) { rawParts.push('"blockedReason" = ?'); rawVals.push(blockedReason) }
  if (dueDate !== undefined) { rawParts.push('"dueDate" = ?'); rawVals.push(dueDate) }
  if (rawParts.length > 0) {
    rawParts.push('"updatedAt" = ?')
    rawVals.push(new Date().toISOString(), id)
    await prisma.$executeRawUnsafe(
      `UPDATE "Form" SET ${rawParts.join(", ")} WHERE "id" = ?`,
      ...rawVals
    )
  }

  // A form moved to "Concluído" cannot be blocked — clear the flag regardless of what was in the PATCH body
  if (status === "Concluído") {
    await prisma.$executeRawUnsafe(
      `UPDATE "Form" SET "isBlocked" = 0, "blockedReason" = NULL, "updatedAt" = ? WHERE "id" = ?`,
      new Date().toISOString(), id
    )
  }

  if (!form) {
    form = await prisma.form.findUnique({
      where: { id },
      include: { assignedUser: { select: { id: true, name: true } } },
    })
  }

  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (status && status !== current.status) {
    await prisma.stateHistory.create({
      data: { formId: id, fromStatus: current.status, toStatus: status, userId: session.id },
    })
  }

  const raw = await getRawFields(id)
  return NextResponse.json({
    ...(form as Record<string, unknown>),
    ...raw,
    checklistProgress: checklistProgress(raw.checklistData),
  })
}
