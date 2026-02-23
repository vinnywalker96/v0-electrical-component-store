import type React from "react"
import type { Metadata } from "next"

import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { CartProvider } from "@/lib/context/cart-context"
import { LanguageProvider } from "@/lib/context/language-context"
import StoreProvider from "@/lib/store/StoreProvider"
import { MainLayout } from "@/components/main-layout"
import { CurrencyProvider } from "@/lib/context/currency-context"

export const metadata: Metadata = {
  title: "KG Components - Electrical Components Store",
  description:
    "Professional quality electrical and electronic components for professionals and makers"
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="overflow-x-hidden w-full max-w-[100vw]">
      <body className={`font-sans antialiased flex flex-col min-h-screen overflow-x-hidden w-full max-w-[100vw]`}>
        <StoreProvider>
          <LanguageProvider>
            <CartProvider>
              <CurrencyProvider>
                <MainLayout>{children}</MainLayout>
              </CurrencyProvider>
            </CartProvider>
          </LanguageProvider>
        </StoreProvider>
        <Analytics />
      </body>
    </html>
  )
}
