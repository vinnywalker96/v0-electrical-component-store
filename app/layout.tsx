import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { ReduxProvider } from "@/components/redux-provider" // Import the new client wrapper
const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "KG Compponents - Electrical Components Store",
  description: "Professional quality electrical and electronic components for professionals and makers",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased flex flex-col min-h-screen`}>
        <ReduxProvider> {/* Wrap with custom client provider */}
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
        </ReduxProvider>
        <Analytics />
      </body>
    </html>
  )
}
