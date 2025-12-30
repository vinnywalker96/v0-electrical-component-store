"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { UserProfile } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, UserCog, Edit, Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function AdminUsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        let query = supabase.from("profiles").select("*")

        if (searchQuery) {
          query = query.or(`email.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        }
        if (roleFilter !== "all") {
          query = query.eq("role", roleFilter)
        }

        const { data, error } = await query.order("created_at", { ascending: false })

        if (error) throw error;
        setUsers(data || []);
      } catch (error: any) {
        console.error("Error fetching users:", error.message);
        toast({
          title: "Error",
          description: "Failed to load users.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [supabase, searchQuery, roleFilter]);

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedUsers.length} users? This action is irreversible.`)) return;

    try {
        // Note: Supabase RLS must allow admins to delete users.
        // This may require a custom RPC function to delete from `auth.users` as well.
      const { error } = await supabase.from("profiles").delete().in("id", selectedUsers);
      if (error) throw error;
      
      setUsers(users.filter(u => !selectedUsers.includes(u.id)));
      setSelectedUsers([]);
      toast({
        title: "Success",
        description: `${selectedUsers.length} users deleted successfully.`,
      });
    } catch (error) {
      console.error("Error bulk deleting users:", error);
      toast({
        title: "Error",
        description: "Failed to delete selected users.",
        variant: "destructive"
      });
    }
  };

  const handleBlockUser = async (userId: string, reason?: string) => {
    const action = users.find(u => u.id === userId)?.is_blocked ? "unblock" : "block";
    const confirmMessage = `Are you sure you want to ${action} this user?${action === "block" ? " They will not be able to access their account." : ""}`;
    
    if (!confirm(confirmMessage)) return;

    const blockReason = action === "block" ? (reason || prompt("Enter reason for blocking (optional):")) : null;

    try {
      const updateData: any = {
        is_blocked: action === "block",
        blocked_at: action === "block" ? new Date().toISOString() : null,
        block_reason: blockReason
      };

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);
        
      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, ...updateData } : u));
      toast({
        title: "Success",
        description: `User ${action}ed successfully.`,
      });
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} user.`,
        variant: "destructive"
      });
    }
  };


  if (loading) {
    return <div className="text-center py-12">Loading users...</div>;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/admin/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Admin Dashboard
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">Manage Users</h1>
          {selectedUsers.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Bulk Actions ({selectedUsers.length})</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleBulkDelete} className="text-red-600">Delete Selected</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {/* Filters */}
        <Card className="mb-8">
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 mb-4">No users found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-4">
                        <Checkbox
                            checked={selectedUsers.length > 0 && selectedUsers.length === users.length}
                            onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Role</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Joined Date</th>
                      <th className="text-center py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4">
                            <Checkbox
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={() => handleSelectUser(user.id)}
                            />
                        </td>
                        <td className="py-3 px-4 font-semibold">{user.first_name || ""} {user.last_name || ""}</td>
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4">{user.role}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.is_blocked 
                              ? "bg-red-100 text-red-800" 
                              : "bg-green-100 text-green-800"
                          }`}>
                            {user.is_blocked ? "Blocked" : "Active"}
                          </span>
                        </td>
                        <td className="py-3 px-4">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleMakeAdmin(user.id)}
                            disabled={user.role === 'admin' || user.role === 'super_admin'}
                          >
                            <UserCog size={16} className="mr-2"/>
                            Make Admin
                          </Button>
                          <Button 
                            variant={user.is_blocked ? "default" : "destructive"} 
                            size="sm"
                            onClick={() => handleBlockUser(user.id)}
                          >
                            {user.is_blocked ? "Unblock" : "Block"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
