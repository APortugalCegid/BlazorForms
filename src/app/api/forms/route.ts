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
  const sprint = searchParams.get("sprint")

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
        ...(activeOnly === "true" ? { status: "Em Estabilização" } : {}),
      },
      include: {
        assignedUser: { select: { id: true, name: true } },
      },
      orderBy: [{ module: "asc" }, { className: "asc" }],
    }),
    // No WHERE — bypasses stale Prisma client for new fields; avoids IN-clause parameter limits
    prisma.$queryRaw<{ id: string; checklistData: string | null; isBlocked: number; blockedReason: string | null; dueDate: string | null; sprint: number | null; dataInicial: string | null; dataFinal: string | null; estimativa: number | null }[]>`
      SELECT "id", "checklistData", "isBlocked", "blockedReason", "dueDate", "sprint", "dataInicial", "dataFinal", "estimativa" FROM "Form"
    `,
  ])

  type ChecklistRow = { id: string; checklistData: string | null; isBlocked: number; blockedReason: string | null; dueDate: string | null; sprint: number | null; dataInicial: string | null; dataFinal: string | null; estimativa: number | null }
  const rawMap: Record<string, { checklistData: string | null; isBlocked: boolean; blockedReason: string | null; dueDate: string | null; sprint: number | null; dataInicial: string | null; dataFinal: string | null; estimativa: number | null }> = {}
  for (const r of checklistRows as ChecklistRow[]) {
    rawMap[r.id] = {
      checklistData: r.checklistData,
      isBlocked: Boolean(r.isBlocked),
      blockedReason: r.blockedReason,
      dueDate: r.dueDate,
      sprint: r.sprint,
      dataInicial: r.dataInicial,
      dataFinal: r.dataFinal,
      estimativa: r.estimativa,
    }
  }

  const mapped = forms.map((f) => ({
    ...f,
    isBlocked: rawMap[f.id]?.isBlocked ?? false,
    blockedReason: rawMap[f.id]?.blockedReason ?? null,
    dueDate: rawMap[f.id]?.dueDate ?? null,
    sprint: rawMap[f.id]?.sprint ?? null,
    dataInicial: rawMap[f.id]?.dataInicial ?? null,
    dataFinal: rawMap[f.id]?.dataFinal ?? null,
    estimativa: rawMap[f.id]?.estimativa ?? null,
    checklistProgress: checklistProgress(rawMap[f.id]?.checklistData ?? null, f.classification),
  }))

  let result = blockedOnly === "true" ? mapped.filter((f) => f.isBlocked) : mapped
  if (sprint) result = result.filter((f) => f.sprint === Number(sprint))
  return NextResponse.json(result)
}
