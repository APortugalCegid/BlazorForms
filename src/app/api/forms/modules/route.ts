import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"

export async function GET(_request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await prisma.$queryRaw<{ module: string }[]>`
    SELECT DISTINCT "module" FROM "Form" ORDER BY "module" ASC
  `
  return NextResponse.json(rows.map((r) => r.module))
}
