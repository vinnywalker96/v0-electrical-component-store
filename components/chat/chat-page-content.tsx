import { redirect } from "next/navigation"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { ChatInterface } from "@/components/chat-interface"
import { getMessagesForChat } from "@/app/actions/chat"

interface PageProps {
    params: Promise<{ userId: string }>
    searchParams: Promise<{ product?: string }>
    basePath: string
}

export async function ChatPageContent({ params: paramsPromise, searchParams: searchParamsPromise, basePath }: PageProps) {
    const params = await paramsPromise
    const searchParams = await searchParamsPromise
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect("/auth/login")

    // Get other user profile securely
    const adminSupabase = createAdminClient()
    
    // First, try to resolve otherUser as a profile ID
    let otherUserResult = await adminSupabase.from("profiles").select("*").eq("id", params.userId).single()
    let otherUser = otherUserResult.data

    if (!otherUser) {
        // If not a profile ID, check if it's a seller ID and get the associated profile
        const { data: seller } = await adminSupabase.from("sellers").select("user_id").eq("id", params.userId).single()
        if (seller) {
            const { data: profile } = await adminSupabase.from("profiles").select("*").eq("id", seller.user_id).single()
            otherUser = profile
        }
    }

    if (!otherUser) redirect(basePath)

    // Get product if provided
    let product = null
    if (searchParams.product) {
        const { data: productData } = await supabase.from("products").select("*").eq("id", searchParams.product).single()
        product = productData
    }

    // Get initial messages via server action to avoid schema mismatches and RLS issues
    const chatData = await getMessagesForChat(user.id, params.userId, searchParams.product || null)
    const initialMessages = chatData?.messages || []

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
