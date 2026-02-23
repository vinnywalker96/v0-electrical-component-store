"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Menu, X, ShoppingCart, User, LogOut, Settings, LayoutDashboard, Store } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useCart } from "@/lib/context/cart-context"
import { useLanguage } from "@/lib/context/language-context"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { CurrencySwitcher } from "@/components/currency-switcher"
import { useCurrency } from "@/lib/context/currency-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { itemCount } = useCart()
  const { t } = useLanguage()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
          setUserRole(profile?.role || null)
        }
      } catch (error) {
        console.error("Auth check error:", error)
      } finally {
        setLoading(false)
      }
    }

    if (mounted) {
      checkAuth()

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        checkAuth()
      })

      return () => {
        subscription?.unsubscribe()
      }
    }
  }, [mounted, supabase])

  async function handleLogout() {
    toast({
      title: t("common.logout"),
      description: t("common.loading"),
    })
    // Sign out globally to terminate all sessions
    await supabase.auth.signOut({ scope: 'global' })
    setUser(null)
    setUserRole(null)
    router.push("/auth/login")
  }

  const getDashboardLink = () => {
    if (userRole === "vendor") return "/vendor/dashboard"
    if (userRole === "admin" || userRole === "super_admin") return "/admin/dashboard"
    return "/protected/dashboard"
  }

  const getDashboardLabel = () => {
    if (userRole === "vendor") return t("navigation.vendor_dashboard") || "Vendor Dashboard"
    if (userRole === "admin" || userRole === "super_admin") return t("navigation.admin_dashboard") || "Admin Dashboard"
    return t("navigation.dashboard") || "Dashboard"
  }

  const showDashboardToast = (dashboardType: string) => {
    toast({
      title: "Navigation",
      description: `You are now accessing the ${dashboardType} Dashboard.`,
    })
  }

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">⚡</div>
            <span className="text-foreground">KG Components</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-foreground hover:text-primary transition">
              {t("common.home")}
            </Link>
            <Link href="/shop" className="text-foreground hover:text-primary transition">
              {t("common.shop")}
            </Link>
            <Link href="/about" className="text-foreground hover:text-primary transition">
              {t("common.about")}
            </Link>
            <Link href="/contact" className="text-foreground hover:text-primary transition">
              {t("common.contact")}
            </Link>
            {user && (
              <Link href="/chat" className="text-foreground hover:text-primary transition">
                {t("common.messages")}
              </Link>
            )}
          </div>

          {/* Right Side Icons */}
          <div className="flex items-center gap-2 md:gap-4">
            {mounted && <LanguageSwitcher />}
            {mounted && <CurrencySwitcher />}

            <Link href="/cart" className="relative p-2 hover:bg-muted rounded transition">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {itemCount}
                </span>
              )}
            </Link>

            {!loading && (
              <>
                {user ? (
                  /* Added profile dropdown menu */
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-2 h-auto">
                        <User className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href={getDashboardLink()} className="flex items-center gap-2 cursor-pointer"
                          onClick={() => showDashboardToast(getDashboardLabel())}>
                          <LayoutDashboard className="w-4 h-4" />
                          {getDashboardLabel()}
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={
                          (pathname || "").startsWith("/admin") ? "/admin/profile" :
                            (pathname || "").startsWith("/seller") ? "/seller/profile" :
                              "/protected/profile"
                        } className="flex items-center gap-2 cursor-pointer">
                          <User className="w-4 h-4" />
                          {t("navigation.profile")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="flex items-center gap-2 cursor-pointer text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        {t("navigation.logout")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-2 h-auto">
                        <User className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 shadow-lg">
                      <DropdownMenuItem asChild>
                        <Link href="/auth/login" className="cursor-pointer">
                          {t("dropdown.login")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/auth/signup" className="cursor-pointer">
                          {t("dropdown.signup")}
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button className="md:hidden p-2 hover:bg-muted rounded transition" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden fixed inset-x-0 top-16 bg-background border-b border-border shadow-xl z-40 transition-all duration-300 ease-in-out transform ${isOpen ? "translate-y-0 opacity-100 visible" : "-translate-y-4 opacity-0 invisible"
            }`}
        >
          <div className="p-4 space-y-2">
            <Link href="/" className="flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-xl transition" onClick={() => setIsOpen(false)}>
              <span className="font-medium">{t("common.home")}</span>
            </Link>
            <Link href="/shop" className="flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-xl transition" onClick={() => setIsOpen(false)}>
              <span className="font-medium">{t("common.shop")}</span>
            </Link>
            <Link href="/about" className="flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-xl transition" onClick={() => setIsOpen(false)}>
              <span className="font-medium">{t("common.about")}</span>
            </Link>
            <Link href="/contact" className="flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-xl transition" onClick={() => setIsOpen(false)}>
              <span className="font-medium">{t("common.contact")}</span>
            </Link>

            {user && (
              <>
                <div className="h-px bg-border my-2 mx-4" />
                <Link href="/chat" className="flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-xl transition" onClick={() => setIsOpen(false)}>
                  <span className="font-medium">{t("common.messages")}</span>
                </Link>
                <Link href={getDashboardLink()} className="flex items-center gap-3 px-4 py-3 bg-primary/5 text-primary hover:bg-primary/10 rounded-xl transition" onClick={() => {
                  setIsOpen(false)
                  showDashboardToast(getDashboardLabel())
                }}>
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="font-semibold">{getDashboardLabel()}</span>
                </Link>
                <Link href={
                  (pathname || "").startsWith("/admin") ? "/admin/profile" :
                    (pathname || "").startsWith("/seller") ? "/seller/profile" :
                      "/protected/profile"
                } className="flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-xl transition" onClick={() => setIsOpen(false)}>
                  <User className="w-5 h-5" />
                  <span className="font-medium">{t("navigation.profile")}</span>
                </Link>
                <button
                  onClick={() => {
                    handleLogout()
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition mt-2"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">{t("navigation.logout")}</span>
                </button>
              </>
            )}

            {!user && !loading && (
              <div className="grid grid-cols-2 gap-4 mt-4 px-2">
                <Link href="/auth/login" className="w-full" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full rounded-xl">
                    {t("dropdown.login")}
                  </Button>
                </Link>
                <Link href="/auth/signup" className="w-full" onClick={() => setIsOpen(false)}>
                  <Button className="w-full rounded-xl">
                    {t("dropdown.signup")}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Backdrop for mobile menu */}
        {isOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/20 z-30"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    </nav>
  )
}
