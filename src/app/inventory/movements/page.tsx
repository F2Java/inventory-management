"use client"

import { useState, useEffect, Fragment } from "react"
import Link from "next/link"
import { Search, Download, Loader2, ArrowLeft, ChevronDown, ChevronRight, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { formatDate } from "@/lib/utils"

interface Movement {
  id: string
  reference: string
  type: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT" | "RETURN" | "SALE" | "PURCHASE" | "CONVERSION"
  productId: string
  product: { id: string; name: string; sku: string }
  fromWarehouse?: { id: string; name: string }
  toWarehouse?: { id: string; name: string }
  quantity: number
  notes?: string
  createdAt: string
}

function parseConversionNotes(notes?: string) {
  if (!notes) return null
  // Format: [SPLIT] 1 × ctn → 50 pcs: Optional reason
  //     or: [COMBINE] 50 × pcs → 1 ctn
  const match = notes.match(/^\[(SPLIT|COMBINE)\]\s+(\d+)\s+×\s+(\w+)\s+→\s+(\d+)\s+(\w+)(?::\s*(.*))?$/)
  if (!match) return null
  return {
    direction: match[1].toLowerCase() as "split" | "combine",
    sourceQty: parseInt(match[2]),
    sourceAbbr: match[3],
    targetQty: parseInt(match[4]),
    targetAbbr: match[5],
    reason: match[6]?.trim() || null,
  }
}

const typeConfig: Record<string, { label: string; status: "active" | "inactive" | "pending" | "delivered" }> = {
  IN: { label: "In", status: "active" },
  OUT: { label: "Out", status: "inactive" },
  TRANSFER: { label: "Transfer", status: "pending" },
  ADJUSTMENT: { label: "Adjustment", status: "delivered" },
  RETURN: { label: "Return", status: "pending" },
  SALE: { label: "Sale", status: "inactive" },
  PURCHASE: { label: "Purchase", status: "active" },
  CONVERSION: { label: "Conversion", status: "pending" },
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [expandedConv, setExpandedConv] = useState<Set<string>>(new Set())
  const convCount = movements.filter((m) => m.type === "CONVERSION").length

  const quickFilters = [
    { type: "", label: "All" },
    { type: "PURCHASE", label: "Purchases" },
    { type: "SALE", label: "Sales" },
    { type: "CONVERSION", label: "Conversions" },
    { type: "ADJUSTMENT", label: "Adjustments" },
    { type: "TRANSFER", label: "Transfers" },
  ]

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const res = await fetch("/api/movements")
        if (!res.ok) throw new Error("Failed to load")
        const json = await res.json()
        setMovements(json.data || [])
      } catch (err) {
        console.error("Failed to load movements:", err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const filtered = movements.filter((m) => {
    if (typeFilter && m.type !== typeFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.reference.toLowerCase().includes(q) ||
      m.product?.name?.toLowerCase().includes(q) ||
      m.product?.sku?.toLowerCase().includes(q) ||
      (m.notes || "").toLowerCase().includes(q)
    )
  })

  const typeOptions = Object.entries(typeConfig).map(([key, val]) => ({
    label: val.label,
    value: key,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/inventory" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Stock Movements</h3>
            <p className="text-sm text-gray-500 mt-1">
              Track all stock movements across warehouses — {movements.length} records
            </p>
          </div>
        </div>
        <Button variant="outline" className="flex items-center gap-2" disabled>
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap no-print">
        {quickFilters.map((qf) => {
          const isActive = typeFilter === qf.type
          const isConv = qf.type === "CONVERSION"
          const count = movements.filter((m) => (qf.type ? m.type === qf.type : true)).length
          return (
            <button
              key={qf.type}
              onClick={() => setTypeFilter(qf.type)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? isConv
                    ? "bg-purple-100 text-purple-700 ring-1 ring-purple-300 shadow-sm"
                    : "bg-blue-100 text-blue-700 ring-1 ring-blue-300 shadow-sm"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100 ring-1 ring-gray-200"
              }`}
            >
              {isConv && convCount > 0 && (
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-purple-500" : "bg-purple-300"}`} />
              )}
              {qf.label}
              {qf.type && <span className={`text-[10px] ${isActive ? "opacity-80" : "text-gray-400"}`}>{count}</span>}
            </button>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Movement History</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by reference, product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="">All Types</option>
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500">
              {search || typeFilter
                ? "No movements match your filters."
                : "No stock movements recorded yet. Movements appear when stock is received, sold, or adjusted."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((mov) => {
                  const cfg = typeConfig[mov.type] || { label: mov.type, status: "pending" as const }
                  const isConv = mov.type === "CONVERSION"
                  const isExpanded = expandedConv.has(mov.id)
                  const convDetails = isConv ? parseConversionNotes(mov.notes) : null

                  return (
                    <Fragment key={mov.id}>
                      <TableRow
                        className={`${isConv ? "bg-purple-50/40 border-l-2 border-l-purple-400" : ""} ${isConv ? "cursor-pointer" : ""}`}
                        onClick={() => {
                          if (!isConv) return
                          setExpandedConv((prev) => {
                            const next = new Set(prev)
                            if (next.has(mov.id)) next.delete(mov.id)
                            else next.add(mov.id)
                            return next
                          })
                        }}
                      >
                        <TableCell className="font-mono text-xs font-medium">
                          <div className="flex items-center gap-2">
                            {isConv && (
                              <span className="text-purple-400">
                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </span>
                            )}
                            {mov.reference}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{mov.product?.name || "—"}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{mov.product?.sku || ""}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="status" status={cfg.status}>{cfg.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={
                            mov.type === "IN" || mov.type === "PURCHASE" ? "text-green-600" :
                            mov.type === "OUT" || mov.type === "SALE" ? "text-red-600" :
                            mov.type === "ADJUSTMENT" ? "text-amber-600" :
                            isConv ? "text-purple-600" :
                            "text-gray-600"
                          }>
                            {mov.type === "IN" || mov.type === "PURCHASE" ? "+" :
                             mov.type === "OUT" || mov.type === "SALE" ? "−" :
                             isConv ? "⇄" :
                             "±"}{mov.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {mov.fromWarehouse?.name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {mov.toWarehouse?.name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(mov.createdAt)}
                        </TableCell>
                        <TableCell className="text-xs text-gray-400 max-w-[160px] truncate" title={mov.notes || ""}>
                          {mov.notes || "—"}
                        </TableCell>
                      </TableRow>
                      {isConv && isExpanded && convDetails && (
                        <TableRow className="bg-purple-50/20 border-l-2 border-l-purple-400">
                          <TableCell colSpan={8} className="p-0">
                            <div className="px-10 py-4 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="flex items-start gap-8 text-sm">
                                <div className="flex flex-col gap-3 min-w-[320px]">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="status" status={convDetails.direction === "split" ? "active" : "delivered"}>
                                      {convDetails.direction === "split" ? "Break Down" : "Package Up"}
                                    </Badge>
                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                      {convDetails.direction === "split" ? "(Larger → Smaller)" : "(Smaller → Larger)"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 bg-white rounded-lg border border-purple-100 px-4 py-3">
                                    <div className="text-center min-w-[60px]">
                                      <div className="text-lg font-bold text-purple-700">{convDetails.sourceQty}</div>
                                      <div className="text-[11px] text-gray-500 font-medium uppercase">{convDetails.sourceAbbr}</div>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5 text-purple-300">
                                      <ArrowRight className="h-5 w-5" />
                                      <span className="text-[10px] text-gray-400 font-mono">
                                        {Math.round(convDetails.targetQty / convDetails.sourceQty)} × {convDetails.targetAbbr}
                                      </span>
                                    </div>
                                    <div className="text-center min-w-[60px]">
                                      <div className="text-lg font-bold text-purple-700">{convDetails.targetQty}</div>
                                      <div className="text-[11px] text-gray-500 font-medium uppercase">{convDetails.targetAbbr}</div>
                                    </div>
                                  </div>
                                </div>
                                {convDetails.reason && (
                                  <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Reason</span>
                                    <p className="text-sm text-gray-600 leading-relaxed">{convDetails.reason}</p>
                                  </div>
                                )}
                                <div className="flex flex-col gap-1.5 ml-auto">
                                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Warehouse</span>
                                  <span className="text-sm font-medium text-gray-700">
                                    {mov.fromWarehouse?.name || mov.toWarehouse?.name || "—"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
