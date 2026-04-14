"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Send, Package, UserCircle2 } from "lucide-react"
import { useLanguage } from "@/lib/context/language-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { sendMessage as sendMessageAction, getMessagesForChat } from "@/app/actions/chat"



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
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
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

  // Initialize conversation ID and subscription
  useEffect(() => {
    const initChat = async () => {
       const result = await getMessagesForChat(currentUserId, otherUser.id, product?.id || null)
       if (result && result.conversation_id) {
          setActiveConversationId(result.conversation_id)
          if (result.messages) setMessages(result.messages)
       }
    }
    initChat()
  }, [currentUserId, otherUser.id, product?.id])

  useEffect(() => {
    if (!activeConversationId) return

    const channel = supabase
      .channel(`chat_${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`
        },
        (payload) => {
          const msg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })

          // Mark as read if from other user
          if (msg.sender_id !== currentUserId) {
            supabase.from("messages").update({ is_read: true }).eq("id", msg.id)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, activeConversationId, supabase])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    const optimisticMessage = newMessage
    setNewMessage("")
    try {
      const { data, error } = await sendMessageAction(
        currentUserId,
        otherUser.id,
        product?.id || null,
        optimisticMessage.trim()
      )

      if (error) throw new Error(error)

      if (data) {
        setMessages((prev) => {
           if (prev.some(m => m.id === data.id)) return prev;
           return [...prev, data]
        })
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setNewMessage(optimisticMessage) // revert if failed
    } finally {
      setSending(false)
      scrollToBottom()
    }
  }

  // Always use first_name + last_name, fall back to localized 'User' if strictly empty to avoid showing emails
  const otherUserName = (otherUser.first_name || otherUser.last_name) 
    ? `${otherUser.first_name || ""} ${otherUser.last_name || ""}`.trim()
    : otherUser.full_name || t("chat.user_fallback") || "Support"

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[800px] w-full max-w-5xl mx-auto rounded-lg overflow-hidden border border-border bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Link href={basePath || "/protected/messages"} className="p-2 -ml-2 rounded-md hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
             <Avatar className="h-10 w-10 border border-slate-200">
                <AvatarImage src={otherUser.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {otherUserName.charAt(0).toUpperCase()}
                </AvatarFallback>
             </Avatar>
            <div>
              <h2 className="text-lg font-semibold leading-tight">{otherUserName}</h2>
              {product && (
                <Link href={`/shop/${product.id}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors mt-0.5">
                  <Package className="w-3 h-3" />
                  Re: {product.name}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 bg-white p-6 flex flex-col">
        <div className="space-y-6 max-w-4xl mx-auto w-full pb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground space-y-3">
               <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle2 className="w-6 h-6 text-primary" />
               </div>
               <p>{t("chat.no_messages_conversation")}</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.sender_id === currentUserId
              const showAvatar = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                >
                  {!isMine && (
                      <div className="w-8 shrink-0">
                        {showAvatar && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-semibold">
                                {otherUserName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                  )}

                  <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[75%]`}>
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                            isMine
                          ? "bg-slate-900 text-white rounded-br-sm"
                          : "bg-slate-100 text-slate-900 rounded-bl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content || (msg as any).message}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground mt-1 mx-1 font-medium px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 bg-white border-t shrink-0">
        <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto relative items-center">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t("chat.type_message")}
            className="flex-1 bg-white border-slate-300 focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:border-slate-400 rounded-full pl-5 pr-14 py-6 text-[15px]"
            disabled={sending}
          />
          <Button 
            type="submit" 
            disabled={sending || !newMessage.trim()} 
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Send className="h-4 w-4 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  )
}
