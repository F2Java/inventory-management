"use client"

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"

interface SalesByStatusChartProps {
  data: { status: string; count: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  PROCESSING: "#3b82f6",
  PACKAGING: "#8b5cf6",
  SHIPPED: "#06b6d4",
  DELIVERED: "#10b981",
  CANCELLED: "#ef4444",
  RETURNED: "#f97316",
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  PACKAGING: "Packaging",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900">
          {STATUS_LABELS[payload[0].name] || payload[0].name}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Orders: <span className="font-semibold">{payload[0].value}</span>
        </p>
      </div>
    )
  }
  return null
}

export function SalesByStatusChart({ data }: SalesByStatusChartProps) {
  const chartData = data.map((d) => ({
    name: d.status,
    value: d.count,
    color: STATUS_COLORS[d.status] || "#9ca3af",
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span className="text-sm text-gray-600">
                {STATUS_LABELS[value] || value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
