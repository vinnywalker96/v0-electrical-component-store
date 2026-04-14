"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell } from "lucide-react"
import Link from "next/link"
import { getUnreadCount as fetchGlobalUnreadAction } from "@/app/actions/chat"

export function NotificationIcon() {
  const supabase = createClient()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnreadCount = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const count = await fetchGlobalUnreadAction(user.id)
        setUnreadCount(count || 0)
      }
    }

    fetchUnreadCount()

    const channel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          fetchUnreadCount()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <Link href="/protected/messages" className="relative">
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-xs">
          {unreadCount}
        </div>
      )}
    </Link>
  )
}
