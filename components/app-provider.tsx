"use client"

import { ReduxProvider } from "@/components/redux-provider"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { ToasterProvider } from "@/components/toaster-provider"

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ToasterProvider />
    </ReduxProvider>
  )
}