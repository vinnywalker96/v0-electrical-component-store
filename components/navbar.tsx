"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Menu, X, ShoppingCart, User, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useCart } from "@/lib/context/cart-context"
import { useLanguage } from "@/lib/context/language-context"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { itemCount } = useCart()
  const { t } = useLanguage()

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

          setIsAdmin(profile?.role === "admin" || profile?.role === "super_admin")
        }
      } catch (error) {
        console.error("Auth check error:", error)
      } finally {
        setLoading(false)
      }
    }

    if (mounted) {
      checkAuth()

      // Listen for auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        checkAuth()
      })

      return () => {
        subscription?.unsubscribe()
      }
    }
  }, [mounted])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    router.push("/")
  }

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">⚡</div>
            {/* Renamed to KG Components */}
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
            <Link href="/faq" className="text-foreground hover:text-primary transition">
              {t("common.faq")}
            </Link>
            <Link href="/contact" className="text-foreground hover:text-primary transition">
              {t("common.contact")}
            </Link>
            {isAdmin && (
              <Link href="/admin/dashboard" className="text-foreground hover:text-primary transition font-semibold">
                {t("common.admin")}
              </Link>
            )}
          </div>

          {/* Right Side Icons */}
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <LanguageSwitcher />

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
                  <div className="flex items-center gap-2">
                    <Link href="/protected/dashboard" className="p-2 hover:bg-muted rounded transition">
                      <User className="w-5 h-5" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="hidden sm:flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      {t("common.logout")}
                    </Button>
                  </div>
                ) : (
                  <Link href="/auth/login" className="p-2 hover:bg-muted rounded transition">
                    <User className="w-5 h-5" />
                  </Link>
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
            <Link href="/faq" className="block px-2 py-2 hover:bg-muted rounded transition">
              {t("common.faq")}
            </Link>
            <Link href="/contact" className="block px-2 py-2 hover:bg-muted rounded transition">
              {t("common.contact")}
            </Link>
            {isAdmin && (
              <Link href="/admin/dashboard" className="block px-2 py-2 hover:bg-muted rounded transition font-semibold">
                {t("common.admin")}
              </Link>
            )}
            {user && (
              <button
                onClick={handleLogout}
                className="block w-full text-left px-2 py-2 hover:bg-muted rounded transition text-red-600"
              >
                {t("common.logout")}
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
