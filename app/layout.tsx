import { ToasterProvider } from "@/components/toaster-provider"

// ... (other imports)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased flex flex-col min-h-screen`}>
        <ReduxProvider> {/* Wrap with custom client provider */}
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <ToasterProvider />
        </ReduxProvider>
        <Analytics />
      </body>
    </html>
  )
}
