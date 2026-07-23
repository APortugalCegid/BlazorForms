import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Nav } from "@/components/nav"
import { getSession } from "@/lib/session"

const inter = Inter({ subsets: ["latin"] })

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Estabilização Blazor",
  description: "Gestão de migração de Forms ERP",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  return (
    <html lang="pt" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 min-h-screen`} suppressHydrationWarning>
        {session && <Nav userName={session.name} env={process.env.NODE_ENV ?? "production"} />}
        <main className={session ? "ml-56 min-h-screen" : "min-h-screen"}>
          {children}
        </main>
      </body>
    </html>
  )
}
