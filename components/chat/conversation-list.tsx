import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Clock, Package, ChevronRight } from "lucide-react"
import { useLanguage } from "@/lib/context/language-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { getConversations, getAdminId } from "@/app/actions/chat"

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
    const [adminId, setAdminId] = useState<string | null>(null)

    const fetchConversations = async () => {
        const formattedConvs = await getConversations(currentUserId)

        if (formattedConvs) {
            setConversations(formattedConvs)
        }

        // Also fetch an admin id for the empty state fallback
        const adminIdData = await getAdminId()
        if (adminIdData) {
             setAdminId(adminIdData)
        }

        setLoading(false)
    }

    useEffect(() => {
        fetchConversations()

        // Subscribe to messages changes for the conversation list update
        const channel = supabase
            .channel("conversation_list_channel")
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
        return (
            <Card className="border-border shadow-sm">
                 <CardContent className="p-12 flex flex-col items-center justify-center space-y-4">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                     <p className="text-muted-foreground">{t("common.loading")}</p>
                 </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b pb-5">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <MessageSquare className="h-6 w-6 text-primary" />
                    {t("chat.your_conversations")}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                   {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
                </p>
            </CardHeader>
            <CardContent className="p-0">
                {conversations.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                             <MessageSquare className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{t("chat.no_messages")}</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{t("chat.no_messages_conversation")}</p>
                        {adminId ? (
                             <Link href={`${basePath}/${adminId}`} className="inline-flex items-center justify-center bg-primary text-primary-foreground font-medium px-6 py-2.5 rounded-md hover:bg-primary/90 transition-colors shadow-sm">
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Contact Support
                             </Link>
                        ) : (
                             <Link href="/shop" className="inline-flex items-center justify-center bg-primary text-primary-foreground font-medium px-6 py-2.5 rounded-md hover:bg-primary/90 transition-colors shadow-sm">
                                  {t("chat.browse_start")}
                             </Link>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {conversations.map((conv) => {
                            const otherUserName = (conv.otherUser?.first_name || conv.otherUser?.last_name)
                                ? `${conv.otherUser.first_name || ""} ${conv.otherUser.last_name || ""}`.trim()
                                : conv.otherUser?.full_name || t("chat.user_fallback") || "User";
                            return (
                                <Link
                                    key={`${conv.otherUserId}-${conv.productId}`}
                                    href={`${basePath}/${conv.otherUserId}${conv.productId && conv.productId !== "general" ? `?product=${conv.productId}` : ""}`}
                                    className="group block"
                                >
                                    <div className="flex items-center gap-4 p-5 hover:bg-muted/50 transition duration-200">
                                        <div className="relative shrink-0">
                                            <Avatar className="h-14 w-14 border border-border shadow-sm group-hover:border-primary/30 transition-colors">
                                                <AvatarImage src={conv.otherUser?.avatar_url} />
                                                <AvatarFallback className="bg-primary/5 text-primary text-lg font-medium">
                                                    {otherUserName.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {conv.unreadCount > 0 && (
                                                <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold border-2 border-background shadow-sm">
                                                    {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <p className="font-semibold text-[15px] text-foreground truncate pr-4">
                                                    {otherUserName}
                                                </p>
                                                <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0 font-medium tracking-wide w-max">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true })}
                                                </span>
                                            </div>
                                            {conv.product && (
                                                <div className="flex items-center gap-1.5 text-xs text-primary mb-1.5 font-medium">
                                                    <Package className="w-3.5 h-3.5" />
                                                    <span className="truncate">Re: {conv.product.name}</span>
                                                </div>
                                            )}
                                            <p className={`text-sm line-clamp-1 ${conv.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                                {conv.lastMessage}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors ml-2">
                                             <ChevronRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
