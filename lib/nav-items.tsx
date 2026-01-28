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

export const getAdminNavItems = (t: (key: string) => string) => [
  {
    href: "/admin/dashboard",
    label: t("navigation.dashboard"),
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  { href: "/admin/users", label: t("navigation.users"), icon: <Users className="w-5 h-5" /> },
  { href: "/admin/vendors", label: t("navigation.vendors"), icon: <Store className="w-5 h-5" /> },
  {
    href: "/admin/products",
    label: t("navigation.products"),
    icon: <Package className="w-5 h-5" />,
  },
  {
    href: "/admin/orders",
    label: t("navigation.orders"),
    icon: <ShoppingBag className="w-5 h-5" />,
  },
  { href: "/admin/banking-details", label: t("navigation.banking_details"), icon: <CreditCard className="w-5 h-5" /> },
  { href: "/admin/reports", label: t("navigation.reports"), icon: <TrendingUp className="w-5 h-5" /> },
  {
    href: "/admin/messages",
    label: t("navigation.messages"),
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    href: "/admin/settings",
    label: t("navigation.settings"),
    icon: <Settings className="w-5 h-5" />,
  },
  { href: "/auth/logout", label: t("navigation.logout"), icon: <LogOut className="w-5 h-5" /> },
]

export const getSellerNavItems = (t: (key: string) => string) => [
  {
    href: "/seller/dashboard",
    label: t("navigation.dashboard"),
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: "/seller/products",
    label: t("navigation.products"),
    icon: <Package className="w-5 h-5" />,
  },
  {
    href: "/seller/orders",
    label: t("navigation.orders"),
    icon: <ShoppingBag className="w-5 h-5" />,
  },
  {
    href: "/seller/messages",
    label: t("navigation.messages"),
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    href: "/seller/settings",
    label: t("navigation.settings"),
    icon: <Settings className="w-5 h-5" />,
  },
  { href: "/auth/logout", label: t("navigation.logout"), icon: <LogOut className="w-5 h-5" /> },
]

export const getCustomerNavItems = (t: (key: string) => string) => [
  {
    href: "/protected/dashboard",
    label: t("navigation.dashboard"),
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: "/protected/profile",
    label: t("navigation.profile"),
    icon: <User className="w-5 h-5" />,
  },
  {
    href: "/protected/orders",
    label: t("navigation.orders"),
    icon: <ShoppingBag className="w-5 h-5" />,
  },
  {
    href: "/protected/addresses",
    label: t("navigation.addresses"),
    icon: <Home className="w-5 h-5" />,
  },

  {
    href: "/protected/settings",
    label: t("navigation.settings"),
    icon: <Settings className="w-5 h-5" />,
  },
  {
    href: "/protected/messages",
    label: t("navigation.messages"),
    icon: <MessageSquare className="w-5 h-5" />,
  },
]
