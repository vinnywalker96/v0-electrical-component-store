"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/context/language-context"

interface Seller {
    id: string
    store_name: string
    contact_email: string
    verification_status: string
    is_blocked?: boolean
    profile: {
        first_name: string
        last_name: string
        email: string
    } | null
}

export default function AdminVendorsPage() {
    const [sellers, setSellers] = useState<Seller[]>([])
    const [loading, setLoading] = useState(true)
    // const [error, setError] = useState("")
    const { t } = useLanguage()

    useEffect(() => {
        const fetchSellers = async () => {
            try {
                const response = await fetch("/api/admin/vendors")
                const data = await response.json()
                if (!response.ok) {
                    throw new Error(data.error || t("admin.failed_to_fetch_sellers"))
                }
                setSellers(data.sellers)
            } catch (err: any) {
                // setError(err.message)
                toast({
                    title: "Error",
                    description: err.message || t("admin.failed_to_fetch_sellers"),
                    variant: "destructive"
                });
            } finally {
                setLoading(false)
            }
        }
        fetchSellers()
    }, [t])

    const handleUpdateStatus = async (sellerId: string, newStatus: string) => {
        if (!confirm(`Are you sure you want to ${newStatus} this vendor?`)) return;

        try {
            const supabaseClient = createClient(); // Use a new client to get user profile
            const { data: { user } } = await supabaseClient.auth.getUser();
            let currentUserRole = "unknown";
            if (user) {
                const { data: profile } = await supabaseClient.from("profiles").select("role").eq("id", user.id).single();
                currentUserRole = profile?.role || "unknown";
            }
            console.log("[v0] handleUpdateStatus: Current user role:", currentUserRole);


            console.log(`[v0] Attempting to update seller ${sellerId} to status: ${newStatus}`);
            const response = await fetch("/api/admin/vendors", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sellerId, status: newStatus }),
            });
            const data = await response.json();
            console.log("[v0] handleUpdateStatus: API Response:", data);

            if (!response.ok) {
                throw new Error(data.error || `Failed to ${newStatus} vendor`);
            }
            setSellers(sellers.map(s => s.id === sellerId ? { ...s, verification_status: newStatus } : s));
            toast({
                title: "Success",
                description: `Vendor ${newStatus} successfully!`,
            });
        } catch (err: any) {
            console.error("[v0] handleUpdateStatus: Error:", err);
            toast({
                title: "Error",
                description: err.message || `Failed to ${newStatus} vendor`,
                variant: "destructive",
            });
        }
    };

    const handleBlockVendor = async (sellerId: string) => {
        const seller = sellers.find(s => s.id === sellerId);
        const action = seller?.is_blocked ? "unblock" : "block";
        const confirmMessage = `Are you sure you want to ${action} this vendor?${action === "block" ? " They will not be able to sell products." : ""}`;
        
        if (!confirm(confirmMessage)) return;

        try {
            const response = await fetch("/api/admin/vendors", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sellerId, action: "block", isBlocked: action === "block" }),
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || `Failed to ${action} vendor`)
            }
            setSellers(sellers.map(s => s.id === sellerId ? { ...s, is_blocked: action === "block" } : s))
            toast({
                title: "Success",
                description: `Vendor ${action}ed successfully!`,
            });
        } catch (err: any) {
            // setError(err.message)
            toast({
                title: "Error",
                description: err.message || `Failed to ${action} vendor`,
                variant: "destructive",
            });
        }
    }

    if (loading) {
        return <div>{t("admin.loading")}</div>
    }

    // if (error) {
    //     return <div className="text-red-500">{t("admin.error")}{error}</div>
    // }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">{t("admin.manage_vendors")}</h1>
            <Card>
                <CardHeader>
                    <CardTitle>{t("admin.seller_applications")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {sellers.map(seller => (
                            <div key={seller.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <p className="font-semibold">{seller.store_name}</p>
                                    <p className="text-sm text-gray-500">{seller.profile?.email || seller.contact_email}</p>
                                    <div className="flex gap-2 mt-1">
                                        <Badge variant={
                                            seller.verification_status === 'approved' ? 'default' :
                                            seller.verification_status === 'pending' ? 'secondary' :
                                            'destructive'
                                        }>
                                            {seller.verification_status}
                                        </Badge>
                                        <Badge variant={seller.is_blocked ? 'destructive' : 'default'}>
                                            {seller.is_blocked ? 'Blocked' : 'Active'}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link href={`/admin/vendors/${seller.id}`}>
                                        <Button size="sm" variant="outline">View</Button>
                                    </Link>
                                    {seller.verification_status === 'pending' && (
                                        <>
                                            <Button size="sm" onClick={() => handleUpdateStatus(seller.id, "approved")}>{t("admin.approve")}</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(seller.id, "rejected")}>{t("admin.reject")}</Button>
                                        </>
                                    )}
                                    <Button 
                                        size="sm" 
                                        variant={seller.is_blocked ? "default" : "destructive"} 
                                        onClick={() => handleBlockVendor(seller.id)}
                                    >
                                        {seller.is_blocked ? "Unblock" : "Block"}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
