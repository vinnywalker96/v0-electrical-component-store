"use client"

import type React from "react"
import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { createClient } from "@/lib/supabase/client"

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isDashboard =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/seller") ||
    pathname.startsWith("/protected") ||
    pathname.startsWith("/chat")

  const supabase = createClient()

  useEffect(() => {
    const checkSessionTimeout = () => {
      const lastActivity = localStorage.getItem("last-activity")
      if (lastActivity) {
        const twentyFourHours = 24 * 60 * 60 * 1000
        if (Date.now() - parseInt(lastActivity, 10) > twentyFourHours) {
          supabase.auth.signOut()
        }
      }
    }

    const updateLastActivity = () => {
      localStorage.setItem("last-activity", Date.now().toString())
    }

    // Check on initial load
    checkSessionTimeout()

    // Set up listeners to update activity timestamp
    window.addEventListener("mousemove", updateLastActivity)
    window.addEventListener("keydown", updateLastActivity)
    window.addEventListener("scroll", updateLastActivity)
    window.addEventListener("click", updateLastActivity)

    // Set up a periodic check
    const interval = setInterval(checkSessionTimeout, 60 * 1000) // every minute

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(event => {
      if (event === "SIGNED_IN") {
        updateLastActivity()
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem("last-activity")
        if (isDashboard) {
          router.push("/auth/login")
        }
      }
    })

    return () => {
      window.removeEventListener("mousemove", updateLastActivity)
      window.removeEventListener("keydown", updateLastActivity)
      window.removeEventListener("scroll", updateLastActivity)
      window.removeEventListener("click", updateLastActivity)
      clearInterval(interval)
      subscription.unsubscribe()
    }
  }, [supabase, router, isDashboard])

  if (isDashboard) {
    return <>{children}</>
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
