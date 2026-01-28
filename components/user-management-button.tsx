"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { UserCog } from "lucide-react"
import { useLanguage } from "@/lib/context/language-context"

export function UserManagementButton() {
  const router = useRouter()
  const { t } = useLanguage()

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
      {t("admin_dashboard.quick_links.manage_users")}
    </Button>
  )
}
