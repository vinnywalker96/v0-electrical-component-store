import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ChatInterface } from "@/components/chat-interface"

export default async function ChatWithUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ product?: string }>
}) {
  const { userId } = await params
  const { product: productId } = await searchParams

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get other user's profile
  const { data: otherUser } = await supabase.from("user_profiles").select("*").eq("user_id", userId).single()

  if (!otherUser) notFound()

  // Get product info if provided
  let product = null
  if (productId) {
    const { data: productData } = await supabase.from("products").select("*").eq("id", productId).single()
    product = productData
  }

  // Get conversation messages
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
    .eq("product_id", productId || null)
    .order("created_at", { ascending: true })

  // Mark messages as read
  await supabase.from("messages").update({ is_read: true }).eq("receiver_id", user.id).eq("sender_id", userId)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <ChatInterface currentUserId={user.id} otherUser={otherUser} product={product} initialMessages={messages || []} />
    </div>
  )
}
