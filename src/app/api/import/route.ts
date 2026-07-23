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
  await prisma.$transaction([
    prisma.stateHistory.deleteMany(),
    prisma.note.deleteMany(),
    prisma.form.deleteMany(),
  ])

  let deletedUsers = 0
  if (shouldDeleteUsers) {
    const result = await prisma.user.deleteMany()
    deletedUsers = result.count
  }

  await prisma.form.createMany({ data })

  return NextResponse.json({ imported: data.length, deletedUsers })
}
