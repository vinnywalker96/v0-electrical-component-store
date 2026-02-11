"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserCircle, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UserProfile } from "@/lib/types"
import { useLanguage } from "@/lib/context/language-context"


interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface SidebarNavProps {
  navItems: NavItem[]
  userProfile?: UserProfile | null
  onLogout?: () => void
  isOpen?: boolean
  onClose?: () => void
}

export function SidebarNav({ navItems, userProfile, onLogout, isOpen, onClose }: SidebarNavProps) {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <aside className={`w-64 bg-white border-r border-slate-200 fixed h-screen flex flex-col z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
      <div className="p-6 flex-1 overflow-y-auto">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-8">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">⚡</div>
          <span>KG Components</span>
        </Link>

        {/* Close button for mobile */}
        <button onClick={onClose} className="md:hidden absolute top-6 right-6 p-1 text-slate-500">
          {/* We already have the X in the layout, but another here is fine or we keep it simple */}
        </button>

        {userProfile && (
          <div className="mb-6 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <UserCircle className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {userProfile.first_name || userProfile.email}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {userProfile.role ? t(`admin_users.${userProfile.role}`) : t("seller_orders.customer")}
                </p>
              </div>
            </div>
          </div>
        )}

        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname === item.href ? "bg-primary/10 text-primary font-medium" : "hover:bg-slate-100 text-slate-700"
                }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {onLogout && (
        <div className="p-4 border-t border-slate-200">
          <Button
            onClick={onLogout}
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-700 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            {t("navigation.logout")}
          </Button>
        </div>
      )}
    </aside>
  )
}
