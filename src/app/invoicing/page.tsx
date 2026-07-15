"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, FileText, Loader2, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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

interface InvoiceItem {
  id: string
  invoiceNumber: string
  customer: { companyName: string; contactPerson: string; email: string } | null
  orderNumber: string | null
  invoiceDate: string
  dueDate: string
  status: string
  totalAmount: number
  amountPaid: number
  balanceDue: number
  postedToJournal: boolean
  paymentCount: number
  createdAt: string
}

interface Stats {
  total: number
  totalOutstanding: number
  totalOverdue: number
  totalCollected: number
  pending: number
  overdue: number
  paid: number
}

export default function InvoicingPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<InvoiceItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const loadData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      if (search) params.set("search", search)
      const res = await fetch(`/api/invoicing/invoices?${params.toString()}`)
      const json = await res.json()
      if (json.data) setInvoices(json.data)
      if (json.stats) setStats(json.stats)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadData() }, [statusFilter, search])

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; status: string }> = {
      PENDING: { label: "Pending", status: "pending" },
      PARTIAL: { label: "Partial", status: "default" },
      PAID: { label: "Paid", status: "active" },
      OVERDUE: { label: "Overdue", status: "destructive" },
      CANCELLED: { label: "Cancelled", status: "inactive" },
      VOID: { label: "Void", status: "inactive" },
    }
    return map[status] || { label: status, status: "outline" }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Invoicing & Receivables</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading ? "Loading..." : `${stats?.total || 0} invoices · ${formatCurrency(stats?.totalOutstanding || 0)} outstanding`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/invoicing/aging")} className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Aging Report
          </Button>
          <Button size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Invoices</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Outstanding</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(stats.totalOutstanding)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Overdue</p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(stats.totalOverdue)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Collected</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalCollected)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Overdue Count</p>
            <p className="text-xl font-bold text-red-600 mt-1">{stats.overdue}</p>
          </CardContent></Card>
        </div>
      )}

      <Card>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {["", "PENDING", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"].map((s) => (
              <Badge
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setStatusFilter(s)}
              >
                {s || "All"}
              </Badge>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-64" />
          </div>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-base font-medium text-gray-500">No invoices yet</p>
              <p className="text-sm mt-1">Invoices are auto-generated when B2B orders are confirmed</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Journal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const badge = getStatusBadge(inv.status)
                  const isOverdue = inv.status === "OVERDUE" || (inv.status === "PENDING" && new Date(inv.dueDate) < new Date())
                  return (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/invoicing/${inv.id}`)}
                    >
                      <TableCell className="font-mono text-xs font-medium">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">{inv.customer?.companyName || "—"}</TableCell>
                      <TableCell className="text-sm">{formatDateShort(inv.invoiceDate)}</TableCell>
                      <TableCell className={`text-sm ${isOverdue ? "text-red-600 font-medium" : ""}`}>{formatDateShort(inv.dueDate)}</TableCell>
                      <TableCell>
                        <Badge variant="status" status={badge.status}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(inv.totalAmount)}</TableCell>
                      <TableCell className="text-right text-gray-500">{formatCurrency(inv.amountPaid)}</TableCell>
                      <TableCell className={`text-right font-medium ${inv.balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(inv.balanceDue)}</TableCell>
                      <TableCell className="text-center">
                        {inv.postedToJournal ? (
                          <span title="Journaled"><CheckCircle2 className="h-4 w-4 text-green-500 inline" /></span>
                        ) : (
                          <span title="Not journaled"><Clock className="h-4 w-4 text-gray-300 inline" /></span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  )
}
