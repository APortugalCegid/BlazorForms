import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { requiresSprint } from "@/lib/validation"

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { ids, assignedUserId, status, sprint, dataInicial, dataFinal } = body as {
    ids: string[]
    assignedUserId?: string | null
    status?: string
    sprint?: number | null
    dataInicial?: string | null
    dataFinal?: string | null
  }

  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: "ids required" }, { status: 400 })
  if (!assignedUserId && !status && sprint === undefined && dataInicial === undefined && dataFinal === undefined)
    return NextResponse.json({ error: "assignedUserId, status, sprint, dataInicial or dataFinal required" }, { status: 400 })

  // Fetch current states before updating (needed for stateHistory + Sprint guard)
  const currentForms = status
    ? await prisma.form.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } })
    : []

  // Sprint guard: a form can only move into "Em Estabilização" if it has (or is being given) a Sprint
  let statusIds = ids
  let blockedNoSprint = 0
  if (status && requiresSprint(status)) {
    if (sprint !== undefined) {
      // This request is also setting the Sprint for every selected id
      statusIds = sprint != null ? ids : []
    } else {
      const sprintRows: { id: string; sprint: number | null }[] = []
      for (const id of ids) {
        const r = await prisma.$queryRaw<{ id: string; sprint: number | null }[]>`SELECT "id", "sprint" FROM "Form" WHERE "id" = ${id}`
        sprintRows.push(...r)
      }
      const sprintById = new Map(sprintRows.map((r) => [r.id, r.sprint]))
      statusIds = ids.filter((id) => sprintById.get(id) != null)
    }
    blockedNoSprint = ids.length - statusIds.length
  }

  if (assignedUserId !== undefined) {
    await prisma.form.updateMany({ where: { id: { in: ids } }, data: { assignedUserId: assignedUserId || null } })
  }
  if (status !== undefined && statusIds.length > 0) {
    await prisma.form.updateMany({ where: { id: { in: statusIds } }, data: { status } })
  }

  // stateHistory for status changes
  if (status) {
    const changed = currentForms.filter((f) => statusIds.includes(f.id) && f.status !== status)
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
      for (const id of statusIds) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Form" SET "isBlocked" = 0, "blockedReason" = NULL, "updatedAt" = ? WHERE "id" = ?`,
          new Date().toISOString(), id
        )
      }
    }
  }

  // sprint / dataInicial / dataFinal are raw fields (outside stale Prisma schema) — must use raw SQL
  const rawParts: string[] = []
  const rawVals: unknown[] = []
  if (sprint !== undefined) { rawParts.push('"sprint" = ?'); rawVals.push(sprint) }
  if (dataInicial !== undefined) { rawParts.push('"dataInicial" = ?'); rawVals.push(dataInicial) }
  if (dataFinal !== undefined) { rawParts.push('"dataFinal" = ?'); rawVals.push(dataFinal) }
  if (rawParts.length > 0) {
    for (const id of ids) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Form" SET ${rawParts.join(", ")}, "updatedAt" = ? WHERE "id" = ?`,
        ...rawVals, new Date().toISOString(), id
      )
    }
  }

  return NextResponse.json({ updated: ids.length, blockedNoSprint })
}
