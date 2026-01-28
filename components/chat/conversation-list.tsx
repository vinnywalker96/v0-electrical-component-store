"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"
import { useLanguage } from "@/lib/context/language-context"

interface Conversation {
    otherUser: any
    otherUserId: string
    product: any
    productId: string
    lastMessage: string
    lastMessageTime: string
    unreadCount: number
}

interface ConversationListProps {
    currentUserId: string
    basePath: string // e.g., "/admin/messages", "/seller/messages"
}

export function ConversationList({ currentUserId, basePath }: ConversationListProps) {
    const supabase = createClient()
    const { t } = useLanguage()
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [loading, setLoading] = useState(true)

    const fetchConversations = async () => {
        const { data: messages } = await supabase
            .from("messages")
            .select(`
        *,
        sender:user_profiles!messages_sender_id_fkey(first_name, last_name, email, user_id),
        receiver:user_profiles!messages_receiver_id_fkey(first_name, last_name, email, user_id),
        product:products(name, id)
      `)
            .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
            .order("created_at", { ascending: false })

        if (messages) {
            const convMap = new Map()
            messages.forEach((msg: any) => {
                const otherUserId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id
                const productId = msg.product_id || "general"
                const key = `${otherUserId}-${productId}`

                if (!convMap.has(key)) {
                    convMap.set(key, {
                        otherUser: msg.sender_id === currentUserId ? msg.receiver : msg.sender,
                        otherUserId,
                        product: msg.product,
                        productId: msg.product_id,
                        lastMessage: msg.message,
                        lastMessageTime: msg.created_at,
                        unreadCount: msg.receiver_id === currentUserId && !msg.is_read ? 1 : 0,
                    })
                } else {
                    const conv = convMap.get(key)
                    if (msg.receiver_id === currentUserId && !msg.is_read) {
                        conv.unreadCount++
                    }
                }
            })
            setConversations(Array.from(convMap.values()))
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchConversations()

        // Subscribe to messages changes
        const channel = supabase
            .channel("conversation-list")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "messages",
                },
                () => {
                    fetchConversations()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [currentUserId, supabase])

    if (loading) {
        return <div>{t("common.loading")}</div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {t("chat.your_conversations")}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {conversations.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground mb-4">{t("chat.no_messages")}</p>
                        <Link href="/shop" className="text-primary hover:underline">
                            {t("chat.browse_start")}
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {conversations.map((conv) => (
                            <Link
                                key={`${conv.otherUserId}-${conv.productId}`}
                                href={`${basePath}/${conv.otherUserId}${conv.productId && conv.productId !== "general" ? `?product=${conv.productId}` : ""}`}
                                className="block"
                            >
                                <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <MessageSquare className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-semibold">
                                                {conv.otherUser?.first_name || conv.otherUser?.email?.split("@")[0] || t("chat.user_fallback")}
                                            </p>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(conv.lastMessageTime).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {conv.product && <p className="text-sm text-muted-foreground mb-1">Re: {conv.product.name}</p>}
                                        <p className="text-sm text-muted-foreground line-clamp-1">{conv.lastMessage}</p>
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <div className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-semibold">
                                            {conv.unreadCount}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
