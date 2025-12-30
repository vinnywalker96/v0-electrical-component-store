import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
    try {
        const supabase = await createServerClient()
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (!currentUser) {
            return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", currentUser.id).single()

        if (profile?.role !== "super_admin" && profile?.role !== "admin") {
            return Response.json({ error: "Forbidden" }, { status: 403 })
        }
        
        const { data: sellers, error } = await supabase.from("sellers").select("*")

        if (error) {
            return Response.json({ error: error.message }, { status: 400 })
        }
        
        // Explicitly fetch profiles for each seller
        const sellersWithProfiles = await Promise.all(sellers.map(async (seller) => {
            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", seller.user_id)
                .single();
            
            if (profileError) {
                console.warn(`[v0] Could not fetch profile for seller ${seller.id}:`, profileError.message);
                return { ...seller, profile: null }; // Return seller with null profile
            }
            return { ...seller, profile: profileData };
        }));
        
        return Response.json({ sellers: sellersWithProfiles })

    } catch (error) {
        console.error("[v0] Error:", error)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createServerClient()
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (!currentUser) {
            return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", currentUser.id).single()

        if (profile?.role !== "super_admin" && profile?.role !== "admin") {
            return Response.json({ error: "Forbidden" }, { status: 403 })
        }

        const { sellerId, status } = await request.json()

        const { error } = await supabase
            .from("sellers")
            .update({ verification_status: status })
            .eq("id", sellerId)

        if (error) {
            return Response.json({ error: error.message }, { status: 400 })
        }

        return Response.json({ success: true, message: "Seller status updated" })

    } catch (error) {
        console.error("[v0] Error:", error)
        return Response.json({ error: "Internal server error" }, { status: 500 })
    }
}
