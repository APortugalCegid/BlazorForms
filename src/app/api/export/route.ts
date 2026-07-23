import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { checklistProgress } from "@/lib/constants"
import * as XLSX from "xlsx"

type RawRow = { id: string; isBlocked: number; blockedReason: string | null; dueDate: string | null; checklistData: string | null }

export async function GET(_request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [forms, rawRows] = await Promise.all([
    prisma.form.findMany({
      include: { assignedUser: { select: { name: true } } },
      orderBy: [{ module: "asc" }, { className: "asc" }],
    }),
    prisma.$queryRaw<RawRow[]>`
      SELECT "id", "isBlocked", "blockedReason", "dueDate", "checklistData" FROM "Form"
    `,
  ])

  const rawMap = new Map((rawRows as RawRow[]).map((r) => [r.id, r]))

  const rows = forms.map((f) => {
    const raw = rawMap.get(f.id)
    const cp = checklistProgress(raw?.checklistData ?? null, f.classification)
    return {
      "Módulo":          f.module,
      "Classe":          f.className,
      "Token":           f.token ?? "",
      "Classificação":   f.classification,
      "Estado":          f.status,
      "Atribuído a":     f.assignedUser?.name ?? "",
      "Prazo":           raw?.dueDate ?? "",
      "Bloqueado":       raw?.isBlocked ? "Sim" : "Não",
      "Motivo Bloqueio": raw?.blockedReason ?? "",
      "Checklist":       `${cp.checked}/${cp.total}`,
      "% Checklist":     cp.total > 0 ? Math.round((cp.checked / cp.total) * 100) : 0,
      "Incluído":        f.included ? "Sim" : "Não",
    }
  })

  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths for readability
  ws["!cols"] = [
    { wch: 20 }, // Módulo
    { wch: 40 }, // Classe
    { wch: 14 }, // Token
    { wch: 14 }, // Classificação
    { wch: 18 }, // Estado
    { wch: 18 }, // Atribuído a
    { wch: 12 }, // Prazo
    { wch: 10 }, // Bloqueado
    { wch: 40 }, // Motivo Bloqueio
    { wch: 12 }, // Checklist
    { wch: 12 }, // % Checklist
    { wch: 10 }, // Incluído
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Progresso")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
  const date = new Date().toISOString().split("T")[0]

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="estabilizacao-blazor-${date}.xlsx"`,
    },
  })
}
