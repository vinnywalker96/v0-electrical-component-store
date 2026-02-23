import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const res = await fetch("https://open.er-api.com/v6/latest/ZAR", {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch from open.er-api.com: ${res.status}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Currency proxy error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
