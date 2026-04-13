"use server"

import { createAdminClient } from "@/lib/supabase/server"

// Get an admin-owned seller ID to route the standard contact button to
export async function getSupportSellerId() {
    try {
        const supabase = createAdminClient()
        // 1. Find a super_admin or admin
        const { data: admin } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['admin', 'super_admin'])
            .limit(1)
            .single()
        
        if (!admin) return null

        // 2. Find the seller record for this admin
        const { data: seller } = await supabase
            .from('sellers')
            .select('id')
            .eq('user_id', admin.id)
            .single()

        return seller?.id || null
    } catch (e) {
        console.error("Error getting support seller ID:", e)
        return null
    }
}

// Deprecated: getAdminId (use getSupportSellerId instead for better schema matching)
export async function getAdminId() {
    try {
        const supabase = createAdminClient()
        const { data } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['admin', 'super_admin'])
            .limit(1)
            .single()
        
        return data?.id || null
    } catch (e) {
        console.error("Error getting admin ID:", e)
        return null
    }
}

// Get conversations for a user, bypassing RLS to correctly fetch profiles
export async function getConversations(userId: string) {
    try {
        const supabase = createAdminClient()
        
        // Check if the requesting user is an admin
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
        const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

        // Fetch conversations
        let query = supabase
            .from("conversations")
            .select(`
                *,
                buyer:profiles!conversations_buyer_id_fkey(id, first_name, last_name, email, avatar_url, role),
                seller_profile:profiles!conversations_seller_id_fkey(id, first_name, last_name, email, avatar_url, role),
                messages (id, content, is_read, created_at, sender_id),
                product:products(name, id)
            `)

        // If not admin, restrict to their own messages
        if (!isAdmin) {
             query = query.or(`buyer_id.eq.${userId},seller_id.in.(select id from sellers where user_id = '${userId}')`)
        }

        const { data, error } = await query
        
        if (error || !data) {
            console.error("Supabase query error:", error)
            return []
        }

        // Format to match the expected interface structure for ConversationList
        const formatted = data.map((conv: any) => {
            const isBuyer = conv.buyer_id === userId
            
            // For admins, we usually show the buyer (customer)
            // For customers, we show the seller (or support admin)
            const otherUserRaw = isAdmin ? conv.buyer : (isBuyer ? conv.seller_profile : conv.buyer)
            
            // Construct full name from first/last
            const otherUser = otherUserRaw ? {
                ...otherUserRaw,
                full_name: otherUserRaw.first_name && otherUserRaw.last_name 
                    ? `${otherUserRaw.first_name} ${otherUserRaw.last_name}`.trim()
                    : (otherUserRaw.first_name || otherUserRaw.last_name || "").trim()
            } : null

            // Get latest message
            const sortedMessages = (conv.messages || []).sort((a: any, b: any) => 
                 new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            const latestMessage = sortedMessages[0]
            
            // Unread count
            const unreadCount = conv.messages?.filter((m: any) => !m.is_read && m.sender_id !== userId).length || 0

            return {
                id: conv.id,
                otherUser,
                otherUserId: otherUser?.id,
                product: conv.product,
                productId: conv.product_id,
                lastMessage: latestMessage?.content || "",
                lastMessageTime: latestMessage?.created_at || conv.created_at,
                unreadCount
            }
        }).sort((a: any, b: any) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())
            
        return formatted
    } catch (e) {
        console.error("Error getting conversations:", e)
        return []
    }
}

// Send a message securely from the server
export async function sendMessage(sender_id: string, receiver_id: string, product_id: string | null, message: string) {
    try {
        const supabase = createAdminClient()
        
        // 1. Resolve receiver_seller_id correctly
        // The frontend might pass a Profile ID or a Seller ID. 
        // conversations.seller_id ALWAYS expects a sellers.id (PK of sellers table).
        let sellerId = receiver_id
        const { data: isSeller } = await supabase.from('sellers').select('id').eq('id', receiver_id).single()
        
        if (!isSeller) {
            // If it's not a seller ID, check if it's a profile ID that HAS a seller record
            const { data: foundSeller } = await supabase.from('sellers').select('id').eq('user_id', receiver_id).single()
            if (foundSeller) {
                sellerId = foundSeller.id
            } else {
                // If it's a customer-to-customer chat (rare in this app), seller_id constraint still applies to sellers table.
                // For this app, we assume routing to a seller/support.
                return { error: `Receiver ID ${receiver_id} is not associated with any Seller profile.` }
            }
        }

        // 2. Find or create conversation
        let { data: convData } = await supabase.from('conversations')
            .select('id')
            .or(`and(buyer_id.eq.${sender_id},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${sender_id})`)
            .limit(1).single()

        if (!convData) {
            const { data: newConv, error: convErr } = await supabase.from('conversations').insert({
                buyer_id: sender_id,
                seller_id: sellerId,
                product_id: product_id || null,
            }).select('id').single()
            if (convErr) {
                console.error("Conversation creation error:", convErr)
                return { error: JSON.stringify(convErr) }
            }
            convData = newConv
        }

        const conversation_id = convData?.id
        if (!conversation_id) return { error: "Failed to resolve conversation ID" }

        // 2. Insert message
        const { data, error } = await supabase.from("messages").insert({
            conversation_id,
            sender_id,
            content: message,
            message_type: 'text',
            is_read: false,
        }).select().single()

        if (error) {
            console.error("Supabase message insert error:", error)
            return { error: JSON.stringify(error) }
        }
        
        // Update last message timestamp
        await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation_id)
        
        return { data }
    } catch (e) {
        console.error("Server action error sending message:", e)
        return { error: String(e) }
    }
}

// Fetch global unread count for notifications
export async function getUnreadCount(userId: string) {
    try {
        const supabase = createAdminClient()
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
        
        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
             // For admins, monitor all conversations where a seller is an admin
             const { data: admins } = await supabase.from('profiles').select('id').in('role', ['admin', 'super_admin'])
             const adminUserIds = (admins || []).map(a => a.id)
             if (adminUserIds.length === 0) return 0
             
             const { data: adminSellers } = await supabase.from('sellers').select('id').in('user_id', adminUserIds)
             const adminSellerIds = (adminSellers || []).map(s => s.id)
             if (adminSellerIds.length === 0) return 0

             const { data: convs } = await supabase.from('conversations').select('id').in('seller_id', adminSellerIds)
             const convIds = (convs || []).map(c => c.id)
             if (convIds.length === 0) return 0

             const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true })
                 .in('conversation_id', convIds)
                 .neq('sender_id', userId)
                 .eq('is_read', false)
                 
             return count || 0
        } else {
             // For customers, monitor their conversations
             const { data: convs } = await supabase.from('conversations').select('id').eq('buyer_id', userId)
             const convIds = (convs || []).map(c => c.id)
             if (convIds.length === 0) return 0

             const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true })
                 .in('conversation_id', convIds)
                 .neq('sender_id', userId)
                 .eq('is_read', false)
                 
             return count || 0
        }
    } catch (e) {
        console.error("Error getting unread count:", e)
        return 0
    }
}

// Get messages for a specific chat UI
export async function getMessagesForChat(userId: string, otherId: string, productId: string | null) {
    try {
        const supabase = createAdminClient()
        
        // 1. Locate conversation (using sellers table check for otherId if it's a seller)
        // First, check if otherId is a profile OR seller
        let sellerId = otherId
        let { data: isSeller } = await supabase.from('sellers').select('id').eq('id', otherId).single()
        
        if (!isSeller) {
            // Check if it's a user_id from profiles and find their seller record
            const { data: foundSeller } = await supabase.from('sellers').select('id').eq('user_id', otherId).single()
            if (foundSeller) sellerId = foundSeller.id
        }

        let { data: convData } = await supabase.from('conversations')
            .select('id')
            .or(`and(buyer_id.eq.${userId},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${userId})`)
            .limit(1).single()
            
        if (!convData) return { messages: [], conversation_id: null }
        
        const { data: messages, error } = await supabase.from('messages')
             .select('*')
             .eq('conversation_id', convData.id)
             .order('created_at', { ascending: true })
             
        if (error) return { error: JSON.stringify(error) }
        
        return { messages: messages || [], conversation_id: convData.id }
    } catch (e) {
        console.error("Error getting messages for chat:", e)
        return { error: String(e) }
    }
}

