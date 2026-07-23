import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createSessionToken } from "@/lib/session"

const COOKIE = "blazor_user"
const MAX_AGE = 60 * 60 * 24 * 30 // 30 dias

export async function POST(request: NextRequest) {
  const body = await request.json()
  const pat: string = body.pat
  const org: string = body.org || process.env.AZURE_DEVOPS_ORG || ""

  if (!pat?.trim()) {
    return NextResponse.json({ error: "PAT obrigatório" }, { status: 400 })
  }
  if (!org?.trim()) {
    return NextResponse.json({ error: "Organização obrigatória" }, { status: 400 })
  }

  // Accept "cegid", "https://dev.azure.com/cegid", "cegid.visualstudio.com", etc.
  const normalizedOrg = org.trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(dev\.azure\.com|app\.vssps\.visualstudio\.com)\//i, "")
    .replace(/\.visualstudio\.com.*/i, "")
    .replace(/\/.*$/, "")
    .trim()

  const auth = `Basic ${Buffer.from(`:${pat.trim()}`).toString("base64")}`

  const attempts = [
    {
      url: `https://dev.azure.com/${normalizedOrg}/_apis/connectionData`,
      getName: (d: Record<string, unknown>) =>
        (d.authenticatedUser as Record<string, unknown>)?.providerDisplayName as string,
    },
    {
      url: "https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1",
      getName: (d: Record<string, unknown>) => d.displayName as string,
    },
  ]

  let displayName = ""
  const errors: string[] = []

  for (const { url, getName } of attempts) {
    try {
      const res = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } })
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>
        displayName = getName(data)?.trim() || ""
        if (displayName) break
      } else {
        errors.push(`${url}: HTTP ${res.status}`)
      }
    } catch (e) {
      errors.push(`${url}: ${e}`)
    }
  }

  if (!displayName) {
    return NextResponse.json({
      error: `Não foi possível autenticar com este PAT. Detalhes: ${errors.join(" | ")}`,
    }, { status: 401 })
  }

  // Find or create user — identity comes from Azure DevOps, not user input
  let user = await prisma.user.findUnique({ where: { name: displayName } })
  if (!user) {
    user = await prisma.user.create({ data: { name: displayName } })
  }

  const token = await createSessionToken({ id: user.id, name: user.name })

  const response = NextResponse.json({ id: user.id, name: user.name })
  response.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  })
  return response
}
