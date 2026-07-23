/**
 * Seed script: imports ERP_Forms_Estimative.xlsx into the SQLite database.
 * Usage: npx tsx scripts/seed.ts <path-to-xlsx>
 */

import "dotenv/config"
import * as XLSX from "xlsx"
import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import path from "path"

const INCLUDED_MODULES = new Set([
  "Accounting", "Base", "CashManagement", "Erp", "Internal",
  "Inventory", "PayablesReceivables", "Platform", "Purchases",
  "Saft", "Sales", "UpgradeSupport", "_SharedFiles",
])

async function main() {
  const xlsxPath = process.argv[2] || path.join(__dirname, "..", "..", "..", "Downloads", "ERP_Forms_Estimative.xlsx")

  console.log(`Reading: ${xlsxPath}`)
  const workbook = XLSX.readFile(xlsxPath)
  const sheet = workbook.Sheets["Forms"]
  if (!sheet) throw new Error("Sheet 'Forms' not found")

  const rows = XLSX.utils.sheet_to_json<{
    "Módulo": string
    "Classe": string
    "LOC": number
    "Token": string
    "Cópias": number
    "Classificação": string
    "Dias/form": number
  }>(sheet)

  const dbPath = (process.env.DATABASE_URL ?? "file:./prisma/dev.db").replace(/^file:/, "")
  const adapter = new PrismaBetterSqlite3({ url: dbPath })
  const prisma = new PrismaClient({ adapter })

  console.log("Clearing existing data...")
  await prisma.stateHistory.deleteMany()
  await prisma.note.deleteMany()
  await prisma.form.deleteMany()

  const data = rows
    .filter((r) => r["Módulo"] && r["Classe"])
    .map((r) => ({
      module: String(r["Módulo"]).trim(),
      className: String(r["Classe"]).trim(),
      loc: Number(r["LOC"]) || 0,
      token: r["Token"] && r["Token"] !== "-" ? String(r["Token"]).trim() : null,
      copies: Number(r["Cópias"]) || 1,
      classification: String(r["Classificação"] || "Other").trim(),
      estimatedDays: Number(r["Dias/form"]) || 0,
      included: INCLUDED_MODULES.has(String(r["Módulo"]).trim()),
      status: "Backlog",
    }))

  console.log(`Inserting ${data.length} forms...`)
  await prisma.form.createMany({ data })

  const counts = await prisma.form.groupBy({ by: ["module"], _count: true })
  counts.sort((a, b) => a.module.localeCompare(b.module))
  counts.forEach((c) => console.log(`  ${c.module}: ${c._count} forms`))

  console.log(`\nDone! ${data.length} forms imported.`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
