import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"

const ACTIVE_STATUSES = ["Em Estabilização"]

export async function GET(_request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [grouped, users, dueSoonRows] = await Promise.all([
    prisma.form.groupBy({
      by: ["assignedUserId", "status"],
      where: { status: { in: ACTIVE_STATUSES }, NOT: { assignedUserId: null } },
      _count: { id: true },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
    // dueDate is a new field — bypass stale client with raw SQL
    prisma.$queryRaw<{ assignedUserId: string }[]>`
      SELECT "assignedUserId" FROM "Form"
      WHERE "assignedUserId" IS NOT NULL
        AND "dueDate" IS NOT NULL
        AND "status" != 'Concluído'
        AND "dueDate" <= date('now', '+3 days')
    `,
  ])

  const userMap = new Map(users.map((u) => [u.id, u.name]))
  const dueSoonMap: Record<string, number> = {}
  for (const r of dueSoonRows as { assignedUserId: string }[]) dueSoonMap[r.assignedUserId] = (dueSoonMap[r.assignedUserId] ?? 0) + 1

  const byUser: Record<string, { name: string; counts: Record<string, number>; total: number; dueSoon: number }> = {}

  for (const row of grouped) {
    if (!row.assignedUserId) continue
    if (!byUser[row.assignedUserId]) {
      byUser[row.assignedUserId] = {
        name: userMap.get(row.assignedUserId) ?? row.assignedUserId,
        counts: {},
        total: 0,
        dueSoon: dueSoonMap[row.assignedUserId] ?? 0,
      }
    }
    byUser[row.assignedUserId].counts[row.status] = row._count.id
    byUser[row.assignedUserId].total += row._count.id
  }

  return NextResponse.json(
    Object.entries(byUser)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
  )
}
