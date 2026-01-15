"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { UserCog } from "lucide-react"

export function UserManagementButton() {
  const router = useRouter()

  const handleClick = () => {
    router.push("/admin/users")
  }

  return (
    <Button
      onClick={handleClick}
      className="w-full h-16 text-lg justify-start gap-4 bg-transparent"
      variant="outline"
    >
      <UserCog size={24} />
      Manage Users
    </Button>
  )
}
