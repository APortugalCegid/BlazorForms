import { NextRequest, NextResponse } from "next/server"

const COOKIE = "blazor_user"
const PUBLIC = ["/login", "/api/auth/login"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const session = request.cookies.get(COOKIE)?.value
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
