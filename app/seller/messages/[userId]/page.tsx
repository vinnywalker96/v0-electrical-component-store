import { ChatPageContent } from "@/components/chat/chat-page-content"

export default async function SellerIndividualMessagePage({
    params,
    searchParams,
}: {
    params: { userId: string }
    searchParams: { product?: string }
}) {
    return <ChatPageContent params={params} searchParams={searchParams} basePath="/seller/messages" />
}
