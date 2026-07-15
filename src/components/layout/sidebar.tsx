"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  FileText,
  DollarSign,
  Users,
  Settings,
  Building2,
  BarChart3,
  QrCode,
  Shield,
  Menu,
  X,
  ChevronDown,
} from "lucide-react"
import { useState } from "react"
import { hasPermission, type Feature } from "@/lib/auth/permissions"

interface MenuItem {
  feature: Feature
  label: string
  href: string
  icon: React.ReactNode
  submenu?: { label: string; href: string }[]
}

const ALL_MENU_ITEMS: MenuItem[] = [
  { feature: "dashboard", label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  {
    feature: "products", label: "Products", href: "/products", icon: <Package className="h-5 w-5" />,
    submenu: [
      { label: "All Products", href: "/products" },
      { label: "Add Product", href: "/products/new" },
    ],
  },
  {
    feature: "inventory", label: "Inventory", href: "/inventory", icon: <Warehouse className="h-5 w-5" />,
    submenu: [
      { label: "Stock Overview", href: "/inventory" },
      { label: "Stock Movements", href: "/inventory/movements" },
      { label: "Thresholds", href: "/inventory/thresholds" },
      { label: "Inventory Report", href: "/inventory/report" },
    ],
  },
  {
    feature: "warehouses", label: "Warehouses", href: "/warehouses", icon: <Building2 className="h-5 w-5" />,
    submenu: [
      { label: "All Warehouses", href: "/warehouses" },
      { label: "Add Warehouse", href: "/warehouses/new" },
      { label: "Receiving", href: "/warehouses/receiving" },
    ],
  },
  {
    feature: "procurement", label: "Procurement", href: "/procurement", icon: <ShoppingCart className="h-5 w-5" />,
    submenu: [
      { label: "Overview", href: "/procurement" },
      { label: "Purchase Orders", href: "/procurement/purchase-orders" },
      { label: "New PO", href: "/procurement/purchase-orders/new" },
      { label: "Stock Requests", href: "/procurement/stock-requests" },
      { label: "Suppliers", href: "/procurement/suppliers" },
    ],
  },
  {
    feature: "sales", label: "Sales", href: "/sales", icon: <BarChart3 className="h-5 w-5" />,
    submenu: [
      { label: "All Sales", href: "/sales" },
      { label: "Reports", href: "/sales/reports" },
    ],
  },
  { feature: "branches", label: "Branches", href: "/branches", icon: <Building2 className="h-5 w-5" /> },
  {
    feature: "invoicing", label: "Invoicing", href: "/invoicing", icon: <FileText className="h-5 w-5" />,
    submenu: [
      { label: "All Invoices", href: "/invoicing" },
      { label: "Aging Report", href: "/invoicing/aging" },
    ],
  },
  { feature: "customers", label: "B2B Customers", href: "/invoicing/customers", icon: <Users className="h-5 w-5" /> },
  {
    feature: "accounting", label: "Accounting", href: "/accounting", icon: <DollarSign className="h-5 w-5" />,
    submenu: [
      { label: "Chart of Accounts", href: "/accounting/chart-of-accounts" },
      { label: "Journals", href: "/accounting/journals" },
      { label: "Expenses", href: "/accounting/expenses" },
      { label: "Payroll", href: "/accounting/payroll" },
      { label: "Reports", href: "/accounting/reports" },
    ],
  },
  { feature: "employees", label: "Employees", href: "/employees", icon: <Users className="h-5 w-5" /> },
  {
    feature: "payroll", label: "Payroll", href: "/payroll", icon: <ClockIcon className="h-5 w-5" />,
    submenu: [
      { label: "Attendance", href: "/payroll/attendance" },
      { label: "Leaves", href: "/payroll/leaves" },
      { label: "Shifts", href: "/payroll/shifts" },
    ],
  },
  { feature: "tracking", label: "Tracking", href: "/tracking", icon: <QrCode className="h-5 w-5" /> },
  { feature: "activity_logs", label: "Activity Logs", href: "/activity-logs", icon: <FileText className="h-5 w-5" /> },
  { feature: "reports", label: "Reports", href: "/sales/reports", icon: <FileText className="h-5 w-5" /> },
  {
    feature: "settings", label: "Settings", href: "/settings", icon: <Settings className="h-5 w-5" />,
    submenu: [
      { label: "Profile", href: "/settings/profile" },
      { label: "Currency", href: "/settings/currency" },
      { label: "Tax", href: "/settings/tax" },        { label: "E-Commerce", href: "/settings/ecommerce" },
        { label: "Subscription", href: "/settings/subscription" },
      ],
  },
  { feature: "users_roles", label: "Users & Roles", href: "/settings/users", icon: <Shield className="h-5 w-5" /> },
]

function ClockIcon(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Dashboard"])

  const role = session?.user?.role
  const permissions = session?.user?.permissions

  // Filter menu items based on user permissions
  const menuItems = ALL_MENU_ITEMS.filter((item) =>
    hasPermission(role, permissions, item.feature, "view")
  )

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label)
        ? prev.filter((m) => m !== label)
        : [...prev, label]
    )
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white border border-gray-200 shadow-sm"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Inventory</h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {menuItems.map((item) => (
              <div key={item.label}>
                {item.submenu ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          expandedMenus.includes(item.label) && "rotate-180"
                        )}
                      />
                    </button>
                    {expandedMenus.includes(item.label) && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.submenu.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "block px-3 py-2 rounded-lg text-sm transition-colors",
                              pathname === sub.href
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                            )}
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-medium text-white">
                {session?.user?.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div className="truncate">
                <p className="font-medium text-gray-900">{session?.user?.name || "User"}</p>
                <p className="text-xs">{session?.user?.email || ""}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
