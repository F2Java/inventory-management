"use client"

import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Search, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { NotificationBadge } from "@/components/ui/notification-badge"
import { SubscriptionBadge } from "@/components/ui/subscription-badge"
import { cn } from "@/lib/utils"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/products/new": "Add Product",
  "/inventory": "Stock Overview",
  "/inventory/movements": "Stock Movements",
  "/inventory/thresholds": "Stock Thresholds",
  "/warehouses": "Warehouses",
  "/warehouses/new": "Add Warehouse",
  "/procurement/purchase-orders": "Purchase Orders",
  "/procurement/purchase-orders/new": "New Purchase Order",
  "/sales": "Sales Orders",
  "/sales/reports": "Sales Reports",
  "/branches": "Branches",
  "/branches/new": "Add Branch",
  "/accounting": "Accounting",
  "/accounting/chart-of-accounts": "Chart of Accounts",
  "/accounting/journals": "Journal Entries",
  "/employees": "Employees",
  "/employees/new": "Add Employee",
  "/payroll": "Payroll",
  "/payroll/attendance": "Attendance",
  "/payroll/leaves": "Leave Management",
  "/payroll/shifts": "Shift Management",
  "/tracking": "Order Tracking",
  "/settings": "Settings",
  "/settings/profile": "Profile Settings",
  "/settings/subscription": "Subscription & System",
  "/settings/currency": "Currency Settings",
  "/settings/tax": "Tax Settings",
  "/settings/ecommerce": "E-Commerce Settings",
  "/settings/users": "Users",
  "/settings/users/new": "Add User",
  "/settings/roles": "Roles & Permissions",
  "/activity-logs": "Activity Logs",
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
  CASHIER: "Cashier",
  WAREHOUSE_STAFF: "Warehouse Staff",
}

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const title = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path)
  )?.[1] ?? "Dashboard"

  const user = session?.user
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "A"
  const roleLabel = roleLabels[user?.role || ""] || user?.role || "User"

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              className="pl-10 w-64 bg-gray-50 border-gray-200"
            />
          </div>

          <SubscriptionBadge />

          <NotificationBadge />

          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-sm font-medium text-white">
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.name || "User"}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                {roleLabel}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
    </header>
  )
}
