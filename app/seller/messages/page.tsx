"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ConversationList } from "@/components/chat/conversation-list"
import { useLanguage } from "@/lib/context/language-context"

export default function SellerMessagesPage() {
    const supabase = createClient()
    const { t } = useLanguage()
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setUserId(user.id)
        }
        getUser()
    }, [supabase])

    if (!userId) return null

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-2">{t("chat.title")}</h1>
            <p className="text-muted-foreground mb-8">{t("chat.subtitle")}</p>
            <ConversationList currentUserId={userId} basePath="/seller/messages" />
        </div>
    )
}
