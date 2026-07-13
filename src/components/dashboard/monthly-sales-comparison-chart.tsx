"use client"

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { formatCurrency } from "@/lib/utils"

interface MonthlySalesComparisonChartProps {
  data: { month: string; revenue: number; orders: number }[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
        <p className="text-sm text-blue-600 font-semibold">
          Revenue: {formatCurrency(payload[0].value)}
        </p>
        <p className="text-sm text-orange-600">
          Orders: <span className="font-semibold">{payload[1]?.value || payload[0]?.payload?.orders}</span>
        </p>
      </div>
    )
  }
  return null
}

export function MonthlySalesComparisonChart({ data }: MonthlySalesComparisonChartProps) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `Rp${(value / 1000000).toFixed(0)}M`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span className="text-sm text-gray-600">{value}</span>
            )}
          />
          <Bar
            yAxisId="left"
            dataKey="revenue"
            name="Revenue"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="orders"
            name="Orders"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 4, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
