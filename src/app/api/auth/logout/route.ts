import { NextResponse } from "next/server"

const COOKIE = "blazor_user"

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE, "", { maxAge: 0, path: "/" })
  return response
}
