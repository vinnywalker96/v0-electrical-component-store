"use client"

import type React from "react"

import { useState } from "react"
import { Provider } from "react-redux"
import { makeStore, type AppStore } from "./store"

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => makeStore())

  return <Provider store={store}>{children}</Provider>
}
