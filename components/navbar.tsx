"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  const pathname = useRouter().pathname

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
      title: "Logging Out",
      description: "You are being logged out...",
    })
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
    router.push("/")
  }

  const getDashboardLink = () => {
    if (userRole === "vendor") return "/vendor/dashboard"
    if (userRole === "admin" || userRole === "super_admin") return "/admin/dashboard"
    return "/protected/dashboard"
  }

  const getDashboardLabel = () => {
    if (userRole === "vendor") return "Vendor Dashboard"
    if (userRole === "admin" || userRole === "super_admin") return "Admin Dashboard"
    return "Dashboard"
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
            <span className="text-foreground">KG Compponents</span>
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
          <div className="flex items-center gap-4">
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
                      {pathname !== "/protected/dashboard" && ( // Conditional rendering for user portal
                        <DropdownMenuItem asChild>
                          <Link href="/protected/dashboard" className="flex items-center gap-2 cursor-pointer"
                                onClick={() => showDashboardToast("User Portal")}>
                            <LayoutDashboard className="w-4 h-4" />
                            {t("dropdown.dashboard")}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {userRole === "admin" || userRole === "super_admin" ? (
                        pathname !== "/admin/dashboard" && ( // Conditional rendering for admin dashboard
                          <DropdownMenuItem asChild>
                            <Link href="/admin/dashboard" className="flex items-center gap-2 cursor-pointer"
                                  onClick={() => showDashboardToast("Admin")}>
                            <LayoutDashboard className="w-4 h-4" />
                            {t("dropdown.dashboard")}
                          </Link>
                          </DropdownMenuItem>
                        )
                      ) : null}
                      {userRole === "vendor" ? (
                        pathname !== "/seller/dashboard" && ( // Conditional rendering for vendor dashboard
                          <DropdownMenuItem asChild>
                            <Link href="/seller/dashboard" className="flex items-center gap-2 cursor-pointer"
                                  onClick={() => showDashboardToast("Vendor Admin")}>
                            <LayoutDashboard className="w-4 h-4" />
                            {t("dropdown.dashboard")}
                          </Link>
                          </DropdownMenuItem>
                        )
                      ) : null}

                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                          <Link href={
                              (pathname || "").startsWith("/admin") ? "/admin/profile" :
                              (pathname || "").startsWith("/seller") ? "/seller/profile" :
                              "/protected/profile"
                            } className="flex items-center gap-2 cursor-pointer">
                            <User className="w-4 h-4" />
                            {t("dropdown.profile")}
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="flex items-center gap-2 cursor-pointer text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        {t("dropdown.logout")}
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
        {isOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-2">
            <Link href="/" className="block px-2 py-2 hover:bg-muted rounded transition">
              {t("common.home")}
            </Link>
            <Link href="/shop" className="block px-2 py-2 hover:bg-muted rounded transition">
              {t("common.shop")}
            </Link>
            <Link href="/about" className="block px-2 py-2 hover:bg-muted rounded transition">
              {t("common.about")}
            </Link>
            <Link href="/contact" className="block px-2 py-2 hover:bg-muted rounded transition">
              {t("common.contact")}
            </Link>
            {user && (
              <>
                <Link href="/chat" className="block px-2 py-2 hover:bg-muted rounded transition">
                  {t("common.messages")}
                </Link>
                <Link href={getDashboardLink()} className="block px-2 py-2 hover:bg-muted rounded transition">
                  {getDashboardLabel()}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
