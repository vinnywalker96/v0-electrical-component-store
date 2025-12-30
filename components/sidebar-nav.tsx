"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface SidebarNavProps {
  navItems: NavItem[]
}

export function SidebarNav({ navItems }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-slate-200 fixed h-screen">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-8">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">⚡</div>
          <span>KG Compponents</span>
        </Link>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                pathname === item.href
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}
