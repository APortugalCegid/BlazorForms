import { SignJWT, jwtVerify } from "jose"

const COOKIE = "blazor_user"
const MAX_AGE = 60 * 60 * 24 * 30 // 30 dias

export interface SessionUser {
  id: string
  name: string
}

function secret() {
  const s = process.env.SESSION_SECRET ?? ""
  if (s.length < 32) throw new Error("SESSION_SECRET must be ≥ 32 chars — define-o em .env")
  return new TextEncoder().encode(s)
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ id: user.id, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .setIssuedAt()
    .sign(secret())
}

export async function getSession(): Promise<SessionUser | null> {
  const { cookies } = await import("next/headers")
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    return { id: payload.id as string, name: payload.name as string }
  } catch {
    return null
  }
}

export async function setSession(user: SessionUser): Promise<void> {
  const { cookies } = await import("next/headers")
  const token = await createSessionToken(user)
  const store = await cookies()
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  })
}

export async function clearSession(): Promise<void> {
  const { cookies } = await import("next/headers")
  const store = await cookies()
  store.delete(COOKIE)
}
