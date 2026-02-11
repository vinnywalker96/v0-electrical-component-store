import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route to proxy translation requests to MyMemory API
 * This avoids CORS issues when calling the API from the browser
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const text = searchParams.get('q')
        const langpair = searchParams.get('langpair')

        if (!text || !langpair) {
            return NextResponse.json(
                { error: 'Missing required parameters: q and langpair' },
                { status: 400 }
            )
        }

        // Call MyMemory API from server-side (no CORS issues)
        const encodedText = encodeURIComponent(text)
        const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${langpair}`

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`Translation API error: ${response.status}`)
        }

        const data = await response.json()

        return NextResponse.json(data)
    } catch (error) {
        console.error('Translation API proxy error:', error)
        return NextResponse.json(
            { error: 'Translation failed' },
            { status: 500 }
        )
    }
}
