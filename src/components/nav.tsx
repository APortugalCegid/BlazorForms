"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Kanban, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { href: "/board",     label: "Board",     icon: Kanban },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin",     label: "Admin",     icon: Settings },
]

export function Nav({ userName, env }: { userName: string; env: string }) {
  const pathname = usePathname()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col z-40"
      style={{ backgroundColor: "#022341" }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#2962FF" }}>
            <span className="text-white font-black text-sm">B</span>
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">Estabilização</p>
            <p className="font-bold text-white text-sm leading-tight">Blazor</p>
          </div>
        </div>
        <p className="text-xs mt-1" style={{ color: "#CCE9FF", opacity: 0.7 }}>ERP Forms Migration</p>
        <span className={cn(
          "inline-block mt-2 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide",
          env === "development"
            ? "bg-amber-400 text-amber-900"
            : "bg-emerald-500/20 text-emerald-300"
        )}>
          {env === "development" ? "DEV" : "PROD"}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
              style={active ? { backgroundColor: "#2962FF" } : {}}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ backgroundColor: "#2962FF" }}>
            {userName[0].toUpperCase()}
          </div>
          <p className="text-sm font-medium text-white truncate">{userName}</p>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-xs transition-colors hover:text-white"
          style={{ color: "rgba(204,233,255,0.6)" }}>
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </aside>
  )
}
