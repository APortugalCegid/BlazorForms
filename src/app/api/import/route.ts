import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import * as XLSX from "xlsx"

const INCLUDED_MODULES = new Set([
  "Accounting", "Base", "CashManagement", "Erp", "Internal",
  "Inventory", "PayablesReceivables", "Platform", "Purchases",
  "Saft", "Sales", "UpgradeSupport", "_SharedFiles",
])

const ADMIN_NAMES = new Set(
  (process.env.ADMIN_NAMES ?? "").split(",").map((n) => n.trim()).filter(Boolean)
)

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (ADMIN_NAMES.size > 0 && !ADMIN_NAMES.has(session.name)) {
    return NextResponse.json({ error: "Forbidden — acesso restrito a administradores" }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: "buffer" })

  const sheet = workbook.Sheets["Forms"]
  if (!sheet) return NextResponse.json({ error: "Sheet 'Forms' not found" }, { status: 400 })

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  const data = rows
    .filter((row) => row["Módulo"] && row["Classe"])
    .map((row) => ({
      module: String(row["Módulo"] ?? "").trim(),
      className: String(row["Classe"] ?? "").trim(),
      loc: Number(row["LOC"]) || 0,
      token: row["Token"] && row["Token"] !== "-" ? String(row["Token"]).trim() : null,
      copies: Number(row["Cópias"]) || 1,
      classification: String(row["Classificação"] ?? "Other").trim(),
      estimatedDays: Number(row["Dias/form"]) || 0,
      included: INCLUDED_MODULES.has(String(row["Módulo"] ?? "").trim()),
      status: "Backlog",
    }))

  const shouldDeleteUsers = formData.get("deleteUsers") === "true"

  // Delete in order: history → notes → forms (clears FK on assignedUserId) → users
  let deletedUsers = 0
  try {
    await prisma.$transaction(async (tx) => {
      await tx.stateHistory.deleteMany()
      await tx.note.deleteMany()
      await tx.form.deleteMany()
      if (shouldDeleteUsers) {
        const result = await tx.user.deleteMany()
        deletedUsers = result.count
      }
      await tx.form.createMany({ data })
      // estimativa is a raw field (outside stale Prisma client) — suggest it from LOC via SQL
      await tx.$executeRawUnsafe(`UPDATE "Form" SET "estimativa" = ROUND("loc" * 7.0 / 12000, 0) WHERE "estimativa" IS NULL`)
    })
  } catch (err) {
    console.error("[import] DB error:", err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Erro de base de dados: ${message}` }, { status: 500 })
  }

  return NextResponse.json({ imported: data.length, deletedUsers })
}
