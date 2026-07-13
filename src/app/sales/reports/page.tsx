"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Download, TrendingUp, DollarSign, ShoppingBag, Activity, Loader2, BarChart3 } from "lucide-react"
import { MonthlySalesComparisonChart } from "@/components/dashboard/monthly-sales-comparison-chart"
import { SalesByPlatformChart } from "@/components/dashboard/sales-by-platform-chart"
import { SalesByStatusChart } from "@/components/dashboard/sales-by-status-chart"
import { DailySalesChart } from "@/components/dashboard/daily-sales-chart"
import { formatCurrency } from "@/lib/utils"

interface ReportData {
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  monthlyTrend: { month: string; revenue: number; orders: number }[]
  salesByStatus: { status: string; count: number }[]
  salesByPlatform: { platform: string; orders: number; revenue: number; percentage: number }[]
  dailyTrend: { date: string; revenue: number; orders: number }[]
}

const defaultData: ReportData = {
  totalRevenue: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  monthlyTrend: [],
  salesByStatus: [],
  salesByPlatform: [],
  dailyTrend: [],
}

export default function SalesReportsPage() {
  const [period, setPeriod] = useState("year")
  const [data, setData] = useState<ReportData>(defaultData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/sales/reports?period=${period}`)
        if (!res.ok) throw new Error("Failed to fetch")
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError("Could not load report data.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [period])

  const periodOptions = [
    { label: "This Year", value: "year" },
    { label: "This Month", value: "month" },
    { label: "This Week", value: "week" },
  ]

  const summaryCards = [
    { label: "Total Revenue", value: formatCurrency(data.totalRevenue), change: `${data.totalOrders} orders`, icon: DollarSign, up: true },
    { label: "Total Orders", value: data.totalOrders.toLocaleString("id-ID"), change: "All time", icon: ShoppingBag, up: true },
    { label: "Avg Order Value", value: formatCurrency(data.avgOrderValue), change: "Per order", icon: TrendingUp, up: true },
    { label: "Monthly Avg", value: data.monthlyTrend.length > 0 ? formatCurrency(data.totalRevenue / Math.max(1, data.monthlyTrend.filter(m => m.revenue > 0).length)) : "Rp 0", change: "Active months", icon: Activity, up: true },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading report data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Sales Reports</h3>
          <p className="text-sm text-gray-500 mt-1">
            {data.totalOrders > 0
              ? `${data.totalOrders.toLocaleString("id-ID")} orders totaling ${formatCurrency(data.totalRevenue)}`
              : "No sales data yet. Connect your e-commerce platform to see reports."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={periodOptions}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="Period"
            className="w-40"
          />
          <Button className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaryCards.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{item.label}</p>
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-sm text-gray-400 mt-1">{item.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Revenue & Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {data.monthlyTrend.length > 0 && data.monthlyTrend.some(m => m.revenue > 0) ? (
            <MonthlySalesComparisonChart data={data.monthlyTrend} />
          ) : (
            <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No sales data for this period</p>
                <p className="text-xs text-gray-400 mt-1">Data will appear once orders start coming in</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            {data.salesByPlatform.length > 0 ? (
              <>
                <SalesByPlatformChart data={data.salesByPlatform} />
                <div className="mt-4 space-y-2">
                  {data.salesByPlatform.map((p) => (
                    <div key={p.platform} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: getPlatformColor(p.platform) }}
                        />
                        <span className="text-gray-700">{p.platform}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">{p.orders} orders</span>
                        <span className="font-medium">{formatCurrency(p.revenue)}</span>
                        <span className="text-xs text-gray-400">({p.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-72 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-sm text-gray-500">Connect e-commerce platforms to see data</p>
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
      </div>

      {/* Daily Sales Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Sales (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.dailyTrend.length > 0 && data.dailyTrend.some(d => d.revenue > 0) ? (
            <DailySalesChart data={data.dailyTrend} />
          ) : (
            <div className="h-72 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No daily sales data</p>
                <p className="text-xs text-gray-400 mt-1">Recent sales activity will appear here</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    Tokopedia: "#3b82f6",
    Shopee: "#f59e0b",
    Bukalapak: "#10b981",
    Lazada: "#8b5cf6",
    Blibli: "#ef4444",
    Direct: "#6b7280",
  }
  return colors[platform] || "#6b7280"
}
