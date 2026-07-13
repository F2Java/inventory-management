"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
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
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils"
import { ArrowLeft, CheckCircle2, Send, Truck, XCircle, Loader2, FileText, Building2, Package, Printer } from "lucide-react"

interface POItem {
  id: string
  product: { id: string; name: string; sku: string; unit: string }
  quantity: number
  unitCost: number
  totalCost: number
}

interface PO {
  id: string
  poNumber: string
  supplier?: { id: string; name: string; code?: string; contactPerson?: string; phone?: string }
  supplierName: string
  supplierContact?: string
  status: string
  notes?: string
  totalAmount: number
  taxAmount: number
  grandTotal: number
  warehouse?: { id: string; name: string }
  branch?: { id: string; name: string }
  expectedAt?: string
  receivedAt?: string
  createdAt: string
  items: POItem[]
  stockRequests?: { requestNumber: string; status: string }[]
}

const statusFlow: Record<string, { label: string; actions: { label: string; nextStatus: string; icon: React.ReactNode; variant?: string }[]; color: string }> = {
  DRAFT: {
    label: "Draft",
    actions: [
      { label: "Submit for Approval", nextStatus: "PENDING_APPROVAL", icon: <Send className="h-4 w-4" /> },
      { label: "Cancel", nextStatus: "CANCELLED", icon: <XCircle className="h-4 w-4" />, variant: "destructive" },
    ],
    color: "inactive",
  },
  PENDING_APPROVAL: {
    label: "Pending Approval",
    actions: [
      { label: "Approve", nextStatus: "APPROVED", icon: <CheckCircle2 className="h-4 w-4" /> },
      { label: "Cancel", nextStatus: "CANCELLED", icon: <XCircle className="h-4 w-4" />, variant: "destructive" },
    ],
    color: "pending",
  },
  APPROVED: {
    label: "Approved",
    actions: [
      { label: "Mark as Sent", nextStatus: "SENT", icon: <Send className="h-4 w-4" /> },
      { label: "Cancel", nextStatus: "CANCELLED", icon: <XCircle className="h-4 w-4" />, variant: "destructive" },
    ],
    color: "approved",
  },
  SENT: {
    label: "Sent to Supplier",
    actions: [
      { label: "Mark Received", nextStatus: "RECEIVED", icon: <Truck className="h-4 w-4" /> },
      { label: "Partial Receive", nextStatus: "PARTIALLY_RECEIVED", icon: <Package className="h-4 w-4" /> },
      { label: "Cancel", nextStatus: "CANCELLED", icon: <XCircle className="h-4 w-4" />, variant: "destructive" },
    ],
    color: "active",
  },
  PARTIALLY_RECEIVED: {
    label: "Partially Received",
    actions: [
      { label: "Mark Fully Received", nextStatus: "RECEIVED", icon: <CheckCircle2 className="h-4 w-4" /> },
      { label: "Cancel Remaining", nextStatus: "CANCELLED", icon: <XCircle className="h-4 w-4" />, variant: "destructive" },
    ],
    color: "processing",
  },
  RECEIVED: {
    label: "Received",
    actions: [],
    color: "delivered",
  },
  CANCELLED: {
    label: "Cancelled",
    actions: [],
    color: "cancelled",
  },
}

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [po, setPo] = useState<PO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/procurement/purchase-orders/${id}`)
        const json = await res.json()
        if (json.data) setPo(json.data)
        else setError("Purchase order not found")
      } catch { setError("Failed to load PO") }
      finally { setIsLoading(false) }
    }
    load()
  }, [id])

  const handleStatusChange = async (nextStatus: string) => {
    setActionLoading(nextStatus)
    try {
      const res = await fetch("/api/procurement/purchase-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      })
      const json = await res.json()
      if (json.success) {
        setPo(json.data)
      } else {
        alert(json.error || "Failed to update status")
      }
    } catch (err) {
      alert("Failed to update status")
    } finally {
      setActionLoading(null)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>
  if (!po) return null

  const flow = statusFlow[po.status] || statusFlow.DRAFT
  const isTerminal = po.status === "RECEIVED" || po.status === "CANCELLED"

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ─── Print Styles ─────────────────────────────────────────────────── */}
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm 20mm;
          }
          :global(body) {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-header {
            display: flex !important;
          }
          .print-signature {
            display: flex !important;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      {/* ─── Screen Header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 no-print">
        <Link href="/procurement/purchase-orders" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-gray-900">PO {po.poNumber}</h3>
            <Badge variant="status" status={flow.color}>{flow.label}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {po.supplier?.name || po.supplierName} — {formatDate(po.createdAt)}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handlePrint}
          className="flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Print PO
        </Button>
      </div>

      {/* ─── Print-Only Header ────────────────────────────────────────────── */}
      <div className="print-only print-header">
        <div className="border-b-2 border-gray-900 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PURCHASE ORDER</h1>
              <p className="text-sm text-gray-500 mt-1">{po.poNumber}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">Date: {formatDateShort(po.createdAt)}</p>
              {po.expectedAt && <p>Expected: {formatDateShort(po.expectedAt)}</p>}
              <p className="mt-2 font-medium">Status: {flow.label}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Supplier</h3>
            <p className="font-medium">{po.supplier?.name || po.supplierName}</p>
            {po.supplier?.contactPerson && <p className="text-sm">{po.supplier.contactPerson}</p>}
            {po.supplier?.phone && <p className="text-sm">{po.supplier.phone}</p>}
            {po.supplierContact && <p className="text-sm">{po.supplierContact}</p>}
          </div>
          <div className="text-right">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Delivery To</h3>
            <p className="font-medium">{po.warehouse?.name || "—"}</p>
            {po.branch?.name && <p className="text-sm">{po.branch.name}</p>}
          </div>
        </div>
      </div>

      {/* ─── Screen Status Actions ───────────────────────────────────────── */}
      {!isTerminal && flow.actions.length > 0 && (
        <Card className="no-print">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Actions:</span>
            <div className="flex gap-2">
              {flow.actions.map((action) => (
                <Button
                  key={action.nextStatus}
                  variant={action.variant === "destructive" ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleStatusChange(action.nextStatus)}
                  disabled={actionLoading !== null}
                  className={`flex items-center gap-2 ${action.variant === "destructive" ? "text-red-600 border-red-200 hover:bg-red-50" : ""}`}
                >
                  {actionLoading === action.nextStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    action.icon
                  )}
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── PO Info Cards (screen only) ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <Card>
          <CardHeader><CardTitle className="text-sm">Supplier</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{po.supplier?.name || po.supplierName}</p>
            {po.supplierContact && <p className="text-sm text-gray-500">{po.supplierContact}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Warehouse</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{po.warehouse?.name || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Expected</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{po.expectedAt ? formatDate(po.expectedAt) : "—"}</p>
            {po.receivedAt && <p className="text-xs text-green-600">Received: {formatDate(po.receivedAt)}</p>}
          </CardContent>
        </Card>
      </div>

      {/* ─── Items Table ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Items ({po.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-gray-400 text-[10px]">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell className="text-gray-400 text-xs">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{item.product.name}</TableCell>
                  <TableCell className="text-xs font-mono">{item.product.sku}</TableCell>
                  <TableCell className="text-right">{item.quantity} {item.product.unit}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.unitCost))}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(Number(item.totalCost))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end mt-4">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(Number(po.totalAmount))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">PPN 11%</span>
                <span className="font-medium">{formatCurrency(Number(po.taxAmount))}</span>
              </div>
              <div className="border-t-2 border-gray-300 pt-2 flex justify-between text-base">
                <span className="font-semibold">Grand Total</span>
                <span className="font-bold text-lg">{formatCurrency(Number(po.grandTotal))}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Print Signature Section ──────────────────────────────────────── */}
      <div className="print-only print-signature mt-8 pt-4 border-t border-gray-300">
        <div className="grid grid-cols-3 gap-8 text-center text-sm">
          <div>
            <p className="font-semibold mb-8">Requested By,</p>
            <div className="h-12"></div>
            <p className="border-t border-gray-600 pt-1">(Name & Signature)</p>
          </div>
          <div>
            <p className="font-semibold mb-8">Approved By,</p>
            <div className="h-12"></div>
            <p className="border-t border-gray-600 pt-1">(Name & Signature)</p>
          </div>
          <div>
            <p className="font-semibold mb-8">Received By,</p>
            <div className="h-12"></div>
            <p className="border-t border-gray-600 pt-1">(Name & Signature)</p>
          </div>
        </div>
      </div>

      {/* ─── Stock Requests (screen only) ─────────────────────────────────── */}
      {po.stockRequests && po.stockRequests.length > 0 && (
        <Card className="no-print">
          <CardHeader><CardTitle className="text-sm">Linked Stock Requests</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {po.stockRequests.map((sr) => (
                <Badge key={sr.requestNumber} variant="outline" className="font-mono text-xs">
                  {sr.requestNumber} ({sr.status})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Notes ─────────────────────────────────────────────────────────── */}
      {po.notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{po.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
