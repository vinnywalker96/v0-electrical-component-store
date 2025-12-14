"use client"

import { toast as sonnerToast } from "sonner"
// import * as React from "react" // Not strictly needed for this simple version

export function useToast() {
  return {
    toast: sonnerToast,
    // You can also expose dismiss and other methods if needed
    // dismiss: sonnerToast.dismiss,
    // update: sonnerToast.update,
    // promise: sonnerToast.promise,
    // success: sonnerToast.success,
    // error: sonnerToast.error,
    // info: sonnerToast.info,
    // warning: sonnerToast.warning,
    // loading: sonnerToast.loading,
  }
}