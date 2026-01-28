import { ChatPageContent } from "@/components/chat/chat-page-content"

export default async function ProtectedIndividualMessagePage({
    params,
    searchParams,
}: {
    params: { userId: string }
    searchParams: { product?: string }
}) {
    return <ChatPageContent params={params} searchParams={searchParams} basePath="/protected/messages" />
}
