import dynamic from "next/dynamic"

// ... (other imports)

const DynamicToaster = dynamic(() => import("@/components/ui/toaster").then((mod) => mod.Toaster), { ssr: false })

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
            <DynamicToaster />
        </ReduxProvider>
        <Analytics />
      </body>
    </html>
  )
}
