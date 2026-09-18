import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { checklistProgress } from "@/lib/constants"
import { addBusinessDays } from "@/lib/date-utils"
import { requiresSprint } from "@/lib/validation"

// Raw query helper — bypasses stale Prisma client cache for fields added after initial codegen
async function getRawFields(id: string) {
  const rows = await prisma.$queryRaw<{
    checklistData: string | null
    isBlocked: number
    blockedReason: string | null
    dueDate: string | null
    sprint: number | null
    dataInicial: string | null
    dataFinal: string | null
    estimativa: number | null
  }[]>`
    SELECT "checklistData", "isBlocked", "blockedReason", "dueDate", "sprint", "dataInicial", "dataFinal", "estimativa" FROM "Form" WHERE "id" = ${id}
  `
  const row = rows[0]
  return {
    checklistData: row?.checklistData ?? null,
    isBlocked: Boolean(row?.isBlocked),
    blockedReason: row?.blockedReason ?? null,
    dueDate: row?.dueDate ?? null,
    sprint: row?.sprint ?? null,
    dataInicial: row?.dataInicial ?? null,
    dataFinal: row?.dataFinal ?? null,
    estimativa: row?.estimativa ?? null,
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
    checklistProgress: checklistProgress(raw.checklistData, form?.classification as string | undefined),
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
  const { status, assignedUserId, isBlocked, blockedReason, dueDate, sprint, dataInicial, dataFinal, estimativa } = body

  const current = await prisma.form.findUnique({ where: { id }, select: { status: true, classification: true } })
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const currentRaw = await getRawFields(id)

  // Sprint is required for a form to be/remain in "Em Estabilização"
  const effectiveStatus = status !== undefined ? status : current.status
  const effectiveSprint = sprint !== undefined ? sprint : currentRaw.sprint
  if (requiresSprint(effectiveStatus) && effectiveSprint == null) {
    return NextResponse.json({ error: "Define o Sprint antes de mover para Em Estabilização" }, { status: 400 })
  }

  // Fields the stale Prisma client knows — safe to use typed update
  const coreUpdates: { status?: string; assignedUserId?: string | null } = {}
  if (status !== undefined) coreUpdates.status = status
  if (assignedUserId !== undefined) coreUpdates.assignedUserId = assignedUserId || null

  let form: Record<string, unknown> | null = null
  if (Object.keys(coreUpdates).length > 0) {
    form = await prisma.form.update({
      where: { id },
      data: coreUpdates,
      include: { assignedUser: { select: { id: true, name: true } } },
    }) as Record<string, unknown>
  }

  // Data Final recalculates automatically from Data Inicial + Estimativa, unless the
  // client sent dataFinal explicitly (a direct manual edit — kept as-is, no recompute)
  let effectiveDataFinal: string | null | undefined = dataFinal
  if (dataFinal === undefined && (dataInicial !== undefined || estimativa !== undefined)) {
    const inicial = dataInicial !== undefined ? dataInicial : currentRaw.dataInicial
    const est = estimativa !== undefined ? estimativa : currentRaw.estimativa
    effectiveDataFinal = inicial && est != null ? addBusinessDays(inicial, est) : undefined
  }

  // New fields — use raw SQL to bypass stale Prisma client cache
  const rawParts: string[] = []
  const rawVals: unknown[] = []
  if (isBlocked !== undefined) { rawParts.push('"isBlocked" = ?'); rawVals.push(isBlocked ? 1 : 0) }
  if (blockedReason !== undefined) { rawParts.push('"blockedReason" = ?'); rawVals.push(blockedReason) }
  if (dueDate !== undefined) { rawParts.push('"dueDate" = ?'); rawVals.push(dueDate) }
  if (sprint !== undefined) { rawParts.push('"sprint" = ?'); rawVals.push(sprint) }
  if (dataInicial !== undefined) { rawParts.push('"dataInicial" = ?'); rawVals.push(dataInicial) }
  if (estimativa !== undefined) { rawParts.push('"estimativa" = ?'); rawVals.push(estimativa) }
  if (effectiveDataFinal !== undefined) { rawParts.push('"dataFinal" = ?'); rawVals.push(effectiveDataFinal) }
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
    }) as Record<string, unknown> | null
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
    checklistProgress: checklistProgress(raw.checklistData, current.classification),
  })
}
