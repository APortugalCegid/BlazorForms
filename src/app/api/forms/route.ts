import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { checklistProgress } from "@/lib/constants"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const module = searchParams.get("module")
  const classification = searchParams.get("classification")
  const assignedUserId = searchParams.get("assignedUserId")
  const search = searchParams.get("search")
  const included = searchParams.get("included")
  const activeOnly = searchParams.get("activeOnly")
  const blockedOnly = searchParams.get("blocked")

  // Run both queries in parallel — raw SQL for checklistData (bypasses stale Prisma client)
  const [forms, checklistRows] = await Promise.all([
    prisma.form.findMany({
      where: {
        ...(module ? { module } : {}),
        ...(classification ? { classification } : {}),
        ...(assignedUserId === "me"
          ? { assignedUserId: session.id }
          : assignedUserId
          ? { assignedUserId }
          : {}),
        ...(search
          ? { OR: [{ className: { contains: search } }, { module: { contains: search } }] }
          : {}),
        ...(included !== null ? { included: included === "true" } : {}),
        ...(activeOnly === "true" ? { status: { in: ["Em Estabilização", "Testes"] } } : {}),
      },
      include: {
        assignedUser: { select: { id: true, name: true } },
      },
      orderBy: [{ module: "asc" }, { className: "asc" }],
    }),
    // No WHERE — bypasses stale Prisma client for new fields; avoids IN-clause parameter limits
    prisma.$queryRaw<{ id: string; checklistData: string | null; isBlocked: number; blockedReason: string | null; dueDate: string | null }[]>`
      SELECT "id", "checklistData", "isBlocked", "blockedReason", "dueDate" FROM "Form"
    `,
  ])

  const rawMap: Record<string, { checklistData: string | null; isBlocked: boolean; blockedReason: string | null; dueDate: string | null }> = {}
  for (const r of checklistRows) {
    rawMap[r.id] = {
      checklistData: r.checklistData,
      isBlocked: Boolean(r.isBlocked),
      blockedReason: r.blockedReason,
      dueDate: r.dueDate,
    }
  }

  const mapped = forms.map((f) => ({
    ...f,
    isBlocked: rawMap[f.id]?.isBlocked ?? false,
    blockedReason: rawMap[f.id]?.blockedReason ?? null,
    dueDate: rawMap[f.id]?.dueDate ?? null,
    checklistProgress: checklistProgress(rawMap[f.id]?.checklistData ?? null, f.classification),
  }))

  const result = blockedOnly === "true" ? mapped.filter((f) => f.isBlocked) : mapped
  return NextResponse.json(result)
}
