"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts"

interface ChartConfig {
  type: "bar" | "line" | "pie" | "donut"
  title: string
  labels: string[]
  datasets: { label: string; data: number[]; color?: string }[]
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"]

export function ChatChart({ chart }: { chart: ChartConfig }) {
  if (!chart || !chart.labels.length) return null

  const data = chart.labels.map((label, i) => {
    const row: Record<string, any> = { name: label }
    chart.datasets.forEach((ds) => {
      row[ds.label] = ds.data[i] || 0
    })
    return row
  })

  if (chart.type === "pie" || chart.type === "donut") {
    const pieData = chart.labels.map((label, i) => ({
      name: label,
      value: chart.datasets[0]?.data[i] || 0,
    }))

    return (
      <div className="mt-3 bg-white rounded-lg border border-gray-100 p-3">
        <p className="text-xs font-semibold text-gray-700 mb-2">{chart.title}</p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={chart.type === "donut" ? 50 : 0}
              outerRadius={80}
              dataKey="value"
              label={(entry: any) => `${entry.name} ${((entry.percent || 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {pieData.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chart.type === "line") {
    return (
      <div className="mt-3 bg-white rounded-lg border border-gray-100 p-3">
        <p className="text-xs font-semibold text-gray-700 mb-2">{chart.title}</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {chart.datasets.map((ds, i) => (
              <Line
                key={ds.label}
                type="monotone"
                dataKey={ds.label}
                stroke={ds.color || COLORS[i]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Default: bar chart
  return (
    <div className="mt-3 bg-white rounded-lg border border-gray-100 p-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">{chart.title}</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {chart.datasets.map((ds, i) => (
            <Bar key={ds.label} dataKey={ds.label} fill={ds.color || COLORS[i]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
