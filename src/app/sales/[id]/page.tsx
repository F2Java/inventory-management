"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Loader2,
  ShoppingCart,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Globe,
  Building2,
  Clock,
  FileText,
} from "lucide-react"
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
import { formatCurrency, formatDate } from "@/lib/utils"

interface SaleItem {
  id: string
  product: { id: string; name: string; sku: string; unit: string; sellPerUnit: number; image?: string }
  quantity: number
  unitPrice: number
  totalPrice: number
  uom?: { name: string; abbreviation: string }
}

interface OrderStatus {
  id: string
  status: string
  location?: string
  description?: string
  createdAt: string
}

interface OrderTracking {
  status: string
  courier?: string
  trackingNumber?: string
  packagedAt?: string
  handedOverAt?: string
  deliveredAt?: string
  notes?: string
}

interface Sale {
  id: string
  orderNumber: string
  externalOrderId?: string
  status: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: string
  subtotal: number
  taxAmount: number
  shippingCost: number
  discountAmount: number
  totalAmount: number
  currency: string
  notes?: string
  createdAt: string
  updatedAt: string
  items: SaleItem[]
  branch?: { id: string; name: string; code: string }
  connector?: { id: string; platform: string; storeName?: string }
  orderStatuses: OrderStatus[]
  orderTracking?: OrderTracking
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: "Pending", color: "inactive", icon: <Clock className="h-3 w-3" /> },
  PROCESSING: { label: "Processing", color: "pending", icon: <Package className="h-3 w-3" /> },
  PACKAGING: { label: "Packaging", color: "processing", icon: <Package className="h-3 w-3" /> },
  SHIPPED: { label: "Shipped", color: "active", icon: <Truck className="h-3 w-3" /> },
  DELIVERED: { label: "Delivered", color: "delivered", icon: <CheckCircle2 className="h-3 w-3" /> },
  CANCELLED: { label: "Cancelled", color: "cancelled", icon: <XCircle className="h-3 w-3" /> },
  RETURNED: { label: "Returned", color: "cancelled", icon: <XCircle className="h-3 w-3" /> },
}

export default function SaleDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [sale, setSale] = useState<Sale | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sales/${id}`)
        const json = await res.json()
        if (json.data) setSale(json.data)
        else throw new Error(json.error || "Sale not found")
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>
  if (!sale) return null

  const cfg = statusConfig[sale.status] || statusConfig.PENDING
  const totalItems = sale.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/sales" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-gray-900">Order {sale.orderNumber}</h3>
            <Badge variant="status" status={cfg.color} className="flex items-center gap-1">
              {cfg.icon}
              {cfg.label}
            </Badge>
            {sale.connector && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {sale.connector.platform}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {sale.branch?.name || "No branch"} — {formatDate(sale.createdAt)}
            {sale.externalOrderId && <span className="ml-2">— Ext ID: {sale.externalOrderId}</span>}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Items</p><p className="text-xl font-bold mt-1">{totalItems}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Subtotal</p><p className="text-xl font-bold mt-1">{formatCurrency(Number(sale.subtotal))}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Shipping</p><p className="text-xl font-bold mt-1">{formatCurrency(Number(sale.shippingCost))}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Discount</p><p className="text-xl font-bold mt-1 text-red-500">-{formatCurrency(Number(sale.discountAmount))}</p></CardContent></Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4"><p className="text-xs text-blue-600 font-medium">Total</p>
            <p className="text-xl font-bold mt-1 text-blue-700">{formatCurrency(Number(sale.totalAmount))}</p>
            <p className="text-xs text-blue-500">{sale.currency}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Info */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-500" /> Customer</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{sale.customerName || "Guest"}</p>
            {sale.customerEmail && <p className="text-sm text-gray-500">{sale.customerEmail}</p>}
            {sale.customerPhone && <p className="text-sm text-gray-500">{sale.customerPhone}</p>}
            {sale.shippingAddress && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Shipping Address:</p>
                <p className="text-sm whitespace-pre-wrap">{sale.shippingAddress}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Info */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-blue-500" /> Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Order Number</span><span className="font-mono font-medium">{sale.orderNumber}</span></div>
            {sale.externalOrderId && <div className="flex justify-between text-sm"><span className="text-gray-500">External ID</span><span className="font-mono text-xs">{sale.externalOrderId}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-gray-500">Branch</span><span>{sale.branch?.name || "—"}</span></div>
            {sale.connector && <div className="flex justify-between text-sm"><span className="text-gray-500">Platform</span><span>{sale.connector.platform}{sale.connector.storeName ? ` — ${sale.connector.storeName}` : ""}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-gray-500">Order Date</span><span>{formatDate(sale.createdAt)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Last Updated</span><span>{formatDate(sale.updatedAt)}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-blue-500" /> Order Items ({sale.items.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product.name}</TableCell>
                  <TableCell className="text-xs font-mono">{item.product.sku}</TableCell>
                  <TableCell className="text-right">{item.quantity} {item.product.unit}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.unitPrice))}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(Number(item.totalPrice))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end mt-4">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(Number(sale.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="font-medium">{formatCurrency(Number(sale.shippingCost))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="font-medium text-red-500">-{formatCurrency(Number(sale.discountAmount))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="font-medium">{formatCurrency(Number(sale.taxAmount))}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-blue-600">{formatCurrency(Number(sale.totalAmount))}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Tracking */}
      {sale.orderTracking && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Truck className="h-4 w-4 text-blue-500" /> Tracking</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <Badge variant="status" status={sale.orderTracking.status === "delivered" ? "delivered" : "active"}>
                  {sale.orderTracking.status}
                </Badge>
              </div>
              {sale.orderTracking.courier && (
                <div><p className="text-xs text-gray-500">Courier</p><p className="text-sm font-medium">{sale.orderTracking.courier}</p></div>
              )}
              {sale.orderTracking.trackingNumber && (
                <div><p className="text-xs text-gray-500">Tracking #</p><p className="text-sm font-mono">{sale.orderTracking.trackingNumber}</p></div>
              )}
              {sale.orderTracking.deliveredAt && (
                <div><p className="text-xs text-gray-500">Delivered</p><p className="text-sm font-medium">{formatDate(sale.orderTracking.deliveredAt)}</p></div>
              )}
            </div>
            {sale.orderTracking.notes && (
              <p className="text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">{sale.orderTracking.notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Timeline */}
      {sale.orderStatuses.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" /> Status History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sale.orderStatuses.map((st, i) => (
                <div key={st.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    {i < sale.orderStatuses.length - 1 && <div className="w-0.5 flex-1 bg-blue-200" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium capitalize">{st.status.replace("_", " ")}</p>
                    {st.description && <p className="text-xs text-gray-500">{st.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(st.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {sale.notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{sale.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
