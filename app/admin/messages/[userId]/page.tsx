import { ChatPageContent } from "@/components/chat/chat-page-content"

export default async function AdminIndividualMessagePage({
    params,
    searchParams,
}: {
    params: Promise<{ userId: string }>
    searchParams: Promise<{ product?: string }>
}) {
    return <ChatPageContent params={params} searchParams={searchParams} basePath="/admin/messages" />
}
