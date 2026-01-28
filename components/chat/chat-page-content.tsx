import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ChatInterface } from "@/components/chat-interface"

interface PageProps {
    params: { userId: string }
    searchParams: { product?: string }
    basePath: string
}

export async function ChatPageContent({ params, searchParams, basePath }: PageProps) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect("/auth/login")

    // Get other user profile
    const { data: otherUser } = await supabase.from("user_profiles").select("*").eq("user_id", params.userId).single()

    if (!otherUser) redirect(basePath)

    // Get product if provided
    let product = null
    if (searchParams.product) {
        const { data: productData } = await supabase.from("products").select("*").eq("id", searchParams.product).single()
        product = productData
    }

    // Get initial messages
    const { data: initialMessages } = await supabase
        .from("messages")
        .select("*")
        .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${params.userId}),and(sender_id.eq.${params.userId},receiver_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <ChatInterface
                currentUserId={user.id}
                otherUser={otherUser}
                product={product}
                initialMessages={initialMessages || []}
                basePath={basePath}
            />
        </div>
    )
}
