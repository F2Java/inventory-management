"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Package,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  CreditCard,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MonthlyRevenueChart } from "@/components/dashboard/monthly-revenue-chart"
import { SalesByStatusChart } from "@/components/dashboard/sales-by-status-chart"
import { SalesByPlatformChart } from "@/components/dashboard/sales-by-platform-chart"
import { formatCurrency, formatDate } from "@/lib/utils"

interface DashboardData {
  totalProducts: number
  totalSales: number
  totalRevenue: number
  pendingOrders: number
  lowStockItems: number
  inventoryValue: number
  monthlyRevenue: { month: string; revenue: number }[]
  salesByStatus: { status: string; count: number }[]
  salesByPlatform: { platform: string; orders: number; revenue: number }[]
  recentOrders: { id: string; product: string; customer: string; status: string; amount: number; date: string }[]
  topProducts: { name: string; sold: number; revenue: number }[]
}

const defaultData: DashboardData = {
  totalProducts: 0,
  totalSales: 0,
  totalRevenue: 0,
  pendingOrders: 0,
  lowStockItems: 0,
  inventoryValue: 0,
  monthlyRevenue: [],
  salesByStatus: [],
  salesByPlatform: [],
  recentOrders: [],
  topProducts: [],
}

interface SubscriptionInfo {
  subscriptionPlan: string | null
  subscriptionStatus: string | null
  subscriptionEnd: string | null
  daysRemaining: number | null
  isExpiringSoon: boolean
  needsReminder: boolean
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData>(defaultData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [dismissing, setDismissing] = useState(false)
  const [reminderDismissed, setReminderDismissed] = useState(false)

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, subRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          isSuperAdmin ? fetch("/api/subscription") : Promise.resolve(null),
        ])

        if (statsRes?.ok) {
          const json = await statsRes.json()
          setData(json)
        }

        if (subRes?.ok) {
          const json = await subRes.json()
          if (json.data) setSubscription(json.data)
        }
      } catch (err) {
        setError("Could not load dashboard data. Make sure the database is connected.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [isSuperAdmin])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  const statsCards = [
    {
      title: "Total Products",
      value: data.totalProducts.toLocaleString("id-ID"),
      change: "Active",
      changeType: "positive",
      icon: Package,
    },
    {
      title: "Total Revenue",
      value: formatCurrency(data.totalRevenue),
      change: `${data.totalSales} orders`,
      changeType: "positive",
      icon: DollarSign,
    },
    {
      title: "Active Orders",
      value: data.pendingOrders.toString(),
      change: `${data.totalSales} total`,
      changeType: data.pendingOrders > 10 ? "positive" : "positive",
      icon: ShoppingCart,
    },
    {
      title: "Low Stock Items",
      value: data.lowStockItems.toString(),
      change: "Needs attention",
      changeType: data.lowStockItems > 0 ? "negative" : "positive",
      icon: AlertTriangle,
    },
    {
      title: "Inventory Value",
      value: formatCurrency(data.inventoryValue),
      change: `${data.totalProducts} products`,
      changeType: "positive",
      icon: Package,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          Selamat Datang, Admin!
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-700">
          {error}
        </div>
      )}

      {/* Subscription Expiry Reminder Banner */}
      {subscription?.needsReminder && !reminderDismissed && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-800">
              Subscription expiring in {subscription.daysRemaining} days
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Your subscription ends on {subscription.subscriptionEnd ? formatDate(subscription.subscriptionEnd) : "N/A"}.{" "}
              <Link href="/settings/subscription" className="underline font-medium hover:text-orange-800">
                Manage subscription
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/settings/subscription">
              <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                <CreditCard className="h-3.5 w-3.5 mr-1" />
                Renew
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-orange-500 hover:text-orange-700 hover:bg-orange-100"
              disabled={dismissing}
              onClick={async () => {
                setDismissing(true)
                try {
                  const res = await fetch("/api/subscription", { method: "PATCH" })
                  if (res.ok) {
                    setReminderDismissed(true)
                  }
                } catch (err) {
                  console.error("Failed to dismiss reminder:", err)
                }
                setDismissing(false)
              }}
              title="Dismiss reminder"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {subscription?.isExpiringSoon && !subscription.needsReminder && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
          <CreditCard className="h-4 w-4 text-blue-500 shrink-0" />
          <p className="text-sm text-blue-700 flex-1">
            {subscription.daysRemaining} days remaining on your {subscription.subscriptionPlan} plan
          </p>
          <Link href="/settings/subscription">
            <Button variant="outline" size="sm" className="text-xs border-blue-300 text-blue-700 hover:bg-blue-100">
              View
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-blue-600" />
                </div>
                <Badge
                  variant="status"
                  status={stat.changeType === "positive" ? "active" : "inactive"}
                >
                  <span className="flex items-center gap-1">
                    {stat.changeType === "positive" ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {stat.change}
                  </span>
                </Badge>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-4">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthlyRevenue.length > 0 && data.monthlyRevenue.some(m => m.revenue > 0) ? (
              <MonthlyRevenueChart data={data.monthlyRevenue} />
            ) : (
              <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No revenue data yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Sales data will appear here once orders come in
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {data.salesByStatus.length > 0 ? (
              <SalesByStatusChart data={data.salesByStatus} />
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-sm text-gray-500">No data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            {data.salesByPlatform.length > 0 ? (
              <SalesByPlatformChart data={data.salesByPlatform} />
            ) : (
              <div className="h-72 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-sm text-gray-500">Connect e-commerce platforms to see data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id}</TableCell>
                      <TableCell className="text-sm">{order.product}</TableCell>
                      <TableCell>
                        <Badge variant="status" status={order.status}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {formatCurrency(order.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-sm text-gray-500">No recent orders</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length > 0 ? (
              <div className="space-y-4">
                {data.topProducts.map((product, i) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-400 w-6">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {product.name || `Product #${i + 1}`}
                        </p>
                        <p className="text-xs text-gray-500">{product.sold} sold</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(product.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-gray-500">No sales data yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
