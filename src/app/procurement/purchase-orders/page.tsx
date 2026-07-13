"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, CheckCircle2, Send, XCircle, Printer } from "lucide-react"
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
import { formatCurrency, formatDate } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface PO {
  id: string
  poNumber: string
  supplier?: { id: string; name: string }
  supplierName: string
  status: string
  items: { id: string; product: { name: string }; quantity: number }[]
  totalAmount: number
  taxAmount: number
  grandTotal: number
  warehouse?: { id: string; name: string }
  expectedAt?: string
  createdAt: string
}

const statusConfig: Record<string, { label: string; color: string; nextActions: { status: string; label: string; requiresAuth?: boolean }[] }> = {
  DRAFT: { label: "Draft", color: "inactive", nextActions: [{ status: "PENDING_APPROVAL", label: "Submit" }, { status: "CANCELLED", label: "Cancel", requiresAuth: false }] },
  PENDING_APPROVAL: { label: "Pending Approval", color: "pending", nextActions: [{ status: "APPROVED", label: "Approve" }, { status: "CANCELLED", label: "Cancel", requiresAuth: false }] },
  APPROVED: { label: "Approved", color: "approved", nextActions: [{ status: "SENT", label: "Send" }, { status: "CANCELLED", label: "Cancel", requiresAuth: true }] },
  SENT: { label: "Sent", color: "active", nextActions: [{ status: "RECEIVED", label: "Receive" }, { status: "CANCELLED", label: "Cancel", requiresAuth: true }] },
  PARTIALLY_RECEIVED: { label: "Partial", color: "processing", nextActions: [{ status: "RECEIVED", label: "Receive All" }, { status: "CANCELLED", label: "Cancel", requiresAuth: true }] },
  RECEIVED: { label: "Received", color: "delivered", nextActions: [] },
  CANCELLED: { label: "Cancelled", color: "cancelled", nextActions: [] },
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => { loadPOs() }, [statusFilter])

  const loadPOs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      if (search) params.set("poNumber", search)
      const res = await fetch(`/api/procurement/purchase-orders?${params}`)
      const json = await res.json()
      if (json.data) setOrders(json.data)
    } catch (err) {
      console.error("Failed to load:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = async (id: string, status: string) => {
    setActionLoading(`${id}-${status}`)
    try {
      const res = await fetch("/api/procurement/purchase-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      const json = await res.json()
      if (json.success) loadPOs()
      else alert(json.error || "Failed")
    } catch { alert("Failed to update") }
    finally { setActionLoading(null) }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) loadPOs()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Purchase Orders</h3>
          <p className="text-sm text-gray-500 mt-1">Manage procurement orders with full approval workflow</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="flex items-center gap-2 print:hidden"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Link href="/procurement/purchase-orders/new">
            <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> New Purchase Order</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">All Orders</CardTitle>
              {["", "DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "RECEIVED", "CANCELLED"].map((s) => {
                const cfg = statusConfig[s] || { label: s || "All", color: "inactive" }
                return (
                  <Badge
                    key={s}
                    variant={statusFilter === s ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setStatusFilter(s)}
                  >
                    {cfg.label}
                  </Badge>
                )
              })}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search PO..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No purchase orders.{' '}
              <Link href="/procurement/purchase-orders/new" className="text-blue-500 hover:underline">Create one</Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((po) => {
                  const cfg = statusConfig[po.status] || { label: po.status, color: "inactive", nextActions: [] }
                  return (
                    <TableRow key={po.id}>
                      <TableCell>
                        <Link href={`/procurement/purchase-orders/${po.id}`} className="font-mono text-xs font-medium hover:text-blue-600">
                          {po.poNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">{po.supplier?.name || po.supplierName}</TableCell>
                      <TableCell>
                        <Badge variant="status" status={cfg.color}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{po.items.length}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(po.grandTotal))}</TableCell>
                      <TableCell className="text-sm">{po.warehouse?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{po.expectedAt ? formatDate(po.expectedAt) : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {cfg.nextActions.map((action) => (
                            <Button
                              key={action.status}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQuickAction(po.id, action.status)}
                              disabled={actionLoading === `${po.id}-${action.status}`}
                              className={
                                action.status === "APPROVED" ? "text-green-600" :
                                action.status === "CANCELLED" ? (action.requiresAuth ? "text-red-400" : "text-red-500") :
                                action.status === "PENDING_APPROVAL" ? "text-blue-600" : ""
                              }
                              title={action.status === "CANCELLED" && action.requiresAuth ? "Requires authorization (delete permission)" : undefined}
                            >
                              {actionLoading === `${po.id}-${action.status}` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>{action.label}{action.requiresAuth ? " 🔒" : ""}</>
                              )}
                            </Button>
                          ))}
                          <Link href={`/procurement/purchase-orders/${po.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
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
