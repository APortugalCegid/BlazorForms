import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import fs from "fs"
import path from "path"

const ADMIN_NAMES = new Set(
  (process.env.ADMIN_NAMES ?? "").split(",").map((n) => n.trim()).filter(Boolean)
)

function dbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db"
  const filePart = url.replace(/^file:/, "")
  return path.isAbsolute(filePart) ? filePart : path.join(process.cwd(), filePart)
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (ADMIN_NAMES.size > 0 && !ADMIN_NAMES.has(session.name)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const file = dbPath()
  if (!fs.existsSync(file)) {
    return NextResponse.json({ error: "Base de dados não encontrada" }, { status: 404 })
  }

  // Flush pending writes before reading
  await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)")

  const buffer = new Uint8Array(fs.readFileSync(file))
  const date = new Date().toISOString().slice(0, 10)
  const filename = `blazor-backup-${date}.db`

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  })
}
