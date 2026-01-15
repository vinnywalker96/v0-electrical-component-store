
import type React from "react"
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingBag,
  CreditCard,
  MessageSquare,
  Settings,
  LogOut,
  User,
  Home,
  Store,
  TrendingUp,
} from "lucide-react"

export const adminNavItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  { href: "/admin/users", label: "Users", icon: <Users className="w-5 h-5" /> },
  { href: "/admin/vendors", label: "Vendors", icon: <Store className="w-5 h-5" /> },
  {
    href: "/admin/products",
    label: "Products",
    icon: <Package className="w-5 h-5" />,
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: <ShoppingBag className="w-5 h-5" />,
  },
  { href: "/admin/banking-details", label: "Banking Details", icon: <CreditCard className="w-5 h-5" /> },
  { href: "/admin/reports", label: "Reports", icon: <TrendingUp className="w-5 h-5" /> },
  {
    href: "/chat",
    label: "Messages",
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: <Settings className="w-5 h-5" />,
  },
  { href: "/auth/logout", label: "Logout", icon: <LogOut className="w-5 h-5" /> },
]

export const sellerNavItems = [
  {
    href: "/seller/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: "/seller/products",
    label: "Products",
    icon: <Package className="w-5 h-5" />,
  },
  {
    href: "/seller/orders",
    label: "Orders",
    icon: <ShoppingBag className="w-5 h-5" />,
  },
  {
    href: "/chat",
    label: "Messages",
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    href: "/seller/settings",
    label: "Settings",
    icon: <Settings className="w-5 h-5" />,
  },
  { href: "/auth/logout", label: "Logout", icon: <LogOut className="w-5 h-5" /> },
]

export const customerNavItems = [
  {
    href: "/protected/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: "/protected/profile",
    label: "Profile",
    icon: <User className="w-5 h-5" />,
  },
  {
    href: "/protected/orders",
    label: "Orders",
    icon: <ShoppingBag className="w-5 h-5" />,
  },
  {
    href: "/protected/addresses",
    label: "Addresses",
    icon: <Home className="w-5 h-5" />,
  },
  
  {
    href: "/protected/settings",
    label: "Settings",
    icon: <Settings className="w-5 h-5" />,
  },
  {
    href: "/chat",
    label: "Messages",
    icon: <MessageSquare className="w-5 h-5" />,
  },
]

