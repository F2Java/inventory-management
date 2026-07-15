"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, AlertTriangle, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDateShort } from "@/lib/utils"

interface AgingItem {
  id: string
  invoiceNumber: string
  customer: { companyName: string; contactPerson: string; email: string; phone: string | null }
  invoiceDate: string
  dueDate: string
  daysOverdue: number
  totalAmount: number
  amountPaid: number
  balanceDue: number
  bucket: string
  status: string
}

interface Summary {
  current: number
  "1-30": number
  "31-60": number
  "61-90": number
  "90+": number
  totalOutstanding: number
  totalInvoices: number
}

export default function AgingReportPage() {
  const router = useRouter()
  const [data, setData] = useState<AgingItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/invoicing/aging")
        const json = await res.json()
        if (json.data) setData(json.data)
        if (json.summary) setSummary(json.summary)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const buckets = [
    { key: "current", label: "Current (Not Due)", color: "bg-green-50 border-green-200 text-green-700" },
    { key: "1-30", label: "1-30 Days", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
    { key: "31-60", label: "31-60 Days", color: "bg-orange-50 border-orange-200 text-orange-700" },
    { key: "61-90", label: "61-90 Days", color: "bg-red-50 border-red-200 text-red-700" },
    { key: "90+", label: "90+ Days", color: "bg-red-100 border-red-300 text-red-800" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/invoicing")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Receivable Aging Report</h3>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? "Loading..." : `${summary?.totalInvoices || 0} invoices · ${formatCurrency(summary?.totalOutstanding || 0)} total outstanding`}
            </p>
          </div>
        </div>
      </div>

      {/* Aging Summary */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {buckets.map((b) => (
            <Card key={b.key} className={b.color}>
              <CardContent className="p-4 text-center">
                <p className="text-xs font-medium mb-1">{b.label}</p>
                <p className="text-xl font-bold">{formatCurrency(summary[b.key as keyof Summary] as number)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Aging Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-base font-medium text-gray-500">No outstanding receivables</p>
              <p className="text-sm mt-1">All invoices are paid</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Days Overdue</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Aging Bucket</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/invoicing/${item.id}`)}
                  >
                    <TableCell className="font-mono text-xs font-medium">{item.invoiceNumber}</TableCell>
                    <TableCell className="text-sm max-w-[160px] truncate">{item.customer.companyName}</TableCell>
                    <TableCell className="text-sm">{formatDateShort(item.invoiceDate)}</TableCell>
                    <TableCell className="text-sm">{formatDateShort(item.dueDate)}</TableCell>
                    <TableCell className="text-right font-medium">{item.daysOverdue > 0 ? `${item.daysOverdue}d` : "—"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.amountPaid)}</TableCell>
                    <TableCell className={`text-right font-medium ${item.balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(item.balanceDue)}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const b = buckets.find((b) => b.key === item.bucket)
                        return <Badge variant="status" status={item.bucket === "current" ? "active" : item.bucket === "1-30" ? "pending" : "destructive"}>{b?.label || "Current"}</Badge>
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
