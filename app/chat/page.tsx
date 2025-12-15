import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"
import Link from "next/link"

export default async function ChatPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get all conversations for this user
  const { data: messages } = await supabase
    .from("messages")
    .select(
      `
      *,
      sender:user_profiles!messages_sender_id_fkey(first_name, last_name, email),
      receiver:user_profiles!messages_receiver_id_fkey(first_name, last_name, email),
      product:products(name, id)
    `,
    )
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false })

  // Group messages by conversation (other user + product)
  const conversationsMap = new Map()
  messages?.forEach((msg: any) => {
    const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
    const key = `${otherUserId}-${msg.product_id || "general"}`

    if (!conversationsMap.has(key)) {
      conversationsMap.set(key, {
        otherUser: msg.sender_id === user.id ? msg.receiver : msg.sender,
        otherUserId,
        product: msg.product,
        productId: msg.product_id,
        lastMessage: msg.message,
        lastMessageTime: msg.created_at,
        unreadCount: msg.receiver_id === user.id && !msg.is_read ? 1 : 0,
      })
    } else {
      const conv = conversationsMap.get(key)
      if (msg.receiver_id === user.id && !msg.is_read) {
        conv.unreadCount++
      }
    }
  })

  const conversations = Array.from(conversationsMap.values())

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Messages</h1>
      <p className="text-muted-foreground mb-8">Chat with buyers and sellers</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Your Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No messages yet</p>
              <Link href="/shop" className="text-primary hover:underline">
                Browse products and start a conversation
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {conversations.map((conv) => (
                <Link
                  key={`${conv.otherUserId}-${conv.productId}`}
                  href={`/chat/${conv.otherUserId}${conv.productId ? `?product=${conv.productId}` : ""}`}
                  className="block"
                >
                  <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold">
                          {conv.otherUser?.first_name || conv.otherUser?.email?.split("@")[0] || "User"}
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
    </div>
  )
}
