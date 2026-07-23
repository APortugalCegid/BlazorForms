import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import fs from "fs"
import path from "path"

const ADMIN_NAMES = new Set(
  (process.env.ADMIN_NAMES ?? "").split(",").map((n) => n.trim()).filter(Boolean)
)

const SQLITE_MAGIC = "SQLite format 3\0"

function dbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db"
  const filePart = url.replace(/^file:/, "")
  return path.isAbsolute(filePart) ? filePart : path.join(process.cwd(), filePart)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (ADMIN_NAMES.size > 0 && !ADMIN_NAMES.has(session.name)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Ficheiro não fornecido" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  // Validate SQLite magic bytes
  const magic = buffer.slice(0, 16).toString("binary")
  if (magic !== SQLITE_MAGIC) {
    return NextResponse.json({ error: "Ficheiro inválido — não é uma base de dados SQLite" }, { status: 400 })
  }

  const target = dbPath()
  const tmp = `${target}.tmp`

  try {
    fs.writeFileSync(tmp, buffer)

    // Close Prisma connection before replacing the file
    await prisma.$disconnect()

    // Atomic replace: write to .tmp then rename over the target
    fs.renameSync(tmp, target)
  } catch (e) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
    return NextResponse.json({ error: `Erro ao restaurar: ${e}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
