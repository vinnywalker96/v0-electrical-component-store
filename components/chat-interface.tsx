"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Send } from "lucide-react"
import type { Message } from "@/lib/types"
import { useLanguage } from "@/lib/context/language-context"

interface ChatInterfaceProps {
  currentUserId: string
  otherUser: any
  product: any
  initialMessages: Message[]
  basePath?: string
}

export function ChatInterface({ currentUserId, otherUser, product, initialMessages, basePath }: ChatInterfaceProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as Message
          if (
            (msg.sender_id === currentUserId && msg.receiver_id === otherUser.user_id) ||
            (msg.sender_id === otherUser.user_id && msg.receiver_id === currentUserId)
          ) {
            setMessages((prev) => [...prev, msg])

            // Mark as read if from other user
            if (msg.sender_id === otherUser.user_id) {
              supabase.from("messages").update({ is_read: true }).eq("id", msg.id)
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, otherUser.user_id, supabase, setMessages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: currentUserId,
        receiver_id: otherUser.user_id,
        product_id: product?.id || null,
        message: newMessage.trim(),
        is_read: false,
      })

      if (error) throw error

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <Link href={basePath || "/chat"} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />
        {t("chat.back_to_messages")}
      </Link>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">
                {otherUser.first_name || otherUser.email?.split("@")[0] || t("chat.user_fallback")}
              </p>
              {product && (
                <Link href={`/shop/${product.id}`} className="text-sm text-muted-foreground hover:text-primary">
                  Re: {product.name}
                </Link>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Messages */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">{t("chat.no_messages_conversation")}</div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${msg.sender_id === currentUserId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                      }`}
                  >
                    <p className="text-sm break-words">{msg.message}</p>
                    <p className="text-xs mt-1 opacity-70">{new Date(msg.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSend} className="border-t p-4 flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t("chat.type_message")}
              className="flex-1"
              disabled={sending}
            />
            <Button type="submit" disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
