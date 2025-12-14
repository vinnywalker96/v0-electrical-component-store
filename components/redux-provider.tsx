"use client"

import { Provider } from "react-redux"
import { store } from "@/lib/store"
import { Toaster } from "@/components/ui/toaster"
import React from "react" // Ensure React is imported for JSX

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      {children}
      <Toaster />
    </Provider>
  )
}
