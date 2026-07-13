"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { formatCurrency } from "@/lib/utils"

interface SalesByPlatformChartProps {
  data: { platform: string; orders: number; revenue: number }[]
}

const PLATFORM_COLORS: Record<string, string> = {
  Tokopedia: "#3b82f6",
  Shopee: "#f59e0b",
  Bukalapak: "#10b981",
  Lazada: "#8b5cf6",
  Blibli: "#ef4444",
  Direct: "#6b7280",
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
        <p className="text-sm text-gray-600">
          Orders: <span className="font-semibold">{payload[0].payload.orders}</span>
        </p>
        <p className="text-sm text-gray-600">
          Revenue: <span className="font-semibold">{formatCurrency(payload[0].value)}</span>
        </p>
      </div>
    )
  }
  return null
}

export function SalesByPlatformChart({ data }: SalesByPlatformChartProps) {
  const chartData = data.map((d) => ({
    name: d.platform,
    revenue: d.revenue,
    orders: d.orders,
    fill: PLATFORM_COLORS[d.platform] || "#6b7280",
  }))

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(value) => `Rp${(value / 1000000).toFixed(0)}M`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={32}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
