"use client"

import { useState, useEffect } from "react"
import { Search, Filter, ArrowUpDown, AlertTriangle, CheckCircle2, XCircle, FileText, Trash2 } from "lucide-react"
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
import { formatDate, formatCurrency } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface StockRequest {
  id: string
  requestNumber: string
  status: string
  priority: string
  notes?: string
  warehouse: { id: string; name: string }
  items: { id: string; product: { id: string; name: string; sku: string }; quantityRequested: number }[]
  purchaseOrder?: { poNumber: string; status: string } | null
  createdAt: string
  approvedAt?: string
}

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  RELEASED: "Released",
  PARTIALLY_FULFILLED: "Partial",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
}

export default function StockRequestsPage() {
  const [requests, setRequests] = useState<StockRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => { loadRequests() }, [statusFilter])

  const loadRequests = async () => {
    setIsLoading(true)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ""
      const res = await fetch(`/api/stock-requests${params}`)
      const json = await res.json()
      if (json.data) setRequests(json.data)
    } catch (err) {
      console.error("Failed to load:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRelease = async (request: StockRequest) => {
    // Navigate to new PO page with stock request and supplier params
    window.location.href = `/procurement/purchase-orders/new?fromRequest=${request.id}`
  }

  const handleDelete = async (id: string, requestNumber: string) => {
    if (!confirm(`Delete stock request "${requestNumber}"? Only PENDING requests can be deleted.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/stock-requests?id=${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to delete")
      loadRequests()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch("/api/stock-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "APPROVED" }),
      })
      const json = await res.json()
      if (json.success) loadRequests()
    } catch (err) {
      console.error("Failed:", err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "pending"
      case "APPROVED": return "approved"
      case "RELEASED": return "active"
      case "FULFILLED": return "delivered"
      case "CANCELLED": return "cancelled"
      default: return "inactive"
    }
  }

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "URGENT": return "bg-red-100 text-red-700"
      case "HIGH": return "bg-orange-100 text-orange-700"
      case "NORMAL": return "bg-blue-100 text-blue-700"
      case "LOW": return "bg-gray-100 text-gray-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Stock Requests</h3>
        <p className="text-sm text-gray-500 mt-1">Warehouse stock replenishment requests for procurement</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">All Requests</CardTitle>
              {["", "PENDING", "APPROVED", "RELEASED", "FULFILLED", "CANCELLED"].map((s) => (
                <Badge
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter(s)}
                >
                  {s ? statusLabels[s] : "All"}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No stock requests yet. Set inventory thresholds to auto-generate requests.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked PO</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-mono text-xs font-medium">{req.requestNumber}</TableCell>
                    <TableCell>{req.warehouse.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(req.priority)}`}>
                        {req.priority === "URGENT" && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {req.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {req.items.map((item) => (
                          <span key={item.id} className="text-xs text-gray-600">
                            {item.product.name} × {item.quantityRequested}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="status" status={getStatusColor(req.status)}>
                        {statusLabels[req.status] || req.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {req.purchaseOrder ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          {req.purchaseOrder.poNumber}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(req.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {req.status === "PENDING" && (
                          <>
                            <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handleApprove(req.id)}>
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => handleRelease(req)}>
                              <FileText className="h-4 w-4 mr-1" /> Release as PO
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="text-red-400 hover:text-red-600"
                              onClick={() => handleDelete(req.id, req.requestNumber)}
                              disabled={deletingId === req.id}
                            >
                              {deletingId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </>
                        )}
                        {req.status === "APPROVED" && (
                          <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => handleRelease(req)}>
                            <FileText className="h-4 w-4 mr-1" /> Release as PO
                          </Button>
                        )}
                      </div>
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
